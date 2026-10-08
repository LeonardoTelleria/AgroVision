import { CropCycle } from "../types/cropTypes";
import prisma from "../../../shared/database/prisma";
import type { CropProfile as PersistedCropProfile } from "../../../generated/prisma/client";

import type{ CropCycle, CropResponse,  createCropInput, updateCropInput} from "../types/cropProfileTypes";
export class CropService {
    public async getActiveCropCycles(): Promise<CropCycle[]> {
        const cropCycles: CropCycle[] = [
            {
                id: "crop-01",
                fieldId: "field-01",
                cropName: "Naranjo (Citrus x sinensis)",
                healthScore: 89,
                growthStage: "VEGETATIVE",
                plantedAt: "2026-05-10T08:00:00Z",
                expectedHarvestAt: "2026-09-15T18:00:00Z"
            },
            {
                id: "crop-02",
                fieldId: "parcela-02",
                cropName: "Caña de Azúcar",
                healthScore: 88,
                growthStage: "RIPENING",
                plantedAt: "2025-11-01T06:30:00Z",
                expectedHarvestAt: "2026-07-20T12:00:00Z"
            }
        ];
        return cropCycles;
    }
}