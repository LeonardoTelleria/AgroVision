-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FARM_MANAGER', 'AGRONOMIST', 'OPERATOR');

-- CreateEnum
CREATE TYPE "CropStatus" AS ENUM ('ACTIVE', 'HARVESTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SensorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "VegetationSource" AS ENUM ('SATELLITE', 'DRONE', 'UAV');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "totalAreaSquareMeters" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fields" (
    "id" SERIAL NOT NULL,
    "farmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "areaSquareMeters" DECIMAL(12,2) NOT NULL,
    "soilType" TEXT NOT NULL,
    "irrigationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crop_profiles" (
    "id" SERIAL NOT NULL,
    "cropType" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "mainRisks" TEXT,
    "preferredMetrics" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crop_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "cropProfileId" INTEGER NOT NULL,
    "cropType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "growthStage" TEXT NOT NULL,
    "plantedAt" TIMESTAMP(3) NOT NULL,
    "status" "CropStatus" NOT NULL,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SensorStatus" NOT NULL,
    "installedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_readings" (
    "id" SERIAL NOT NULL,
    "sensorId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "quality" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telemetry_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vision_inspections" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "cropId" INTEGER NOT NULL,
    "prediction" TEXT NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "greenCoveragePercentage" DECIMAL(5,2) NOT NULL,
    "dryAreaPercentage" DECIMAL(5,2) NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vision_inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vegetation_snapshots" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "source" "VegetationSource" NOT NULL,
    "ndvi" DECIMAL(8,4),
    "ndwi" DECIMAL(8,4),
    "gndvi" DECIMAL(8,4),
    "vigorLevel" TEXT NOT NULL,
    "anomalyDetected" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vegetation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_items" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zone_insights" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "cropId" INTEGER NOT NULL,
    "finalRiskLevel" "RiskLevel" NOT NULL,
    "healthScore" DECIMAL(5,2) NOT NULL,
    "mainCause" TEXT,
    "summary" TEXT,
    "recommendedAction" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zone_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "zoneInsightId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "recommendedAction" TEXT,
    "status" "AlertStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "zoneInsightId" INTEGER NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "reason" TEXT,
    "suggestedAction" TEXT NOT NULL,
    "expectedImpactArea" DECIMAL(12,2),
    "expectedImpactDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_notebook_entries" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "cropId" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT,
    "problemObserved" TEXT,
    "actionTaken" TEXT,
    "responsibleUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_notebook_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "zoneId" TEXT NOT NULL,
    "zoneInsightId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "riskLevel" "RiskLevel" NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "farms_ownerId_idx" ON "farms"("ownerId");

-- CreateIndex
CREATE INDEX "fields_farmId_idx" ON "fields"("farmId");

-- CreateIndex
CREATE INDEX "crops_fieldId_idx" ON "crops"("fieldId");

-- CreateIndex
CREATE INDEX "crops_cropProfileId_idx" ON "crops"("cropProfileId");

-- CreateIndex
CREATE INDEX "sensors_fieldId_idx" ON "sensors"("fieldId");

-- CreateIndex
CREATE INDEX "telemetry_readings_sensorId_idx" ON "telemetry_readings"("sensorId");

-- CreateIndex
CREATE INDEX "telemetry_readings_fieldId_idx" ON "telemetry_readings"("fieldId");

-- CreateIndex
CREATE INDEX "telemetry_readings_recordedAt_idx" ON "telemetry_readings"("recordedAt");

-- CreateIndex
CREATE INDEX "vision_inspections_fieldId_idx" ON "vision_inspections"("fieldId");

-- CreateIndex
CREATE INDEX "vision_inspections_cropId_idx" ON "vision_inspections"("cropId");

-- CreateIndex
CREATE INDEX "vision_inspections_zoneId_idx" ON "vision_inspections"("zoneId");

-- CreateIndex
CREATE INDEX "vegetation_snapshots_fieldId_idx" ON "vegetation_snapshots"("fieldId");

-- CreateIndex
CREATE INDEX "vegetation_snapshots_zoneId_idx" ON "vegetation_snapshots"("zoneId");

-- CreateIndex
CREATE INDEX "vegetation_snapshots_capturedAt_idx" ON "vegetation_snapshots"("capturedAt");

-- CreateIndex
CREATE INDEX "evidence_items_fieldId_idx" ON "evidence_items"("fieldId");

-- CreateIndex
CREATE INDEX "evidence_items_zoneId_idx" ON "evidence_items"("zoneId");

-- CreateIndex
CREATE INDEX "zone_insights_fieldId_idx" ON "zone_insights"("fieldId");

-- CreateIndex
CREATE INDEX "zone_insights_cropId_idx" ON "zone_insights"("cropId");

-- CreateIndex
CREATE INDEX "zone_insights_zoneId_idx" ON "zone_insights"("zoneId");

-- CreateIndex
CREATE INDEX "zone_insights_finalRiskLevel_idx" ON "zone_insights"("finalRiskLevel");

-- CreateIndex
CREATE INDEX "alerts_fieldId_idx" ON "alerts"("fieldId");

-- CreateIndex
CREATE INDEX "alerts_zoneId_idx" ON "alerts"("zoneId");

-- CreateIndex
CREATE INDEX "alerts_zoneInsightId_idx" ON "alerts"("zoneInsightId");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "recommendations_fieldId_idx" ON "recommendations"("fieldId");

-- CreateIndex
CREATE INDEX "recommendations_zoneId_idx" ON "recommendations"("zoneId");

-- CreateIndex
CREATE INDEX "recommendations_zoneInsightId_idx" ON "recommendations"("zoneInsightId");

-- CreateIndex
CREATE INDEX "recommendations_priority_idx" ON "recommendations"("priority");

-- CreateIndex
CREATE INDEX "field_notebook_entries_fieldId_idx" ON "field_notebook_entries"("fieldId");

-- CreateIndex
CREATE INDEX "field_notebook_entries_cropId_idx" ON "field_notebook_entries"("cropId");

-- CreateIndex
CREATE INDEX "field_notebook_entries_responsibleUserId_idx" ON "field_notebook_entries"("responsibleUserId");

-- CreateIndex
CREATE INDEX "field_notebook_entries_zoneId_idx" ON "field_notebook_entries"("zoneId");

-- CreateIndex
CREATE INDEX "reports_fieldId_idx" ON "reports"("fieldId");

-- CreateIndex
CREATE INDEX "reports_zoneId_idx" ON "reports"("zoneId");

-- CreateIndex
CREATE INDEX "reports_zoneInsightId_idx" ON "reports"("zoneInsightId");

-- CreateIndex
CREATE INDEX "reports_createdBy_idx" ON "reports"("createdBy");

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crops" ADD CONSTRAINT "crops_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crops" ADD CONSTRAINT "crops_cropProfileId_fkey" FOREIGN KEY ("cropProfileId") REFERENCES "crop_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sensors" ADD CONSTRAINT "sensors_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_readings" ADD CONSTRAINT "telemetry_readings_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "sensors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_readings" ADD CONSTRAINT "telemetry_readings_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_inspections" ADD CONSTRAINT "vision_inspections_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vision_inspections" ADD CONSTRAINT "vision_inspections_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vegetation_snapshots" ADD CONSTRAINT "vegetation_snapshots_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_insights" ADD CONSTRAINT "zone_insights_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zone_insights" ADD CONSTRAINT "zone_insights_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_zoneInsightId_fkey" FOREIGN KEY ("zoneInsightId") REFERENCES "zone_insights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_zoneInsightId_fkey" FOREIGN KEY ("zoneInsightId") REFERENCES "zone_insights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_notebook_entries" ADD CONSTRAINT "field_notebook_entries_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_notebook_entries" ADD CONSTRAINT "field_notebook_entries_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_notebook_entries" ADD CONSTRAINT "field_notebook_entries_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_zoneInsightId_fkey" FOREIGN KEY ("zoneInsightId") REFERENCES "zone_insights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
