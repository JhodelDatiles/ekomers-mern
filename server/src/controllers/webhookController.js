import crypto from 'crypto';
import Order from '../models/orderSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import User from '../models/userSchema.js';
import { sendOrderConfirmation } from '../services/emailService.js';
import { config } from '../envconfig.js';

// ─────────────────────────────────────────────────────────────────
// SHARED ORDER CREATION LOGIC
// Used by both webhook AND frontend fallback to avoid duplication
// ─────────────────────────────────────────────────────────────────
// export const createQrPhOrderFromIntent = async (paymentIntentId, userId, items, shippingInfo, totalAmount) => {
//   // 1. Prevent duplicates — idempotency check
//   const existing = await Order.findOne({ paymentIntentId });
//   if (existing) {
//     console.log(`⚠️ Order already exists for intent ${paymentIntentId}`);
//     return { order: existing, alreadyExists: true };
//   }

//   // 2. Build order items
//   const orderItems = items.map(item => ({
//     productId: item.productId?._id || item.productId,
//     name: item.productId?.name || item.name,
//     price: item.price,
//     quantity: item.quantity,
//     size: item.size || 'N/A',
//     image: item.productId?.images?.[0]?.url || item.image
//   }));

//   if (!orderItems.length || !orderItems[0].name) {
//     throw new Error('Invalid order items — missing name');
//   }

//   // 3. Create order
//   const newOrder = await Order.create({
//     userId,
//     paymentIntentId,
//     items: orderItems,
//     totalAmount,
//     shippingInfo,
//     paymentMethod: 'qrph',
//     paymentStatus: 'paid',
//     status: 'Order in Progress'
//   });

//   // 4. Deduct stock
//   for (const item of orderItems) {
//     if (item.productId && item.size) {
//       await Product.updateOne(
//         { _id: item.productId, "sizes.size": item.size },
//         { $inc: { "sizes.$.stock": -item.quantity } }
//       );
//     }
//   }

//   // 5. Clear purchased cart items from DB
//   const cartItemIds = items.map(i => i._id).filter(Boolean);
//   if (cartItemIds.length > 0) {
//     await Cart.updateOne(
//       { userId },
//       { $pull: { items: { _id: { $in: cartItemIds } } } }
//     );
//     // Recalculate cart total
//     const updatedCart = await Cart.findOne({ userId });
//     if (updatedCart) {
//       updatedCart.totalAmount = updatedCart.items.reduce(
//         (sum, i) => sum + (i.price * i.quantity), 0
//       );
//       await updatedCart.save();
//     }
//   }

//   // 6. Send confirmation email (non-blocking)
//   try {
//     const user = await User.findById(userId);
//     if (user?.email) await sendOrderConfirmation(newOrder, user);
//   } catch (emailErr) {
//     console.error('📧 Email failed:', emailErr.message);
//   }

//   console.log(`✅ Order created: ${newOrder._id}`);
//   return { order: newOrder, alreadyExists: false };
// };


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
      const { userId, fullName, address, city, postalCode, contactNumber, instructions } = session.metadata;

      const existing = await Order.findOne({ checkoutSessionId: event.data.id });
      if (existing) {
        console.log('⚠️ Duplicate checkout session, skipping');
        return res.status(200).json({ received: true });
      }

      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart) {
        console.error('❌ Cart not found for userId:', userId);
        return res.status(200).json({ received: true });
      }

      const orderItems = cart.items.map(item => ({
        productId: item.productId._id,
        name: item.productId.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        image: item.productId?.images?.[0]?.url
      }));

      for (const item of cart.items) {
        await Product.updateOne(
          { _id: item.productId._id, 'sizes.size': item.size },
          { $inc: { 'sizes.$.stock': -item.quantity } }
        );
      }

      const newOrder = await Order.create({
        userId,
        checkoutSessionId: event.data.id,
        items: orderItems,
        totalAmount: cart.totalAmount,
        shippingInfo: { fullName, address, city, postalCode, contactNumber, deliveryInstructions: instructions },
        paymentMethod: session.payment_method_used || 'gcash',
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      await Cart.findOneAndDelete({ userId });

      try {
        const user = await User.findById(userId);
        if (user?.email) await sendOrderConfirmation(newOrder, user);
      } catch (e) { console.error('📧 Email failed:', e.message); }

      console.log(`✅ Checkout session order created: ${newOrder._id}`);
    } catch (err) {
      console.error('❌ Checkout webhook error:', err.message);
    }
    return res.status(200).json({ received: true });
  }

  // ─── PAYMENT INTENT (QR PH) — Webhook updates pending order ───
  if (type === 'payment_intent.succeeded') {
    try {
      const paymentIntent = event.data;
      const paymentIntentId = paymentIntent.id;
      const metadata = paymentIntent.attributes?.metadata;

      // Find the pending order created during QR generation
      const pendingOrder = await Order.findOne({ paymentIntentId });

      if (!pendingOrder) {
        console.log(`⚠️ No pending order for intent ${paymentIntentId} — may already be confirmed`);
        return res.status(200).json({ received: true });
      }

      if (pendingOrder.paymentStatus === 'paid') {
        console.log(`⚠️ Order already paid: ${pendingOrder._id}`);
        return res.status(200).json({ received: true });
      }

      // Update to paid
      pendingOrder.paymentStatus = 'paid';
      pendingOrder.status = 'Order in Progress';
      await pendingOrder.save();

      // Deduct stock
      for (const item of pendingOrder.items) {
        if (item.productId && item.size) {
          await Product.updateOne(
            { _id: item.productId, 'sizes.size': item.size },
            { $inc: { 'sizes.$.stock': -item.quantity } }
          );
        }
      }

      // Clear cart
      await Cart.findOneAndDelete({ userId: pendingOrder.userId });

      // Send email
      try {
        const user = await User.findById(pendingOrder.userId);
        if (user?.email) await sendOrderConfirmation(pendingOrder, user);
      } catch (e) { console.error('📧 Email failed:', e.message); }

      console.log(`✅ QR PH order confirmed via webhook: ${pendingOrder._id}`);
    } catch (err) {
      console.error('❌ QR PH webhook error:', err.message);
    }
    return res.status(200).json({ received: true });
  }

  console.log(`⏭️ Ignored event: ${type}`);
  return res.status(200).json({ received: true });
};