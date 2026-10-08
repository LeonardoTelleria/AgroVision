import type { Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../../../generated/prisma/client";
import { TelemetryService } from "../services/telemetryService";
import { createTelemetryReadingSchema, createTelemetryBatchSchema, sensorIdParamSchema, fieldIdParamSchema } from "../schemas/telemetrySchemas";
import { ok, fail } from "../../../shared/responses/apiResponses";

function respondError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json(fail("Invalid telemetry parameters or data"));
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      res.status(400).json(fail("Sensor or field does not exist"));
      return;
    }
    if (error.code === "P2002") {
      res.status(409).json(fail("Telemetry conflicts with an existing record"));
      return;
    }
    if (error.code === "P2020") {
      res.status(400).json(fail("Telemetry value is outside the supported range"));
      return;
    }
  }
  res.status(500).json(fail("Failed to process telemetry request"));
}

export class TelemetryController {
  private readonly telemetryService = new TelemetryService();

  public createReading = async (req: Request, res: Response): Promise<void> => {
    try {
      const input = createTelemetryReadingSchema.parse(req.body);
      res.status(201).json(ok(await this.telemetryService.createReading(input), "Telemetry reading created successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public createReadingsBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const input = createTelemetryBatchSchema.parse(req.body);
      res.status(201).json(ok(await this.telemetryService.createReadingsBatch(input), "Telemetry batch created successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public getReadingsBySensorId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sensorId } = sensorIdParamSchema.parse(req.params);
      res.status(200).json(ok(await this.telemetryService.getReadingsBySensorId(sensorId), "Sensor readings loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public getReadingsByFieldId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fieldId } = fieldIdParamSchema.parse(req.params);
      res.status(200).json(ok(await this.telemetryService.getReadingsByFieldId(fieldId), "Field readings loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public getLatestReadingsByFieldId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fieldId } = fieldIdParamSchema.parse(req.params);
      res.status(200).json(ok(await this.telemetryService.getLatestReadingsByFieldId(fieldId), "Latest field readings loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };
}
