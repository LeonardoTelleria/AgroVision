"""Pruebas del pipeline real de inferencia sin modificar artefactos ML."""

from __future__ import annotations

import asyncio
import hashlib
import json
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

import main
from app.inference import InvalidImageError, ModelLoader, ModelUnavailableError, VisionInferenceEngine


SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATASET_ROOT = SERVICE_ROOT / "data" / "processed" / "v1"
MANIFEST = DATASET_ROOT / "manifest.jsonl"
REGISTRY = SERVICE_ROOT / "model_registry" / "registry.json"


def _sample(crop_type: str) -> tuple[bytes, str]:
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        record = json.loads(line)
        if record["cropType"] == crop_type and record["split"] == "train":
            path = DATASET_ROOT / record["relativePath"]
            mime = "image/png" if path.suffix.casefold() == ".png" else "image/jpeg"
            return path.read_bytes(), mime
    raise AssertionError(f"No existe muestra train para {crop_type}")


def _upload(content: bytes, mime: str, name: str = "leaf.jpg") -> UploadFile:
    return UploadFile(
        file=BytesIO(content),
        filename=name,
        headers=Headers({"content-type": mime}),
    )


@unittest.skipUnless(REGISTRY.is_file() and MANIFEST.is_file(), "Pesos/dataset locales no disponibles")
class RealInferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.loader = ModelLoader()
        cls.engine = VisionInferenceEngine(cls.loader)

    def test_loads_correct_models_class_order_and_cache(self) -> None:
        expected = {
            "CORN": ("blight", "common_rust", "gray_leaf_spot", "healthy"),
            "ORANGE": ("black_spot", "canker", "greening", "healthy", "melanose"),
        }
        for crop_type, classes in expected.items():
            with self.subTest(crop_type=crop_type):
                first = self.loader.get_model(crop_type)
                second = self.loader.get_model(crop_type)
                self.assertIs(first, second)
                self.assertEqual(first.metadata.crop_type, crop_type)
                self.assertEqual(first.metadata.class_names, classes)

        with ThreadPoolExecutor(max_workers=4) as executor:
            loaded = list(executor.map(self.loader.get_model, ["CORN"] * 4))
        self.assertTrue(all(item is loaded[0] for item in loaded))

    def test_red_bean_is_not_available(self) -> None:
        with self.assertRaises(ModelUnavailableError):
            self.loader.get_model("RED_BEAN")

    def test_invalid_image_is_rejected(self) -> None:
        with self.assertRaises(InvalidImageError):
            self.engine.predict(b"not-an-image", "CORN")

    def test_real_inference_for_corn_and_orange_uses_train_only(self) -> None:
        versions = {"CORN": "corn-1.0.0", "ORANGE": "orange-1.0.0"}
        for crop_type, version in versions.items():
            with self.subTest(crop_type=crop_type):
                content, _ = _sample(crop_type)
                result = self.engine.predict(content, crop_type)
                self.assertEqual(result.crop_type, crop_type)
                self.assertEqual(result.model_version, version)
                self.assertIn(result.detected_class, self.loader.get_model(crop_type).metadata.class_names)
                self.assertEqual(len(result.top_classes), 3)
                self.assertGreaterEqual(result.confidence, 0)
                self.assertGreaterEqual(result.inference_ms, 0)

    def test_fastapi_contract_and_controlled_503(self) -> None:
        content, mime = _sample("CORN")
        response = asyncio.run(main.analyze(
            image=_upload(content, mime),
            cropType="CORN",
            fieldId="field-test",
            zoneId="zone-test",
            imageFileName="corn-smoke.jpg",
        ))
        self.assertEqual(response.cropType, "CORN")
        self.assertEqual(response.modelVersion, "corn-1.0.0")
        self.assertTrue(response.detectedClass)
        self.assertIsNone(response.visualMetrics.greenCoveragePercentage)

        image = BytesIO()
        Image.new("RGB", (32, 32), "green").save(image, format="JPEG")
        with self.assertRaises(HTTPException) as context:
            asyncio.run(main.analyze(
                image=_upload(image.getvalue(), "image/jpeg"),
                cropType="RED_BEAN",
                fieldId="field-test",
                zoneId=None,
                imageFileName="bean.jpg",
            ))
        self.assertEqual(context.exception.status_code, 503)

    def test_status_has_no_internal_paths(self) -> None:
        response = asyncio.run(main.models_status())
        encoded = response.model_dump_json()
        self.assertNotIn("checkpointPath", encoded)
        self.assertNotIn(str(SERVICE_ROOT), encoded)
        by_crop = {item.cropType: item for item in response.models}
        self.assertTrue(by_crop["CORN"].available)
        self.assertTrue(by_crop["ORANGE"].available)
        self.assertFalse(by_crop["RED_BEAN"].available)

    def test_export_matches_checkpoint_when_present(self) -> None:
        for crop_type in ("CORN", "ORANGE"):
            contract = SERVICE_ROOT / "exports" / crop_type / (
                "corn-1.0.0" if crop_type == "CORN" else "orange-1.0.0"
            ) / "model.contract.json"
            if not contract.is_file():
                continue
            content, _ = _sample(crop_type)
            scripted = VisionInferenceEngine(ModelLoader(prefer_torchscript=True)).predict(content, crop_type)
            checkpoint = VisionInferenceEngine(ModelLoader(prefer_torchscript=False)).predict(content, crop_type)
            self.assertEqual(scripted.detected_class, checkpoint.detected_class)
            self.assertEqual(
                [item.class_name for item in scripted.top_classes],
                [item.class_name for item in checkpoint.top_classes],
            )
            for left, right in zip(scripted.top_classes, checkpoint.top_classes, strict=True):
                self.assertAlmostEqual(left.score, right.score, places=5)


class IntegrityTests(unittest.TestCase):
    def test_modified_checkpoint_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            checkpoint = root / "checkpoint.pt"
            checkpoint.write_bytes(b"tampered")
            document = {
                "schemaVersion": "1.0",
                "models": [{
                    "modelId": "agrovision-efficientnet-b0-corn",
                    "modelVersion": "corn-test",
                    "status": "TRAINED",
                    "architecture": "efficientnet_b0",
                    "cropType": "CORN",
                    "classNames": ["blight", "common_rust", "gray_leaf_spot", "healthy"],
                    "datasetVersion": "v1",
                    "checkpointPath": checkpoint.name,
                    "preprocessing": {
                        "inputSize": 224,
                        "resizeSize": 256,
                        "mean": [0.485, 0.456, 0.406],
                        "std": [0.229, 0.224, 0.225],
                    },
                    "metrics": {},
                    "trainedAt": "2026-10-09T00:00:00+00:00",
                    "frameworkVersion": {"torch": "test", "torchvision": "test"},
                    "checksum": hashlib.sha256(b"different").hexdigest(),
                }],
            }
            registry = root / "registry.json"
            registry.write_text(json.dumps(document), encoding="utf-8")
            loader = ModelLoader(registry_path=registry, exports_root=root / "exports")
            with self.assertRaises(ModelUnavailableError):
                loader.get_model("CORN")


if __name__ == "__main__":
    unittest.main()
