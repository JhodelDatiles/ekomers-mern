import express from "express";
import {
  getAllUsers,
  getUserById,
  adminUpdateUser,
  adminDeleteUser,
} from "../controllers/admin/adminUserController.js";
import { protect, adminOnly } from "../middlewares/protect.js";

const router = express.Router();

router.get("/", protect, adminOnly, getAllUsers);
router.get("/:id", protect, adminOnly, getUserById);
router.put("/:id", protect, adminOnly, adminUpdateUser);
router.delete("/:id", protect, adminOnly, adminDeleteUser);

export default router;
