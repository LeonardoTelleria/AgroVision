/** Validación HTTP del modelo Prisma TelemetryReading. */
import { z } from "zod";

const positiveInteger = z.number().int().positive().max(2147483647);
const idParameter = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(positiveInteger);
const nonEmptyString = z.string().trim().min(1);

export const createTelemetryReadingSchema = z.object({
  sensorId: positiveInteger,
  fieldId: positiveInteger,
  metric: nonEmptyString,
  // Decimal(12,4): hasta ocho dígitos enteros; PostgreSQL redondea a cuatro decimales.
  value: z.number().finite().min(-99999999.9999).max(99999999.9999),
  unit: nonEmptyString,
  quality: nonEmptyString.nullable().optional(),
  recordedAt: z.string().datetime({ offset: true }).optional(),
}).strict();

export const createTelemetryBatchSchema = z.array(createTelemetryReadingSchema).min(1);
export const sensorIdParamSchema = z.object({ sensorId: idParameter }).strict();
export const fieldIdParamSchema = z.object({ fieldId: idParameter }).strict();
