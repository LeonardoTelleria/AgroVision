"""Partición determinista y agrupada para impedir data leakage."""

from __future__ import annotations

import hashlib
from collections import Counter, defaultdict
from dataclasses import dataclass

from .models import SPLITS, SampleCandidate, SplitName


@dataclass
class _DisjointSet:
    parent: list[int]

    @classmethod
    def create(cls, size: int) -> "_DisjointSet":
        return cls(list(range(size)))

    def find(self, value: int) -> int:
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left: int, right: int) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root != right_root:
            self.parent[right_root] = left_root


class _BKNode:
    def __init__(self, value: int, index: int) -> None:
        self.value = value
        self.indices = [index]
        self.children: dict[int, _BKNode] = {}

    def add(self, value: int, index: int) -> None:
        distance = (self.value ^ value).bit_count()
        if distance == 0:
            self.indices.append(index)
            return
        child = self.children.get(distance)
        if child is None:
            self.children[distance] = _BKNode(value, index)
        else:
            child.add(value, index)

    def search(self, value: int, threshold: int, output: list[int]) -> None:
        distance = (self.value ^ value).bit_count()
        if distance <= threshold:
            output.extend(self.indices)
        lower = max(1, distance - threshold)
        upper = distance + threshold
        for edge, child in self.children.items():
            if lower <= edge <= upper:
                child.search(value, threshold, output)


def perceptual_groups(
    samples: list[SampleCandidate], threshold: int
) -> tuple[list[list[int]], list[dict[str, object]]]:
    """Agrupa candidatos visualmente cercanos dentro de la misma clase agronómica."""

    dsu = _DisjointSet.create(len(samples))
    trees: dict[tuple[str, str], _BKNode] = {}
    for index, sample in enumerate(samples):
        key = (sample.crop_type, sample.normalized_label)
        value = int(sample.perceptual_hash, 16)
        tree = trees.get(key)
        if tree is None:
            trees[key] = _BKNode(value, index)
            continue
        neighbors: list[int] = []
        tree.search(value, threshold, neighbors)
        for neighbor in neighbors:
            if samples[neighbor].sha256 != sample.sha256:
                dsu.union(index, neighbor)
        tree.add(value, index)

    grouped: dict[int, list[int]] = defaultdict(list)
    for index in range(len(samples)):
        grouped[dsu.find(index)].append(index)
    clusters = [indices for indices in grouped.values() if len(indices) > 1]
    report = [
        {
            "cropType": samples[indices[0]].crop_type,
            "normalizedLabel": samples[indices[0]].normalized_label,
            "members": [
                {
                    "hash": samples[index].sha256,
                    "perceptualHash": samples[index].perceptual_hash,
                    "archive": samples[index].archive_relative_path,
                    "member": samples[index].member_path,
                }
                for index in indices
            ],
        }
        for indices in clusters
    ]
    return clusters, report


def apply_leakage_groups(samples: list[SampleCandidate], perceptual_clusters: list[list[int]]) -> None:
    """Combina groupId explícito y duplicados perceptuales en una agrupación estable."""

    dsu = _DisjointSet.create(len(samples))
    by_group: dict[tuple[str, str], int] = {}
    for index, sample in enumerate(samples):
        if sample.group_id:
            key = (sample.source_dataset, sample.group_id)
            previous = by_group.setdefault(key, index)
            dsu.union(index, previous)
    for cluster in perceptual_clusters:
        for index in cluster[1:]:
            dsu.union(cluster[0], index)

    grouped: dict[int, list[int]] = defaultdict(list)
    for index in range(len(samples)):
        grouped[dsu.find(index)].append(index)
    for indices in grouped.values():
        if len(indices) == 1 and samples[indices[0]].group_id is None:
            continue
        explicit_ids = sorted({samples[index].group_id for index in indices if samples[index].group_id})
        stable_material = "|".join(explicit_ids + sorted(samples[index].sha256 for index in indices))
        stable_id = f"group:{hashlib.sha256(stable_material.encode('utf-8')).hexdigest()[:20]}"
        for index in indices:
            samples[index].group_id = stable_id


def assign_stratified_grouped_splits(
    samples: list[SampleCandidate], ratios: dict[SplitName, float], seed: int
) -> None:
    """Asigna grupos completos minimizando el desvío por clase respecto de 70/15/15."""

    pending = [sample for sample in samples if sample.split is None]
    groups: dict[str, list[SampleCandidate]] = defaultdict(list)
    for sample in pending:
        key = sample.group_id or f"sample:{sample.sha256}"
        groups[key].append(sample)

    totals = Counter(sample.normalized_label for sample in pending)
    targets = {
        split: {label: total * ratios[split] for label, total in totals.items()}
        for split in SPLITS
    }
    assigned = {split: Counter() for split in SPLITS}

    def stable_tie(group_key: str) -> str:
        return hashlib.sha256(f"{seed}:{group_key}".encode("utf-8")).hexdigest()

    ordered_groups = sorted(
        groups.items(),
        key=lambda item: (-len(item[1]), stable_tie(item[0])),
    )
    for _, members in ordered_groups:
        group_counts = Counter(member.normalized_label for member in members)

        def score(split: SplitName) -> tuple[float, int]:
            delta = 0.0
            for label, target in targets[split].items():
                before = assigned[split][label] - target
                after = assigned[split][label] + group_counts[label] - target
                delta += (after * after - before * before) / max(target, 1.0)
            return delta, SPLITS.index(split)

        selected = min(SPLITS, key=score)
        for member in members:
            member.split = selected
        assigned[selected].update(group_counts)


def assert_no_leakage(samples: list[SampleCandidate]) -> None:
    """Falla si un hash exacto o groupId aparece en más de un split."""

    hash_splits: dict[str, set[SplitName | None]] = defaultdict(set)
    group_splits: dict[str, set[SplitName | None]] = defaultdict(set)
    for sample in samples:
        hash_splits[sample.sha256].add(sample.split)
        if sample.group_id:
            group_splits[sample.group_id].add(sample.split)
    leaking_hashes = [key for key, splits in hash_splits.items() if len(splits) > 1]
    leaking_groups = [key for key, splits in group_splits.items() if len(splits) > 1]
    if leaking_hashes or leaking_groups:
        raise ValueError(
            f"Data leakage detectado: hashes={len(leaking_hashes)}, grupos={len(leaking_groups)}"
        )
