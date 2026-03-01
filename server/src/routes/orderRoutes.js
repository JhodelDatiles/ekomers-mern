import express from 'express';
import { 
  initiatePayMongoCheckout, 
  getUserOrders, 
  getOrderById,
  confirmDelivery,
  deleteOrder,
  cancelOrder // Ensure this is exported in orderController.js
} from '../controllers/orderController.js';
import { handlePayMongoWebhook } from '../controllers/webhookController.js'; // ← fixed import
import { protect } from '../middlewares/protect.js';

const router = express.Router();

// 1. Webhook: MUST be public so PayMongo can hit it
// It is handled BEFORE any 'protect' middleware
router.post('/webhook', handlePayMongoWebhook);

// 2. Checkout: Initiates PayMongo Session
router.post('/checkout-session', protect, initiatePayMongoCheckout);

// 3. User History & Logistics
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);

// 🚀 NEW: Logistics for the user to confirm they received the item
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/confirm-delivery', protect, confirmDelivery);
router.delete('/:id', protect, deleteOrder);

export default router;