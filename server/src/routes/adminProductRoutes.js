import express from 'express';
import { adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '../controllers/adminProductController.js';
import { protect, adminOnly } from '../middlewares/protect.js';

const router = express.Router();

// All routes require admin authentication
// Change '/products' to '/'
router.post('/', protect, adminOnly, adminCreateProduct);

// Change '/products/:id' to '/:id'
router.put('/:id', protect, adminOnly, adminUpdateProduct);
router.delete('/:id', protect, adminOnly, adminDeleteProduct);

export default router;