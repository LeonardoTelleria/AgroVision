/**
 * =========================================
 * Prisma Config
 * =========================================
 *
 * Configuración oficial de Prisma para AgroVision.
 *
 * Responsabilidades:
 * - localizar el schema;
 * - localizar las migraciones;
 * - obtener la conexión PostgreSQL;
 * - centralizar la configuración del CLI.
 * =========================================
 */

import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida. Configúrala en backend/.env."
  );
}

export default {
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seeds.ts",
  },

  datasource: {
    url: databaseUrl,
  },
};
