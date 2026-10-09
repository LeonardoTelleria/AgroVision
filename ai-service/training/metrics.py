"""Métricas deterministas sin dependencia de scikit-learn."""

from __future__ import annotations

import math
from statistics import mean
from typing import Sequence


def classification_metrics(
    targets: Sequence[int], predictions: Sequence[int], class_names: Sequence[str]
) -> dict[str, object]:
    if len(targets) != len(predictions):
        raise ValueError("targets y predictions deben tener igual longitud")
    if not targets:
        raise ValueError("No se pueden calcular métricas sin muestras")
    class_total = len(class_names)
    if class_total < 2 or len(set(class_names)) != class_total:
        raise ValueError("classNames debe contener al menos dos clases únicas")
    matrix = [[0 for _ in range(class_total)] for _ in range(class_total)]
    for target, prediction in zip(targets, predictions, strict=True):
        if not 0 <= target < class_total or not 0 <= prediction < class_total:
            raise ValueError("Índice de clase fuera de rango")
        matrix[target][prediction] += 1

    per_class: dict[str, dict[str, float | int]] = {}
    precisions: list[float] = []
    recalls: list[float] = []
    f1_scores: list[float] = []
    for index, class_name in enumerate(class_names):
        true_positive = matrix[index][index]
        false_positive = sum(matrix[row][index] for row in range(class_total) if row != index)
        false_negative = sum(matrix[index][column] for column in range(class_total) if column != index)
        support = sum(matrix[index])
        precision = _safe_divide(true_positive, true_positive + false_positive)
        recall = _safe_divide(true_positive, true_positive + false_negative)
        f1 = _safe_divide(2 * precision * recall, precision + recall)
        precisions.append(precision)
        recalls.append(recall)
        f1_scores.append(f1)
        per_class[class_name] = {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "support": support,
        }

    correct = sum(matrix[index][index] for index in range(class_total))
    return {
        "sampleCount": len(targets),
        "accuracy": correct / len(targets),
        "macroPrecision": mean(precisions),
        "macroRecall": mean(recalls),
        "macroF1": mean(f1_scores),
        "f1ByClass": {name: metrics["f1"] for name, metrics in per_class.items()},
        "perClass": per_class,
        "confusionMatrix": matrix,
    }


def latency_metrics(milliseconds: Sequence[float]) -> dict[str, float | int]:
    if not milliseconds or any(value < 0 or not math.isfinite(value) for value in milliseconds):
        raise ValueError("Las latencias deben ser números finitos no negativos")
    ordered = sorted(milliseconds)
    return {
        "samples": len(ordered),
        "meanMs": mean(ordered),
        "p50Ms": _percentile(ordered, 0.50),
        "p95Ms": _percentile(ordered, 0.95),
        "minMs": ordered[0],
        "maxMs": ordered[-1],
    }


def _safe_divide(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def _percentile(ordered: Sequence[float], percentile: float) -> float:
    position = (len(ordered) - 1) * percentile
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight
