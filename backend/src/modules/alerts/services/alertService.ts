
/**
 * AgroVision - Alert Service
 *
 * Lee alertas y evidencias persistidas en PostgreSQL.
 * Mantiene el contrato AgriculturalAlert del sistema.
 */

import prisma from "../../../shared/database/prisma";
import type {
  AgriculturalAlert,
  AlertType,
} from "../types/alertsTypes";
import type { EvidenceItem } from "../../analysis/types/evidenceTypes";
import { formatFieldId } from "../../../shared/identifiers/entityIds";

const VALID_ALERT_TYPES: readonly AlertType[] = [
  "WATER_STRESS",
  "FUNGAL_RISK",
  "LOW_VIGOR",
  "VISUAL_ANOMALY",
  "HEAT_STRESS",
  "SYSTEM",
];

function normalizeAlertType(value: string): AlertType {
  return VALID_ALERT_TYPES.includes(value as AlertType)
    ? (value as AlertType)
    : "SYSTEM";
}

export class AlertService {
  /**
   * GET /api/alerts
   *
   * Recupera registros de la tabla alerts.
   * La evidencia procede de evidence_items,
   * asociada por fieldId y zoneId.
   */
  public static async getAllAlerts(): Promise<AgriculturalAlert[]> {
    const alerts = await prisma.alert.findMany({
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    if (alerts.length === 0) {
      return [];
    }

    const pairs = Array.from(
      new Map(
        alerts.map((alert) => [
          `${alert.fieldId}:${alert.zoneId}`,
          {
            fieldId: alert.fieldId,
            zoneId: alert.zoneId,
          },
        ]),
      ).values(),
    );

    const persistedEvidence = await prisma.evidenceItem.findMany({
      where: {
        OR: pairs,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const evidenceByZone = new Map<string, EvidenceItem[]>();

    for (const item of persistedEvidence) {
      const key = `${item.fieldId}:${item.zoneId}`;

      const evidence: EvidenceItem = {
        source: item.source as EvidenceItem["source"],
        metric: item.metric,
        value: Number(item.value),
        unit: item.unit || null,
        status: item.status as EvidenceItem["status"],
        explanation:
          item.explanation ?? "Sin explicación registrada.",
      };

      const current = evidenceByZone.get(key) ?? [];
      current.push(evidence);
      evidenceByZone.set(key, current);
    }

    return alerts.map((alert): AgriculturalAlert => {
      const key = `${alert.fieldId}:${alert.zoneId}`;

      return {
        id: `alert-${alert.id}`,
        fieldId: formatFieldId(alert.fieldId),
        zoneId: alert.zoneId,
        type: normalizeAlertType(alert.type),
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        evidence: evidenceByZone.get(key) ?? [],
        recommendedAction:
          alert.recommendedAction ??
          "Sin acción recomendada registrada.",
        status:
          alert.status === "DISMISSED"
            ? "IGNORED"
            : alert.status,
        createdAt: alert.createdAt.toISOString(),
        resolvedAt: alert.resolvedAt?.toISOString() ?? null,
      };
    });
  }

  /**
   * Filtrado por zona, compatible con consumidores futuros.
   */
  public static async getAlertsByZone(
    zoneId: string,
  ): Promise<AgriculturalAlert[]> {
    const alerts = await this.getAllAlerts();
    return alerts.filter((alert) => alert.zoneId === zoneId);
  }

  /**
   * Recupera alertas activas de severidad alta o crítica.
   */
  public static async getCriticalAlerts(): Promise<AgriculturalAlert[]> {
    const alerts = await this.getAllAlerts();

    return alerts.filter(
      (alert) =>
        alert.status === "ACTIVE" &&
        (alert.severity === "HIGH" ||
          alert.severity === "CRITICAL"),
    );
  }
}
