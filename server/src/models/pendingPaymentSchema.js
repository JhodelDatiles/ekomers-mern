import mongoose from 'mongoose';

const pendingPaymentSchema = new mongoose.Schema({
  paymentIntentId: {
      type: String,
      required: true,
      unique: true
  },
  userId: {
     type: mongoose.Schema.Types.ObjectId, 
     ref: 'User', 
     required: true 
  },
  items: [{ 
    productId: mongoose.Schema.Types.ObjectId,
    name: String, 
    price: Number, 
    quantity: Number, 
    size: String, 
    image: String
  }],
  totalAmount: { 
    type: Number, 
    required: true 
  },
  shippingInfo: {
    fullName: String, 
    address: String, 
    city: String,
    postalCode: String, 
    contactNumber: String, 
    deliveryInstructions: String
  },
  isDirectPurchase: { 
    type: Boolean, 
    default: false 
  },
  cartItemIds: [String],
  createdAt: { type: Date, default: Date.now, expires: 3600  } // auto-delete after 1hr
}, { timestamps: false });

export default mongoose.model('PendingPayment', pendingPaymentSchema);