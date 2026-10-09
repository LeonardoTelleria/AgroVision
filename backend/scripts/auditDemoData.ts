import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL no está definida.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

const expectedCropTypes = ["CORN", "RED_BEAN", "CASSAVA", "QUEQUISQUE", "ORANGE", "SORGHUM", "PEANUT", "GENERAL"];
const expectedZoneIds = Array.from({ length: 10 }, (_, index) => `zone-${String(index + 1).padStart(2, "0")}`);

async function main() {
  const counts = {
    users: await prisma.user.count(),
    farms: await prisma.farm.count(),
    fields: await prisma.field.count(),
    cropProfiles: await prisma.cropProfile.count(),
    crops: await prisma.crop.count(),
    sensors: await prisma.sensor.count(),
    telemetryReadings: await prisma.telemetryReading.count(),
    visionInspections: await prisma.visionInspection.count(),
    vegetationSnapshots: await prisma.vegetationSnapshot.count(),
    evidenceItems: await prisma.evidenceItem.count(),
    zoneInsights: await prisma.zoneInsight.count(),
    alerts: await prisma.alert.count(),
    recommendations: await prisma.recommendation.count(),
    notebookEntries: await prisma.fieldNotebookEntry.count(),
    reports: await prisma.report.count(),
  };

  const profiles = await prisma.cropProfile.findMany({
    select: { cropType: true, analysisFocus: true, mainRisks: true, preferredMetrics: true, riskRules: true, recommendationTemplates: true },
  });
  const missingProfiles = expectedCropTypes.filter((cropType) => !profiles.some((profile) => profile.cropType === cropType));
  const incompleteProfiles = profiles.flatMap((profile) => {
    const listFields = [profile.analysisFocus, profile.mainRisks, profile.preferredMetrics];
    const objectFields = [profile.riskRules, profile.recommendationTemplates];
    return listFields.every((value) => Array.isArray(value) && value.length > 0)
      && objectFields.every((value) => typeof value === "object" && value !== null && !Array.isArray(value))
      ? []
      : [profile.cropType];
  });
  const allZones = await prisma.zoneInsight.findMany({
    include: { field: { include: { evidenceItems: true, vegetationSnapshots: true } } },
  });
  const missingZones = expectedZoneIds.filter((zoneId) => !allZones.some((zone) => zone.zoneId === zoneId));
  const incompleteZones = allZones.flatMap((zone) => {
    const evidence = zone.field.evidenceItems.filter((item) => item.zoneId === zone.zoneId);
    const vegetation = zone.field.vegetationSnapshots.filter((item) => item.zoneId === zone.zoneId);
    const issues = [
      ...(evidence.length < 2 ? ["evidence"] : []),
      ...(vegetation.length < 3 ? ["vegetation-history"] : []),
    ];
    return issues.length ? [{ zoneId: zone.zoneId, issues }] : [];
  });
  const priorityZones = await prisma.zoneInsight.findMany({
    where: { finalRiskLevel: { in: ["HIGH", "CRITICAL"] } },
    include: { alerts: true, recommendations: true, reports: true, field: { include: { evidenceItems: true, notebookEntries: true, vegetationSnapshots: true, visionInspections: true } } },
  });
  const incompletePriorityZones = priorityZones.flatMap((zone) => {
    const issues: string[] = [];
    const zoneEvidence = zone.field.evidenceItems.filter((item) => item.zoneId === zone.zoneId);
    const zoneNotebook = zone.field.notebookEntries.filter((item) => item.zoneId === zone.zoneId);
    const zoneVegetation = zone.field.vegetationSnapshots.filter((item) => item.zoneId === zone.zoneId);
    if (zoneEvidence.length === 0) issues.push("evidence");
    if (zone.alerts.length === 0) issues.push("alerts");
    if (zone.recommendations.length === 0) issues.push("recommendations");
    if (zone.reports.length === 0) issues.push("reports");
    if (zoneNotebook.length === 0) issues.push("notebook");
    if (zoneVegetation.length === 0) issues.push("vegetation");
    return issues.length ? [{ zoneId: zone.zoneId, issues }] : [];
  });

  const minimums: Record<keyof typeof counts, number> = {
    users: 1, farms: 1, fields: 6, cropProfiles: 8, crops: 7, sensors: 7,
    telemetryReadings: 49, visionInspections: 3, vegetationSnapshots: 30,
    evidenceItems: 25, zoneInsights: 10, alerts: 6, recommendations: 5,
    notebookEntries: 5, reports: 4,
  };
  const insufficient = Object.entries(counts).flatMap(([name, count]) => count < minimums[name as keyof typeof counts] ? [{ name, count, expectedMinimum: minimums[name as keyof typeof counts] }] : []);

  const result = { status: "PASS", counts, missingProfiles, incompleteProfiles, missingZones, incompleteZones, incompletePriorityZones, insufficient };
  if (missingProfiles.length || incompleteProfiles.length || missingZones.length || incompleteZones.length || incompletePriorityZones.length || insufficient.length) {
    result.status = "FAIL";
    console.error(JSON.stringify(result, null, 2));
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
