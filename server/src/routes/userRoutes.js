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

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/request-code', protect, requestSecurityCode);
router.post('/verify-password', protect, verifyPasswordChange);
router.post('/verify-delete', protect, verifyAccountDeletion);

export default router;