
/**
 * AgroVision - Field Notebook Controller
 *
 * Endpoints de solo lectura.
 * Recuperan registros persistidos desde Prisma.
 *
 * Las rutas originales permanecen intactas.
 */

import type { Request, Response } from "express";

import {
  ok,
  fail,
} from "../../../shared/responses/apiResponses";

import { PersistedNotebookService } from "../services/persistedNotebookService";

export class FieldNotebookController {
  /**
   * GET /api/field-notebook
   */
  public static async getAllFieldNotebookEntries(
    _req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const entries =
        await PersistedNotebookService.getAllEntries();

      res.status(200).json(
        ok(
          entries,
          "Field notebook entries loaded successfully",
        ),
      );
    } catch (error: unknown) {
      console.error(
        "[AgroVision] Error consultando cuaderno:",
        error,
      );

      res.status(500).json(
        fail("No fue posible consultar el cuaderno de campo."),
      );
    }
  }

  /**
   * GET /api/field-notebook/zone/:zoneId
   */
  public static async getFieldNotebookEntriesByZone(
    req: Request,
    res: Response,
  ): Promise<void> {
    const zoneId = req.params.zoneId;

    if (typeof zoneId !== "string" || !zoneId.trim()) {
      res.status(400).json(
        fail("El identificador de zona es inválido."),
      );
      return;
    }

    try {
      const entries =
        await PersistedNotebookService.getEntriesByZone(
          zoneId,
        );

      res.status(200).json(
        ok(entries, "Zone notebook entries loaded successfully"),
      );
    } catch (error: unknown) {
      console.error(
        "[AgroVision] Error consultando zona:",
        error,
      );

      res.status(500).json(
        fail("No fue posible consultar los registros de la zona."),
      );
    }
  }

  /**
   * GET /api/field-notebook/field/:fieldId
   */
  public static async getFieldNotebookEntriesByField(
    req: Request,
    res: Response,
  ): Promise<void> {
    const fieldId = req.params.fieldId;

    if (
      typeof fieldId !== "string" ||
      !/^(?:field-)?[0-9]+$/.test(fieldId.trim())
    ) {
      res.status(400).json(
        fail("El identificador de parcela es inválido."),
      );
      return;
    }

    try {
      const entries =
        await PersistedNotebookService.getEntriesByField(
          fieldId,
        );

      res.status(200).json(
        ok(entries, "Field notebook entries loaded successfully"),
      );
    } catch (error: unknown) {
      console.error(
        "[AgroVision] Error consultando parcela:",
        error,
      );

      res.status(500).json(
        fail("No fue posible consultar los registros de la parcela."),
      );
    }
  }
}
