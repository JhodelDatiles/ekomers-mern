import {config} from '../envconfig.js';
import Paymongo from 'paymongo';
import Order from '../models/orderSchema.js';
import PendingPayment from '../models/pendingPaymentSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import axios from 'axios';


const paymongo = new Paymongo(config.paymongoSecret);

// Create Payment Intent (Step 1: Initialize payment)
export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body; // amount in centavos (e.g., 10000 = PHP 100.00)
    // Get user's cart to verify amount
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Amount should match cart total (convert to centavos)
    const totalInCentavos = Math.round(cart.totalAmount * 100);

    // Create Payment Intent
    const paymentIntent = await paymongo.paymentIntents.create({
      data: {
        attributes: {
          amount: totalInCentavos,
          // ✅ CORRECT SYNTAX
          payment_method_allowed: [
            'card', 
            'gcash', 
            'paymaya', 
            'grab_pay',
            'qrph'
          ],
          payment_method_options: {
            card: { request_three_d_secure: 'any' }
          },
          currency: 'PHP',
          description: `Order payment for user ${req.user.username}`,
          statement_descriptor: 'Your Store Name'
        }
      }
    });

    res.status(200).json({
      clientKey: paymentIntent.data.attributes.client_key,
      paymentIntentId: paymentIntent.data.id,
      amount: totalInCentavos
    });

  } catch (error) {
    console.error('PayMongo Error:', error);
    res.status(500).json({ 
      message: "Failed to create payment intent", 
      error: error.message 
    });
  }
};

// Attach Payment Method (Step 2: After user enters card details)
export const attachPaymentMethod = async (req, res) => {
  try {
    const { paymentIntentId, paymentMethodId } = req.body;

    // Attach the payment method to the payment intent
    const attachedIntent = await paymongo.paymentIntents.attach(
      paymentIntentId,
      {
        data: {
          attributes: {
            payment_method: paymentMethodId
          }
        }
      }
    );

    res.status(200).json(attachedIntent);

  } catch (error) {
    console.error('Attach Error:', error);
    res.status(500).json({ message: "Failed to attach payment method" });
  }
};

// Verify Payment & Create Order (Step 3: After successful payment)
export const verifyPaymentAndCreateOrder = async (req, res) => {
  try {
    const { paymentIntentId, shippingAddress } = req.body;

    // 1. Retrieve payment intent to verify status
    const paymentIntent = await paymongo.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.data.attributes.status !== 'succeeded') {
      return res.status(400).json({ message: "Payment not successful" });
    }

    // 2. Get user's cart
    const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 3. Prepare order items and update stock
    const orderItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}` 
        });
      }

      orderItems.push({
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color
      });

      // Reduce stock
      product.stock -= item.quantity;
      await product.save();
    }

    // 4. Create the order
    const order = new Order({
      userId: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod: 'paymongo', // or specific method like 'gcash', 'card'
      paymentStatus: 'completed',
      totalAmount: cart.totalAmount,
      paymentIntentId: paymentIntentId // Store for reference
    });

    await order.save();

    // 5. Clear cart
    await Cart.findOneAndDelete({ userId: req.user.id });

    res.status(201).json({ 
      message: "Order created successfully", 
      order 
    });

  } catch (error) {
    console.error('Order Creation Error:', error);
    res.status(500).json({ message: "Failed to create order" });
  }
};

// Create Payment Method (for card payments)
export const createPaymentMethod = async (req, res) => {
  try {
    const { details } = req.body; 
    // details should contain: { card_number, exp_month, exp_year, cvc }

    const paymentMethod = await paymongo.paymentMethods.create({
      data: {
        attributes: {
          type: 'card',
          details: {
            card_number: details.card_number,
            exp_month: parseInt(details.exp_month),
            exp_year: parseInt(details.exp_year),
            cvc: details.cvc
          }
        }
      }
    });

    res.status(200).json({
      paymentMethodId: paymentMethod.data.id
    });

  } catch (error) {
    console.error('Payment Method Error:', error);
    res.status(500).json({ 
      message: "Failed to create payment method",
      error: error.message 
    });
  }
};

// For GCash/GrabPay - Create Source
export const createEWalletSource = async (req, res) => {
  try {
    const { type, amount } = req.body; // type: 'gcash' or 'grab_pay'
    
    const cart = await Cart.findOne({ userId: req.user.id });
    const totalInCentavos = Math.round(cart.totalAmount * 100);

    const source = await paymongo.sources.create({
      data: {
        attributes: {
          type: type, // 'gcash' or 'grab_pay'
          amount: totalInCentavos,
          currency: 'PHP',
          redirect: {
            success: `${config.clientUrl}/payment/success`,
            failed: `${config.clientUrl}/payment/failed`
          }
        }
      }
    });

    res.status(200).json({
      checkoutUrl: source.data.attributes.redirect.checkout_url,
      sourceId: source.data.id
    });

  } catch (error) {
    console.error('E-Wallet Error:', error);
    res.status(500).json({ message: "Failed to create e-wallet payment" });
  }
};

export const createQrPhPayment = async (req, res) => {
  try {
    const { shippingInfo, isDirectPurchase, directProductId, directQuantity, directSize, selectedCartItemIds } = req.body;
    const userId = req.user.id;
    const secretKey = config.paymongoSecret.trim();
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    let orderItems;
    let serverTotal;

    if (isDirectPurchase) {
      // ── DIRECT / BUY NOW ──
      if (!directProductId || !directSize || !directQuantity) {
        return res.status(400).json({ message: 'Missing direct purchase details' });
      }
      const product = await Product.findById(directProductId);
      if (!product) return res.status(404).json({ message: 'Product not found' });

      const sizeData = product.sizes?.find(s => s.size === directSize);
      if (!sizeData || sizeData.stock < directQuantity) {
        return res.status(400).json({ message: 'Insufficient stock for selected size' });
      }

      const serverPrice = sizeData.price;
      serverTotal = serverPrice * directQuantity;
      orderItems = [{
        productId: product._id,
        name: product.name,
        price: serverPrice,
        quantity: directQuantity,
        size: directSize,
        image: product.images?.[0]?.url
      }];

    } else {
      // ── CART CHECKOUT — only selected items ──
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      // SECURITY: filter to selected items, calculate total server-side
      const selectedIds = selectedCartItemIds || [];
      console.log('🔍 selectedIds from frontend:', JSON.stringify(selectedIds));
console.log('🔍 all cart item IDs:', cart.items.map(i => String(i._id)));
const selectedItems2 = cart.items.filter(item => selectedIds.includes(String(item._id)));
console.log('🔍 matched items count:', selectedItems2.length);
      const selectedItems = selectedIds.length > 0
        ? cart.items.filter(item => selectedIds.includes(String(item._id)))
        : cart.items;

      if (selectedItems.length === 0) {
        return res.status(400).json({ message: 'No matching cart items found' });
      }

      serverTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      orderItems = selectedItems.map(item => ({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || 'N/A',
        image: item.productId?.images?.[0]?.url,
        cartItemId: String(item._id)
      }));
    }

    const amountInCentavos = Math.round(serverTotal * 100);

    // Step 1: Create Payment Intent with server-calculated amount
    const intentRes = await axios.post('https://api.paymongo.com/v1/payment_intents', {
      data: {
        attributes: {
          amount: amountInCentavos,
          payment_method_allowed: ['qrph'],
          currency: 'PHP',
          description: 'EKOMERS Order Payment',
          metadata: { userId: String(userId) }
        }
      }
    }, { headers: { authorization: authHeader, 'Content-Type': 'application/json' } });

    const paymentIntentId = intentRes.data.data.id;
    const clientKey = intentRes.data.data.attributes.client_key;

    // Step 2: Create QR PH Payment Method
    const methodRes = await axios.post('https://api.paymongo.com/v1/payment_methods', {
      data: { attributes: { type: 'qrph' } }
    }, { headers: { authorization: authHeader, 'Content-Type': 'application/json' } });

    const paymentMethodId = methodRes.data.data.id;

    // Step 3: Attach Payment Method to Intent
    const attachRes = await axios.post(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`,
      { data: { attributes: { payment_method: paymentMethodId, client_key: clientKey } } },
      { headers: { authorization: authHeader, 'Content-Type': 'application/json' } }
    );

    const attrs = attachRes.data.data.attributes;
    const qrImage = attrs.next_action?.code?.image_url || attrs.next_action?.data?.image_url;

    await PendingPayment.create({
      paymentIntentId,
      userId,
      items: orderItems,
      totalAmount: serverTotal,
      shippingInfo,
      isDirectPurchase: !isDirectPurchase ? false : true,
      cartItemIds: selectedCartItemIds || []
    });

    console.log(`✅ QR PH pending order: ${paymentIntentId} (${orderItems.length} items, ₱${serverTotal})`);
    res.status(200).json({ paymentIntentId, qrImage, status: attrs.status });

  } catch (error) {
    console.error('❌ QR PH Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'QR PH payment failed' });
  }
};

export const checkPaymentIntentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const secretKey = config.paymongoSecret.trim();
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    const response = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      { headers: { authorization: authHeader } }
    );

    const status = response.data.data.attributes.status;
    res.status(200).json({ status });

  } catch (error) {
    res.status(500).json({ message: 'Failed to check status' });
  }
};