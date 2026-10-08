import { Router } from "express";
import { TelemetryController } from "../controllers/telemetryController";

const router = Router();
const controller = new TelemetryController();

router.post("/", controller.createReading);
router.post("/batch", controller.createReadingsBatch);
router.get("/sensor/:sensorId", controller.getReadingsBySensorId);
router.get("/field/:fieldId/latest", controller.getLatestReadingsByFieldId);
router.get("/field/:fieldId", controller.getReadingsByFieldId);

export default router;
