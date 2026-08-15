import express from 'express';
import { 
  initiatePayMongoCheckout, 
  getUserOrders, 
  getOrderById,
  confirmDelivery,
  deleteOrder,
  cancelOrder,
} from '../controllers/customerOrderController.js';
import { protect } from '../middlewares/protect.js';

const router = express.Router();

router.post('/checkout-session', protect, initiatePayMongoCheckout);

router.get('/', protect, getUserOrders);
router.get('/:id', protect, getOrderById);

router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/confirm-delivery', protect, confirmDelivery);
router.delete('/:id', protect, deleteOrder);

export default router;