import axios from 'axios';
import crypto from 'crypto';
import Order from '../models/orderSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import User from '../models/userSchema.js';
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

export const handlePayMongoWebhook = async (req, res) => {
  console.log("📩 Webhook Received: Processing...");

  try {
    const signature = req.headers['paymongo-signature'];
    const webhookSecret = config.paymongoWebhooks;
    const payload = req.rawBody;

    if (!signature || !payload) {
      console.error("❌ Webhook Error: Missing signature header or raw body");
      return res.status(400).send('Missing Data');
    }

    if (!webhookSecret) {
      console.error("❌ Config Error: PAYMONGO_WEBHOOK_SECRET is undefined.");
      return res.status(500).send('Server Configuration Error');
    }

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
      console.error("❌ Security: Invalid Webhook Signature");
      return res.status(401).send('Invalid signature');
    }

    const eventAttr = req.body.data.attributes;
    const eventType = eventAttr.type;

    // ─── CHECKOUT SESSION (GCash, Card, Maya, GrabPay) ───
    if (eventType === 'checkout_session.payment.paid') {
      const session = eventAttr.data.attributes;
      const { userId, fullName, address, city, postalCode, contactNumber, instructions, cartItemIds, directItemData } = session.metadata;

      console.log(`📦 Checkout Session: Processing Order for User: ${userId}`);

      const existingOrder = await Order.findOne({ checkoutSessionId: eventAttr.data.id });
      if (existingOrder) {
        console.log("⚠️ Order already exists for this session.");
        return res.status(200).json({ received: true });
      }

      let orderItems = [];

      if (cartItemIds === "DIRECT_BUY" && directItemData) {
        const rawData = JSON.parse(directItemData);
        orderItems = rawData.map(item => ({
          productId: item.pId,
          name: item.n,
          price: item.pr,
          quantity: item.q,
          size: item.s || 'N/A',
          image: item.img
        }));
      } else {
        const targetCartItemIds = cartItemIds?.split(',') || [];
        const userCart = await Cart.findOne({ userId }).populate('items.productId');

        if (userCart) {
          const purchasedItems = targetCartItemIds.length > 0
            ? userCart.items.filter(item => targetCartItemIds.includes(item._id.toString()))
            : userCart.items;

          orderItems = purchasedItems.map(item => ({
            productId: item.productId?._id,
            name: item.productId?.name || item.name || "Product",
            price: item.price,
            quantity: item.quantity,
            size: item.size || 'N/A',
            image: item.productId?.images?.[0]?.url || item.productId?.images?.[0]
          }));

          // Remove only purchased items from cart
          if (targetCartItemIds.length > 0) {
            await Cart.updateOne(
              { userId },
              { $pull: { items: { _id: { $in: targetCartItemIds } } } }
            );
          } else {
            await Cart.findOneAndDelete({ userId });
          }
        }
      }

      if (orderItems.length === 0) {
        console.error("❌ No order items found");
        return res.status(200).json({ received: true });
      }

      const amountPaid = eventAttr.data.attributes.payments?.[0]?.attributes?.amount / 100 || 0;

      const newOrder = await Order.create({
        userId,
        checkoutSessionId: eventAttr.data.id,
        items: orderItems,
        totalAmount: amountPaid,
        shippingInfo: { fullName, address, city, postalCode, contactNumber, deliveryInstructions: instructions },
        paymentMethod: eventAttr.data.attributes.payment_method_used || 'gcash',
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      // Deduct stock
      for (const item of orderItems) {
        await Product.updateOne(
          { _id: item.productId, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": -item.quantity } }
        );
      }

      try {
        const user = await User.findById(userId);
        if (user?.email) await sendOrderConfirmation(newOrder, user);
      } catch (e) { console.error("📧 Email Failed:", e.message); }

      console.log(`✅ Checkout Session Order created: ${newOrder._id}`);
    }

    // ─── PAYMENT INTENT (QR PH) ───
    if (eventType === 'payment_intent.succeeded') {
      try {
        const paymentIntent = eventAttr.data;
        const metadata = paymentIntent.attributes.metadata;

        if (!metadata?.userId) {
          console.log("⚠️ No userId in metadata, skipping");
          return res.status(200).json({ received: true });
        }

        const { userId, shippingInfo, items } = metadata;

        // Prevent duplicate orders
        const existing = await Order.findOne({ paymentIntentId: paymentIntent.id });
        if (existing) {
          console.log("⚠️ QR PH Order already exists");
          return res.status(200).json({ received: true });
        }

        const parsedItems = JSON.parse(items);
        const parsedShipping = JSON.parse(shippingInfo);

        const orderItems = parsedItems.map(item => ({
          productId: item.productId?._id || item.productId,
          name: item.productId?.name || item.name,
          price: item.price,
          quantity: item.quantity,
          size: item.size || 'N/A',
          image: item.productId?.images?.[0]?.url || item.image
        }));

        const newOrder = await Order.create({
          userId,
          paymentIntentId: paymentIntent.id,
          items: orderItems,
          totalAmount: paymentIntent.attributes.amount / 100,
          shippingInfo: {
            fullName: parsedShipping.fullName,
            address: parsedShipping.address,
            city: parsedShipping.city,
            postalCode: parsedShipping.postalCode,
            contactNumber: parsedShipping.contactNumber,
          },
          paymentMethod: 'qrph',
          paymentStatus: 'paid',
          status: 'Order in Progress'
        });

        // Deduct stock
        for (const item of orderItems) {
          await Product.updateOne(
            { _id: item.productId, "sizes.size": item.size },
            { $inc: { "sizes.$.stock": -item.quantity } }
          );
        }

        // ✅ Clear only the purchased items from cart
        const cartItemIds = parsedItems.map(item => item._id).filter(Boolean);
        if (cartItemIds.length > 0) {
          await Cart.updateOne(
            { userId },
            { $pull: { items: { _id: { $in: cartItemIds } } } }
          );
        }

        try {
          const user = await User.findById(userId);
          if (user?.email) await sendOrderConfirmation(newOrder, user);
        } catch (e) { console.error("📧 Email Failed:", e.message); }

        console.log(`✅ QR PH Order created: ${newOrder._id}`);
      } catch (err) {
        console.error("❌ QR PH Webhook Error:", err.message);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("🔥 Webhook Fatal Error:", err.message);
    return res.status(500).send("Internal Server Error");
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

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const protectedStatuses = ['shipped', 'shipped/in transit', 'out for delivery', 'completed'];
    if (protectedStatuses.includes(order.status.toLowerCase())) {
      return res.status(400).json({ message: "Order cannot be cancelled at this stage." });
    }

    order.status = 'Cancellation Requested';
    await order.save();

    res.status(200).json({ message: "Cancellation request sent to admin.", order });
  } catch (error) {
    console.error("❌ CANCEL ERROR:", error);
    res.status(500).json({ message: "Failed to request cancellation" });
  }
};