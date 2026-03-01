import express from 'express';
import { 
  initiatePayMongoCheckout, 
  getUserOrders, 
  getOrderById,
  confirmDelivery,
  deleteOrder,
  cancelOrder,
} from '../controllers/orderController.js';
import { protect } from '../middlewares/protect.js';
import { handlePayMongoWebhook,   confirmQrPhOrder } from '../controllers/webhookController.js';

const router = express.Router();

// 1. Webhook: MUST be public so PayMongo can hit it
router.post('/webhook', handlePayMongoWebhook);

// 2. QR PH direct confirmation — frontend calls this after polling detects success
router.post('/confirm-qrph', protect, confirmQrPhOrder);

// 3. Checkout
router.post('/checkout-session', protect, initiatePayMongoCheckout);

// 4. User orders
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);

router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/confirm-delivery', protect, confirmDelivery);
router.delete('/:id', protect, deleteOrder);

export default router;