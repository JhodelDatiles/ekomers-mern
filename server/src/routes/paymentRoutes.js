import express from 'express';
import { 
  createQrPhPayment,
  checkPaymentIntentStatus,
} from '../controllers/paymentController.js';
import { protect, adminOnly } from '../middlewares/protect.js';

const router = express.Router();

router.post('/qrph', protect, createQrPhPayment);
router.get('/qrph/status/:paymentIntentId', protect, checkPaymentIntentStatus);

export default router;