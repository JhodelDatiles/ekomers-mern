import axios from 'axios';
import crypto from 'crypto';
import Order from '../models/orderSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import User from '../models/userSchema.js';
import { sendOrderConfirmation } from '../services/emailService.js';
import {config} from '../envconfig.js';

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
        img: item.productId?.images?.[0]?.url || item.productId?.images?.[0] || item.image
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
    const order = await Order.findById(req.params.id);
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
    await Order.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Order purged from manifest" });
  } catch (error) {
    res.status(500).json({ message: "Server error during deletion" });
  }
};

// ─────────────────────────────────────────────────────────────────
// CANCEL ORDER — auto-approve, restore stock, trigger PayMongo refund
// User can cancel anytime before shipment is arranged
// ─────────────────────────────────────────────────────────────────
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    // Validate reason is provided
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Cancellation reason is required." });
    }

    const order = await Order.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Block cancellation if already shipped or beyond
    const blockedStatuses = [
      'Shipped/In Transit', 
      'Out for Delivery', 
      'Delivered', 
      'Completed', 
      'Cancelled'
    ];
    if (blockedStatuses.includes(order.status)) {
      return res.status(400).json({ 
        message: "Cannot cancel — order has already been shipped or completed." 
      });
    }

    // ── 1. RESTORE STOCK ──
    const stockUpdates = order.items.map(item => {
      if (!item.productId) return Promise.resolve();
      return Product.updateOne(
        { _id: item.productId, "sizes.size": item.size },
        { $inc: { "sizes.$.stock": item.quantity } } // +quantity to restore
      );
    });
    await Promise.all(stockUpdates);
    console.log(`✅ Stock restored for order ${order._id}`);

    // ── 2. PAYMONGO REFUND (only for supported payment methods) ──
    // QR PH (InstaPay/PESONet) and GrabPay cannot be refunded via API.
    // Those require manual bank transfer back to the customer.
    const AUTO_REFUNDABLE = ['gcash', 'paymaya', 'card'];
    const canAutoRefund = order.paymentStatus === 'paid' && AUTO_REFUNDABLE.includes(order.paymentMethod);
    const needsManualRefund = order.paymentStatus === 'paid' && !canAutoRefund;

    let refundId = null;

    if (canAutoRefund) {
      try {
        const secretKey = config.paymongoSecret.trim();
        const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

        // Get the actual payment ID from the checkout session
        let paymentId = null;
        if (order.checkoutSessionId) {
          const sessionRes = await axios.get(
            `https://api.paymongo.com/v1/checkout_sessions/${order.checkoutSessionId}`,
            { headers: { authorization: authHeader } }
          );
          const payments = sessionRes.data.data.attributes.payments;
          if (payments && payments.length > 0) {
            paymentId = payments[0].id;
          }
        }

        if (paymentId) {
          const refundRes = await axios.post(
            'https://api.paymongo.com/v1/refunds',
            {
              data: {
                attributes: {
                  amount: Math.round(order.totalAmount * 100),
                  payment_id: paymentId,
                  reason: 'others',
                  notes: reason.trim()
                }
              }
            },
            { headers: { authorization: authHeader, 'Content-Type': 'application/json' } }
          );
          refundId = refundRes.data.data.id;
          console.log(`💸 PayMongo refund triggered: ${refundId} for order ${order._id}`);
        } else {
          console.warn(`⚠️ Could not find payment ID for order ${order._id} — refund skipped`);
        }
      } catch (refundErr) {
        console.error(`❌ PayMongo refund failed for order ${order._id}:`, refundErr.response?.data || refundErr.message);
      }
    } else if (needsManualRefund) {
      // QR PH / GrabPay — log it so admin knows to refund manually
      console.log(`⚠️ Manual refund required for order ${order._id} (method: ${order.paymentMethod}, amount: ₱${order.totalAmount})`);
    }

    // ── 3. UPDATE ORDER ──
    order.status = 'Cancelled';
    order.paymentStatus = refundId ? 'refunded' : (needsManualRefund ? 'refund_pending' : order.paymentStatus);
    order.cancellationReason = reason.trim();
    order.cancelledAt = new Date();
    order.refundId = refundId;
    await order.save();

    console.log(`✅ Order ${order._id} cancelled. Reason: "${reason}". Refund: ${refundId || (needsManualRefund ? 'MANUAL REQUIRED' : 'N/A')}`);

    res.status(200).json({ 
      message: "Order cancelled successfully.",
      refundTriggered: !!refundId,
      needsManualRefund,
      refundId,
      order
    });

  } catch (error) {
    console.error("❌ CANCEL ERROR:", error);
    res.status(500).json({ message: "Failed to cancel order." });
  }
};

// ─────────────────────────────────────────────────────────────────
// CONFIRM QR PH ORDER — frontend fallback after polling succeeds
// ─────────────────────────────────────────────────────────────────
export const confirmQrPhOrder = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'paymentIntentId required' });
    }

    const secretKey = config.paymongoSecret.trim();
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
    const intentRes = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      { headers: { authorization: authHeader } }
    );
    const piStatus = intentRes.data.data.attributes.status;
    const piMetadata = intentRes.data.data.attributes.metadata;

    console.log(`🔍 Intent ${paymentIntentId} status: ${piStatus}`);

    if (piStatus !== 'succeeded') {
      return res.status(400).json({ message: `Payment not confirmed. Status: ${piStatus}` });
    }

    if (piMetadata?.userId && String(piMetadata.userId) !== String(userId)) {
      console.error('🚨 userId mismatch — possible fraud');
      return res.status(403).json({ message: 'Unauthorized' });
    }

    let pendingOrder = await Order.findOne({ paymentIntentId });

    if (pendingOrder) {
      if (String(pendingOrder.userId) !== String(userId)) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
      if (pendingOrder.paymentStatus === 'paid') {
        console.log(`✅ Order already confirmed (webhook was first): ${pendingOrder._id}`);
        return res.status(200).json({ order: pendingOrder, alreadyConfirmed: true });
      }
      pendingOrder.paymentStatus = 'paid';
      pendingOrder.status = 'Order in Progress';
      await pendingOrder.save();
    } else {
      console.error(`❌ No order found for ${paymentIntentId} but payment succeeded`);
      return res.status(200).json({ message: 'Payment confirmed but order record missing. Please contact support.', alreadyConfirmed: true });
    }

    for (const item of pendingOrder.items) {
      if (item.productId && item.size) {
        await Product.updateOne(
          { _id: item.productId, 'sizes.size': item.size },
          { $inc: { 'sizes.$.stock': -item.quantity } }
        );
      }
    }

    if (!pendingOrder.isDirectPurchase) {
      const paidProductIds = pendingOrder.items.map(i => String(i.productId));
      await Cart.findOneAndUpdate(
        { userId },
        { $pull: { items: { productId: { $in: paidProductIds } } } }
      );
      const updatedCart = await Cart.findOne({ userId });
      if (updatedCart) {
        updatedCart.totalAmount = updatedCart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        await updatedCart.save();
      }
    }

    try {
      const user = await User.findById(userId);
      if (user?.email) await sendOrderConfirmation(pendingOrder, user);
    } catch (emailErr) {
      console.error('📧 Email failed:', emailErr.message);
    }

    console.log(`✅ QR PH order confirmed: ${pendingOrder._id}`);
    res.status(200).json({ order: pendingOrder });

  } catch (error) {
    console.error('❌ confirmQrPhOrder error:', error.message);
    res.status(500).json({ message: 'Failed to confirm order', error: error.message });
  }
};

// Poll order status by paymentIntentId
export const getOrderByPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const order = await Order.findOne({ paymentIntentId });
    if (!order) return res.status(404).json({ status: 'pending' });
    res.status(200).json({ status: order.paymentStatus, orderId: order._id });
  } catch (error) {
    res.status(500).json({ message: 'Error checking order status' });
  }
};