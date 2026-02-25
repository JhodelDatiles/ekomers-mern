import express from 'express';
import { protect } from '../middlewares/protect.js';
import Review from '../models/reviewSchema.js';
import Product from '../models/productSchema.js';

const router = express.Router();

// POST /api/reviews - Create a review
router.post('/', protect, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Check if user already reviewed
    const existingReview = await Review.findOne({ 
      productId, 
      userId: req.user.id 
    });
    
    if (existingReview) {
      return res.status(400).json({ message: "You already reviewed this product" });
    }
    
    const review = new Review({
      productId,
      userId: req.user.id,
      rating,
      comment
    });
    
    await review.save();
    
    res.status(201).json({ 
      message: "Review submitted successfully", 
      review 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating review" });
  }
});

// GET /api/reviews/product/:productId - Get all reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .populate('userId', 'username profilePic')
      .sort({ createdAt: -1 });
    
    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;
    
    res.status(200).json({
      reviews,
      totalReviews: reviews.length,
      averageRating: avgRating.toFixed(1)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching reviews" });
  }
});

// PUT /api/reviews/:id - Update user's own review
router.put('/:id', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    // Ensure user owns this review
    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to edit this review" });
    }
    
    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    
    await review.save();
    
    res.status(200).json({ 
      message: "Review updated successfully", 
      review 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating review" });
  }
});

// DELETE /api/reviews/:id - Delete user's own review
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }
    
    // Ensure user owns this review
    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this review" });
    }
    
    await Review.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting review" });
  }
});

export default router;