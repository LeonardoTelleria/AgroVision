import prisma from "../../../shared/database/prisma";
import type { TelemetryReading } from "../../../generated/prisma/client";
import type { CreateTelemetryReadingInput, CreateTelemetryBatchInput, TelemetryReadingResponse, TelemetryBatchResponse } from "../types/readingTypes";

function toData(input: CreateTelemetryReadingInput) {
  return {
    sensorId: input.sensorId,
    fieldId: input.fieldId,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    quality: input.quality ?? null,
    recordedAt: input.recordedAt === undefined ? new Date() : new Date(input.recordedAt),
  };
}

function toResponse(reading: TelemetryReading): TelemetryReadingResponse {
  return {
    id: reading.id,
    sensorId: reading.sensorId,
    fieldId: reading.fieldId,
    metric: reading.metric,
    value: Number(reading.value),
    unit: reading.unit,
    quality: reading.quality,
    recordedAt: reading.recordedAt.toISOString(),
  };
}

export class TelemetryService {
  public async createReading(input: CreateTelemetryReadingInput): Promise<TelemetryReadingResponse> {
    const reading = await prisma.telemetryReading.create({ data: toData(input) });
    return toResponse(reading);
  }

  public async createReadingsBatch(input: CreateTelemetryBatchInput): Promise<TelemetryBatchResponse> {
    return prisma.telemetryReading.createMany({ data: input.map(toData) });
  }

  public async getReadingsBySensorId(sensorId: number): Promise<TelemetryReadingResponse[]> {
    const readings = await prisma.telemetryReading.findMany({
      where: { sensorId },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    });
    return readings.map(toResponse);
  }

  public async getReadingsByFieldId(fieldId: number): Promise<TelemetryReadingResponse[]> {
    const readings = await prisma.telemetryReading.findMany({
      where: { fieldId },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    });
    return readings.map(toResponse);
  }

  /** Última lectura de cada sensor y métrica; ID resuelve empates de fecha. */
  public async getLatestReadingsByFieldId(fieldId: number): Promise<TelemetryReadingResponse[]> {
    const readings = await prisma.telemetryReading.findMany({
      where: { fieldId },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
      distinct: ["sensorId", "metric"],
    });
    return readings.map(toResponse);
  }
}
