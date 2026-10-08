
import prisma from "../../../shared/database/prisma";
import type {Crop as PersistedCrop} from "../../../generated/prisma/client";

import type{ CropCycle, CropResponse, CreateCropInput, UpdateCropInput,} from "../types/cropTypes";


function toResponse(crop: PersistedCrop): CropResponse {
    return {
        id: crop.id,
        fieldId: crop.fieldId,
        cropProfileId: crop.cropProfileId,
        cropType: crop.cropType,
        name: crop.name,
        growthStage: crop.growthStage,
        plantedAt: crop.plantedAt.toISOString(),
        status: crop.status,
    };
}

export class CropService {
    public async getCrops(): Promise<CropResponse[]> {
        const crops = await prisma.crop.findMany({
            orderBy: {id: "asc"},
    });
        return crops.map(toResponse);
    }
    
    public async getCropById(id: number): Promise<CropResponse | null> {
        const crops = await prisma.crop.findUnique({
            where: {id},
        });
        return crops ? toResponse(crops) : null;
    }
    public async createCrop(input: CreateCropInput): Promise<CropResponse> {
        const crop = await prisma.crop.create({
            data: {
                fieldId: input.fieldId,
                cropProfileId: input.cropProfileId,
                cropType: input.cropType,
                name: input.name,
                growthStage: input.growthStage,
                plantedAt: new Date(input.plantedAt),
                status: input.status,
            },
        });
        return toResponse(crop);
            }
    public async updateCrop(id: number, input: UpdateCropInput): Promise<CropResponse> {
        const crop = await prisma.crop.update({
            where: {id},
            data: {
                ...(input.cropProfileId != undefined && {
                    cropProfileId: input.cropProfileId,
                }),
                ...(input.cropType != undefined && {
                    cropType: input.cropType
                }),
                ...(input.name != undefined && {
                    name: input.name
                }),
                ...(input.growthStage != undefined && {
                    growthStage: input.growthStage
                }),
                ...(input.plantedAt != undefined && {
                    plantedAt: new Date(input.plantedAt)
                }),
                ...(input.status != undefined && {
                    status: input.status
                }),
                },
            });
            return toResponse(crop);
        }
}
