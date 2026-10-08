/** Validación HTTP del módulo Fields, alineada con el modelo Prisma Field. */
import { z } from "zod";

const positiveInteger = z.coerce.number().int().positive();
const nonEmptyString = z.string().trim().min(1);

export const createFieldSchema = z.object({
  farmId: positiveInteger,
  name: nonEmptyString,
  areaSquareMeters: z.number().finite().positive(),
  soilType: nonEmptyString,
  irrigationType: nonEmptyString,
  status: nonEmptyString,
}).strict();

export const updateFieldSchema = z.object({
  name: nonEmptyString.optional(),
  areaSquareMeters: z.number().finite().positive().optional(),
  soilType: nonEmptyString.optional(),
  irrigationType: nonEmptyString.optional(),
  status: nonEmptyString.optional(),
}).strict().refine(
  (input) => Object.keys(input).length > 0,
  { message: "At least one field value is required." },
);

export const fieldIdParamSchema = z.object({
  id: positiveInteger,
}).strict();

export const farmIdParamSchema = z.object({
  farmId: positiveInteger,
}).strict();
