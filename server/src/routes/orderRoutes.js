import express from 'express';
import { 
  initiatePayMongoCheckout, 
  getUserOrders, 
  getOrderById,
  confirmDelivery,
  deleteOrder,
  cancelOrder,
  confirmQrPhOrder    ,
  getOrderByPaymentIntent  // ← route handler from orderController
} from '../controllers/orderController.js';
import { handlePayMongoWebhook } from '../controllers/webhookController.js'; // ← only the webhook handler
import { protect } from '../middlewares/protect.js';

const router = express.Router();

// 1. Webhook: MUST be public — no protect middleware
router.post('/webhook', handlePayMongoWebhook);

// 2. QR PH confirmation — frontend calls after polling detects success
router.post('/confirm-qrph', protect, confirmQrPhOrder);

// 3. Checkout session (GCash, Card, Maya, GrabPay)
router.post('/checkout-session', protect, initiatePayMongoCheckout);

router.get('/by-intent/:paymentIntentId', protect, getOrderByPaymentIntent);


// 4. User orders
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);

router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/confirm-delivery', protect, confirmDelivery);
router.delete('/:id', protect, deleteOrder);

export default router;