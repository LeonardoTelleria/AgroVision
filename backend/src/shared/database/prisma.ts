
/**
 * =========================================
 * Prisma Client
 * =========================================
 *
 * Instancia central de Prisma para AgroVision.
 *
 * Todo el backend debe utilizar ESTA instancia.
 *
 * NO crear nuevos PrismaClient dentro de:
 * - farms
 * - fields
 * - crops
 * - sensors
 * - telemetry
 * - analysis
 * - vision
 * - alerts
 * - reports
 *
 * Flujo:
 *
 * Service
 *    ↓
 * prisma.ts
 *    ↓
 * Prisma Client
 *    ↓
 * PostgreSQL
 * =========================================
 */

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client";


/**
 * URL principal de PostgreSQL.
 */
const databaseUrl = process.env.DATABASE_URL;


/**
 * Evitamos iniciar AgroVision sin una conexión configurada.
 */
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL no está definida. Configúrala en backend/.env."
  );
}


/**
 * Driver PostgreSQL requerido por Prisma 7.
 */
const adapter = new PrismaPg({
  connectionString: databaseUrl,
});


/**
 * Instancia única del Prisma Client.
 */
export const prisma = new PrismaClient({
  adapter,
});


export default prisma;