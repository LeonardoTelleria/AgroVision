/** Validación HTTP de Sensor, alineada con el enum SensorStatus de Prisma. */
import { z } from "zod";

const positiveInteger = z.coerce.number().int().positive();
const nonEmptyString = z.string().trim().min(1);
const sensorStatusSchema = z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]);

export const createSensorSchema = z.object({
  fieldId: positiveInteger,
  type: nonEmptyString,
  name: nonEmptyString,
  status: sensorStatusSchema,
  installedAt: z.string().datetime({ offset: true }),
}).strict();

export const updateSensorSchema = z.object({
  type: nonEmptyString.optional(),
  name: nonEmptyString.optional(),
  status: sensorStatusSchema.optional(),
}).strict().refine(
  (input) => Object.keys(input).length > 0,
  { message: "At least one sensor field is required." },
);

export const sensorIdParamSchema = z.object({
  id: positiveInteger,
}).strict();

export const fieldIdParamSchema = z.object({
  fieldId: positiveInteger,
}).strict();
