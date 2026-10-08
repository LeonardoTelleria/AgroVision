
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida. Configúrala en backend/.env.",
  );
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando seed de AgroVision...");

  // 1. Usuario base
  const user = await prisma.user.upsert({
    where: { email: "admin@agrovision.com" },
    update: {
      fullName: "Administrador AgroVision",
      role: "ADMIN",
    },
    create: {
      fullName: "Administrador AgroVision",
      email: "admin@agrovision.com",
      passwordHash: "seed-password",
      role: "ADMIN",
    },
  });

  console.log(`Usuario: ${user.email}`);

  // 2. Finca
  let farm = await prisma.farm.findFirst({
    where: {
      ownerId: user.id,
      name: "Finca AgroVision",
    },
  });

  const farmData = {
    ownerId: user.id,
    name: "Finca AgroVision",
    location: "Chinandega, Nicaragua",
    totalAreaSquareMeters: 450000,
  };

  if (farm) {
    farm = await prisma.farm.update({
      where: { id: farm.id },
      data: farmData,
    });
  } else {
    farm = await prisma.farm.create({
      data: farmData,
    });
  }

  console.log(`Finca: ${farm.name}`);

  // 3. Seis campos
  const fieldData = [
    {
      name: "Lote Norte - Maíz",
      areaSquareMeters: 120000,
      soilType: "LOAMY",
      irrigationType: "DRIP",
    },
    {
      name: "Lote Sur - Tomate",
      areaSquareMeters: 85000,
      soilType: "CLAY",
      irrigationType: "SPRINKLER",
    },
    {
      name: "Lote Este - Frijol",
      areaSquareMeters: 60000,
      soilType: "SANDY_LOAM",
      irrigationType: "DRIP",
    },
    {
      name: "Lote Oeste - Arroz",
      areaSquareMeters: 55000,
      soilType: "CLAY",
      irrigationType: "FLOOD",
    },
    {
      name: "Lote Central - Hortalizas",
      areaSquareMeters: 50000,
      soilType: "LOAMY",
      irrigationType: "SPRINKLER",
    },
    {
      name: "Lote Experimental",
      areaSquareMeters: 45000,
      soilType: "SILT",
      irrigationType: "DRIP",
    },
  ];

  const fields = [];

  for (const item of fieldData) {
    const data = {
      farmId: farm.id,
      ...item,
      status: "ACTIVE",
    };

    let field = await prisma.field.findFirst({
      where: {
        farmId: farm.id,
        name: item.name,
      },
    });

    if (field) {
      field = await prisma.field.update({
        where: { id: field.id },
        data,
      });
    } else {
      field = await prisma.field.create({ data });
    }

    fields.push(field);
  }

  console.log(`Campos preparados: ${fields.length}`);

  // 4. Perfiles de cultivo
  const profileData = [
    {
      cropType: "MAIZE",
      displayName: "Maíz",
      mainRisks: "Sequía, deficiencia de nitrógeno y plagas",
      preferredMetrics: "soil_moisture,temperature,humidity",
    },
    {
      cropType: "TOMATO",
      displayName: "Tomate",
      mainRisks: "Hongos, exceso de humedad y estrés térmico",
      preferredMetrics: "soil_moisture,temperature,humidity",
    },
    {
      cropType: "BEAN",
      displayName: "Frijol",
      mainRisks: "Sequía, enfermedades foliares y plagas",
      preferredMetrics: "soil_moisture,temperature,humidity",
    },
    {
      cropType: "RICE",
      displayName: "Arroz",
      mainRisks: "Disponibilidad de agua y enfermedades",
      preferredMetrics: "soil_moisture,temperature,humidity",
    },
  ];

  const profiles = [];

  for (const item of profileData) {
    let profile = await prisma.cropProfile.findFirst({
      where: { cropType: item.cropType },
    });

    if (profile) {
      profile = await prisma.cropProfile.update({
        where: { id: profile.id },
        data: item,
      });
    } else {
      profile = await prisma.cropProfile.create({
        data: item,
      });
    }

    profiles.push(profile);
  }

  console.log(`Perfiles preparados: ${profiles.length}`);

  // 5. Cuatro cultivos asociados a campos y perfiles
  const cropData = [
    {
      fieldIndex: 0,
      profileIndex: 0,
      name: "Maíz ciclo principal",
      growthStage: "VEGETATIVE",
      plantedAt: "2026-08-15T12:00:00.000Z",
    },
    {
      fieldIndex: 1,
      profileIndex: 1,
      name: "Tomate ciclo principal",
      growthStage: "FLOWERING",
      plantedAt: "2026-08-25T12:00:00.000Z",
    },
    {
      fieldIndex: 2,
      profileIndex: 2,
      name: "Frijol ciclo principal",
      growthStage: "VEGETATIVE",
      plantedAt: "2026-09-01T12:00:00.000Z",
    },
    {
      fieldIndex: 3,
      profileIndex: 3,
      name: "Arroz ciclo principal",
      growthStage: "DEVELOPMENT",
      plantedAt: "2026-08-20T12:00:00.000Z",
    },
  ];

  const crops = [];

  for (const item of cropData) {
    const data = {
      fieldId: fields[item.fieldIndex].id,
      cropProfileId: profiles[item.profileIndex].id,
      cropType: profiles[item.profileIndex].cropType,
      name: item.name,
      growthStage: item.growthStage,
      plantedAt: new Date(item.plantedAt),
      status: "ACTIVE" as const,
    };

    let crop = await prisma.crop.findFirst({
      where: {
        fieldId: data.fieldId,
        name: data.name,
      },
    });

    if (crop) {
      crop = await prisma.crop.update({
        where: { id: crop.id },
        data,
      });
    } else {
      crop = await prisma.crop.create({ data });
    }

    crops.push(crop);
  }

  console.log(`Cultivos preparados: ${crops.length}`);

  // 6. Cuatro sensores, uno por cada uno de los primeros cuatro campos
  const sensorData = [
    {
      fieldIndex: 0,
      name: "Sensor de humedad - Norte",
      type: "SOIL_MOISTURE",
      metric: "soil_moisture",
      unit: "%",
      values: [42.5, 41.8, 40.2, 38.9, 40.5, 43.1],
    },
    {
      fieldIndex: 1,
      name: "Sensor ambiental - Sur",
      type: "TEMPERATURE",
      metric: "temperature",
      unit: "°C",
      values: [28.2, 29.1, 30.4, 29.7, 27.8, 28.5],
    },
    {
      fieldIndex: 2,
      name: "Sensor de humedad - Este",
      type: "SOIL_MOISTURE",
      metric: "soil_moisture",
      unit: "%",
      values: [51.2, 49.8, 48.5, 50.1, 52.4, 53.0],
    },
    {
      fieldIndex: 3,
      name: "Sensor ambiental - Oeste",
      type: "HUMIDITY",
      metric: "humidity",
      unit: "%",
      values: [76.0, 78.5, 81.2, 79.0, 75.5, 74.8],
    },
  ];

  const sensors = [];

  for (const item of sensorData) {
    const data = {
      fieldId: fields[item.fieldIndex].id,
      name: item.name,
      type: item.type,
      status: "ACTIVE" as const,
      installedAt: new Date("2026-09-20T12:00:00.000Z"),
    };

    let sensor = await prisma.sensor.findFirst({
      where: {
        fieldId: data.fieldId,
        name: data.name,
      },
    });

    if (sensor) {
      sensor = await prisma.sensor.update({
        where: { id: sensor.id },
        data,
      });
    } else {
      sensor = await prisma.sensor.create({ data });
    }

    sensors.push(sensor);
  }

  console.log(`Sensores preparados: ${sensors.length}`);

  // 7. Veinticuatro lecturas: seis por sensor.
  // Las fechas fijas hacen que el seed pueda repetirse sin
  // insertar otra copia de las mismas lecturas.
  const readingsCount = 6;

  for (let sensorIndex = 0; sensorIndex < sensorData.length; sensorIndex++) {
    const config = sensorData[sensorIndex];
    const sensor = sensors[sensorIndex];
    const field = fields[config.fieldIndex];

    for (let day = 0; day < readingsCount; day++) {
      const recordedAt = new Date(
        Date.UTC(2026, 9, day + 1, 12, 0, 0),
      );

      const data = {
        sensorId: sensor.id,
        fieldId: field.id,
        metric: config.metric,
        value: config.values[day],
        unit: config.unit,
        quality: "GOOD",
        recordedAt,
      };

      const existing = await prisma.telemetryReading.findFirst({
        where: {
          sensorId: sensor.id,
          metric: config.metric,
          recordedAt,
        },
      });

      if (existing) {
        await prisma.telemetryReading.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.telemetryReading.create({ data });
      }
    }
  }

  console.log(`Lecturas de telemetría preparadas: ${sensorData.length * readingsCount}`);

  // 8. Cinco análisis de zonas asociados a campos y cultivos reales
  const insightData = [
    {
      fieldIndex: 0,
      cropIndex: 0,
      zoneId: "Z-01",
      finalRiskLevel: "MEDIUM" as const,
      healthScore: 72.5,
      mainCause: "Humedad del suelo en descenso",
      summary: "El cultivo presenta señales moderadas de estrés hídrico.",
      recommendedAction: "Revisar la humedad y ajustar el riego.",
    },
    {
      fieldIndex: 0,
      cropIndex: 0,
      zoneId: "Z-02",
      finalRiskLevel: "LOW" as const,
      healthScore: 88.0,
      mainCause: "Condiciones generales favorables",
      summary: "La zona mantiene indicadores de salud favorables.",
      recommendedAction: "Continuar el monitoreo periódico.",
    },
    {
      fieldIndex: 1,
      cropIndex: 1,
      zoneId: "Z-01",
      finalRiskLevel: "HIGH" as const,
      healthScore: 54.0,
      mainCause: "Temperatura elevada",
      summary: "El cultivo podría estar experimentando estrés térmico.",
      recommendedAction: "Verificar temperatura y humedad del suelo.",
    },
    {
      fieldIndex: 2,
      cropIndex: 2,
      zoneId: "Z-01",
      finalRiskLevel: "LOW" as const,
      healthScore: 91.0,
      mainCause: "Humedad adecuada",
      summary: "Los indicadores disponibles sugieren buenas condiciones.",
      recommendedAction: "Mantener las prácticas de manejo actuales.",
    },
    {
      fieldIndex: 3,
      cropIndex: 3,
      zoneId: "Z-01",
      finalRiskLevel: "MEDIUM" as const,
      healthScore: 69.5,
      mainCause: "Humedad ambiental elevada",
      summary: "Conviene vigilar las condiciones que favorecen enfermedades.",
      recommendedAction: "Inspeccionar el cultivo y mantener el seguimiento.",
    },
  ];

  for (const item of insightData) {
    const data = {
      fieldId: fields[item.fieldIndex].id,
      cropId: crops[item.cropIndex].id,
      zoneId: item.zoneId,
      finalRiskLevel: item.finalRiskLevel,
      healthScore: item.healthScore,
      mainCause: item.mainCause,
      summary: item.summary,
      recommendedAction: item.recommendedAction,
    };

    let insight = await prisma.zoneInsight.findFirst({
      where: {
        fieldId: data.fieldId,
        cropId: data.cropId,
        zoneId: data.zoneId,
      },
    });

    if (insight) {
      insight = await prisma.zoneInsight.update({
        where: { id: insight.id },
        data,
      });
    } else {
      insight = await prisma.zoneInsight.create({ data });
    }
  }

  console.log(`Análisis de zonas preparados: ${insightData.length}`);
  console.log("Seed de AgroVision completado correctamente.");
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
