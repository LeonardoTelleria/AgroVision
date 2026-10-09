"""Contrato portable de un artefacto TorchScript exportado."""

from __future__ import annotations

import hashlib
from pathlib import Path


EXPORT_SCHEMA_VERSION = "1.0"
REQUIRED_EXPORT_FIELDS = {
    "schemaVersion",
    "modelId",
    "modelVersion",
    "architecture",
    "cropType",
    "classNames",
    "datasetVersion",
    "format",
    "artifactPath",
    "preprocessing",
    "frameworkVersion",
    "checkpointChecksum",
    "artifactChecksum",
    "exportedAt",
}


class ExportContractError(ValueError):
    """El contrato de exportación no es consumible de forma segura."""


def validate_export_contract(payload: object, base_path: Path | None = None) -> dict[str, object]:
    if not isinstance(payload, dict):
        raise ExportContractError("El contrato debe ser un objeto")
    missing = REQUIRED_EXPORT_FIELDS.difference(payload)
    if missing:
        raise ExportContractError(f"Contrato incompleto: {sorted(missing)}")
    if payload["schemaVersion"] != EXPORT_SCHEMA_VERSION:
        raise ExportContractError("schemaVersion de exportación no soportado")
    if payload["format"] != "torchscript":
        raise ExportContractError("Training Engine v1 solo exporta torchscript")
    for field in (
        "modelId", "modelVersion", "architecture", "cropType", "datasetVersion",
        "artifactPath", "checkpointChecksum", "artifactChecksum", "exportedAt",
    ):
        if not isinstance(payload[field], str) or not payload[field]:
            raise ExportContractError(f"{field} inválido")
    class_names = payload["classNames"]
    if not isinstance(class_names, list) or not class_names or len(class_names) != len(set(class_names)):
        raise ExportContractError("classNames inválido")
    if not isinstance(payload["preprocessing"], dict) or not isinstance(payload["frameworkVersion"], dict):
        raise ExportContractError("preprocessing/frameworkVersion inválido")
    for checksum_field in ("checkpointChecksum", "artifactChecksum"):
        checksum = payload[checksum_field]
        if len(checksum) != 64 or any(character not in "0123456789abcdef" for character in checksum.casefold()):
            raise ExportContractError(f"{checksum_field} no es SHA256")
    if base_path is not None:
        artifact = (base_path.resolve() / str(payload["artifactPath"])).resolve()
        if base_path.resolve() not in artifact.parents or not artifact.is_file():
            raise ExportContractError(f"Artefacto inexistente o fuera del directorio: {artifact}")
        actual_checksum = hashlib.sha256(artifact.read_bytes()).hexdigest()
        if actual_checksum != payload["artifactChecksum"]:
            raise ExportContractError("El checksum del artefacto no coincide con el contrato")
    return payload
