import express from 'express';
import { register, login, logout, getCurrentUser, refreshToken, verifyEmail, forgotPassword, resetPassword, resendVerification} from '../controllers/authController.js';
import { protect } from '../middlewares/protect.js'

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/resend-verification', resendVerification);
router.get('/me', protect, getCurrentUser);
router.get('/verify-email/:token', verifyEmail);



export default router;