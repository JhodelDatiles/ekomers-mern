import axios from 'axios';
import crypto from 'crypto';
import Order from '../models/orderSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import User from '../models/userSchema.js';
import PendingPayment from '../models/pendingPaymentSchema.js';
import { sendOrderConfirmation } from '../services/emailService.js';
import { config } from '../envconfig.js';


export const handlePayMongoWebhook = async (req, res) => {
  console.log('🚀 Webhook hit!');

  const signature = req.headers['paymongo-signature'];
  const webhookSecret = config.paymongoWebhooks;
  const payload = req.rawBody;

  if (!signature || !payload) {
    console.error('❌ Missing signature or payload');
    return res.status(400).send('Missing Data');
  }

  // 1. Verify webhook signature
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const testHash = parts.find(p => p.startsWith('te='))?.split('=')[1];
  const liveHash = parts.find(p => p.startsWith('li='))?.split('=')[1];
  const paymongoHash = liveHash || testHash;

  const baseString = `${timestamp}.${payload}`;
  const calculatedHash = crypto
    .createHmac('sha256', webhookSecret)
    .update(baseString)
    .digest('hex');

  if (calculatedHash !== paymongoHash) {
    console.error('❌ Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  const event = req.body.data.attributes;
  const type = event.type;
  console.log(`📩 Event type: ${type}`);

  // ─── CHECKOUT SESSION (GCash, Card, Maya, GrabPay) ───
  if (type === 'checkout_session.payment.paid') {
    try {
      const session = event.data.attributes;
      const sessionId = event.data.id;

      // PayMongo test mode strips metadata from webhook payload — fetch directly
      let metadata = session.metadata;
      if (!metadata) {
        console.log('⚠️ Metadata null in webhook — fetching session from PayMongo API...');
        const authHeader = `Basic ${Buffer.from(`${config.paymongoSecret.trim()}:`).toString('base64')}`;
        const fetched = await axios.get(
          `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
          { headers: { authorization: authHeader, accept: 'application/json' } }
        );
        metadata = fetched.data.data.attributes.metadata;
        console.log('📋 Fetched metadata:', JSON.stringify(metadata));
      }

      if (!metadata) {
        console.error('❌ Metadata still null after fetch — cannot process order');
        return res.status(200).json({ received: true });
      }

      const {
        userId, fullName, address, city, postalCode,
        contactNumber, instructions, cartItemIds, directItemData
      } = metadata;

      console.log(`📦 Processing order for user: ${userId}, cartItemIds: ${cartItemIds}`);

      // Duplicate check
      const existing = await Order.findOne({ checkoutSessionId: sessionId });
      if (existing) {
        console.log('⚠️ Duplicate checkout session, skipping');
        return res.status(200).json({ received: true });
      }

      let orderItems = [];
      let totalAmount = 0;

      if (cartItemIds === 'DIRECT_BUY' && directItemData) {
        const rawData = JSON.parse(directItemData);
        orderItems = rawData.map(item => ({
          productId: item.pId,
          name: item.n,
          price: item.pr,
          quantity: item.q,
          size: item.s || 'N/A',
        }));
        totalAmount = orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

      } else {
        const targetIds = cartItemIds ? cartItemIds.split(',') : [];
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart) {
          console.error('❌ Cart not found for userId:', userId);
          return res.status(200).json({ received: true });
        }

        const purchasedItems = targetIds.length > 0
          ? cart.items.filter(item => targetIds.includes(item._id.toString()))
          : cart.items;

        if (purchasedItems.length === 0) {
          console.error('❌ No matching cart items for IDs:', targetIds);
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

        await Cart.findOneAndUpdate(
          { userId },
          { $pull: { items: { _id: { $in: targetIds } } } }
        );
        const updatedCart = await Cart.findOne({ userId });
        if (updatedCart) {
          updatedCart.totalAmount = updatedCart.items.reduce((acc, i) => acc + i.quantity * i.price, 0);
          await updatedCart.save();
        }
      }

      // Atomic stock deduction
      for (const item of orderItems) {
        const result = await Product.findOneAndUpdate(
          { _id: item.productId, 'sizes.size': item.size, 'sizes.stock': { $gte: item.quantity } },
          { $inc: { 'sizes.$.stock': -item.quantity } }
        );
        if (!result) console.warn(`⚠️ Insufficient stock for product ${item.productId} size ${item.size}`);
      }

      const newOrder = await Order.create({
        userId,
        checkoutSessionId: sessionId,
        items: orderItems,
        totalAmount,
        shippingInfo: { fullName, address, city, postalCode, contactNumber, deliveryInstructions: instructions },
        paymentMethod: session.payment_method_used || 'gcash',
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      try {
        const user = await User.findById(userId);
        if (user?.email) await sendOrderConfirmation(newOrder, user);
      } catch (e) { console.error('📧 Email failed:', e.message); }

      console.log(`✅ Checkout order created: ${newOrder._id} (${orderItems.length} items)`);

    } catch (err) {
      console.error('❌ Checkout webhook error:', err.message);
    }
    return res.status(200).json({ received: true });
  }

  // ─── PAYMENT PAID (QR PH) ───
  if (type === 'payment.paid') {
    try {
      const payment = event.data;
      const paymentIntentId = payment.attributes?.payment_intent_id;

      console.log(`💳 payment.paid — intent: ${paymentIntentId}`);

      if (!paymentIntentId) {
        console.log('⚠️ No payment_intent_id on payment.paid event');
        return res.status(200).json({ received: true });
      }

      // ✅ Duplicate check — confirmQrPhOrder may have already created the Order
      const existingOrder = await Order.findOne({ paymentIntentId });
      if (existingOrder) {
        console.log(`⚠️ Order already exists for intent ${paymentIntentId} — skipping`);
        return res.status(200).json({ received: true });
      }

      // ✅ Look up PendingPayment
      const pending = await PendingPayment.findOne({ paymentIntentId });
      if (!pending) {
        console.log(`⚠️ No PendingPayment found for intent ${paymentIntentId}`);
        return res.status(200).json({ received: true });
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
          const result = await Product.findOneAndUpdate(
            { _id: item.productId, 'sizes.size': item.size, 'sizes.stock': { $gte: item.quantity } },
            { $inc: { 'sizes.$.stock': -item.quantity } }
          );
          if (!result) console.warn(`⚠️ Insufficient stock for product ${item.productId} size ${item.size}`);
        }
      }

      // Remove paid items from cart (skip for direct/buy-now)
      if (!pending.isDirectPurchase) {
        const cartItemIds = pending.cartItemIds || [];
        if (cartItemIds.length > 0) {
          await Cart.findOneAndUpdate(
            { userId: pending.userId },
            { $pull: { items: { _id: { $in: cartItemIds } } } }
          );
        }
        const updatedCart = await Cart.findOne({ userId: pending.userId });
        if (updatedCart) {
          updatedCart.totalAmount = updatedCart.items.reduce((acc, i) => acc + i.quantity * i.price, 0);
          await updatedCart.save();
        }
      }

      // ✅ Delete PendingPayment now that Order exists
      await PendingPayment.deleteOne({ paymentIntentId });
      console.log(`🗑️ PendingPayment cleaned up for intent ${paymentIntentId}`);

      try {
        const user = await User.findById(pending.userId);
        if (user?.email) await sendOrderConfirmation(newOrder, user);
      } catch (e) { console.error('📧 Email failed:', e.message); }

      console.log(`✅ QR PH order created via webhook: ${newOrder._id}`);

    } catch (err) {
      console.error('❌ payment.paid webhook error:', err.message);
    }
    return res.status(200).json({ received: true });
  }

  console.log(`⏭️ Ignored event: ${type}`);
  return res.status(200).json({ received: true });
};