"""Lectura estricta de manifiestos e imágenes para futuros DataLoaders."""

from __future__ import annotations

import hashlib
import json
import random
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Sequence

from PIL import Image


VALID_SPLITS = ("train", "validation", "test")


class DatasetContractError(ValueError):
    """El manifiesto o una muestra no cumple el contrato de entrenamiento."""


@dataclass(frozen=True)
class ManifestRecord:
    crop_type: str
    original_label: str
    normalized_label: str
    source: str
    split: str
    sha256: str
    image_path: Path
    relative_path: str
    group_id: str | None


def _required_text(payload: dict[str, object], names: tuple[str, ...], context: str) -> str:
    for name in names:
        value = payload.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    raise DatasetContractError(f"Falta {names[0]} válido en {context}")


def load_manifest_records(
    dataset_root: Path,
    manifest_name: str,
    crop_type: str,
    split: str,
    class_names: Sequence[str],
    verify_hashes: bool = False,
) -> list[ManifestRecord]:
    """Carga solo un cultivo/split y acepta los nombres v1 documentados y sus aliases."""

    if split not in VALID_SPLITS:
        raise DatasetContractError(f"Split inválido: {split}")
    root = dataset_root.resolve()
    manifest_path = (root / manifest_name).resolve()
    if root not in manifest_path.parents or not manifest_path.is_file():
        raise DatasetContractError(f"Manifiesto no encontrado dentro del dataset: {manifest_path}")
    expected_classes = set(class_names)
    if len(expected_classes) != len(class_names) or not class_names:
        raise DatasetContractError("classNames debe ser único y no vacío")

    records: list[ManifestRecord] = []
    with manifest_path.open("r", encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            context = f"{manifest_path}:{line_number}"
            try:
                payload = json.loads(line)
            except json.JSONDecodeError as exc:
                raise DatasetContractError(f"JSON inválido en {context}: {exc}") from exc
            if not isinstance(payload, dict):
                raise DatasetContractError(f"Registro no-objeto en {context}")
            record_crop = _required_text(payload, ("cropType",), context)
            record_split = _required_text(payload, ("split",), context)
            if record_crop != crop_type or record_split != split:
                continue
            label = _required_text(payload, ("normalizedLabel",), context)
            if label not in expected_classes:
                raise DatasetContractError(
                    f"Etiqueta {label!r} no configurada para {crop_type} en {context}"
                )
            relative_path = _required_text(payload, ("relativePath", "imagePath"), context)
            image_path = (root / Path(*Path(relative_path).parts)).resolve()
            if root not in image_path.parents:
                raise DatasetContractError(f"imagePath sale del dataset en {context}")
            if not image_path.is_file():
                raise DatasetContractError(f"Imagen inexistente: {image_path}")
            digest = _required_text(payload, ("hash", "sha256"), context).casefold()
            if len(digest) != 64 or any(character not in "0123456789abcdef" for character in digest):
                raise DatasetContractError(f"SHA256 inválido en {context}")
            if verify_hashes and file_sha256(image_path) != digest:
                raise DatasetContractError(f"SHA256 no coincide: {image_path}")
            group_id = payload.get("groupId")
            if group_id is not None and not isinstance(group_id, str):
                raise DatasetContractError(f"groupId inválido en {context}")
            records.append(ManifestRecord(
                crop_type=record_crop,
                original_label=_required_text(payload, ("originalLabel",), context),
                normalized_label=label,
                source=_required_text(payload, ("sourceDataset", "source"), context),
                split=record_split,
                sha256=digest,
                image_path=image_path,
                relative_path=relative_path.replace("\\", "/"),
                group_id=group_id,
            ))
    if not records:
        raise DatasetContractError(
            f"No hay muestras para cropType={crop_type}, split={split}. "
            "Ejecuta Dataset Manager o instala los ZIP faltantes."
        )
    records.sort(key=lambda record: (record.normalized_label, record.sha256, record.relative_path))
    return records


class ManifestDataset:
    """Dataset compatible con torch.utils.data.DataLoader sin importar Torch al cargar el módulo."""

    def __init__(
        self,
        records: Sequence[ManifestRecord],
        class_names: Sequence[str],
        transform: Callable[[Image.Image], object] | None = None,
    ) -> None:
        self.records = tuple(records)
        self.class_names = tuple(class_names)
        self.class_to_index = {name: index for index, name in enumerate(self.class_names)}
        if len(self.class_to_index) != len(self.class_names):
            raise DatasetContractError("classNames contiene duplicados")
        self.transform = transform
        for record in self.records:
            if record.normalized_label not in self.class_to_index:
                raise DatasetContractError(f"Etiqueta fuera del mapping: {record.normalized_label}")

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int) -> tuple[object, int]:
        record = self.records[index]
        with Image.open(record.image_path) as source:
            image = source.convert("RGB")
        transformed = self.transform(image) if self.transform else image
        return transformed, self.class_to_index[record.normalized_label]


def class_counts(records: Iterable[ManifestRecord], class_names: Sequence[str]) -> list[int]:
    counts = Counter(record.normalized_label for record in records)
    return [counts.get(class_name, 0) for class_name in class_names]


def balanced_class_weights(counts: Sequence[int]) -> list[float]:
    if not counts or any(count <= 0 for count in counts):
        raise DatasetContractError("Cada clase necesita al menos una muestra para calcular pesos")
    total = sum(counts)
    class_total = len(counts)
    return [total / (class_total * count) for count in counts]


def deterministic_order(records: Sequence[ManifestRecord], seed: int) -> list[int]:
    indices = list(range(len(records)))
    random.Random(seed).shuffle(indices)
    return indices


def assert_manifest_no_leakage(records: Iterable[ManifestRecord]) -> None:
    hash_splits: dict[str, set[str]] = defaultdict(set)
    group_splits: dict[str, set[str]] = defaultdict(set)
    for record in records:
        hash_splits[record.sha256].add(record.split)
        if record.group_id:
            group_splits[record.group_id].add(record.split)
    leaking_hashes = [value for value, splits in hash_splits.items() if len(splits) > 1]
    leaking_groups = [value for value, splits in group_splits.items() if len(splits) > 1]
    if leaking_hashes or leaking_groups:
        raise DatasetContractError(
            f"Data leakage: hashes={len(leaking_hashes)}, groups={len(leaking_groups)}"
        )


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
