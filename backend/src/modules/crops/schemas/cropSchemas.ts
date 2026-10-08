/** Validación HTTP de Crop, sin alterar las rutas legacy de CropProfile. */
import { z } from "zod";

const positiveInteger = z.coerce.number().int().positive();
const nonEmptyString = z.string().trim().min(1);
const cropStatusSchema = z.enum(["ACTIVE", "HARVESTED", "INACTIVE"]);

export const createCropSchema = z.object({
  fieldId: positiveInteger,
  cropProfileId: positiveInteger,
  cropType: nonEmptyString,
  name: nonEmptyString,
  growthStage: nonEmptyString,
  plantedAt: z.string().datetime({ offset: true }),
  status: cropStatusSchema,
}).strict();

export const updateCropSchema = z.object({
  cropProfileId: positiveInteger.optional(),
  cropType: nonEmptyString.optional(),
  name: nonEmptyString.optional(),
  growthStage: nonEmptyString.optional(),
  plantedAt: z.string().datetime({ offset: true }).optional(),
  status: cropStatusSchema.optional(),
}).strict().refine(
  (input) => Object.keys(input).length > 0,
  { message: "At least one crop field is required." },
);

export const cropIdParamSchema = z.object({
  id: positiveInteger,
}).strict();

export const fieldIdParamSchema = z.object({
  fieldId: positiveInteger,
}).strict();

export const cropTypeParamSchema = z.object({
  type: nonEmptyString,
}).strict();
