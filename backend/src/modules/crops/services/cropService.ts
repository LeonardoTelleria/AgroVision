
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
}