"""Modelos internos del Dataset Manager."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal


SplitName = Literal["train", "validation", "test"]
SPLITS: tuple[SplitName, ...] = ("train", "validation", "test")


@dataclass(frozen=True)
class ArchiveSpec:
    path: str
    split: SplitName | None = None


@dataclass(frozen=True)
class LicenseSpec:
    name: str
    url: str
    verified: bool
    note: str


@dataclass(frozen=True)
class DatasetSpec:
    key: str
    crop_type: str
    source_dataset: str
    source_name: str
    source_url: str
    attribution: str
    license: LicenseSpec
    split_strategy: str
    archives: tuple[ArchiveSpec, ...]
    include_path_segments: frozenset[str]
    exclude_path_segments: frozenset[str]
    labels: dict[str, frozenset[str]]


@dataclass(frozen=True)
class ManagerConfig:
    schema_version: str
    config_path: Path
    config_sha256: str
    seed: int
    split_ratios: dict[SplitName, float]
    image_extensions: frozenset[str]
    max_image_bytes: int
    max_archive_members: int
    max_archive_uncompressed_bytes: int
    max_compression_ratio: float
    perceptual_hash_distance: int
    datasets: tuple[DatasetSpec, ...]


@dataclass
class SampleCandidate:
    crop_type: str
    original_label: str
    normalized_label: str
    source_dataset: str
    archive_path: Path
    archive_relative_path: str
    member_path: str
    extension: str
    sha256: str
    perceptual_hash: str
    split: SplitName | None
    group_id: str | None = None
    relative_path: str | None = None

    def manifest_record(self) -> dict[str, object]:
        if self.split is None or self.relative_path is None:
            raise ValueError("La muestra todavía no tiene split o ruta de salida")
        return {
            "cropType": self.crop_type,
            "originalLabel": self.original_label,
            "normalizedLabel": self.normalized_label,
            "sourceDataset": self.source_dataset,
            "split": self.split,
            "hash": self.sha256,
            "relativePath": self.relative_path,
            "groupId": self.group_id,
        }


@dataclass(frozen=True)
class Exclusion:
    source_dataset: str
    archive: str
    member: str | None
    reason: str
    detail: str | None = None

    def as_dict(self) -> dict[str, object]:
        return {
            "sourceDataset": self.source_dataset,
            "archive": self.archive,
            "member": self.member,
            "reason": self.reason,
            "detail": self.detail,
        }


@dataclass
class ScanResult:
    candidates: list[SampleCandidate] = field(default_factory=list)
    exclusions: list[Exclusion] = field(default_factory=list)
    archives: list[dict[str, object]] = field(default_factory=list)
    exact_duplicates: list[dict[str, object]] = field(default_factory=list)
    perceptual_duplicates: list[dict[str, object]] = field(default_factory=list)
