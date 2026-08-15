import express from 'express';
import { 
  createQrPhPayment,
  checkPaymentIntentStatus,
  getOrderByPaymentIntent,
  confirmQrPhOrder,
} from '../controllers/qrPhController.js';
import { handlePayMongoWebhook } from '../controllers/webhookController.js';
import { protect } from '../middlewares/protect.js';

const router = express.Router();

router.post('/webhook', handlePayMongoWebhook);

router.post('/qrph', protect, createQrPhPayment);
router.get('/qrph/status/:paymentIntentId', protect, checkPaymentIntentStatus);
router.get('/qrph/by-intent/:paymentIntentId', getOrderByPaymentIntent);
router.post('/qrph/confirm', protect, confirmQrPhOrder);

export default router;