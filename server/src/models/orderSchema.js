import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderId: { 
      type: String, 
      unique: true, 
      default: () => `ORD-${Math.floor(100000 + Math.random() * 900000)}` 
    },
    checkoutSessionId: { type: String },
    paymentIntentId: { type: String }, // ← QR PH orders use this
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
      enum: ['gcash', 'paymaya', 'card', 'grab_pay', 'billease', 'qrph', 'paymongo'], 
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
    },
    isDirectPurchase: { type: Boolean, default: false }
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });       // getUserOrders query
orderSchema.index({ checkoutSessionId: 1 }, { sparse: true }); // webhook dedup
orderSchema.index({ paymentIntentId: 1 }, { sparse: true });   // QR PH polling
const Order = mongoose.model('Order', orderSchema);

export default Order;