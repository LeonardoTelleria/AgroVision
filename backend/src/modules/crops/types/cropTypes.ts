/** Contratos legacy y de persistencia HTTP para ciclos Crop. */

export interface CropCycle {
    readonly id: string;
    readonly fieldId: string;
    readonly cropName: string;
    readonly healthScore: number;
    readonly growthStage: "VEGETATIVE" | "FLOWERING" | "RIPENING" | "HARVESTED";
    readonly plantedAt: string
    readonly expectedHarvestAt?: string | null;
}

export type CropStatus = "ACTIVE" | "HARVESTED" | "INACTIVE";

/** Respuesta HTTP persistida del modelo Prisma Crop. */
export interface CropResponse {
    readonly id: number;
    readonly fieldId: number;
    readonly cropProfileId: number;
    readonly cropType: string;
    readonly name: string;
    readonly growthStage: string;
    readonly plantedAt: string;
    readonly status: CropStatus;
}

/** Datos necesarios para crear un cultivo persistido. */
export interface CreateCropInput {
    readonly fieldId: number;
    readonly cropProfileId: number;
    readonly cropType: string;
    readonly name: string;
    readonly growthStage: string;
    readonly plantedAt: string;
    readonly status: CropStatus;
}

/** Campos editables de un cultivo persistido. */
export interface UpdateCropInput {
    readonly cropProfileId?: number;
    readonly cropType?: string;
    readonly name?: string;
    readonly growthStage?: string;
    readonly plantedAt?: string;
    readonly status?: CropStatus;
}

