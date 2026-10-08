/** Validación HTTP del módulo Farms, alineada con el modelo Prisma Farm. */
import { z } from "zod";

const positiveInteger = z.coerce.number().int().positive();
const nonEmptyString = z.string().trim().min(1);

export const createFarmSchema = z.object({
  ownerId: positiveInteger,
  name: nonEmptyString,
  location: nonEmptyString,
  totalAreaSquareMeters: z.number().finite().positive(),
}).strict();

export const updateFarmSchema = z.object({
  name: nonEmptyString.optional(),
  location: nonEmptyString.optional(),
  totalAreaSquareMeters: z.number().finite().positive().optional(),
}).strict().refine(
  (input) => Object.keys(input).length > 0,
  { message: "At least one farm field is required." },
);

export const farmIdParamSchema = z.object({
  id: positiveInteger,
}).strict();
