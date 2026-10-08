/** Contratos legacy y de persistencia HTTP del módulo Farms. */

// Contrato legacy del endpoint de compatibilidad /overview.
export interface FarmOverview {
    readonly id: string;
    readonly name: string;
    readonly location: {
        readonly country: string;
        readonly region: string;
        readonly city?: string | null;
        readonly latitude?: number | null;
        readonly longitude?: number | null;
    }
    readonly totalAreaSquareMeters: number;
    readonly fieldsCount: number;
    readonly activeCropCycles: number;
    readonly sensorsCount: number;
    readonly roverCount: number;
    readonly generalStatus: "STABLE" | "WARNING" | "CRITICAL";
    readonly lastUpdateAt: string;
}

/** Respuesta HTTP persistida del modelo Prisma Farm. */
export interface FarmResponse {
    readonly id: number;
    readonly ownerId: number;
    readonly name: string;
    readonly location: string;
    readonly totalAreaSquareMeters: number;
    readonly createdAt: string;
}

/** Datos necesarios para crear una finca. */
export interface CreateFarmInput {
    readonly ownerId: number;
    readonly name: string;
    readonly location: string;
    readonly totalAreaSquareMeters: number;
}

/** Campos editables de una finca existente. */
export interface UpdateFarmInput {
    readonly name?: string;
    readonly location?: string;
    readonly totalAreaSquareMeters?: number;
}

