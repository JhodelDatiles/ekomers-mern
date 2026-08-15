import express from "express";
import {
  getStoreSettings,
  updateStoreSettings,
} from "../controllers/admin/adminSettingsController.js";
import { protect, adminOnly } from "../middlewares/protect.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

router.get("/", getStoreSettings);
router.put("/", protect, adminOnly, upload.single("logo"), updateStoreSettings);

export default router;
