import prisma from "../../../shared/database/prisma";
import {
  FieldResponse,
  CreateFieldInput,
  UpdateFieldInput,
} from "../types/fieldTypes";

export class FieldService {

  public async getFields(): Promise<FieldResponse[]> {
    const fields = await prisma.field.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return fields.map((field) => ({
      id: field.id,
      farmId: field.farmId,
      name: field.name,
      areaSquareMeters: Number(field.areaSquareMeters),
      soilType: field.soilType,
      irrigationType: field.irrigationType,
      status: field.status,
      createdAt: field.createdAt.toISOString(),
    }));
  }

  public async getFieldById(id: number): Promise<FieldResponse> {
    const field = await prisma.field.findUnique({
      where: {
        id,
      },
    });

    if (!field) {
      throw new Error("Field not found");
    }

    return {
      id: field.id,
      farmId: field.farmId,
      name: field.name,
      areaSquareMeters: Number(field.areaSquareMeters),
      soilType: field.soilType,
      irrigationType: field.irrigationType,
      status: field.status,
      createdAt: field.createdAt.toISOString(),
    };
  }

  public async getFieldsByFarmId(
    farmId: number
  ): Promise<FieldResponse[]> {
    const fields = await prisma.field.findMany({
      where: {
        farmId,
      },
      orderBy: {
        id: "asc",
      },
    });

    return fields.map((field) => ({
      id: field.id,
      farmId: field.farmId,
      name: field.name,
      areaSquareMeters: Number(field.areaSquareMeters),
      soilType: field.soilType,
      irrigationType: field.irrigationType,
      status: field.status,
      createdAt: field.createdAt.toISOString(),
    }));
  }

  public async createField(
    input: CreateFieldInput
  ): Promise<FieldResponse> {

    // Verificar que la Farm exista
    const farm = await prisma.farm.findUnique({
      where: {
        id: input.farmId,
      },
    });

    if (!farm) {
      throw new Error("Farm not found");
    }

    const field = await prisma.field.create({
      data: {
        farmId: input.farmId,
        name: input.name,
        areaSquareMeters: input.areaSquareMeters,
        soilType: input.soilType,
        irrigationType: input.irrigationType,
        status: input.status,
      },
    });

    return {
      id: field.id,
      farmId: field.farmId,
      name: field.name,
      areaSquareMeters: Number(field.areaSquareMeters),
      soilType: field.soilType,
      irrigationType: field.irrigationType,
      status: field.status,
      createdAt: field.createdAt.toISOString(),
    };
  }

  public async updateField(
    id: number,
    input: UpdateFieldInput
  ): Promise<FieldResponse> {

    const field = await prisma.field.update({
      where: {
        id,
      },
      data: {
        ...(input.name !== undefined && {
          name: input.name,
        }),
        ...(input.areaSquareMeters !== undefined && {
          areaSquareMeters: input.areaSquareMeters,
        }),
        ...(input.soilType !== undefined && {
          soilType: input.soilType,
        }),
        ...(input.irrigationType !== undefined && {
          irrigationType: input.irrigationType,
        }),
        ...(input.status !== undefined && {
          status: input.status,
        }),
      },
    });

    return {
      id: field.id,
      farmId: field.farmId,
      name: field.name,
      areaSquareMeters: Number(field.areaSquareMeters),
      soilType: field.soilType,
      irrigationType: field.irrigationType,
      status: field.status,
      createdAt: field.createdAt.toISOString(),
    };
  }
}