
/**
 * AgroVision - Persisted Notebook Service
 *
 * Consulta exclusivamente registros almacenados
 * en PostgreSQL mediante Prisma.
 *
 * No modifica FieldNotebookService, utilizado
 * actualmente por otros módulos heredados.
 */

import prisma from "../../../shared/database/prisma";
import { formatFieldId } from "../../../shared/identifiers/entityIds";

import type { FieldNotebookEntry } from "../types/fieldNotebookTypes";
import type { FieldActivityType } from "../types/fieldActivityTypes";

export interface PersistedNotebookEntry
  extends FieldNotebookEntry {
  readonly cropType: string;
}

interface NotebookFilters {
  readonly fieldId?: number;
  readonly zoneId?: string;
}

export class PersistedNotebookService {
  /**
   * Consulta base para los endpoints del Notebook.
   *
   * Recupera las relaciones reales:
   * - Cultivo
   * - Usuario responsable
   */
  private static async findEntries(
    filters: NotebookFilters = {},
  ): Promise<PersistedNotebookEntry[]> {
    const entries = await prisma.fieldNotebookEntry.findMany({
      where: filters,
      include: {
        crop: {
          select: {
            cropType: true,
          },
        },
        responsibleUser: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    return entries.map((entry) => ({
      id: `notebook-${entry.id}`,
      fieldId: formatFieldId(entry.fieldId),
      zoneId: entry.zoneId,
      cropId: `crop-${entry.cropId}`,
      cropType: entry.crop.cropType,
      activityType:
        entry.activityType as FieldActivityType,
      description: entry.description ?? "",
      problemObserved: entry.problemObserved ?? "",
      actionTaken: entry.actionTaken ?? "",
      responsibleUser: entry.responsibleUser.fullName,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  /**
   * GET /api/field-notebook
   */
  public static async getAllEntries():
    Promise<PersistedNotebookEntry[]> {
    return this.findEntries();
  }

  /**
   * GET /api/field-notebook/zone/:zoneId
   */
  public static async getEntriesByZone(
    zoneId: string,
  ): Promise<PersistedNotebookEntry[]> {
    const normalizedZoneId = zoneId.trim();

    if (!normalizedZoneId) {
      throw new Error("INVALID_ZONE_ID");
    }

    return this.findEntries({
      zoneId: normalizedZoneId,
    });
  }

  /**
   * GET /api/field-notebook/field/:fieldId
   *
   * Acepta IDs como:
   * - 1
   * - field-001
   */
  public static async getEntriesByField(
    fieldId: string,
  ): Promise<PersistedNotebookEntry[]> {
    const normalized = fieldId.trim();

    if (!/^(?:field-)?[0-9]+$/.test(normalized)) {
      throw new Error("INVALID_FIELD_ID");
    }

    const id = Number(
      normalized.replace(/^field-/, ""),
    );

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("INVALID_FIELD_ID");
    }

    return this.findEntries({
      fieldId: id,
    });
  }
}
