import express from 'express';
import { 
  createPaymentIntent, 
  attachPaymentMethod,
  verifyPaymentAndCreateOrder,
  createPaymentMethod,
  createEWalletSource
} from '../controllers/paymentController.js';
import { protect, adminOnly } from '../middlewares/protect.js';

const router = express.Router();

router.post('/create-intent', protect, createPaymentIntent);
router.post('/create-method', protect, createPaymentMethod);
router.post('/attach-method', protect, attachPaymentMethod);
router.post('/verify-and-order', protect, verifyPaymentAndCreateOrder);
router.post('/ewallet-source', protect, createEWalletSource);

export default router;