import express from "express";
import { getSalesReport } from "../controllers/admin/adminReportController.js";
import { protect, adminOnly } from "../middlewares/protect.js";

const router = express.Router();

router.get("/", protect, adminOnly, getSalesReport);

export default router;
