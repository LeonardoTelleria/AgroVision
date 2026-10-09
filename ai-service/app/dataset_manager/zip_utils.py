"""Validaciones de seguridad e integridad para archivos ZIP."""

from __future__ import annotations

import hashlib
import re
import stat
from pathlib import Path, PurePosixPath
from zipfile import BadZipFile, ZipFile, ZipInfo

from .models import ManagerConfig


class ArchiveValidationError(ValueError):
    """Un ZIP no puede procesarse de forma segura."""


def normalized_member_path(name: str) -> PurePosixPath:
    normalized = name.replace("\\", "/")
    if "\x00" in normalized:
        raise ArchiveValidationError("nombre con byte nulo")
    if normalized.startswith("/") or re.match(r"^[A-Za-z]:", normalized):
        raise ArchiveValidationError(f"ruta absoluta no permitida: {name}")
    path = PurePosixPath(normalized)
    if path.is_absolute() or ".." in path.parts:
        raise ArchiveValidationError(f"path traversal detectado: {name}")
    if not path.parts or all(part in {"", "."} for part in path.parts):
        raise ArchiveValidationError(f"ruta vacía o inválida: {name}")
    return path


def _is_symlink(info: ZipInfo) -> bool:
    unix_mode = info.external_attr >> 16
    return stat.S_ISLNK(unix_mode)


def validate_archive(zip_file: ZipFile, config: ManagerConfig) -> None:
    """Rechaza rutas inseguras, enlaces, cifrado y bombas ZIP obvias."""

    infos = zip_file.infolist()
    if len(infos) > config.max_archive_members:
        raise ArchiveValidationError(
            f"el ZIP contiene {len(infos)} entradas; máximo {config.max_archive_members}"
        )

    total_size = 0
    for info in infos:
        normalized_member_path(info.filename)
        if _is_symlink(info):
            raise ArchiveValidationError(f"enlace simbólico no permitido: {info.filename}")
        if info.flag_bits & 0x1:
            raise ArchiveValidationError(f"entrada cifrada no soportada: {info.filename}")
        total_size += info.file_size
        if not info.is_dir() and info.file_size > 0:
            ratio = info.file_size / max(info.compress_size, 1)
            if ratio > config.max_compression_ratio:
                raise ArchiveValidationError(
                    f"ratio de compresión sospechoso ({ratio:.1f}): {info.filename}"
                )
    if total_size > config.max_archive_uncompressed_bytes:
        raise ArchiveValidationError(
            f"tamaño descomprimido {total_size} supera {config.max_archive_uncompressed_bytes} bytes"
        )

    bad_member = zip_file.testzip()
    if bad_member is not None:
        raise ArchiveValidationError(f"CRC inválido en {bad_member}")


def archive_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def open_validated_archive(path: Path, config: ManagerConfig) -> ZipFile:
    try:
        archive = ZipFile(path, "r")
        validate_archive(archive, config)
        return archive
    except (BadZipFile, OSError, ArchiveValidationError):
        try:
            archive.close()  # type: ignore[possibly-undefined]
        except (NameError, OSError):
            pass
        raise
