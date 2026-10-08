import { Router } from "express";
import { FieldController } from "../controllers/fieldController";

const router = Router();

const fieldController = new FieldController();

router.get("/", fieldController.getFields);

router.get("/farm/:farmId", fieldController.getFieldsByFarmId);

router.get("/:id", fieldController.getFieldById);

router.post("/", fieldController.createField);

router.patch("/:id", fieldController.updateField);

export default router;