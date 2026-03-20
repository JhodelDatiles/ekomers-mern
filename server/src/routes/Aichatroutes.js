import express from 'express';
import { protect } from '../middlewares/protect.js';
import { aiChat } from '../controllers/Aichatcontroller.js';

const router = express.Router();

// POST /api/ai-chat
// Requires login — so the bot can fetch this user's orders
router.post('/', protect, aiChat);

export default router;