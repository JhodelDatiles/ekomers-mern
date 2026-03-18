import express from 'express';
import { protect } from '../middlewares/protect.js';
import { chat } from '../controllers/chatController.js';

const router = express.Router();

// POST /api/chat — protected, requires login
router.post('/', protect, chat);

export default router;