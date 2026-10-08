/** Validación HTTP de Sensor, alineada con el enum SensorStatus de Prisma. */
import { z } from "zod";

const positiveInteger = z.number().int().positive().max(2147483647);
const idParameter = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(positiveInteger);
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
  id: idParameter,
}).strict();

export const fieldIdParamSchema = z.object({
  fieldId: idParameter,
}).strict();
