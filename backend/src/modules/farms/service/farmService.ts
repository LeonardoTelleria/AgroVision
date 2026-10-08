import prisma from "../../../shared/database/prisma";
import { FarmOverview } from "../types/farmTypes";

export class FarmService {
  public async getFarmOverview(): Promise<FarmOverview> {
    const farm = await prisma.farm.findFirst({
      include: {
        fields: true,
      },
    });
    if (!farm) {
      throw new Error("No farms found");
    }
    const fieldsCount = farm.fields.length;
    return {
      id: farm.id.toString(),
      name: farm.name,
      location: {
        country: "Nicaragua",
        region: farm.location,
        city: null,
        latitude: null,
        longitude: null,
      },
      totalAreaSquareMeters: Number(farm.totalAreaSquareMeters),
      fieldsCount,
      activeCropCycles: 0,
      sensorsCount: 0,
      roverCount: 0,
      generalStatus: "STABLE",
      lastUpdateAt: farm.createdAt.toISOString(),
    };
  }
}