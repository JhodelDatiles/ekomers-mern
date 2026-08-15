import express from "express";
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
} from "../controllers/uploadController.js";
import { upload } from "../config/cloudinary.js";
import { protect, adminOnly } from "../middlewares/protect.js";

const router = express.Router();

router.post("/single", protect, upload.single("image"), uploadImage);

router.post(
  "/multiple",
  protect,
  adminOnly,
  upload.array("images", 5),
  uploadMultipleImages,
);

router.delete("/delete", protect, adminOnly, deleteImage);

export default router;
