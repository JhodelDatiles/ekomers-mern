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

// export const handlePayMongoWebhook = async (req, res) => {
//   try {
//     const eventPayload = req.body.data;
    
//     if (eventPayload.attributes.type === 'checkout_session.payment.paid') {
//       const checkoutSession = eventPayload.attributes.data;
      
//       const metadata = checkoutSession.attributes.payments?.[0]?.attributes?.metadata 
//                   || checkoutSession.attributes.payment_intent?.attributes?.metadata 
//                   || checkoutSession.attributes.metadata;

//       if (!metadata || !metadata.userId) return res.status(200).json({ received: true });

//       const { userId, cartItemIds, directItemData } = metadata;

//       const existingOrder = await Order.findOne({ checkoutSessionId: checkoutSession.id });
//       if (existingOrder) return res.status(200).json({ received: true });

//       let orderItems = [];

//       if (cartItemIds === "DIRECT_BUY" && directItemData) {
//         const rawData = JSON.parse(directItemData);
//         orderItems = rawData.map(item => ({
//           productId: item.pId,
//           name: item.n,
//           price: item.pr,
//           quantity: item.q,
//           size: item.s || 'N/A',
//           image: item.img
//         }));
//       } else {
//         const targetCartItemIds = cartItemIds.split(',');
//         const userCart = await Cart.findOne({ userId }).populate('items.productId');
        
//         if (userCart) {
//           const purchasedItems = userCart.items.filter(item => 
//             targetCartItemIds.includes(item._id.toString())
//           );

//           orderItems = purchasedItems.map(item => ({
//             productId: item.productId?._id,
//             name: item.productId?.name || "Product",
//             price: item.price,
//             quantity: item.quantity,
//             size: item.size || 'N/A',
//             image: item.productId?.images?.[0]?.url || item.productId?.images?.[0]
//           }));

//           await Cart.updateOne(
//             { userId },
//             { $pull: { items: { _id: { $in: targetCartItemIds } } } }
//           );
//         }
//       }

//       if (orderItems.length === 0 || !orderItems[0].name) {
//         console.error("❌ WEBHOOK ERROR: Name is missing in order items", orderItems);
//         return res.status(200).json({ received: true });
//       }

//       const amountPaid = checkoutSession.attributes.payments[0].attributes.amount / 100;

//       const newOrder = await Order.create({
//         userId,
//         checkoutSessionId: checkoutSession.id,
//         items: orderItems,
//         totalAmount: amountPaid,
//         shippingInfo: {
//           fullName: metadata.fullName,
//           address: metadata.address,
//           city: metadata.city,
//           postalCode: metadata.postalCode,
//           contactNumber: metadata.contactNumber,
//           deliveryInstructions: metadata.instructions
//         },
//         paymentMethod: checkoutSession.attributes.payment_method_used || 'paymongo',
//         paymentStatus: 'paid',
//         status: 'Order in Progress'
//       });

//       // 📉 AUTOMATIC STOCK DEDUCTION
//       try {
//         for (const item of orderItems) {
//           await Product.updateOne(
//             { _id: item.productId, "sizes.size": item.size },
//             { $inc: { "sizes.$.stock": -item.quantity } }
//           );
//         }
//         console.log("✅ STOCK UPDATED FOR ORDER:", newOrder._id);
//       } catch (stockErr) {
//         console.error("❌ STOCK UPDATE FAILED:", stockErr);
//       }

//       try {
//         const user = await User.findById(userId);
//         if (user?.email) await sendOrderConfirmation(newOrder, user);
//       } catch (e) { console.error("📧 Email Failed:", e.message); }

//       return res.status(200).json({ received: true });
//     }
//     return res.status(200).json({ received: true });
//   } catch (err) {
//     console.error("❌ WEBHOOK ERROR:", err);
//     return res.status(200).json({ received: true });
//   }
// };

// ... Rest of the functions (getUserOrders, getOrderById, etc.) stay the same

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
      const { userId, fullName, address, contactNumber, instructions } = session.metadata;

      console.log(`📦 Processing Order for User: ${userId}`);

      // Check for duplicate processing
      const existingOrder = await Order.findOne({ checkoutSessionId: session.id });
      if (existingOrder) {
        console.log("⚠️ Order already exists for this session.");
        return res.status(200).json({ received: true });
      }

      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart) {
        console.error("❌ Logic Error: Payment successful but Cart not found.");
        return res.status(200).json({ received: true });
      }

      // Create the Order
      const newOrder = await Order.create({
        userId,
        checkoutSessionId: session.id,
        items: cart.items.map(item => ({
          productId: item.productId._id,
          name: item.productId.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size
        })),
        totalAmount: cart.totalAmount,
        shippingInfo: { 
          fullName, 
          address, 
          contactNumber, 
          deliveryInstructions: instructions 
        },
        paymentMethod: session.payment_method_used || 'gcash',
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      // Stock management
      for (const item of cart.items) {
        await Product.updateOne(
          { _id: item.productId._id, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": -item.quantity, stock: -item.quantity } }
        );
      }

      await Cart.findOneAndDelete({ userId });
      console.log(`✅ Success: Order ${newOrder._id} created. Cart wiped.`);
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
// Called by frontend after polling detects payment success
export const confirmQrPhOrder = async (req, res) => {
  try {
    const { paymentIntentId, items, shippingInfo, totalAmount } = req.body;
    const userId = req.user.id;

    // Prevent duplicate orders
    const existing = await Order.findOne({ paymentIntentId });
    if (existing) {
      console.log("⚠️ QR PH order already exists:", existing._id);
      return res.status(200).json({ order: existing, alreadyExists: true });
    }

    // Verify payment with PayMongo
    const secretKey = config.paymongoSecret.trim();
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
    const intentRes = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      { headers: { authorization: authHeader } }
    );
    const piStatus = intentRes.data.data.attributes.status;
    if (piStatus !== 'succeeded') {
      return res.status(400).json({ message: `Payment not confirmed. Status: ${piStatus}` });
    }

    const orderItems = items.map(item => ({
      productId: item.productId?._id || item.productId,
      name: item.productId?.name || item.name,
      price: item.price,
      quantity: item.quantity,
      size: item.size || 'N/A',
      image: item.productId?.images?.[0]?.url || item.image
    }));

    const newOrder = await Order.create({
      userId,
      paymentIntentId,
      items: orderItems,
      totalAmount,
      shippingInfo,
      paymentMethod: 'qrph',
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

    // ✅ Delete purchased items from cart in database
    const purchasedCartItemIds = items.map(i => i._id).filter(Boolean);
    if (purchasedCartItemIds.length > 0) {
      // Remove only the purchased items (user may have other items in cart)
      await Cart.updateOne(
        { userId },
        { $pull: { items: { _id: { $in: purchasedCartItemIds } } } }
      );
      // Recalculate totalAmount on remaining cart items
      const updatedCart = await Cart.findOne({ userId });
      if (updatedCart) {
        updatedCart.totalAmount = updatedCart.items.reduce(
          (sum, item) => sum + (item.price * item.quantity), 0
        );
        await updatedCart.save();
      }
      console.log(`🧹 Cart cleaned: removed ${purchasedCartItemIds.length} items for user ${userId}`);
    }

    // Send confirmation email
    try {
      const user = await User.findById(userId);
      if (user?.email) await sendOrderConfirmation(newOrder, user);
    } catch (emailErr) {
      console.error("Email failed:", emailErr.message);
    }

    console.log(`✅ QR PH order confirmed: ${newOrder._id}`);
    res.status(201).json({ order: newOrder });

  } catch (error) {
    console.error("❌ confirmQrPhOrder error:", error.message);
    res.status(500).json({ message: "Failed to confirm order", error: error.message });
  }
};