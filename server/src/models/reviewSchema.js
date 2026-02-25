import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Product', 
      required: true 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    rating: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    comment: { 
      type: String, 
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    }
  },
  { timestamps: true } // Handles createdAt and updatedAt
);

// This ensures a unique combination of user and product
// One user = One review per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;