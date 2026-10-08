import prisma from "../../../shared/database/prisma";
import type { Crop as PersistedCrop } from "../../../generated/prisma/client";
import type { CropResponse, CreateCropInput, UpdateCropInput } from "../types/cropTypes";

function toResponse(crop: PersistedCrop): CropResponse {
  return { ...crop, plantedAt: crop.plantedAt.toISOString() };
}

export class CropService {
  public async getCrops(): Promise<CropResponse[]> {
    const crops = await prisma.crop.findMany({ orderBy: { id: "asc" } });
    return crops.map(toResponse);
  }

  public async getCropById(id: number): Promise<CropResponse | null> {
    const crop = await prisma.crop.findUnique({ where: { id } });
    return crop ? toResponse(crop) : null;
  }

  public async getCropsByFieldId(fieldId: number): Promise<CropResponse[]> {
    const crops = await prisma.crop.findMany({
      where: { fieldId },
      orderBy: { id: "asc" },
    });
    return crops.map(toResponse);
  }

  public async createCrop(input: CreateCropInput): Promise<CropResponse> {
    const crop = await prisma.crop.create({
      data: { ...input, plantedAt: new Date(input.plantedAt) },
    });
    return toResponse(crop);
  }

  public async updateCrop(id: number, input: UpdateCropInput): Promise<CropResponse> {
    const crop = await prisma.crop.update({
      where: { id },
      data: {
        ...input,
        ...(input.plantedAt !== undefined && { plantedAt: new Date(input.plantedAt) }),
      },
    });
    return toResponse(crop);
  }
}
