import express from 'express';
import { 
  getAllUsers, getUserById, adminUpdateUser, adminDeleteUser,
  getStoreSettings, updateStoreSettings, getSalesReport, adminGetProducts
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middlewares/protect.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// Publicly accessible
router.get('/settings', getStoreSettings);

router.put('/settings', protect, adminOnly, upload.single('logo'), updateStoreSettings);

// User Management
router.get('/admin/users', protect, adminOnly, getAllUsers);
router.get('/admin/users/:id', protect, adminOnly, getUserById);
router.put('/admin/users/:id', protect, adminOnly, adminUpdateUser);
router.delete('/admin/users/:id', protect, adminOnly, adminDeleteUser);

// Sales Report
router.get('/admin/sales-report', protect, adminOnly, getSalesReport);

// Admin Product Listing (paginated)
router.get('/admin/products-list', protect, adminOnly, adminGetProducts);

export default router;