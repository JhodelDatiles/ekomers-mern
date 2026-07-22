import express from 'express';
import { 
  register, 
  login, 
  logout, 
  getCurrentUser, 
  refreshToken, 
  verifyEmail, 
  forgotPassword, 
  resetPassword, 
  resendVerification
} from '../controllers/authController.js';
import { forgotPasswordLimiter, authLimiter } from '../middlewares/rateLimiter.js';
import { protect } from '../middlewares/protect.js'
import { validatePassword } from "../middlewares/passwordValidation.js"

const router = express.Router();

router.post('/register',authLimiter ,validatePassword('password'), register);
router.post('/login',authLimiter, login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password',forgotPasswordLimiter, forgotPassword);
router.post('/reset-password',forgotPasswordLimiter ,validatePassword('newPassword'), resetPassword);
router.post('/resend-verification',forgotPasswordLimiter, resendVerification);
router.get('/me', protect, getCurrentUser);
router.get('/verify-email/:token', verifyEmail);



export default router;