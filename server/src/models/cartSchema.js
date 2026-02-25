import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    // userId links this cart to a specific user
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    items: [{
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
      },
      quantity: { 
        type: Number, 
        required: true, 
        min: [1, 'Quantity cannot be less than 1.'] 
      },
      price: { type: Number, required: true },
      size: String,
      color: String
    }],
    totalAmount: { 
      type: Number, 
      required: true, 
      default: 0 
    }
  },
  { timestamps: true }
);

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;