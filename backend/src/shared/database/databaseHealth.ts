/** Comprobación aislada de conectividad con PostgreSQL mediante Prisma. */
import prisma from "./prisma";

export type DatabaseHealthStatus = "UP" | "DOWN";

export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "UP";
  } catch {
    return "DOWN";
  }
}
