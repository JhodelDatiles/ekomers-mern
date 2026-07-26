import express from 'express';
import { adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminGetProducts } from '../controllers/admin/adminProductController.js';
import { protect, adminOnly } from '../middlewares/protect.js';

const router = express.Router();

router.get('/', protect, adminOnly, adminGetProducts);
router.post('/', protect, adminOnly, adminCreateProduct);
router.put('/:id', protect, adminOnly, adminUpdateProduct);
router.delete('/:id', protect, adminOnly, adminDeleteProduct);

export default router;