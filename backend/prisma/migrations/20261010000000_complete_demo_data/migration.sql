-- Completa los contratos persistidos que consume la interfaz de AgroVision.
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPLIED', 'DISMISSED');

ALTER TABLE "crop_profiles"
  ADD COLUMN "scientificName" TEXT,
  ADD COLUMN "analysisFocus" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "riskRules" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "recommendationTemplates" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "crop_profiles"
  ALTER COLUMN "mainRisks" TYPE JSONB
    USING CASE
      WHEN "mainRisks" IS NULL OR btrim("mainRisks") = '' THEN '[]'::jsonb
      ELSE to_jsonb(string_to_array("mainRisks", ','))
    END,
  ALTER COLUMN "mainRisks" SET NOT NULL,
  ALTER COLUMN "mainRisks" SET DEFAULT '[]'::jsonb,
  ALTER COLUMN "preferredMetrics" TYPE JSONB
    USING CASE
      WHEN "preferredMetrics" IS NULL OR btrim("preferredMetrics") = '' THEN '[]'::jsonb
      ELSE to_jsonb(string_to_array("preferredMetrics", ','))
    END,
  ALTER COLUMN "preferredMetrics" SET NOT NULL,
  ALTER COLUMN "preferredMetrics" SET DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX "crop_profiles_cropType_key" ON "crop_profiles"("cropType");

ALTER TABLE "vision_inspections"
  ADD COLUMN "cropType" TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN "chlorosisSuspected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "leafSpotSuspected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stressPatternDetected" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "recommendedAction" TEXT,
  ADD COLUMN "evidence" JSONB,
  ADD COLUMN "imageFileName" TEXT;

ALTER TABLE "recommendations"
  ADD COLUMN "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "actionType" TEXT NOT NULL DEFAULT 'MONITORING',
  ADD COLUMN "dosageValue" DECIMAL(12,2),
  ADD COLUMN "dosageUnit" TEXT,
  ADD COLUMN "timeframe" TEXT,
  ADD COLUMN "expectedImpactType" TEXT;

ALTER TABLE "field_notebook_entries"
  ADD COLUMN "followUpAt" TIMESTAMP(3),
  ADD COLUMN "evidence" JSONB;
