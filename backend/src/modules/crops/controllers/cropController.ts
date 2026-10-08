
/**
 * ================================
 * Crop Controller
 * =========================================
 *
 * Responsabilidades:
 * - Recibir peticiones HTTP de cultivos.
 * - Invocar los servicios correspondientes.
 * - Mantener el formato estándar ApiResponse.
 *
 * No consultar Prisma directamente
 * =========================================
 */

import type { Request, Response } from "express";

import { CropService } from "../services/cropService";

import {
  ok,
  fail,
} from "../../../shared/responses/apiResponses";

export class CropController {
  private readonly cropService = new CropService();

  /**
   * GET /api/crops/cycles
   *
   * Obtiene todos los ciclos de cultivo
   * registrados en PostgreSQL.
   */
  public getCrops = async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const crops = await this.cropService.getCrops();

      res.status(200).json(
        ok(crops, "Crop cycles loaded successfully")
      );
    } catch (error: unknown) {
      res.status(500).json(
        fail(
          error instanceof Error
            ? error.message
            : "Failed to load crop cycles"
        )
      );
    }
  };
}
