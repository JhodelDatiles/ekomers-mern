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

export const handlePayMongoWebhook = async (req, res) => {
  try {
    const eventPayload = req.body.data;
    
    if (eventPayload.attributes.type === 'checkout_session.payment.paid') {
      const checkoutSession = eventPayload.attributes.data;
      
      const metadata = checkoutSession.attributes.payments?.[0]?.attributes?.metadata 
                  || checkoutSession.attributes.payment_intent?.attributes?.metadata 
                  || checkoutSession.attributes.metadata;

      if (!metadata || !metadata.userId) return res.status(200).json({ received: true });

      const { userId, cartItemIds, directItemData } = metadata;

      const existingOrder = await Order.findOne({ checkoutSessionId: checkoutSession.id });
      if (existingOrder) return res.status(200).json({ received: true });

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
        const targetCartItemIds = cartItemIds.split(',');
        const userCart = await Cart.findOne({ userId }).populate('items.productId');
        
        if (userCart) {
          const purchasedItems = userCart.items.filter(item => 
            targetCartItemIds.includes(item._id.toString())
          );

          orderItems = purchasedItems.map(item => ({
            productId: item.productId?._id,
            name: item.productId?.name || "Product",
            price: item.price,
            quantity: item.quantity,
            size: item.size || 'N/A',
            image: item.productId?.images?.[0]?.url || item.productId?.images?.[0]
          }));

          await Cart.updateOne(
            { userId },
            { $pull: { items: { _id: { $in: targetCartItemIds } } } }
          );
        }
      }

      if (orderItems.length === 0 || !orderItems[0].name) {
        console.error("❌ WEBHOOK ERROR: Name is missing in order items", orderItems);
        return res.status(200).json({ received: true });
      }

      const amountPaid = checkoutSession.attributes.payments[0].attributes.amount / 100;

      const newOrder = await Order.create({
        userId,
        checkoutSessionId: checkoutSession.id,
        items: orderItems,
        totalAmount: amountPaid,
        shippingInfo: {
          fullName: metadata.fullName,
          address: metadata.address,
          city: metadata.city,
          postalCode: metadata.postalCode,
          contactNumber: metadata.contactNumber,
          deliveryInstructions: metadata.instructions
        },
        paymentMethod: checkoutSession.attributes.payment_method_used || 'paymongo',
        paymentStatus: 'paid',
        status: 'Order in Progress'
      });

      // 📉 AUTOMATIC STOCK DEDUCTION
      try {
        for (const item of orderItems) {
          await Product.updateOne(
            { _id: item.productId, "sizes.size": item.size },
            { $inc: { "sizes.$.stock": -item.quantity } }
          );
        }
        console.log("✅ STOCK UPDATED FOR ORDER:", newOrder._id);
      } catch (stockErr) {
        console.error("❌ STOCK UPDATE FAILED:", stockErr);
      }

      try {
        const user = await User.findById(userId);
        if (user?.email) await sendOrderConfirmation(newOrder, user);
      } catch (e) { console.error("📧 Email Failed:", e.message); }

      return res.status(200).json({ received: true });
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ WEBHOOK ERROR:", err);
    return res.status(200).json({ received: true });
  }
};

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