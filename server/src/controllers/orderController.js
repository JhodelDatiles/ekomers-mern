import axios from 'axios';
import crypto from 'crypto';
import Order from '../models/orderSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import User from '../models/userSchema.js';
import { sendOrderConfirmation } from '../services/emailService.js';
import { config } from '../envconfig.js';

/**
 * 1. INITIATE CHECKOUT
 * Creates a PayMongo Checkout Session
 */
export const initiatePayMongoCheckout = async (req, res) => {
  try {
    const { items, shippingInfo, isDirectPurchase } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items selected for checkout" });
    }

    const isDirect = isDirectPurchase || (items[0]?._id && String(items[0]._id).startsWith('direct'));

    // Construct Metadata for the Webhook
    const metadata = {
      userId: String(req.user.id),
      cartItemIds: isDirect ? "DIRECT_BUY" : items.map(item => item._id).join(','),
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

/**
 * 2. PAYMONGO WEBHOOK HANDLER
 * Process successful payments, create orders, and clear carts.
 */
export const handlePayMongoWebhook = async (req, res) => {
  console.log("🚀 Webhook hit! Checking signature...");

  try {
    const signature = req.headers['paymongo-signature'];
    const webhookSecret = config.paymongoWebhooks;
    
    // CRITICAL: We use req.rawBody (the Buffer) for signature verification
    const payload = req.rawBody; 

    if (!signature || !payload) {
      console.error("❌ Missing signature or payload");
      return res.status(400).send('Bad Request');
    }

    const [t, te, li] = signature.split(',');
    const timestamp = t.split('=')[1];
    const paymongoHash = te ? te.split('=')[1] : li.split('=')[1];

    // Verify HMAC SHA256
    const baseString = timestamp + "." + payload;
    const calculatedHash = crypto
      .createHmac('sha256', webhookSecret)
      .update(baseString)
      .digest('hex');

    if (calculatedHash !== paymongoHash) {
      console.error("❌ Invalid Signature: Hash mismatch");
      return res.status(401).send('Invalid signature');
    }

    const eventData = req.body.data.attributes;
    const type = eventData.type;

    if (type === 'checkout_session.payment.paid') {
      const session = eventData.data.attributes;
      const metadata = session.metadata;

      if (!metadata || !metadata.userId) {
        console.error("❌ Metadata missing userId");
        return res.status(200).json({ received: true });
      }

      const { userId, address, contactNumber, instructions, fullName } = metadata;

      // Check if order already processed to prevent duplicates
      const existingOrder = await Order.findOne({ checkoutSessionId: session.id });
      if (existingOrder) {
        console.log("⚠️ Order already processed for session:", session.id);
        return res.status(200).json({ received: true });
      }

      // Fetch Cart Items
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart) {
        console.error("❌ No cart found for user during webhook processing");
        return res.status(200).json({ received: true });
      }

      const orderItems = cart.items.map(item => ({
        productId: item.productId._id,
        name: item.productId.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color
      }));

      // 📉 Update Stock
      for (const item of cart.items) {
        await Product.updateOne(
          { _id: item.productId._id, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": -item.quantity, stock: -item.quantity } }
        );
      }

      // 📝 Create Order
      const newOrder = new Order({
        userId,
        checkoutSessionId: session.id,
        items: orderItems,
        totalAmount: cart.totalAmount,
        shippingInfo: {
          fullName: fullName || "Customer",
          address,
          contactNumber,
          deliveryInstructions: instructions
        },
        paymentMethod: session.payment_method_used || 'gcash',
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      await newOrder.save();

      // 🧹 Clear Cart
      await Cart.findOneAndDelete({ userId });

      // 📧 Send Email
      try {
        const user = await User.findById(userId);
        if (user) await sendOrderConfirmation(newOrder, user);
      } catch (e) {
        console.error("📧 Email Notification Failed:", e.message);
      }

      console.log(`✅ SUCCESS: Order ${newOrder._id} created and Cart cleared.`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("🔥 Webhook Fatal Error:", err);
    res.status(500).send("Internal Server Error");
  }
};

/**
 * 3. FETCH USER ORDERS
 */
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'name images');
    res.status(200).json(orders); // Changed to return array directly or match your frontend
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders" });
  }
};

/**
 * 4. CANCEL ORDER (Request)
 */
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const protectedStatuses = ['shipped', 'shipped/in transit', 'out for delivery', 'completed', 'delivered'];
    if (protectedStatuses.includes(order.status.toLowerCase())) {
      return res.status(400).json({ message: "Order is already in transit and cannot be cancelled." });
    }

    order.status = 'Cancellation Requested'; 
    await order.save();
    res.status(200).json({ message: "Request sent", order });
  } catch (error) {
    res.status(500).json({ message: "Failed to request cancellation" });
  }
};

/**
 * 5. CONFIRM DELIVERY
 */
export const confirmOrderDelivery = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = "Delivered";
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to confirm delivery" });
  }
};

/**
 * 6. DELETE ORDER (Manifest Purge)
 */
export const deleteOrder = async (req, res) => {
  try {
    await Order.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.status(200).json({ message: "Order removed from manifest" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting record" });
  }
};