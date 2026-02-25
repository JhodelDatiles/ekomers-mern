import express from 'express';
import { getAllOrders, updateOrderStatus } from '../controllers/adminOrderController.js';
import { protect, adminOnly } from '../middlewares/protect.js';

const router = express.Router();

// Get all global orders for the Admin Manifest
// Final URL: /api/admin/orders
router.get('/', protect, adminOnly, getAllOrders);

// Update status (e.g., from 'Order in Progress' to 'Shipped')
// Final URL: /api/admin/orders/:id
router.put('/:id', protect, adminOnly, updateOrderStatus);

export default router;