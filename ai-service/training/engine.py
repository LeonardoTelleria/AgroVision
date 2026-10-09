"""Primitivas compartidas por entrenamiento y evaluación."""

from __future__ import annotations

import random
import time
from dataclasses import dataclass
from typing import Any, Iterable

from .dataset_loader import ManifestDataset, ManifestRecord, balanced_class_weights, class_counts
from .metrics import classification_metrics, latency_metrics


@dataclass
class EarlyStopping:
    patience: int
    best_score: float = -1.0
    bad_epochs: int = 0

    def update(self, score: float) -> tuple[bool, bool]:
        if not 0 <= score <= 1:
            raise ValueError("El score de early stopping debe estar entre 0 y 1")
        improved = score > self.best_score
        if improved:
            self.best_score = score
            self.bad_epochs = 0
        else:
            self.bad_epochs += 1
        return improved, self.bad_epochs >= self.patience

    def state_dict(self) -> dict[str, object]:
        return {
            "patience": self.patience,
            "bestScore": self.best_score,
            "badEpochs": self.bad_epochs,
        }

    def load_state_dict(self, payload: object) -> None:
        if not isinstance(payload, dict):
            raise ValueError("Estado de early stopping inválido")
        patience = payload.get("patience")
        best_score = payload.get("bestScore")
        bad_epochs = payload.get("badEpochs")
        if (
            not isinstance(patience, int)
            or not isinstance(best_score, (int, float))
            or not isinstance(bad_epochs, int)
        ):
            raise ValueError("Estado de early stopping incompleto")
        self.patience = patience
        self.best_score = float(best_score)
        self.bad_epochs = bad_epochs


def seed_worker(_: int) -> None:
    import torch

    worker_seed = torch.initial_seed() % (2**32)
    random.seed(worker_seed)


def build_data_loader(
    *,
    torch_module: Any,
    records: list[ManifestRecord],
    class_names: tuple[str, ...],
    transform: Any,
    batch_size: int,
    num_workers: int,
    seed: int,
    shuffle: bool,
    pin_memory: bool,
    generator: Any | None = None,
) -> Any:
    dataset = ManifestDataset(records, class_names, transform)
    if generator is None:
        generator = torch_module.Generator()
        generator.manual_seed(seed)
    return torch_module.utils.data.DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=num_workers > 0,
        worker_init_fn=seed_worker,
        generator=generator,
    )


def build_loss(
    torch_module: Any,
    records: Iterable[ManifestRecord],
    class_names: tuple[str, ...],
    device: Any,
    class_weighting: str,
    label_smoothing: float,
) -> Any:
    weights = None
    if class_weighting == "auto":
        values = balanced_class_weights(class_counts(records, class_names))
        weights = torch_module.tensor(values, dtype=torch_module.float32, device=device)
    return torch_module.nn.CrossEntropyLoss(weight=weights, label_smoothing=label_smoothing)


def run_epoch(
    *,
    torch_module: Any,
    model: Any,
    data_loader: Any,
    criterion: Any,
    device: Any,
    class_names: tuple[str, ...],
    optimizer: Any | None = None,
    scaler: Any | None = None,
    mixed_precision: bool = False,
) -> dict[str, object]:
    training = optimizer is not None
    model.train(training)
    total_loss = 0.0
    total_samples = 0
    targets: list[int] = []
    predictions: list[int] = []
    gradient_context = torch_module.enable_grad if training else torch_module.no_grad
    with gradient_context():
        for images, labels in data_loader:
            images = images.to(device, non_blocking=device.type == "cuda")
            labels = labels.to(device, non_blocking=device.type == "cuda")
            if training:
                optimizer.zero_grad(set_to_none=True)
            with torch_module.amp.autocast(
                device_type=device.type,
                enabled=mixed_precision,
            ):
                logits = model(images)
                loss = criterion(logits, labels)
            if training:
                if scaler is not None and mixed_precision:
                    scaler.scale(loss).backward()
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    loss.backward()
                    optimizer.step()
            batch_size = labels.shape[0]
            total_loss += float(loss.detach().item()) * batch_size
            total_samples += batch_size
            targets.extend(labels.detach().cpu().tolist())
            predictions.extend(logits.detach().argmax(dim=1).cpu().tolist())
    metrics = classification_metrics(targets, predictions, class_names)
    metrics["loss"] = total_loss / max(total_samples, 1)
    return metrics


def measure_model_latency(
    *,
    torch_module: Any,
    model: Any,
    sample: Any,
    device: Any,
    warmup_runs: int = 10,
    measured_runs: int = 50,
) -> dict[str, float | int]:
    if warmup_runs < 0 or measured_runs < 1:
        raise ValueError("Configuración de latencia inválida")
    model.eval()
    sample = sample[:1].to(device)
    with torch_module.no_grad():
        for _ in range(warmup_runs):
            model(sample)
        _synchronize(torch_module, device)
        measurements: list[float] = []
        for _ in range(measured_runs):
            started = time.perf_counter()
            model(sample)
            _synchronize(torch_module, device)
            measurements.append((time.perf_counter() - started) * 1000)
    return latency_metrics(measurements)


def _synchronize(torch_module: Any, device: Any) -> None:
    if device.type == "cuda":
        torch_module.cuda.synchronize(device)
