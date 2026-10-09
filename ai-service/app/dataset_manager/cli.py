"""CLI reproducible para auditar y preparar Dataset Manager v1.0."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .config import ConfigError
from .manager import DatasetManager, ImmutableDatasetError


DEFAULT_CONFIG = Path("config/datasets.yaml")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.dataset_manager.cli")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG, help="Fuente única YAML")
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit = subparsers.add_parser("audit", help="Valida ZIP, imágenes, etiquetas y duplicados")
    audit.add_argument("--raw", type=Path, default=Path("data/raw"))
    audit.add_argument("--output", type=Path, default=Path("data/reports/audit.json"))
    audit.add_argument("--seed", type=int, default=None)

    prepare = subparsers.add_parser("prepare", help="Crea el dataset unificado e inmutable")
    prepare.add_argument("--raw", type=Path, default=Path("data/raw"))
    prepare.add_argument("--out", type=Path, default=Path("data/processed/v1"))
    prepare.add_argument("--report", type=Path, default=Path("data/reports/prepare.json"))
    prepare.add_argument("--seed", type=int, default=None)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        manager = DatasetManager(args.config, args.seed)
        if args.command == "audit":
            report = manager.audit(args.raw, args.output)
            report_path = args.output
        else:
            report = manager.prepare(args.raw, args.out, args.report)
            report_path = args.report
    except (ConfigError, ImmutableDatasetError, ValueError, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    summary = report["summary"]
    assert isinstance(summary, dict)
    print(f"OK: {args.command} completado")
    print(f"Muestras aceptadas: {summary['acceptedSamples']}")
    print(f"Descartadas: {summary['discarded']}")
    print(f"Reporte JSON: {report_path}")
    print(f"Resumen Markdown: {report_path.with_suffix('.md')}")
    missing = [
        archive["path"] for archive in report["archives"]
        if isinstance(archive, dict) and archive.get("status") == "missing"
    ]
    if missing:
        print("ZIP ausentes (omitidos): " + ", ".join(str(path) for path in missing))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
