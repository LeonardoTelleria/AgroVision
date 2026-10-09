"""Reportes JSON y Markdown del Dataset Manager."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from .models import ManagerConfig, SPLITS, SampleCandidate, ScanResult


def build_report(
    command: str,
    config: ManagerConfig,
    raw_root: Path,
    result: ScanResult,
    processed_root: Path | None = None,
    output_reused: bool = False,
) -> dict[str, object]:
    nested: dict[str, dict[str, Counter[str]]] = defaultdict(lambda: defaultdict(Counter))
    for sample in result.candidates:
        nested[sample.crop_type][sample.normalized_label][sample.split or "unassigned"] += 1

    counts = {
        crop: {
            label: {split: values.get(split, 0) for split in SPLITS}
            for label, values in sorted(labels.items())
        }
        for crop, labels in sorted(nested.items())
    }
    exclusion_counts = Counter(exclusion.reason for exclusion in result.exclusions)
    provenance = [
        {
            "cropType": dataset.crop_type,
            "sourceDataset": dataset.source_dataset,
            "sourceName": dataset.source_name,
            "sourceUrl": dataset.source_url,
            "attribution": dataset.attribution,
            "license": {
                "name": dataset.license.name,
                "url": dataset.license.url,
                "verified": dataset.license.verified,
                "note": dataset.license.note,
            },
        }
        for dataset in config.datasets
    ]
    return {
        "schemaVersion": config.schema_version,
        "command": command,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "seed": config.seed,
        "configPath": config.config_path.as_posix(),
        "configSha256": config.config_sha256,
        "rawRoot": raw_root.resolve().as_posix(),
        "processedRoot": processed_root.resolve().as_posix() if processed_root else None,
        "outputReused": output_reused,
        "summary": {
            "acceptedSamples": len(result.candidates),
            "counts": counts,
            "corruptImages": exclusion_counts.get("corrupt_image", 0),
            "discarded": len(result.exclusions),
            "exactDuplicateGroups": len(result.exact_duplicates),
            "perceptualDuplicateGroups": len(result.perceptual_duplicates),
            "exclusionsByReason": dict(sorted(exclusion_counts.items())),
        },
        "archives": result.archives,
        "provenance": provenance,
        "exactDuplicates": result.exact_duplicates,
        "perceptualDuplicates": result.perceptual_duplicates,
        "exclusions": [exclusion.as_dict() for exclusion in result.exclusions],
    }


def write_report(report: dict[str, object], json_path: Path) -> tuple[Path, Path]:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path = json_path.with_suffix(".md")
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    markdown_path.write_text(_markdown_summary(report), encoding="utf-8")
    return json_path, markdown_path


def _markdown_summary(report: dict[str, object]) -> str:
    summary = report["summary"]
    assert isinstance(summary, dict)
    counts = summary["counts"]
    assert isinstance(counts, dict)
    lines = [
        "# Dataset Manager report",
        "",
        f"- Command: `{report['command']}`",
        f"- Seed: `{report['seed']}`",
        f"- Accepted samples: **{summary['acceptedSamples']}**",
        f"- Corrupt images: **{summary['corruptImages']}**",
        f"- Discarded entries: **{summary['discarded']}**",
        f"- Exact duplicate groups: **{summary['exactDuplicateGroups']}**",
        f"- Perceptual duplicate groups: **{summary['perceptualDuplicateGroups']}**",
        "",
        "## Samples by crop, class and split",
        "",
        "| Crop | Class | Train | Validation | Test |",
        "|---|---|---:|---:|---:|",
    ]
    for crop, labels_value in counts.items():
        assert isinstance(labels_value, dict)
        for label, split_counts_value in labels_value.items():
            assert isinstance(split_counts_value, dict)
            lines.append(
                f"| {crop} | {label} | {split_counts_value.get('train', 0)} | "
                f"{split_counts_value.get('validation', 0)} | {split_counts_value.get('test', 0)} |"
            )

    lines.extend(["", "## Archives", ""])
    archives = report["archives"]
    assert isinstance(archives, list)
    for archive in archives:
        assert isinstance(archive, dict)
        lines.append(
            f"- `{archive['path']}` — **{archive['status']}**"
            + (f": {archive['message']}" if archive.get("message") else "")
        )

    lines.extend(["", "## Exclusions", ""])
    exclusions = summary["exclusionsByReason"]
    assert isinstance(exclusions, dict)
    if exclusions:
        for reason, count in exclusions.items():
            lines.append(f"- `{reason}`: {count}")
    else:
        lines.append("- None")
    lines.append("")
    return "\n".join(lines)
