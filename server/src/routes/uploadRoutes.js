import express from "express";
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
} from "../controllers/cloudinaryUploadController.js";
import { upload } from "../config/cloudinary.js";
import { protect, adminOnly } from "../middlewares/protect.js";

const router = express.Router();

// Single image upload
router.post("/single", protect, upload.single("image"), uploadImage);

// Multiple images upload (max 5)
router.post(
  "/multiple",
  protect,
  adminOnly,
  upload.array("images", 5),
  uploadMultipleImages,
);

// Delete image
router.delete("/delete", protect, adminOnly, deleteImage);

export default router;
