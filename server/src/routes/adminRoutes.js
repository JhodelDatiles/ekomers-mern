import express from 'express';
import { 
  getAllUsers, getUserById, adminUpdateUser, adminDeleteUser,
  getStoreSettings, updateStoreSettings 
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middlewares/protect.js';
import { upload } from '../config/cloudinary.js'; // Ensure this points to your multer-cloudinary config

const router = express.Router();

// Publicly accessible
router.get('/settings', getStoreSettings);

// CRITICAL FIX: Added upload.single('logo') middleware here
router.put('/settings', protect, adminOnly, upload.single('logo'), updateStoreSettings);

// User Management
router.get('/admin/users', protect, adminOnly, getAllUsers);
router.get('/admin/users/:id', protect, adminOnly, getUserById);
router.put('/admin/users/:id', protect, adminOnly, adminUpdateUser);
router.delete('/admin/users/:id', protect, adminOnly, adminDeleteUser);

export default router;