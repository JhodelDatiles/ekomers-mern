import crypto from 'crypto';
import Order from '../models/orderSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import User from '../models/userSchema.js';
import { sendOrderConfirmation } from '../services/emailService.js';
import { config } from '../envconfig.js';


export const handlePayMongoWebhook = async (req, res) => {
  
  console.log("🚀 Webhook hit!");
  const signature = req.headers['paymongo-signature'];
  const webhookSecret = config.paymongoWebhooks;
  const payload = req.rawBody;

  if (!signature || !payload) {
    console.error("❌ Missing signature or payload");
    return res.status(400).send('Missing Data');
  }

  // 1. Parse signature components
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const testHash = parts.find(p => p.startsWith('te='))?.split('=')[1];
  const liveHash = parts.find(p => p.startsWith('li='))?.split('=')[1];
  const paymongoHash = liveHash || testHash;

  // 2. Verify signature
  const baseString = `${timestamp}.${payload}`;
  const calculatedHash = crypto
    .createHmac('sha256', webhookSecret)
    .update(baseString)
    .digest('hex');

  if (calculatedHash !== paymongoHash) {
    console.error("❌ Invalid webhook signature");
    return res.status(401).send('Invalid signature');
  }

  const event = req.body.data.attributes;
  const type = event.type;
  console.log(`📩 Event type: ${type}`);

  // ─── CHECKOUT SESSION (GCash, Card, Maya, GrabPay) ───
  if (type === 'checkout_session.payment.paid') {
    const session = event.data.attributes;
    const { userId, address, contactNumber, instructions, fullName, city, postalCode } = session.metadata;

    try {
      // Prevent duplicate orders
      const existing = await Order.findOne({ checkoutSessionId: event.data.id });
      if (existing) {
        console.log("⚠️ Duplicate checkout session order, skipping");
        return res.status(200).json({ received: true });
      }

      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart) {
        console.error("❌ Cart not found for userId:", userId);
        return res.status(200).json({ received: true });
      }

      const orderItems = cart.items.map(item => ({
        productId: item.productId._id,
        name: item.productId.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
        image: item.productId?.images?.[0]?.url
      }));

      // Update stock
      for (const item of cart.items) {
        await Product.updateOne(
          { _id: item.productId._id, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": -item.quantity } }
        );
      }

      // Create order
      const newOrder = await Order.create({
        userId,
        checkoutSessionId: event.data.id,
        items: orderItems,
        shippingInfo: { 
          fullName: fullName || '',
          address: address || '', 
          city: city || '',
          postalCode: postalCode || '',
          contactNumber: contactNumber || '', 
          deliveryInstructions: instructions || ''
        },
        totalAmount: cart.totalAmount,
        paymentMethod: session.payment_method_used || 'gcash', // ← valid enum value
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      // Clear cart
      await Cart.findOneAndDelete({ userId });

      // Send email
      try {
        const user = await User.findById(userId);
        if (user?.email) await sendOrderConfirmation(newOrder, user);
      } catch (emailErr) {
        console.error("📧 Email failed:", emailErr.message);
      }

      console.log(`✅ Checkout order ${newOrder._id} created`);
      return res.status(200).json({ received: true });

    } catch (err) {
      console.error("❌ Checkout webhook error:", err.message);
      return res.status(200).json({ received: true }); // Always 200 to PayMongo
    }
  }

  // ─── PAYMENT INTENT (QR PH) ───
  if (type === 'payment_intent.succeeded') {
    const paymentIntent = event.data;
    const metadata = paymentIntent.attributes?.metadata;

    console.log("📦 QR PH metadata:", JSON.stringify(metadata));

    if (!metadata?.userId) {
      console.log("⚠️ No userId in metadata, skipping");
      return res.status(200).json({ received: true });
    }

    try {
      // Prevent duplicate orders
      const existing = await Order.findOne({ paymentIntentId: paymentIntent.id });
      if (existing) {
        console.log("⚠️ Duplicate QR PH order, skipping");
        return res.status(200).json({ received: true });
      }

      const { userId, shippingInfo, items } = metadata;

      // Parse JSON strings stored in metadata
      let parsedItems, parsedShipping;
      try {
        parsedItems = JSON.parse(items);
        parsedShipping = JSON.parse(shippingInfo);
      } catch (parseErr) {
        console.error("❌ Failed to parse metadata JSON:", parseErr.message);
        return res.status(200).json({ received: true });
      }

      // Map items to order format
      const orderItems = parsedItems.map(item => ({
        productId: item.productId?._id || item.productId,
        name: item.productId?.name || item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || 'N/A',
        image: item.productId?.images?.[0]?.url || item.image
      }));

      if (orderItems.length === 0 || !orderItems[0].name) {
        console.error("❌ Invalid order items from QR PH metadata");
        return res.status(200).json({ received: true });
      }

      // Create order
      const newOrder = await Order.create({
        userId,
        paymentIntentId: paymentIntent.id,
        items: orderItems,
        totalAmount: paymentIntent.attributes.amount / 100,
        shippingInfo: {
          fullName: parsedShipping.fullName || '',
          address: parsedShipping.address || '',
          city: parsedShipping.city || '',
          postalCode: parsedShipping.postalCode || '',
          contactNumber: parsedShipping.contactNumber || '',
        },
        paymentMethod: 'qrph', // ← valid enum value
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      // Deduct stock
      for (const item of orderItems) {
        if (item.productId && item.size) {
          await Product.updateOne(
            { _id: item.productId, "sizes.size": item.size },
            { $inc: { "sizes.$.stock": -item.quantity } }
          );
        }
      }

      // Clear cart items that were purchased
      try {
        const cartItemIds = parsedItems.map(i => i._id).filter(Boolean);
        if (cartItemIds.length > 0) {
          await Cart.updateOne(
            { userId },
            { $pull: { items: { _id: { $in: cartItemIds } } } }
          );
        }
      } catch (cartErr) {
        console.error("⚠️ Cart cleanup error:", cartErr.message);
      }

      // Send email
      try {
        const user = await User.findById(userId);
        if (user?.email) await sendOrderConfirmation(newOrder, user);
      } catch (emailErr) {
        console.error("📧 Email failed:", emailErr.message);
      }

      console.log(`✅ QR PH order ${newOrder._id} created`);
      return res.status(200).json({ received: true });

    } catch (err) {
      console.error("❌ QR PH webhook error:", err.message, err.stack);
      return res.status(200).json({ received: true });
    }
  }

  console.log(`⏭️ Ignored event type: ${type}`);
  return res.status(200).json({ received: true });
};