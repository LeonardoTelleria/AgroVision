import prisma from "../../../shared/database/prisma";
import { FieldResponse } from "../types/fieldTypes";

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
}