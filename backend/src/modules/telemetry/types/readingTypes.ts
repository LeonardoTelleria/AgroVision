/** Contratos HTTP de lecturas, alineados con Prisma TelemetryReading. */
export interface TelemetryReadingResponse {
  readonly id: number;
  readonly sensorId: number;
  readonly fieldId: number;
  readonly metric: string;
  readonly value: number;
  readonly unit: string;
  readonly quality: string | null;
  readonly recordedAt: string;
}

export interface CreateTelemetryReadingInput {
  readonly sensorId: number;
  readonly fieldId: number;
  readonly metric: string;
  readonly value: number;
  readonly unit: string;
  readonly quality?: string | null;
  readonly recordedAt?: string;
}

export type CreateTelemetryBatchInput =
  readonly CreateTelemetryReadingInput[];

/** Resultado atómico de createMany; no devuelve las filas insertadas. */
export interface TelemetryBatchResponse {
  readonly count: number;
}
