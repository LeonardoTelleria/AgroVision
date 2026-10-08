/** Validación HTTP de lecturas del modelo Prisma TelemetryReading. */
import { z } from "zod";

const positiveInteger = z.coerce.number().int().positive();
const nonEmptyString = z.string().trim().min(1);

export const createTelemetryReadingSchema = z.object({
  sensorId: positiveInteger,
  fieldId: positiveInteger,
  metric: nonEmptyString,
  value: z.number().finite(),
  unit: nonEmptyString,
  quality: nonEmptyString.nullable().optional(),
  recordedAt: z.string().datetime({ offset: true }).optional(),
}).strict();

export const createTelemetryBatchSchema = z
  .array(createTelemetryReadingSchema)
  .min(1);

export const sensorIdParamSchema = z.object({
  sensorId: positiveInteger,
}).strict();

export const fieldIdParamSchema = z.object({
  fieldId: positiveInteger,
}).strict();
