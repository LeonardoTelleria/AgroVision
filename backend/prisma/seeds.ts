/*   → Carga los datos iniciales de desarrollo
   Sirve para levantar una BD funcional rápidamente sin
   depender de los mocks locales.
   
   Aqui no va a vivir la logica central de la BD, por ahora se usa para poder probarla inicialmente
   */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida. Configúrala en backend/.env."
  );
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Iniciando seed de AgroVision...");

  //*Crear usuario base
  const user = await prisma.user.upsert({
    where: {
      email: "admin@agrovision.com",
    },
    update: {},
    create: {
      fullName: "Administrador AgroVision",
      email: "admin@agrovision.com",
      passwordHash: "seed-password",
      role: "ADMIN",
    },
  });

  console.log(`Usuario creado/encontrado: ${user.email}`);

  //*Crear finca
  const farm = await prisma.farm.create({
    data: {
      ownerId: user.id,
      name: "Finca AgroVision",
      location: "Chinandega, Nicaragua",
      totalAreaSquareMeters: 450000,
    },
  });

  console.log(`Finca creada: ${farm.name}`);

  //*Crear campos
  const fields = await prisma.field.createMany({
    data: [
      {
        farmId: farm.id,
        name: "Lote Norte - Maíz",
        areaSquareMeters: 120000,
        soilType: "LOAMY",
        irrigationType: "DRIP",
        status: "ACTIVE",
      },
      {
        farmId: farm.id,
        name: "Lote Sur - Tomate",
        areaSquareMeters: 85000,
        soilType: "CLAY",
        irrigationType: "SPRINKLER",
        status: "ACTIVE",
      },
    ],
  });

  console.log(`Campos creados: ${fields.count}`);

  console.log("Seed completado correctamente.");
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });