"""Orquestación de auditoría, deduplicación y preparación del dataset."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import uuid
from collections import Counter, defaultdict
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile

from .config import load_config, normalize_token
from .images import ImageValidationError, validate_and_fingerprint
from .models import DatasetSpec, Exclusion, ManagerConfig, SPLITS, SampleCandidate, ScanResult, SplitName
from .reporting import build_report, write_report
from .splitting import (
    apply_leakage_groups,
    assert_no_leakage,
    assign_stratified_grouped_splits,
    perceptual_groups,
)
from .zip_utils import ArchiveValidationError, archive_sha256, normalized_member_path, open_validated_archive


class ImmutableDatasetError(RuntimeError):
    """La salida existente difiere y no puede sobrescribirse silenciosamente."""


class DatasetManager:
    """API de alto nivel usada por el CLI y las pruebas."""

    def __init__(self, config_path: Path, seed: int | None = None) -> None:
        self.config = load_config(config_path, seed)

    def audit(self, raw_root: Path, report_path: Path) -> dict[str, object]:
        result = self._scan_and_plan(raw_root)
        report = build_report("audit", self.config, raw_root, result)
        write_report(report, report_path)
        return report

    def prepare(
        self,
        raw_root: Path,
        output_root: Path,
        report_path: Path,
    ) -> dict[str, object]:
        result = self._scan_and_plan(raw_root)
        if not result.candidates:
            report = build_report("prepare", self.config, raw_root, result, output_root)
            write_report(report, report_path)
            raise ValueError("No hay muestras válidas para preparar; revisa el reporte generado")

        manifest_bytes = self._manifest_bytes(result.candidates)
        reused = self._check_existing_output(output_root, manifest_bytes)
        if not reused:
            self._materialize_atomic(output_root, result.candidates, manifest_bytes)

        report = build_report("prepare", self.config, raw_root, result, output_root, reused)
        write_report(report, report_path)
        return report

    def scan_for_tests(self, raw_root: Path) -> ScanResult:
        """Punto verificable sin escritura de artefactos, deliberadamente explícito."""

        return self._scan_and_plan(raw_root)

    def _scan_and_plan(self, raw_root: Path) -> ScanResult:
        result = ScanResult()
        for dataset in self.config.datasets:
            for archive_spec in dataset.archives:
                self._scan_archive(raw_root, dataset, archive_spec.path, archive_spec.split, result)

        self._remove_exact_duplicates(result)
        clusters, perceptual_report = perceptual_groups(
            result.candidates, self.config.perceptual_hash_distance
        )
        result.perceptual_duplicates = perceptual_report
        apply_leakage_groups(result.candidates, clusters)
        self._resolve_official_group_conflicts(result)

        for dataset in self.config.datasets:
            if dataset.split_strategy != "stratified_grouped":
                continue
            subset = [
                sample for sample in result.candidates
                if sample.source_dataset == dataset.source_dataset and sample.split is None
            ]
            assign_stratified_grouped_splits(subset, self.config.split_ratios, self.config.seed)

        unassigned = [sample.member_path for sample in result.candidates if sample.split is None]
        if unassigned:
            raise ValueError(f"Quedaron {len(unassigned)} muestras sin split")
        assert_no_leakage(result.candidates)
        self._assign_output_paths(result.candidates)
        result.candidates.sort(key=lambda item: (
            SPLITS.index(item.split), item.crop_type, item.normalized_label, item.sha256
        ))
        return result

    def _scan_archive(
        self,
        raw_root: Path,
        dataset: DatasetSpec,
        archive_relative_path: str,
        official_split: SplitName | None,
        result: ScanResult,
    ) -> None:
        archive_path = (raw_root / archive_relative_path).resolve()
        raw_resolved = raw_root.resolve()
        if raw_resolved not in archive_path.parents:
            raise ValueError(f"La ruta configurada sale de rawRoot: {archive_relative_path}")

        archive_report: dict[str, object] = {
            "sourceDataset": dataset.source_dataset,
            "path": archive_relative_path,
            "status": "missing",
            "split": official_split,
            "sha256": None,
            "fileCount": 0,
            "acceptedCount": 0,
            "labels": {},
            "message": "ZIP no encontrado; dataset omitido sin abortar la auditoría.",
        }
        result.archives.append(archive_report)
        if not archive_path.is_file():
            result.exclusions.append(Exclusion(
                dataset.source_dataset, archive_relative_path, None, "missing_archive", str(archive_path)
            ))
            return

        archive_report["sha256"] = archive_sha256(archive_path)
        try:
            with open_validated_archive(archive_path, self.config) as archive:
                archive_report["status"] = "valid"
                archive_report["message"] = None
                archive_report["fileCount"] = sum(not info.is_dir() for info in archive.infolist())
                labels = Counter()
                accepted_before = len(result.candidates)
                for info in archive.infolist():
                    if info.is_dir():
                        continue
                    member_path = normalized_member_path(info.filename)
                    if member_path.suffix.casefold() not in self.config.image_extensions:
                        continue
                    parsed = self._parse_member(dataset, member_path)
                    if parsed is None:
                        reason = self._member_exclusion_reason(dataset, member_path)
                        result.exclusions.append(Exclusion(
                            dataset.source_dataset,
                            archive_relative_path,
                            member_path.as_posix(),
                            reason,
                        ))
                        continue
                    original_label, normalized_label = parsed
                    try:
                        data = archive.read(info)
                        sha256, perceptual_hash = validate_and_fingerprint(
                            data, self.config.max_image_bytes
                        )
                    except (ImageValidationError, OSError, RuntimeError) as exc:
                        result.exclusions.append(Exclusion(
                            dataset.source_dataset,
                            archive_relative_path,
                            member_path.as_posix(),
                            "corrupt_image",
                            str(exc),
                        ))
                        continue
                    labels[normalized_label] += 1
                    result.candidates.append(SampleCandidate(
                        crop_type=dataset.crop_type,
                        original_label=original_label,
                        normalized_label=normalized_label,
                        source_dataset=dataset.source_dataset,
                        archive_path=archive_path,
                        archive_relative_path=archive_relative_path,
                        member_path=member_path.as_posix(),
                        extension=member_path.suffix.casefold(),
                        sha256=sha256,
                        perceptual_hash=perceptual_hash,
                        split=official_split,
                    ))
                archive_report["acceptedCount"] = len(result.candidates) - accepted_before
                archive_report["labels"] = dict(sorted(labels.items()))
        except (ArchiveValidationError, BadZipFile, OSError) as exc:
            archive_report["status"] = "invalid"
            archive_report["message"] = str(exc)
            result.exclusions.append(Exclusion(
                dataset.source_dataset,
                archive_relative_path,
                None,
                "invalid_archive",
                str(exc),
            ))

    @staticmethod
    def _parse_member(dataset: DatasetSpec, path: PurePosixPath) -> tuple[str, str] | None:
        directory_segments = list(path.parts[:-1])
        normalized_segments = [normalize_token(segment) for segment in directory_segments]
        if dataset.exclude_path_segments.intersection(normalized_segments):
            return None
        if dataset.include_path_segments and not dataset.include_path_segments.intersection(normalized_segments):
            return None

        matches: list[tuple[str, str]] = []
        for original, normalized in zip(directory_segments, normalized_segments, strict=True):
            for label, aliases in dataset.labels.items():
                if normalized in aliases:
                    matches.append((original, label))
        unique = {(original, label) for original, label in matches}
        if len(unique) != 1:
            return None
        return next(iter(unique))

    @staticmethod
    def _member_exclusion_reason(dataset: DatasetSpec, path: PurePosixPath) -> str:
        segments = {normalize_token(segment) for segment in path.parts[:-1]}
        if dataset.exclude_path_segments.intersection(segments):
            return "excluded_path_segment"
        if dataset.include_path_segments and not dataset.include_path_segments.intersection(segments):
            return "outside_included_part"
        return "unknown_or_ambiguous_label"

    @staticmethod
    def _remove_exact_duplicates(result: ScanResult) -> None:
        by_hash: dict[str, list[SampleCandidate]] = defaultdict(list)
        for sample in result.candidates:
            by_hash[sample.sha256].append(sample)
        retained: list[SampleCandidate] = []
        split_priority = {"test": 0, "validation": 1, "train": 2, None: 3}
        duplicate_ids: set[int] = set()
        for sha256, members in by_hash.items():
            if len(members) == 1:
                continue
            identities = {(member.crop_type, member.normalized_label) for member in members}
            if len(identities) > 1:
                kept = None
                reason = "exact_duplicate_conflicting_label"
                dropped = members
            else:
                ordered = sorted(members, key=lambda item: (
                    split_priority[item.split], item.archive_relative_path, item.member_path
                ))
                kept = ordered[0]
                dropped = ordered[1:]
                reason = "exact_duplicate"
            result.exact_duplicates.append({
                "hash": sha256,
                "kept": DatasetManager._sample_origin(kept) if kept else None,
                "dropped": [DatasetManager._sample_origin(member) for member in dropped],
                "conflictingLabels": len(identities) > 1,
            })
            for member in dropped:
                duplicate_ids.add(id(member))
                result.exclusions.append(Exclusion(
                    member.source_dataset,
                    member.archive_relative_path,
                    member.member_path,
                    reason,
                    f"sha256={sha256}",
                ))
        for sample in result.candidates:
            if id(sample) not in duplicate_ids:
                retained.append(sample)
        result.candidates = retained

    @staticmethod
    def _resolve_official_group_conflicts(result: ScanResult) -> None:
        groups: dict[str, list[SampleCandidate]] = defaultdict(list)
        for sample in result.candidates:
            if sample.group_id:
                groups[sample.group_id].append(sample)
        priority = {"test": 0, "validation": 1, "train": 2}
        removed: set[int] = set()
        for group_id, members in groups.items():
            fixed_splits = {member.split for member in members if member.split is not None}
            if not fixed_splits:
                continue
            selected = min(fixed_splits, key=lambda split: priority[split])
            for member in members:
                if member.split is None:
                    member.split = selected
                elif member.split != selected:
                    removed.add(id(member))
                    result.exclusions.append(Exclusion(
                        member.source_dataset,
                        member.archive_relative_path,
                        member.member_path,
                        "group_crosses_official_splits",
                        f"groupId={group_id}; retainedSplit={selected}",
                    ))
        if removed:
            result.candidates = [sample for sample in result.candidates if id(sample) not in removed]

    @staticmethod
    def _assign_output_paths(samples: list[SampleCandidate]) -> None:
        extension_map = {".jpeg": ".jpg", ".tiff": ".tif"}
        seen: set[str] = set()
        for sample in samples:
            assert sample.split is not None
            extension = extension_map.get(sample.extension, sample.extension)
            path = PurePosixPath(
                sample.split,
                sample.crop_type,
                sample.normalized_label,
                f"{sample.sha256}{extension}",
            ).as_posix()
            if path in seen:
                raise ValueError(f"Ruta de salida duplicada: {path}")
            seen.add(path)
            sample.relative_path = path

    @staticmethod
    def _sample_origin(sample: SampleCandidate | None) -> dict[str, object] | None:
        if sample is None:
            return None
        return {
            "sourceDataset": sample.source_dataset,
            "archive": sample.archive_relative_path,
            "member": sample.member_path,
            "split": sample.split,
            "cropType": sample.crop_type,
            "normalizedLabel": sample.normalized_label,
        }

    @staticmethod
    def _manifest_bytes(samples: list[SampleCandidate]) -> bytes:
        records = [sample.manifest_record() for sample in samples]
        return "".join(
            json.dumps(record, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n"
            for record in records
        ).encode("utf-8")

    @staticmethod
    def _check_existing_output(output_root: Path, manifest_bytes: bytes) -> bool:
        if not output_root.exists():
            return False
        manifest_path = output_root / "manifest.jsonl"
        if not manifest_path.is_file():
            raise ImmutableDatasetError(
                f"{output_root} ya existe sin manifest.jsonl; usa una salida nueva para proteger test"
            )
        if manifest_path.read_bytes() != manifest_bytes:
            raise ImmutableDatasetError(
                "La salida existente difiere. Dataset Manager no sobrescribe un test ya creado; "
                "usa un directorio de salida versionado nuevo."
            )
        for line in manifest_bytes.decode("utf-8").splitlines():
            record = json.loads(line)
            image_path = output_root / record["relativePath"]
            if not image_path.is_file() or DatasetManager._file_sha256(image_path) != record["hash"]:
                raise ImmutableDatasetError(
                    f"La salida existente está incompleta o fue alterada: {record['relativePath']}"
                )
        return True

    def _materialize_atomic(
        self,
        output_root: Path,
        samples: list[SampleCandidate],
        manifest_bytes: bytes,
    ) -> None:
        output_root.parent.mkdir(parents=True, exist_ok=True)
        staging = output_root.parent / f".prepare-{output_root.name}-{uuid.uuid4().hex}"
        if staging.exists():
            raise RuntimeError(f"Directorio temporal inesperado: {staging}")
        staging.mkdir()
        try:
            by_archive: dict[Path, list[SampleCandidate]] = defaultdict(list)
            for sample in samples:
                by_archive[sample.archive_path].append(sample)
            for archive_path, archive_samples in by_archive.items():
                with ZipFile(archive_path, "r") as archive:
                    for sample in archive_samples:
                        assert sample.relative_path is not None
                        data = archive.read(sample.member_path)
                        if hashlib.sha256(data).hexdigest() != sample.sha256:
                            raise RuntimeError(f"El ZIP cambió durante prepare: {sample.member_path}")
                        destination = staging / Path(*PurePosixPath(sample.relative_path).parts)
                        destination.parent.mkdir(parents=True, exist_ok=True)
                        destination.write_bytes(data)

            (staging / "manifest.jsonl").write_bytes(manifest_bytes)
            manifests = staging / "manifests"
            manifests.mkdir()
            for split in SPLITS:
                split_records = [sample for sample in samples if sample.split == split]
                (manifests / f"{split}.jsonl").write_bytes(self._manifest_bytes(split_records))
            class_index = {
                crop: sorted({
                    sample.normalized_label for sample in samples if sample.crop_type == crop
                })
                for crop in sorted({sample.crop_type for sample in samples})
            }
            (staging / "class_index.json").write_text(
                json.dumps(class_index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
            )
            os.replace(staging, output_root)
        except Exception:
            if staging.exists() and staging.parent == output_root.parent and staging.name.startswith(".prepare-"):
                shutil.rmtree(staging)
            raise

    @staticmethod
    def _file_sha256(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()
