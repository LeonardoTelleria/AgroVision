"""EfficientNet-B0, transformaciones ImageNet y congelación progresiva."""

from __future__ import annotations

from typing import Any

from .config import ModelSettings
from .runtime import require_training_dependencies


def build_efficientnet_b0(num_classes: int, pretrained: bool) -> tuple[Any, Any, Any]:
    if num_classes < 2:
        raise ValueError("EfficientNet requiere al menos dos clases")
    torch, torchvision = require_training_dependencies()
    weights_enum = torchvision.models.EfficientNet_B0_Weights.IMAGENET1K_V1
    model = torchvision.models.efficientnet_b0(weights=weights_enum if pretrained else None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = torch.nn.Linear(in_features, num_classes)
    return model, weights_enum, torch


def build_transforms(model: ModelSettings) -> tuple[Any, Any]:
    _, torchvision = require_training_dependencies()
    transforms = torchvision.transforms
    interpolation = transforms.InterpolationMode.BICUBIC
    train_transform = transforms.Compose([
        transforms.RandomResizedCrop(
            model.input_size, scale=(0.75, 1.0), interpolation=interpolation
        ),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(12, interpolation=interpolation),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.10, hue=0.02),
        transforms.ToTensor(),
        transforms.Normalize(mean=model.mean, std=model.std),
    ])
    evaluation_transform = transforms.Compose([
        transforms.Resize(model.resize_size, interpolation=interpolation),
        transforms.CenterCrop(model.input_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=model.mean, std=model.std),
    ])
    return train_transform, evaluation_transform


def freeze_feature_extractor(model: Any) -> None:
    for parameter in model.features.parameters():
        parameter.requires_grad = False
    for parameter in model.classifier.parameters():
        parameter.requires_grad = True


def unfreeze_last_feature_blocks(model: Any, block_count: int) -> None:
    if block_count < 1 or block_count > len(model.features):
        raise ValueError(f"block_count debe estar entre 1 y {len(model.features)}")
    for parameter in model.features.parameters():
        parameter.requires_grad = False
    for block in list(model.features.children())[-block_count:]:
        for parameter in block.parameters():
            parameter.requires_grad = True
    for parameter in model.classifier.parameters():
        parameter.requires_grad = True
