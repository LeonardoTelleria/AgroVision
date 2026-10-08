/** Router reservado para los endpoints REST de TelemetryReading. */
import { Router } from "express";

const router = Router();

// POST / y POST /batch
// GET /sensor/:sensorId
// GET /field/:fieldId y GET /field/:fieldId/latest
// No se registran handlers hasta implementar el controller con Prisma.

export default router;
