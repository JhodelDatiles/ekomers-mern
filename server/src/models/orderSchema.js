import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderId: { 
      type: String, 
      unique: true, 
      default: () => `ORD-${Math.floor(100000 + Math.random() * 900000)}` 
    },
    checkoutSessionId: { type: String },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    items: [{
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      size: String,
      color: String
    }],
    shippingInfo: {
      fullName: { type: String }, 
      address: { type: String, required: true },
      city: { type: String },     
      postalCode: { type: String }, 
      contactNumber: { type: String, required: true },
      deliveryInstructions: { type: String }
    },
    paymentMethod: { 
      type: String, 
      enum: ['gcash', 'paymaya', 'card', 'grab_pay', 'billease'], 
      required: true 
    },
    paymentStatus: { 
      type: String, 
      enum: ['pending', 'paid', 'failed'], 
      default: 'pending' 
    },
    status: { 
      type: String, 
      enum: [
        'Pending', 
        'Order in Progress', 
        'Shipped/In Transit', 
        'Out for Delivery', 
        'Delivered', // <--- ADD THIS EXACTLY
        'Completed', // 🚀 ADDED THIS
        'Cancelled', // 🚀 ADDED THIS
        'Exception/Failed',
        'Cancellation Requested' // 👈 ADD THIS LINE EXACTLY
      ], 
      default: 'Pending' 
    },
    totalAmount: { type: Number, required: true },
    waybillId: { 
      type: String, 
      default: () => `WB-${Math.random().toString(36).substr(2, 9).toUpperCase()}` 
    }
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;