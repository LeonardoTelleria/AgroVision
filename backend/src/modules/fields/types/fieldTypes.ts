/** Contratos legacy y de persistencia HTTP del módulo Fields. */

// Contrato legacy consumido por el runtime mock actual.
export interface Field {
    readonly id: string;
    readonly farmId: string;
    readonly name: string;
    readonly areaSquareMeters: number;
    readonly cropId?: string;
    readonly soilType: "SANDY" | "LOAMY" | "CLAY" | "SILT" | "MIXED" | "UNKNOWN";
    readonly irrigationType: "NONE"| "DRIP" | "SPRINKLER" | "FURROW" | "MANUAL" | "UNKNOWN";
    readonly drainageStatus: "GOOD" | "MODERATE" | "POOR"
    readonly status: "NORMAL" | "WATER_STRESS" | "DISEASE_RISK" | "NUTRIENT_RISK" | "UNKNOWN"
    readonly lastInspectionAt?: string | null;
}

/** Respuesta HTTP persistida del modelo Prisma Field. */
export interface FieldResponse {
    readonly id: number;
    readonly farmId: number;
    readonly name: string;
    readonly areaSquareMeters: number;
    readonly soilType: string;
    readonly irrigationType: string;
    readonly status: string;
    readonly createdAt: string;
}

/** Datos necesarios para crear un Field. */
export interface CreateFieldInput {
    readonly farmId: number;
    readonly name: string;
    readonly areaSquareMeters: number;
    readonly soilType: string;
    readonly irrigationType: string;
    readonly status: string;
}

/** Campos editables de un Field existente. */
export interface UpdateFieldInput {
    readonly name?: string;
    readonly areaSquareMeters?: number;
    readonly soilType?: string;
    readonly irrigationType?: string;
    readonly status?: string;
}
