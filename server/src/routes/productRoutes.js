import express from 'express';
import { getProducts, getProductById, getCategories } from '../controllers/productController.js';

const router = express.Router();

// Public routes
router.get('/', getProducts); // With search & filters
router.get('/categories', getCategories);
router.get('/:id', getProductById);

export default router;