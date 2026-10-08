/** Contratos técnico legacy y persistido del catálogo CropProfile. */

export type CropType = "RED_BEAN" | "CASSAVA" | "QUEQUISQUE" | "ORANGE" | "SORGHUM" | "PEANUT" | "GENERAL";

export interface CropRiskRules {
    readonly waterStressSensitive: boolean;
    readonly fungalRiskSensitive: boolean;
    readonly heatStressSensitive: boolean;
    readonly nutrientStressSensitive: boolean;
}

export interface RecommendationTemplates {
    readonly waterStress: string;
    readonly fungalRisk: string;
    readonly lowVigor: string;
    readonly inspection: string;
}

export interface CropProfile {
    readonly cropType: CropType;
    readonly displayName: string;
    readonly scientificName?: string | null;
    readonly analysisFocus: string[];
    readonly mainRisks: string[];
    readonly riskRules: CropRiskRules;
    readonly preferredMetrics: string[];
    readonly recommendationTemplates: RecommendationTemplates;
}

/** Respuesta persistida del catálogo Prisma CropProfile. */
export interface CropProfileResponse {
    readonly id: number;
    readonly cropType: string;
    readonly displayName: string;
    readonly mainRisks: string | null;
    readonly preferredMetrics: string | null;
    readonly createdAt: string;
}
