"""Pruebas del Model Registry y del contrato de exportación."""

from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from app.model_registry import ModelRegistry, WeightsUnavailableError
from training.export_contract import ExportContractError, validate_export_contract


def _placeholder_registry(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({
        "schemaVersion": "1.0",
        "models": [{
            "modelId": "agrovision-efficientnet-b0-corn",
            "modelVersion": "0.0.0",
            "status": "NOT_TRAINED",
            "architecture": "efficientnet_b0",
            "cropType": "CORN",
            "classNames": ["blight", "healthy"],
            "datasetVersion": "fixture-v1",
            "checkpointPath": None,
            "preprocessing": {
                "inputSize": 224,
                "resizeSize": 256,
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
            },
            "metrics": None,
            "trainedAt": None,
            "frameworkVersion": None,
            "checksum": None,
        }],
    }), encoding="utf-8")


class ModelRegistryTests(unittest.TestCase):
    def test_not_trained_and_real_file_checksum_lifecycle(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            registry_path = root / "registry" / "registry.json"
            _placeholder_registry(registry_path)
            registry = ModelRegistry(registry_path)
            with self.assertRaises(WeightsUnavailableError):
                registry.require_checkpoint("CORN")

            checkpoint = root / "checkpoints" / "best.pt"
            checkpoint.parent.mkdir()
            checkpoint.write_bytes(b"ephemeral-test-checkpoint")
            entry = registry.register_checkpoint(
                model_id="agrovision-efficientnet-b0-corn",
                model_version="1.0.0",
                architecture="efficientnet_b0",
                crop_type="CORN",
                class_names=["blight", "healthy"],
                dataset_version="fixture-v1",
                checkpoint_path=checkpoint,
                preprocessing={
                    "inputSize": 224,
                    "resizeSize": 256,
                    "mean": [0.485, 0.456, 0.406],
                    "std": [0.229, 0.224, 0.225],
                },
                validation_metrics={"macroF1": 0.8},
                trained_at="2026-10-08T12:00:00+00:00",
                framework_version={"torch": "test", "torchvision": "test"},
            )
            self.assertEqual(entry["status"], "TRAINED")
            resolved_checkpoint = ModelRegistry(registry_path).require_checkpoint("CORN", "1.0.0")
            self.assertTrue(resolved_checkpoint.samefile(checkpoint))
            checkpoint.write_bytes(b"tampered")
            with self.assertRaises(WeightsUnavailableError):
                ModelRegistry(registry_path).require_checkpoint("CORN", "1.0.0")

    def test_export_contract_validation_and_missing_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            artifact = root / "model.torchscript.pt"
            artifact.write_bytes(b"artifact")
            artifact_checksum = hashlib.sha256(artifact.read_bytes()).hexdigest()
            contract = {
                "schemaVersion": "1.0",
                "modelId": "agrovision-efficientnet-b0-corn",
                "modelVersion": "1.0.0",
                "architecture": "efficientnet_b0",
                "cropType": "CORN",
                "classNames": ["blight", "healthy"],
                "datasetVersion": "fixture-v1",
                "format": "torchscript",
                "artifactPath": artifact.name,
                "preprocessing": {"inputSize": 224},
                "frameworkVersion": {"torch": "test"},
                "checkpointChecksum": "a" * 64,
                "artifactChecksum": artifact_checksum,
                "exportedAt": "2026-10-08T12:00:00+00:00",
            }
            self.assertIs(validate_export_contract(contract, root), contract)
            artifact.write_bytes(b"tampered")
            with self.assertRaises(ExportContractError):
                validate_export_contract(contract, root)
            artifact.write_bytes(b"artifact")
            artifact.unlink()
            with self.assertRaises(ExportContractError):
                validate_export_contract(contract, root)


if __name__ == "__main__":
    unittest.main()
