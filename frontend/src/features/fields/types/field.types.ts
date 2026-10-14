/**
 * =========================================
 * AgroVision - Field Types
 * =========================================
 *
 * Contrato que representa una parcela
 * persistida en PostgreSQL.
 *
 * Debe coincidir con FieldResponse
 * del backend.
 */

export interface Field {
  readonly id: number;
  readonly farmId: number;
  readonly name: string;
  readonly areaSquareMeters: number;
  readonly soilType: string;
  readonly irrigationType: string;
  readonly status: string;
  readonly createdAt: string;
}