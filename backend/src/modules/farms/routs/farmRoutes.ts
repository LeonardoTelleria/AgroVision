import { Router } from "express";
import { FarmController } from "../controllers/farmController";

const router = Router();

const farmController = new FarmController();

router.get("/", farmController.getFarms);

router.get("/overview", farmController.getFarmOverview);

router.get("/:id", farmController.getFarmById);

router.post("/", farmController.createFarm);

router.patch("/:id", farmController.updateFarm);

export default router;