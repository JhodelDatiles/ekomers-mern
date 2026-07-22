// userRoutes.js
import express from 'express';
import { 
  getProfile, 
  updateProfile, 
  requestSecurityCode, 
  verifyPasswordChange, 
  verifyAccountDeletion // Make sure this matches the controller
} from '../controllers/userController.js';
import { protect } from '../middlewares/protect.js';
import {forgotPasswordLimiter} from "../middlewares/rateLimiter.js"
import {validatePassword} from "../middlewares/passwordValidation.js"

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/request-code',forgotPasswordLimiter , protect, requestSecurityCode);
router.post('/verify-password',forgotPasswordLimiter ,validatePassword('new'), protect, verifyPasswordChange);
router.post('/verify-delete',forgotPasswordLimiter , protect, verifyAccountDeletion);

export default router;