import express from 'express';
import { register, login, logout, getCurrentUser, refreshToken } from '../controllers/authController.js';
import { protect } from '../middlewares/protect.js'

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.get('/me', protect, getCurrentUser); // Get current logged-in user

export default router;