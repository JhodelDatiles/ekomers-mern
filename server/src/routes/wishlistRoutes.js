import express from 'express';
import { getWishlist, toggleWishlistItem } from '../controllers/wishlistController.js';
import { protect } from '../middlewares/protect.js';

const router = express.Router();

router.get('/', protect, getWishlist);
router.post('/toggle', protect, toggleWishlistItem);

export default router;