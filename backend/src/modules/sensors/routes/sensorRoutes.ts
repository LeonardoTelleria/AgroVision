import { Router } from "express";
import { SensorController } from "../controllers/sensorController";

const router = Router();
const controller = new SensorController();

router.get("/", controller.getSensors);
router.get("/field/:fieldId", controller.getSensorsByFieldId);
router.get("/:id", controller.getSensorById);
router.post("/", controller.createSensor);
router.patch("/:id", controller.updateSensor);

export default router;
