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

export const handlePayMongoWebhook = async (req, res) => {
  console.log("📩 Webhook Received: Processing...");

  try {
    const signature = req.headers['paymongo-signature'];
    const webhookSecret = config.paymongoWebhooks;
    const payload = req.rawBody; // Captured as Buffer in server.js

    // 1. Validate existence of required data
    if (!signature || !payload) {
      console.error("❌ Webhook Error: Missing signature header or raw body");
      return res.status(400).send('Missing Data');
    }

    if (!webhookSecret) {
      console.error("❌ Config Error: PAYMONGO_WEBHOOK_SECRET is undefined. Check Render Env Vars.");
      return res.status(500).send('Server Configuration Error');
    }

    // 2. Extract components from PayMongo signature header
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const testHash = parts.find(p => p.startsWith('te='))?.split('=')[1];
    const liveHash = parts.find(p => p.startsWith('li='))?.split('=')[1];
    const paymongoHash = liveHash || testHash;

    // 3. Verify Signature
    const baseString = `${timestamp}.${payload}`;
    const calculatedHash = crypto
      .createHmac('sha256', webhookSecret)
      .update(baseString)
      .digest('hex');

    if (calculatedHash !== paymongoHash) {
      console.error("❌ Security: Invalid Webhook Signature Match");
      // Logging first/last 4 chars for debugging without exposing full secret
      console.log(`Debug: Calc[${calculatedHash.slice(0,4)}...] vs PayM[${paymongoHash.slice(0,4)}...]`);
      return res.status(401).send('Invalid signature');
    }

    // 4. Handle successful payment
    const eventAttr = req.body.data.attributes;
    if (eventAttr.type === 'checkout_session.payment.paid') {
      const session = eventAttr.data.attributes;
      const { userId, fullName, address, city, postalCode, contactNumber, instructions, cartItemIds, directItemData } = session.metadata;

      console.log(`📦 Processing Order for User: ${userId}, cartItemIds: ${cartItemIds}`);

      // Check for duplicate processing
      const existingOrder = await Order.findOne({ checkoutSessionId: session.id });
      if (existingOrder) {
        console.log("⚠️ Order already exists for this session.");
        return res.status(200).json({ received: true });
      }

      let orderItems = [];
      let totalAmount = 0;

      if (cartItemIds === "DIRECT_BUY" && directItemData) {
        // ── DIRECT / BUY NOW ──
        const rawData = JSON.parse(directItemData);
        orderItems = rawData.map(item => ({
          productId: item.pId,
          name: item.n,
          price: item.pr,
          quantity: item.q,
          size: item.s || 'N/A',
          image: item.img
        }));
        totalAmount = orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      } else {
        // ── CART CHECKOUT — only use selected items ──
        const targetIds = cartItemIds ? cartItemIds.split(',') : [];
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart) {
          console.error("❌ Cart not found for userId:", userId);
          return res.status(200).json({ received: true });
        }

        // Filter to only the selected items
        const purchasedItems = targetIds.length > 0
          ? cart.items.filter(item => targetIds.includes(item._id.toString()))
          : cart.items; // fallback: all items if no IDs (shouldn't happen)

        if (purchasedItems.length === 0) {
          console.error("❌ No matching cart items found for IDs:", targetIds);
          return res.status(200).json({ received: true });
        }

        orderItems = purchasedItems.map(item => ({
          productId: item.productId._id,
          name: item.productId.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size || 'N/A',
          image: item.productId?.images?.[0]?.url
        }));
        totalAmount = orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        // Only remove the purchased items from cart
        await Cart.findOneAndUpdate(
          { userId },
          { $pull: { items: { _id: { $in: targetIds } } } }
        );
        // Recalculate cart total
        const updatedCart = await Cart.findOne({ userId });
        if (updatedCart) {
          updatedCart.totalAmount = updatedCart.items.reduce((acc, i) => acc + i.quantity * i.price, 0);
          await updatedCart.save();
        }
      }

      const newOrder = await Order.create({
        userId,
        checkoutSessionId: session.id,
        items: orderItems,
        totalAmount,
        shippingInfo: { 
          fullName, address, city, postalCode,
          contactNumber, 
          deliveryInstructions: instructions 
        },
        paymentMethod: session.payment_method_used || 'gcash',
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      // Deduct stock for purchased items only
      for (const item of orderItems) {
        await Product.updateOne(
          { _id: item.productId, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": -item.quantity } }
        );
      }

      try {
        const user = await User.findById(userId);
        if (user?.email) await sendOrderConfirmation(newOrder, user);
      } catch (e) { console.error('📧 Email failed:', e.message); }

      console.log(`✅ Order ${newOrder._id} created with ${orderItems.length} items.`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("🔥 Webhook Fatal Error:", err.message);
    return res.status(500).send("Internal Server Error");
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

    order.status = "Delivered"; // This must exist in the schema enum!
    
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    // If validation fails, it will hit this block
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

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Prevent cancellation if order is already far along
    const protectedStatuses = ['shipped', 'shipped/in transit', 'out for delivery', 'completed'];
    if (protectedStatuses.includes(order.status.toLowerCase())) {
      return res.status(400).json({ 
        message: "Order cannot be cancelled as it is already being processed/shipped." 
      });
    }

    // 🎯 USER ONLY REQUESTS CANCELLATION
    // We do NOT restore stock here.
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
// CONFIRM QR PH ORDER — frontend fallback after polling succeeds
// SECURITY: never trusts frontend data — looks up pending order
// created server-side in createQrPhPayment
// ─────────────────────────────────────────────────────────────────
export const confirmQrPhOrder = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'paymentIntentId required' });
    }

    // 1. Verify payment with PayMongo server-to-server
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

    // Deduct stock
    for (const item of pendingOrder.items) {
      if (item.productId && item.size) {
        await Product.updateOne(
          { _id: item.productId, 'sizes.size': item.size },
          { $inc: { 'sizes.$.stock': -item.quantity } }
        );
      }
    }

    // Remove purchased items from cart (skip for direct/buy-now)
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