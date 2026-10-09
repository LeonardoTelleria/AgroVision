/** Validación de metadatos multipart y respuestas del AI Service. */

import { z } from "zod";

export const visionAnalyzeFieldsSchema = z.object({
  cropType: z.enum([
    "CORN",
    "RED_BEAN",
    "CASSAVA",
    "QUEQUISQUE",
    "ORANGE",
    "SORGHUM",
    "PEANUT",
    "GENERAL",
  ]),
  fieldId: z.string().trim().min(1).max(100),
  zoneId: z.string().trim().min(1).max(100).optional(),
  imageFileName: z.string().trim().min(1).max(255).optional(),
}).strict();

const nullablePercentageSchema = z.number().finite().min(0).max(100).nullable();

export const aiVisionAnalyzeResponseSchema = z.object({
  prediction: z.enum([
    "HEALTHY",
    "WATER_STRESS",
    "CHLOROSIS",
    "DRY_AREA",
    "LEAF_SPOT",
    "UNKNOWN",
  ]),
  confidence: z.number().finite().min(0).max(1),
  metrics: z.array(z.string().trim().min(1)),
  visualMetrics: z.object({
    greenCoveragePercentage: nullablePercentageSchema,
    dryAreaPercentage: nullablePercentageSchema,
    chlorosisSuspected: z.boolean(),
    leafSpotSuspected: z.boolean(),
    stressPatternDetected: z.boolean(),
  }).strict(),
  evidence: z.array(z.object({
    metric: z.string().trim().min(1),
    value: z.union([z.number(), z.string(), z.boolean()]).nullable(),
    unit: z.string().nullable(),
    explanation: z.string().trim().min(1),
  }).strict()).min(1),
  explanation: z.string().trim().min(1),
  recommendation: z.string().trim().min(1),
}).strict();
