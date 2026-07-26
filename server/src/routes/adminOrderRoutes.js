import express from 'express';
import { getAllOrders, getOrderUsers, getOrdersByUser, updateOrderStatus } from '../controllers/admin/adminOrderController.js';
import { protect, adminOnly } from '../middlewares/protect.js';

const router = express.Router();

// All users who have orders (with total count) — for the user list
router.get('/users', protect, adminOnly, getOrderUsers);

// Paginated orders for a specific user — loaded when accordion opens
router.get('/by-user/:userId', protect, adminOnly, getOrdersByUser);

// Legacy / full list (kept for other consumers)
router.get('/', protect, adminOnly, getAllOrders);

// Update order status
router.put('/:id', protect, adminOnly, updateOrderStatus);

export default router;