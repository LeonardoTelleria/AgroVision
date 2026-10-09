"""Carga diferida de PyTorch y utilidades reproducibles de ejecución."""

from __future__ import annotations

import json
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class TrainingDependencyError(RuntimeError):
    """PyTorch/Torchvision no están disponibles en el entorno de entrenamiento."""


def require_training_dependencies() -> tuple[Any, Any]:
    try:
        import torch
        import torchvision
    except ImportError as exc:
        raise TrainingDependencyError(
            "Training Engine requiere torch==2.13.0 y torchvision==0.28.0. "
            "Consulta docs/ai/TRAINING_GUIDE.md; no los instales en el runtime API si no entrenarás."
        ) from exc
    return torch, torchvision


def select_device(torch_module: Any, requested: str) -> Any:
    normalized = requested.casefold()
    if normalized not in {"auto", "cpu", "cuda"}:
        raise ValueError("device debe ser auto, cpu o cuda")
    if normalized == "cuda" and not torch_module.cuda.is_available():
        raise RuntimeError("CUDA fue solicitado pero torch.cuda.is_available() es False")
    selected = "cuda" if normalized == "cuda" or (
        normalized == "auto" and torch_module.cuda.is_available()
    ) else "cpu"
    return torch_module.device(selected)


def seed_everything(torch_module: Any, seed: int) -> None:
    random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    torch_module.manual_seed(seed)
    if torch_module.cuda.is_available():
        torch_module.cuda.manual_seed_all(seed)
    if hasattr(torch_module.backends, "cudnn"):
        torch_module.backends.cudnn.deterministic = True
        torch_module.backends.cudnn.benchmark = False
    if hasattr(torch_module, "use_deterministic_algorithms"):
        torch_module.use_deterministic_algorithms(True, warn_only=True)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json_atomic(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(temporary, path)
