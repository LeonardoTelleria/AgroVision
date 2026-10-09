import prisma from "../../../shared/database/prisma";
import type { EvidenceItem as PersistedEvidenceItem } from "../../../generated/prisma/client";
import type { EvidenceItem, EvidenceSource, EvidenceStatus } from "../types/evidenceTypes";
import type { ZoneInsight } from "../types/zoneInsightTypes";
import type { CropType } from "../../crops/types/cropProfileTypes";
import { formatFieldId } from "../../../shared/identifiers/entityIds";

export function toEvidenceItem(item: PersistedEvidenceItem): EvidenceItem {
  return {
    source: item.source as EvidenceSource,
    metric: item.metric,
    value: Number(item.value),
    unit: item.unit || null,
    status: item.status as EvidenceStatus,
    explanation: item.explanation ?? "Evidencia persistida sin explicación adicional.",
  };
}

export async function getEvidenceForZone(
  fieldId: number,
  zoneId: string,
): Promise<EvidenceItem[]> {
  const evidence = await prisma.evidenceItem.findMany({
    where: { fieldId, zoneId },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
  return evidence.map(toEvidenceItem);
}

export async function getZoneInsightByZoneId(zoneId: string): Promise<ZoneInsight | null> {
  const insight = await prisma.zoneInsight.findFirst({
    where: { zoneId },
    include: { crop: true, field: { include: { evidenceItems: { where: { zoneId }, orderBy: { id: "asc" } } } } },
    orderBy: { generatedAt: "desc" },
  });

  if (!insight) return null;

  return {
    id: String(insight.id),
    zoneId: insight.zoneId,
    fieldId: formatFieldId(insight.fieldId),
    cropType: insight.crop.cropType as CropType,
    finalRiskLevel: insight.finalRiskLevel,
    healthScore: Number(insight.healthScore),
    evidence: insight.field.evidenceItems.map(toEvidenceItem),
    mainCause: insight.mainCause ?? "Causa pendiente de validación técnica.",
    summary: insight.summary ?? "Análisis de zona disponible.",
    recommendedAction: insight.recommendedAction ?? "Mantener monitoreo de la zona.",
    generatedAt: insight.generatedAt.toISOString(),
  };
}

export async function getZoneInsightsByFieldId(fieldId?: number): Promise<ZoneInsight[]> {
  const insights = await prisma.zoneInsight.findMany({
    where: fieldId === undefined ? undefined : { fieldId },
    include: { crop: true, field: { include: { evidenceItems: true } } },
    orderBy: [{ generatedAt: "desc" }, { id: "asc" }],
  });

  return insights.map((insight) => ({
    id: String(insight.id),
    zoneId: insight.zoneId,
    fieldId: formatFieldId(insight.fieldId),
    cropType: insight.crop.cropType as CropType,
    finalRiskLevel: insight.finalRiskLevel,
    healthScore: Number(insight.healthScore),
    evidence: insight.field.evidenceItems
      .filter((item) => item.zoneId === insight.zoneId)
      .map(toEvidenceItem),
    mainCause: insight.mainCause ?? "Causa pendiente de validación técnica.",
    summary: insight.summary ?? "Análisis de zona disponible.",
    recommendedAction: insight.recommendedAction ?? "Mantener monitoreo de la zona.",
    generatedAt: insight.generatedAt.toISOString(),
  }));
}
