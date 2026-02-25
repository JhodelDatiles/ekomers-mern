import express from 'express';
import { 
  getCart, 
  addToCart, 
  removeFromCart, 
  clearCart, // Add this to your cartController.js
  updateCartItem
} from '../controllers/cartController.js';
import { protect } from '../middlewares/protect.js';

const router = express.Router();

router.get('/', protect, getCart);
router.post('/', protect, addToCart);

// 🚀 NEW: Clear entire cart (used after successful payment)
router.delete('/clear', protect, clearCart); 
router.put('/:itemId', protect, updateCartItem);

router.delete('/:itemId', protect, removeFromCart);

export default router;