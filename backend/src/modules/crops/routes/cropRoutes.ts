import { Router } from "express";
import { CropProfileController } from "../controllers/cropProfileControllers";
import { CropController } from "../controllers/cropController";

const router = Router();
const controller = new CropController();
const profileController = new CropProfileController();

router.get("/cycles", controller.getCrops);
router.get("/cycles/:id", controller.getCropById);
router.get("/field/:fieldId", controller.getCropsByFieldId);
router.post("/cycles", controller.createCrop);
router.patch("/cycles/:id", controller.updateCrop);

// Conservamos las rutas existentes del catálogo de perfiles.
router.get("/", profileController.getAllProfiles);
router.get("/:type", profileController.getProfileByType);

export default router;
