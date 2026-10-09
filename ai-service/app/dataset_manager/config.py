"""Carga y validación estricta de ``config/datasets.yaml``."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

import yaml

from .models import ArchiveSpec, DatasetSpec, LicenseSpec, ManagerConfig, SPLITS


class ConfigError(ValueError):
    """La configuración no cumple el contrato del Dataset Manager."""


def normalize_token(value: str) -> str:
    """Normaliza nombres de carpetas sin alterar las etiquetas registradas."""

    return re.sub(r"[^a-z0-9]+", "_", value.casefold()).strip("_")


def _mapping(value: object, context: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ConfigError(f"{context} debe ser un objeto YAML")
    return value


def _text(value: object, context: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ConfigError(f"{context} debe ser texto no vacío")
    return value.strip()


def _positive_int(value: object, context: str) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
        raise ConfigError(f"{context} debe ser un entero positivo")
    return value


def _string_list(value: object, context: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
        raise ConfigError(f"{context} debe ser una lista de textos no vacíos")
    return [item.strip() for item in value]


def load_config(path: Path, seed_override: int | None = None) -> ManagerConfig:
    """Carga el YAML y devuelve un contrato inmutable y validado."""

    raw_bytes = path.read_bytes()
    try:
        document = yaml.safe_load(raw_bytes)
    except yaml.YAMLError as exc:
        raise ConfigError(f"YAML inválido en {path}: {exc}") from exc

    root = _mapping(document, "raíz")
    schema_version = _text(root.get("schemaVersion"), "schemaVersion")
    if schema_version != "1.0":
        raise ConfigError(f"schemaVersion no soportado: {schema_version}")

    defaults = _mapping(root.get("defaults"), "defaults")
    seed = seed_override if seed_override is not None else _positive_int(defaults.get("seed"), "defaults.seed")
    if seed < 0:
        raise ConfigError("seed no puede ser negativo")

    ratios_raw = _mapping(defaults.get("splitRatios"), "defaults.splitRatios")
    ratios: dict[str, float] = {}
    for split in SPLITS:
        value = ratios_raw.get(split)
        if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
            raise ConfigError(f"splitRatios.{split} debe ser mayor que cero")
        ratios[split] = float(value)
    if abs(sum(ratios.values()) - 1.0) > 1e-9:
        raise ConfigError("splitRatios debe sumar exactamente 1.0")

    extensions = frozenset(extension.casefold() for extension in _string_list(
        defaults.get("imageExtensions"), "defaults.imageExtensions"
    ))
    if any(not extension.startswith(".") for extension in extensions):
        raise ConfigError("Cada imageExtension debe comenzar con punto")

    distance = defaults.get("perceptualHashDistance")
    if not isinstance(distance, int) or isinstance(distance, bool) or not 0 <= distance <= 16:
        raise ConfigError("perceptualHashDistance debe estar entre 0 y 16")
    compression_ratio = defaults.get("maxCompressionRatio")
    if (
        not isinstance(compression_ratio, (int, float))
        or isinstance(compression_ratio, bool)
        or compression_ratio <= 1
    ):
        raise ConfigError("maxCompressionRatio debe ser un número mayor que 1")

    datasets_raw = _mapping(root.get("datasets"), "datasets")
    datasets: list[DatasetSpec] = []
    crop_types: set[str] = set()
    for key, raw_spec in datasets_raw.items():
        if not isinstance(key, str) or not key.strip():
            raise ConfigError("Cada clave de dataset debe ser texto no vacío")
        spec = _mapping(raw_spec, f"datasets.{key}")
        crop_type = _text(spec.get("cropType"), f"datasets.{key}.cropType")
        crop_types.add(crop_type)
        split_strategy = _text(spec.get("splitStrategy"), f"datasets.{key}.splitStrategy")
        if split_strategy not in {"official", "stratified_grouped"}:
            raise ConfigError(f"Estrategia no soportada en {key}: {split_strategy}")

        archives_raw = spec.get("archives")
        if not isinstance(archives_raw, list) or not archives_raw:
            raise ConfigError(f"datasets.{key}.archives debe contener al menos un ZIP")
        archives: list[ArchiveSpec] = []
        for index, archive_value in enumerate(archives_raw):
            archive = _mapping(archive_value, f"datasets.{key}.archives[{index}]")
            archive_split = archive.get("split")
            if archive_split is not None and archive_split not in SPLITS:
                raise ConfigError(f"Split oficial inválido en datasets.{key}.archives[{index}]")
            archives.append(ArchiveSpec(
                path=_text(archive.get("path"), f"datasets.{key}.archives[{index}].path"),
                split=archive_split,
            ))
        if split_strategy == "official" and any(archive.split is None for archive in archives):
            raise ConfigError(f"Todos los archivos oficiales de {key} deben declarar split")

        labels_raw = _mapping(spec.get("labels"), f"datasets.{key}.labels")
        labels: dict[str, frozenset[str]] = {}
        used_aliases: set[str] = set()
        for normalized_label, aliases_value in labels_raw.items():
            normalized = _text(normalized_label, f"datasets.{key}.labels")
            if normalize_token(normalized) != normalized:
                raise ConfigError(f"Etiqueta normalizada inválida en {key}: {normalized}")
            aliases = _string_list(aliases_value, f"datasets.{key}.labels.{normalized}")
            normalized_aliases = frozenset(normalize_token(alias) for alias in aliases)
            overlap = used_aliases.intersection(normalized_aliases)
            if overlap:
                raise ConfigError(f"Alias repetido en {key}: {sorted(overlap)}")
            used_aliases.update(normalized_aliases)
            labels[normalized] = normalized_aliases

        license_raw = _mapping(spec.get("license"), f"datasets.{key}.license")
        verified = license_raw.get("verified")
        if not isinstance(verified, bool):
            raise ConfigError(f"datasets.{key}.license.verified debe ser booleano")

        datasets.append(DatasetSpec(
            key=key,
            crop_type=crop_type,
            source_dataset=_text(spec.get("sourceDataset"), f"datasets.{key}.sourceDataset"),
            source_name=_text(spec.get("sourceName"), f"datasets.{key}.sourceName"),
            source_url=_text(spec.get("sourceUrl"), f"datasets.{key}.sourceUrl"),
            attribution=_text(spec.get("attribution"), f"datasets.{key}.attribution"),
            license=LicenseSpec(
                name=_text(license_raw.get("name"), f"datasets.{key}.license.name"),
                url=_text(license_raw.get("url"), f"datasets.{key}.license.url"),
                verified=verified,
                note=_text(license_raw.get("note"), f"datasets.{key}.license.note"),
            ),
            split_strategy=split_strategy,
            archives=tuple(archives),
            include_path_segments=frozenset(normalize_token(item) for item in _string_list(
                spec.get("includePathSegments"), f"datasets.{key}.includePathSegments"
            )),
            exclude_path_segments=frozenset(normalize_token(item) for item in _string_list(
                spec.get("excludePathSegments"), f"datasets.{key}.excludePathSegments"
            )),
            labels=labels,
        ))

    expected_crops = {"CORN", "RED_BEAN", "ORANGE"}
    if crop_types != expected_crops:
        raise ConfigError(f"Dataset Manager v1 requiere exactamente {sorted(expected_crops)}")

    return ManagerConfig(
        schema_version=schema_version,
        config_path=path.resolve(),
        config_sha256=hashlib.sha256(raw_bytes).hexdigest(),
        seed=seed,
        split_ratios={split: ratios[split] for split in SPLITS},  # type: ignore[index]
        image_extensions=extensions,
        max_image_bytes=_positive_int(defaults.get("maxImageBytes"), "defaults.maxImageBytes"),
        max_archive_members=_positive_int(defaults.get("maxArchiveMembers"), "defaults.maxArchiveMembers"),
        max_archive_uncompressed_bytes=_positive_int(
            defaults.get("maxArchiveUncompressedBytes"), "defaults.maxArchiveUncompressedBytes"
        ),
        max_compression_ratio=float(compression_ratio),
        perceptual_hash_distance=distance,
        datasets=tuple(datasets),
    )
