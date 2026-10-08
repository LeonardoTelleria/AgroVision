import { Router } from "express";
import { CropProfileController } from "../controllers/cropProfileControllers";
import {CropController} from "../controllers/cropController";

const router = Router();

const controller = new CropController();
const profileController = new CropProfileController();
// // Trae todos los perfiles al consultar /api/crops
// router.get("/", controller.getAllProfiles);
// // Trae un perfil específico al consultar /api/crops/RED_BEAN
// router.get("/:type", controller.getProfileByType);

// export default router;

router.get("/cycles",  controller.getCrops);

router.get("/", profileController.getAllProfiles);

router.get("/:type", profileController.getProfileByType);

export default router;

