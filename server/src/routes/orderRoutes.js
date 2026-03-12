import express from 'express';
import { 
  initiatePayMongoCheckout, 
  getUserOrders, 
  getOrderById,
  getOrderByPaymentIntent,
  confirmQrPhOrder,
  confirmDelivery,
  deleteOrder,
  cancelOrder,
} from '../controllers/orderController.js';
import { handlePayMongoWebhook } from '../controllers/webhookController.js';
import { protect } from '../middlewares/protect.js';

const router = express.Router();

// 1. Webhook — public, PayMongo calls this to confirm QR PH orders
router.post('/webhook', handlePayMongoWebhook);

// 2. Checkout session (GCash, Card, Maya, GrabPay)
router.post('/checkout-session', protect, initiatePayMongoCheckout);

// 3. Poll order status by paymentIntentId — public, session may expire at QR screen
router.get('/by-intent/:paymentIntentId', getOrderByPaymentIntent);

// 4. Fallback: confirm QR PH order if webhook didn't fire
router.post('/confirm-qrph', protect, confirmQrPhOrder);

// 5. User orders
router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);

router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/confirm-delivery', protect, confirmDelivery);
router.delete('/:id', protect, deleteOrder);

export default router;