import type { Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../../../generated/prisma/client";
import { CropService } from "../services/cropService";
import { createCropSchema, updateCropSchema, cropIdParamSchema, fieldIdParamSchema } from "../schemas/cropSchemas";
import { ok, fail } from "../../../shared/responses/apiResponses";

function respondError(res: Response, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json(fail("Invalid crop parameters or data"));
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      res.status(404).json(fail("Crop not found"));
      return;
    }
    if (error.code === "P2003") {
      res.status(400).json(fail("Field or crop profile does not exist"));
      return;
    }
    if (error.code === "P2002") {
      res.status(409).json(fail("Crop conflicts with an existing record"));
      return;
    }
  }
  res.status(500).json(fail("Failed to process crop request"));
}

export class CropController {
  private readonly cropService = new CropService();

  public getCrops = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(ok(await this.cropService.getCrops(), "Crop cycles loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public getCropById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = cropIdParamSchema.parse(req.params);
      const crop = await this.cropService.getCropById(id);
      if (!crop) {
        res.status(404).json(fail(`Crop with ID ${id} not found`));
        return;
      }
      res.status(200).json(ok(crop, "Crop loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public getCropsByFieldId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { fieldId } = fieldIdParamSchema.parse(req.params);
      const crops = await this.cropService.getCropsByFieldId(fieldId);
      res.status(200).json(ok(crops, "Field crop cycles loaded successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public createCrop = async (req: Request, res: Response): Promise<void> => {
    try {
      const input = createCropSchema.parse(req.body);
      const crop = await this.cropService.createCrop(input);
      res.status(201).json(ok(crop, "Crop created successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };

  public updateCrop = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = cropIdParamSchema.parse(req.params);
      const input = updateCropSchema.parse(req.body);
      const crop = await this.cropService.updateCrop(id, input);
      res.status(200).json(ok(crop, "Crop updated successfully"));
    } catch (error: unknown) { respondError(res, error); }
  };
}
