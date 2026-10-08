import type { Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../../../generated/prisma/client";
import { SensorService } from "../services/sensorService";
import { createSensorSchema, updateSensorSchema, sensorIdParamSchema, fieldIdParamSchema } from "../schemas/sensorSchemas";
import { ok, fail } from "../../../shared/responses/apiResponses";

function respondError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json(fail("Invalid sensor parameters or data"));
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      res.status(404).json(fail("Sensor not found"));
      return;
    }
    if (error.code === "P2003") {
      res.status(400).json(fail("Field does not exist"));
      return;
    }
    if (error.code === "P2002") {
      res.status(409).json(fail("Sensor conflicts with an existing record"));
      return;
    }
  }
  res.status(500).json(fail("Failed to process sensor request"));
}

export class SensorController {
  private readonly sensorService = new SensorService();

  public getSensors = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(ok(await this.sensorService.getSensors(), "Sensors loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public getSensorById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = sensorIdParamSchema.parse(req.params);
      const sensor = await this.sensorService.getSensorById(id);
      if (!sensor) {
        res.status(404).json(fail(`Sensor with ID ${id} not found`));
        return;
      }
      res.status(200).json(ok(sensor, "Sensor loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public getSensorsByFieldId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fieldId } = fieldIdParamSchema.parse(req.params);
      const sensors = await this.sensorService.getSensorsByFieldId(fieldId);
      res.status(200).json(ok(sensors, "Field sensors loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public createSensor = async (req: Request, res: Response): Promise<void> => {
    try {
      const input = createSensorSchema.parse(req.body);
      const sensor = await this.sensorService.createSensor(input);
      res.status(201).json(ok(sensor, "Sensor created successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public updateSensor = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = sensorIdParamSchema.parse(req.params);
      const input = updateSensorSchema.parse(req.body);
      const sensor = await this.sensorService.updateSensor(id, input);
      res.status(200).json(ok(sensor, "Sensor updated successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };
}
