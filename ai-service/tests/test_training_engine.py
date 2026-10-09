"""Pruebas ligeras del Training Engine sin instalar ni simular un entrenamiento Torch."""

from __future__ import annotations

import hashlib
import io
import json
import pickle
import tempfile
import unittest
from pathlib import Path

import yaml
from PIL import Image

from training.checkpoints import (
    CheckpointContractError,
    build_checkpoint_payload,
    load_checkpoint,
    save_checkpoint,
)
from training.config import TrainingConfigError, load_training_config
from training.dataset_loader import (
    DatasetContractError,
    ManifestDataset,
    assert_manifest_no_leakage,
    balanced_class_weights,
    deterministic_order,
    load_manifest_records,
)
from training.engine import EarlyStopping
from training.metrics import classification_metrics, latency_metrics


class _PickleTorch:
    @staticmethod
    def save(payload: object, path: Path) -> None:
        with path.open("wb") as target:
            pickle.dump(payload, target)

    @staticmethod
    def load(path: Path, **_: object) -> object:
        with path.open("rb") as source:
            return pickle.load(source)


def _png(color: tuple[int, int, int]) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buffer, format="PNG")
    return buffer.getvalue()


class TrainingConfigTests(unittest.TestCase):
    def test_repository_config_matches_dataset_labels(self) -> None:
        config = load_training_config(Path("training/config.yaml"))
        self.assertEqual(config.model.architecture, "efficientnet_b0")
        self.assertEqual(set(config.crops), {"CORN", "RED_BEAN", "ORANGE"})
        self.assertEqual(config.crops["RED_BEAN"].class_names, (
            "angular_leaf_spot", "bean_rust", "healthy",
        ))

    def test_rejects_class_mapping_drift(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "training").mkdir()
            (root / "config").mkdir()
            training_document = yaml.safe_load(Path("training/config.yaml").read_text(encoding="utf-8"))
            training_document["crops"]["CORN"]["classNames"] = ["healthy", "universal_disease"]
            (root / "training" / "config.yaml").write_text(
                yaml.safe_dump(training_document, sort_keys=False), encoding="utf-8"
            )
            (root / "config" / "datasets.yaml").write_bytes(Path("config/datasets.yaml").read_bytes())
            with self.assertRaises(TrainingConfigError):
                load_training_config(root / "training" / "config.yaml")


class DatasetLoaderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        records = []
        for index, (label, split) in enumerate((
            ("healthy", "train"),
            ("blight", "train"),
            ("healthy", "validation"),
        )):
            relative = f"{split}/CORN/{label}/{index}.png"
            image_path = self.root / relative
            image_path.parent.mkdir(parents=True, exist_ok=True)
            data = _png((index * 60, 100, 30))
            image_path.write_bytes(data)
            records.append({
                "cropType": "CORN",
                "originalLabel": label.title(),
                "normalizedLabel": label,
                "sourceDataset": "fixture",
                "split": split,
                "hash": hashlib.sha256(data).hexdigest(),
                "relativePath": relative,
                "groupId": None,
            })
        (self.root / "manifest.jsonl").write_text(
            "".join(json.dumps(record) + "\n" for record in records), encoding="utf-8"
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def test_loader_mapping_hashes_and_deterministic_order(self) -> None:
        classes = ("blight", "healthy")
        records = load_manifest_records(
            self.root, "manifest.jsonl", "CORN", "train", classes, verify_hashes=True
        )
        dataset = ManifestDataset(records, classes)
        image, target = dataset[0]
        self.assertIsInstance(image, Image.Image)
        self.assertEqual(target, classes.index(records[0].normalized_label))
        self.assertEqual(deterministic_order(records, 42), deterministic_order(records, 42))
        self.assertEqual(balanced_class_weights([3, 1]), [2 / 3, 2.0])
        assert_manifest_no_leakage(records)

    def test_rejects_missing_image_and_leakage(self) -> None:
        document = json.loads((self.root / "manifest.jsonl").read_text(encoding="utf-8").splitlines()[0])
        document["relativePath"] = "train/CORN/healthy/missing.png"
        (self.root / "broken.jsonl").write_text(json.dumps(document) + "\n", encoding="utf-8")
        with self.assertRaises(DatasetContractError):
            load_manifest_records(
                self.root, "broken.jsonl", "CORN", "train", ("blight", "healthy")
            )

        train = load_manifest_records(
            self.root, "manifest.jsonl", "CORN", "train", ("blight", "healthy")
        )
        validation = load_manifest_records(
            self.root, "manifest.jsonl", "CORN", "validation", ("blight", "healthy")
        )
        leaking = validation[0].__class__(
            **{**validation[0].__dict__, "sha256": train[0].sha256}
        )
        with self.assertRaises(DatasetContractError):
            assert_manifest_no_leakage([*train, leaking])


class CheckpointAndMetricsTests(unittest.TestCase):
    def test_checkpoint_round_trip_and_contract_errors(self) -> None:
        payload = build_checkpoint_payload(
            architecture="efficientnet_b0",
            crop_type="CORN",
            class_names=["blight", "healthy"],
            dataset_version="fixture-v1",
            model_version="1.0.0",
            stage="classifier",
            epoch=0,
            best_validation_macro_f1=0.5,
            best_validation_metrics={"macroF1": 0.5, "accuracy": 0.75},
            model_state={"weight": [1, 2]},
            optimizer_state={"lr": 0.001},
            scheduler_state={},
            scaler_state={},
            early_stopping_state={"patience": 2, "bestScore": 0.5, "badEpochs": 0},
            history=[{"epoch": 0, "validation": {"macroF1": 0.5}}],
            random_state=(1, 2),
            torch_random_state=b"torch",
            cuda_random_state=None,
            data_loader_random_state=b"loader",
        )
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "checkpoint.pt"
            checksum = save_checkpoint(payload, path, _PickleTorch)
            self.assertEqual(checksum, hashlib.sha256(path.read_bytes()).hexdigest())
            loaded = load_checkpoint(
                path,
                torch_module=_PickleTorch,
                expected_crop_type="CORN",
                expected_class_names=["blight", "healthy"],
                expected_dataset_version="fixture-v1",
            )
            self.assertEqual(loaded["modelVersion"], "1.0.0")
            with self.assertRaises(CheckpointContractError):
                load_checkpoint(path, torch_module=_PickleTorch, expected_crop_type="ORANGE")
            with self.assertRaises(FileNotFoundError):
                load_checkpoint(Path(temporary) / "missing.pt", torch_module=_PickleTorch)

    def test_metrics_are_exact_and_early_stopping_is_reproducible(self) -> None:
        metrics = classification_metrics([0, 0, 1, 1], [0, 1, 1, 1], ["a", "b"])
        self.assertEqual(metrics["accuracy"], 0.75)
        self.assertAlmostEqual(float(metrics["macroRecall"]), 0.75)
        self.assertEqual(metrics["confusionMatrix"], [[1, 1], [0, 2]])
        latency = latency_metrics([1.0, 2.0, 3.0, 4.0])
        self.assertEqual(latency["p50Ms"], 2.5)

        stopper = EarlyStopping(patience=2)
        self.assertEqual(stopper.update(0.5), (True, False))
        self.assertEqual(stopper.update(0.4), (False, False))
        self.assertEqual(stopper.update(0.4), (False, True))


if __name__ == "__main__":
    unittest.main()
