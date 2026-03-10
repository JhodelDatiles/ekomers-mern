import axios from 'axios';
import Order from '../models/orderSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import User from '../models/userSchema.js';
import PendingPayment from '../models/pendingPaymentSchema.js';
import { sendOrderConfirmation } from '../services/emailService.js';
import { config } from '../envconfig.js';

export const initiatePayMongoCheckout = async (req, res) => {
  try {
    const { items, shippingInfo, isDirectPurchase } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items selected for checkout" });
    }

    const isDirect = isDirectPurchase || (items[0]?._id && String(items[0]._id).startsWith('direct'));

    const metadata = {
      userId: String(req.user.id),
      cartItemIds: isDirect ? "DIRECT_BUY" : items.map(item => item._id).join(','),
      directItemData: isDirect ? JSON.stringify(items.map(item => ({
        pId: item.productId?._id || item.productId,
        n: item.productId?.name || item.name,
        pr: item.price,
        q: item.quantity,
        s: item.size,
      }))) : "",
      fullName: String(shippingInfo.fullName || ""),
      address: String(shippingInfo.address || ""),
      city: String(shippingInfo.city || ""),
      postalCode: String(shippingInfo.postalCode || ""),
      contactNumber: String(shippingInfo.contactNumber || ""),
      instructions: String(shippingInfo.deliveryInstructions || "")
    };

    const secretKey = config.paymongoSecret.trim();
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const lineItems = items.map(item => ({
      currency: 'PHP',
      amount: Math.round(item.price * 100),
      name: item.productId?.name || item.name,
      quantity: item.quantity,
      description: `Size: ${item.size || 'N/A'}`
    }));

    const options = {
      method: 'POST',
      url: 'https://api.paymongo.com/v1/checkout_sessions',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        authorization: authHeader
      },
      data: {
        data: {
          attributes: {
            send_email_receipt: true,
            show_line_items: true,
            payment_method_types: ['gcash', 'paymaya', 'card', 'grab_pay'],
            line_items: lineItems,
            success_url: `${config.clientUrl}/payment-success`,
            cancel_url: `${config.clientUrl}/checkout?payment=cancelled`,
            metadata: metadata
          }
        }
      }
    };

    const response = await axios.request(options);
    res.status(200).json({ checkoutUrl: response.data.data.attributes.checkout_url });

  } catch (error) {
    console.error("❌ PAYMONGO ERROR:", error.response?.data || error.message);
    res.status(500).json({ message: "Payment initialization failed" });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'name images');
    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('items.productId', 'name images price');
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Error fetching order" });
  }
};

export const confirmDelivery = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.status = "Delivered";
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    console.error("Validation Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const deleted = await Order.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ message: "Order purged from manifest" });
  } catch (error) {
    res.status(500).json({ message: "Server error during deletion" });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const protectedStatuses = ['shipped', 'shipped/in transit', 'out for delivery', 'completed'];
    if (protectedStatuses.includes(order.status.toLowerCase())) {
      return res.status(400).json({
        message: "Order cannot be cancelled as it is already being processed/shipped."
      });
    }

    order.status = 'Cancellation Requested';
    await order.save();

    res.status(200).json({
      message: "Cancellation request sent to admin.",
      order
    });
  } catch (error) {
    console.error("❌ CANCEL ERROR:", error);
    res.status(500).json({ message: "Failed to request cancellation" });
  }
};

// ─────────────────────────────────────────────────────────────────
// CONFIRM QR PH ORDER — frontend fallback when webhook doesn't fire
// Looks up PendingPayment, verifies with PayMongo, creates real Order
// ─────────────────────────────────────────────────────────────────
export const confirmQrPhOrder = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'paymentIntentId required' });
    }

    // ✅ Check if webhook already created the Order
    const existingOrder = await Order.findOne({ paymentIntentId });
    if (existingOrder) {
      if (String(existingOrder.userId) !== String(userId)) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      console.log(`✅ Order already created by webhook: ${existingOrder._id}`);
      return res.status(200).json({ order: existingOrder, alreadyConfirmed: true });
    }

    // ✅ Look up PendingPayment
    const pending = await PendingPayment.findOne({ paymentIntentId });
    if (!pending) {
      console.error(`❌ No PendingPayment found for ${paymentIntentId}`);
      return res.status(404).json({ message: 'Payment session not found or already expired' });
    }

    if (String(pending.userId) !== String(userId)) {
      console.error('🚨 userId mismatch — possible fraud');
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // ✅ Verify payment with PayMongo server-to-server
    const secretKey = config.paymongoSecret.trim();
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
    const intentRes = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      { headers: { authorization: authHeader } }
    );
    const piStatus = intentRes.data.data.attributes.status;
    console.log(`🔍 Intent ${paymentIntentId} status: ${piStatus}`);

    if (piStatus !== 'succeeded') {
      return res.status(400).json({ message: `Payment not confirmed. Status: ${piStatus}` });
    }

    // ✅ Create real Order from PendingPayment data
    const newOrder = await Order.create({
      userId: pending.userId,
      paymentIntentId,
      items: pending.items,
      totalAmount: pending.totalAmount,
      shippingInfo: pending.shippingInfo,
      isDirectPurchase: pending.isDirectPurchase,
      paymentMethod: 'qrph',
      paymentStatus: 'paid',
      status: 'Order in Progress'
    });

    // Atomic stock deduction
    for (const item of pending.items) {
      if (item.productId && item.size) {
        await Product.findOneAndUpdate(
          { _id: item.productId, 'sizes.size': item.size, 'sizes.stock': { $gte: item.quantity } },
          { $inc: { 'sizes.$.stock': -item.quantity } }
        );
      }
    }

    // Remove purchased items from cart (skip for direct/buy-now)
    if (!pending.isDirectPurchase) {
      const cartItemIds = pending.cartItemIds || [];
      if (cartItemIds.length > 0) {
        await Cart.findOneAndUpdate(
          { userId },
          { $pull: { items: { _id: { $in: cartItemIds } } } }
        );
      }
      const updatedCart = await Cart.findOne({ userId });
      if (updatedCart) {
        updatedCart.totalAmount = updatedCart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        await updatedCart.save();
      }
    }

    // ✅ Delete PendingPayment — Order now exists
    await PendingPayment.deleteOne({ paymentIntentId });
    console.log(`🗑️ PendingPayment cleaned up for intent ${paymentIntentId}`);

    try {
      const user = await User.findById(userId);
      if (user?.email) await sendOrderConfirmation(newOrder, user);
    } catch (emailErr) {
      console.error('📧 Email failed:', emailErr.message);
    }

    console.log(`✅ QR PH order confirmed via fallback: ${newOrder._id}`);
    res.status(200).json({ order: newOrder });

  } catch (error) {
    console.error('❌ confirmQrPhOrder error:', error.message);
    res.status(500).json({ message: 'Failed to confirm order', error: error.message });
  }
};

// Poll order status by paymentIntentId — returns 404 (pending) until Order exists
export const getOrderByPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const order = await Order.findOne({
      paymentIntentId,
      userId: req.user.id
    });
    if (!order) return res.status(404).json({ status: 'pending' });
    res.status(200).json({ status: order.paymentStatus, orderId: order._id });
  } catch (error) {
    res.status(500).json({ message: 'Error checking order status' });
  }
};