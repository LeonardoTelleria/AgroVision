"""Pruebas autocontenidas del Dataset Manager con imágenes ficticias."""

from __future__ import annotations

import io
import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from PIL import Image, ImageDraw

from app.dataset_manager.manager import DatasetManager, ImmutableDatasetError


def fake_image(index: int, image_format: str = "PNG") -> bytes:
    image = Image.new("RGB", (24, 24), (20 + index % 200, 80, 120))
    draw = ImageDraw.Draw(image)
    x = index % 12
    draw.rectangle((x, 2, min(x + 7, 23), 20), fill=(240, (index * 17) % 255, 30))
    draw.line((0, index % 24, 23, (index * 5) % 24), fill=(0, 0, 0), width=2)
    buffer = io.BytesIO()
    image.save(buffer, format=image_format)
    return buffer.getvalue()


class DatasetManagerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.raw = self.root / "raw"
        self.raw.mkdir()
        self.config = self.root / "datasets.yaml"
        self.config.write_text(self._config_text(), encoding="utf-8")

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def _manager(self) -> DatasetManager:
        return DatasetManager(self.config, seed=42)

    def _write_zip(self, relative: str, entries: dict[str, bytes]) -> Path:
        path = self.raw / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        with ZipFile(path, "w", ZIP_DEFLATED) as archive:
            for name, data in entries.items():
                archive.writestr(name, data)
        return path

    def _config_text(self) -> str:
        return """
schemaVersion: "1.0"
defaults:
  seed: 42
  splitRatios: {train: 0.70, validation: 0.15, test: 0.15}
  imageExtensions: [".png", ".jpg", ".jpeg", ".bmp"]
  maxImageBytes: 1048576
  maxArchiveMembers: 1000
  maxArchiveUncompressedBytes: 10485760
  maxCompressionRatio: 250
  perceptualHashDistance: 0
datasets:
  maize:
    cropType: CORN
    sourceDataset: maize_fixture
    sourceName: Maize fixture
    sourceUrl: https://example.invalid/maize
    attribution: Fixture
    license: {name: TEST, url: https://example.invalid/license, verified: false, note: Solo pruebas.}
    splitStrategy: stratified_grouped
    archives: [{path: maize/maize.zip}]
    includePathSegments: []
    excludePathSegments: []
    labels:
      healthy: [Healthy]
      gray_leaf_spot: [Gray_Leaf_Spot]
      common_rust: [Common_Rust]
      blight: [Blight]
  beans:
    cropType: RED_BEAN
    sourceDataset: beans_fixture
    sourceName: Beans fixture
    sourceUrl: https://example.invalid/beans
    attribution: Fixture
    license: {name: TEST, url: https://example.invalid/license, verified: false, note: Solo pruebas.}
    splitStrategy: official
    archives:
      - {path: beans/train.zip, split: train}
      - {path: beans/validation.zip, split: validation}
      - {path: beans/test.zip, split: test}
    includePathSegments: []
    excludePathSegments: []
    labels:
      healthy: [healthy]
      angular_leaf_spot: [angular_leaf_spot]
      bean_rust: [bean_rust]
  citrus:
    cropType: ORANGE
    sourceDataset: citrus_fixture
    sourceName: Citrus fixture
    sourceUrl: https://example.invalid/citrus
    attribution: Fixture
    license: {name: TEST, url: https://example.invalid/license, verified: false, note: Solo pruebas.}
    splitStrategy: stratified_grouped
    archives: [{path: citrus/citrus.zip}]
    includePathSegments: [Leaves]
    excludePathSegments: [Fruits]
    labels:
      healthy: [healthy]
      black_spot: [Black spot]
      canker: [canker]
      greening: [greening]
      melanose: [Melanose]
"""

    def test_audit_tolerates_missing_archives_with_clear_status(self) -> None:
        report_path = self.root / "reports" / "audit.json"
        report = self._manager().audit(self.raw, report_path)
        statuses = [archive["status"] for archive in report["archives"]]
        self.assertEqual(statuses, ["missing"] * 5)
        self.assertTrue(report_path.is_file())
        self.assertTrue(report_path.with_suffix(".md").is_file())

    def test_rejects_zip_path_traversal(self) -> None:
        self._write_zip("maize/maize.zip", {"../escape.png": fake_image(1)})
        result = self._manager().scan_for_tests(self.raw)
        maize_archive = result.archives[0]
        self.assertEqual(maize_archive["status"], "invalid")
        self.assertIn("path traversal", str(maize_archive["message"]))
        self.assertFalse((self.root / "escape.png").exists())

    def test_labels_corrupt_images_and_exact_duplicates(self) -> None:
        duplicate = fake_image(1)
        self._write_zip("maize/maize.zip", {
            "data/Healthy/a.png": duplicate,
            "data/Healthy/a-copy.png": duplicate,
            "data/Gray_Leaf_Spot/b.png": fake_image(2),
            "data/Common_Rust/c.png": fake_image(3),
            "data/Blight/d.png": fake_image(4),
            "data/Blight/corrupt.png": b"not-an-image",
            "data/Unknown/ignored.png": fake_image(5),
        })
        result = self._manager().scan_for_tests(self.raw)
        labels = {sample.normalized_label for sample in result.candidates}
        reasons = Counter(exclusion.reason for exclusion in result.exclusions)
        self.assertEqual(labels, {"healthy", "gray_leaf_spot", "common_rust", "blight"})
        self.assertEqual(reasons["exact_duplicate"], 1)
        self.assertEqual(reasons["corrupt_image"], 1)
        self.assertEqual(reasons["unknown_or_ambiguous_label"], 1)

    def test_citrus_only_accepts_leaves_and_preserves_original_label(self) -> None:
        self._write_zip("citrus/citrus.zip", {
            "Citrus/Leaves/Black spot/leaf.png": fake_image(11),
            "Citrus/Fruits/Black spot/fruit.png": fake_image(12),
            "Citrus/Leaves/Scab/ambiguous.png": fake_image(13),
        })
        result = self._manager().scan_for_tests(self.raw)
        citrus = [sample for sample in result.candidates if sample.crop_type == "ORANGE"]
        self.assertEqual(len(citrus), 1)
        self.assertEqual(citrus[0].original_label, "Black spot")
        self.assertEqual(citrus[0].normalized_label, "black_spot")
        reasons = {exclusion.reason for exclusion in result.exclusions}
        self.assertIn("excluded_path_segment", reasons)
        self.assertIn("unknown_or_ambiguous_label", reasons)

    def test_official_splits_are_preserved_and_test_duplicate_wins(self) -> None:
        repeated = fake_image(21)
        self._write_zip("beans/train.zip", {
            "train/healthy/train.png": repeated,
            "train/bean_rust/rust.png": fake_image(22),
        })
        self._write_zip("beans/validation.zip", {
            "validation/angular_leaf_spot/validation.png": fake_image(23),
        })
        self._write_zip("beans/test.zip", {
            "test/healthy/test.png": repeated,
        })
        result = self._manager().scan_for_tests(self.raw)
        beans = [sample for sample in result.candidates if sample.crop_type == "RED_BEAN"]
        by_member = {sample.member_path: sample.split for sample in beans}
        self.assertNotIn("train/healthy/train.png", by_member)
        self.assertEqual(by_member["test/healthy/test.png"], "test")
        self.assertEqual(by_member["train/bean_rust/rust.png"], "train")
        self.assertEqual(by_member["validation/angular_leaf_spot/validation.png"], "validation")

    def test_perceptual_duplicates_are_reported_and_grouped(self) -> None:
        png = fake_image(31)
        with Image.open(io.BytesIO(png)) as source:
            buffer = io.BytesIO()
            source.save(buffer, format="BMP")
            bmp = buffer.getvalue()
        self.assertNotEqual(png, bmp)
        self._write_zip("maize/maize.zip", {
            "data/Healthy/visual-a.png": png,
            "data/Healthy/visual-b.bmp": bmp,
        })
        result = self._manager().scan_for_tests(self.raw)
        maize = [sample for sample in result.candidates if sample.crop_type == "CORN"]
        self.assertEqual(len(maize), 2)
        self.assertEqual(len(result.perceptual_duplicates), 1)
        self.assertIsNotNone(maize[0].group_id)
        self.assertEqual(maize[0].group_id, maize[1].group_id)
        self.assertEqual(maize[0].split, maize[1].split)

    def test_split_is_deterministic_and_has_no_hash_or_group_leakage(self) -> None:
        entries = {}
        labels = ["Healthy", "Gray_Leaf_Spot", "Common_Rust", "Blight"]
        for label_index, label in enumerate(labels):
            for index in range(12):
                entries[f"data/{label}/{index}.png"] = fake_image(label_index * 20 + index)
        self._write_zip("maize/maize.zip", entries)
        first = self._manager().scan_for_tests(self.raw)
        second = self._manager().scan_for_tests(self.raw)
        first_map = {sample.sha256: sample.split for sample in first.candidates}
        second_map = {sample.sha256: sample.split for sample in second.candidates}
        self.assertEqual(first_map, second_map)
        self.assertEqual(set(first_map.values()), {"train", "validation", "test"})
        for sha256 in first_map:
            self.assertEqual(len({sample.split for sample in first.candidates if sample.sha256 == sha256}), 1)
        for group_id in {sample.group_id for sample in first.candidates if sample.group_id}:
            self.assertEqual(
                len({sample.split for sample in first.candidates if sample.group_id == group_id}), 1
            )

    def test_prepare_writes_unified_manifest_and_never_overwrites_test(self) -> None:
        entries = {
            f"data/{label}/{index}.png": fake_image(label_index * 10 + index)
            for label_index, label in enumerate(["Healthy", "Gray_Leaf_Spot", "Common_Rust", "Blight"])
            for index in range(5)
        }
        zip_path = self._write_zip("maize/maize.zip", entries)
        output = self.root / "processed" / "v1"
        report = self.root / "reports" / "prepare.json"
        manager = self._manager()
        manager.prepare(self.raw, output, report)

        records = [json.loads(line) for line in (output / "manifest.jsonl").read_text(encoding="utf-8").splitlines()]
        required = {
            "cropType", "originalLabel", "normalizedLabel", "sourceDataset",
            "split", "hash", "relativePath", "groupId",
        }
        self.assertTrue(records)
        self.assertTrue(all(set(record) == required for record in records))
        self.assertTrue(all((output / record["relativePath"]).is_file() for record in records))
        self.assertTrue((output / "manifests" / "test.jsonl").is_file())

        manager.prepare(self.raw, output, report)
        with ZipFile(zip_path, "a", ZIP_DEFLATED) as archive:
            archive.writestr("data/Healthy/new.png", fake_image(99))
        with self.assertRaises(ImmutableDatasetError):
            manager.prepare(self.raw, output, report)


if __name__ == "__main__":
    unittest.main()
