import prisma from "../../../shared/database/prisma";
import {
  FarmOverview,
  FarmResponse,
  CreateFarmInput,
  UpdateFarmInput,
} from "../types/farmTypes";

export class FarmService {

  public async getFarms(): Promise<FarmResponse[]> {
    const farms = await prisma.farm.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return farms.map((farm) => ({
      id: farm.id,
      ownerId: farm.ownerId,
      name: farm.name,
      location: farm.location,
      totalAreaSquareMeters: Number(farm.totalAreaSquareMeters),
      createdAt: farm.createdAt.toISOString(),
    }));
  }

  public async getFarmById(id: number): Promise<FarmResponse> {
    const farm = await prisma.farm.findUnique({
      where: {
        id,
      },
    });

    if (!farm) {
      throw new Error("Farm not found");
    }

    return {
      id: farm.id,
      ownerId: farm.ownerId,
      name: farm.name,
      location: farm.location,
      totalAreaSquareMeters: Number(farm.totalAreaSquareMeters),
      createdAt: farm.createdAt.toISOString(),
    };
  }

  public async createFarm(input: CreateFarmInput): Promise<FarmResponse> {
    const farm = await prisma.farm.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        location: input.location,
        totalAreaSquareMeters: input.totalAreaSquareMeters,
      },
    });

    return {
      id: farm.id,
      ownerId: farm.ownerId,
      name: farm.name,
      location: farm.location,
      totalAreaSquareMeters: Number(farm.totalAreaSquareMeters),
      createdAt: farm.createdAt.toISOString(),
    };
  }

  public async updateFarm(
    id: number,
    input: UpdateFarmInput
  ): Promise<FarmResponse> {
    const farm = await prisma.farm.update({
      where: {
        id,
      },
      data: {
        ...(input.name !== undefined && {
          name: input.name,
        }),
        ...(input.location !== undefined && {
          location: input.location,
        }),
        ...(input.totalAreaSquareMeters !== undefined && {
          totalAreaSquareMeters: input.totalAreaSquareMeters,
        }),
      },
    });

    return {
      id: farm.id,
      ownerId: farm.ownerId,
      name: farm.name,
      location: farm.location,
      totalAreaSquareMeters: Number(farm.totalAreaSquareMeters),
      createdAt: farm.createdAt.toISOString(),
    };
  }

  public async getFarmOverview(): Promise<FarmOverview> {
    const farm = await prisma.farm.findFirst({
      include: {
        fields: true,
      },
    });

    if (!farm) {
      throw new Error("No farms found");
    }

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
      fieldsCount: farm.fields.length,
      activeCropCycles: 0,
      sensorsCount: 0,
      roverCount: 0,
      generalStatus: "STABLE",
      lastUpdateAt: farm.createdAt.toISOString(),
    };
  }
}