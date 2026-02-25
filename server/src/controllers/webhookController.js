import crypto from 'crypto';
import Order from '../models/orderSchema.js';
import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';
import User from '../models/userSchema.js';
import { sendOrderConfirmation } from '../services/emailService.js';

export const handlePayMongoWebhook = async (req, res) => {
  
  console.log("🚀 Webhook hit! Checking signature..."); // ADD THIS LINE
  const signature = req.headers['paymongo-signature'];
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

  // 1. Verify Webhook Authenticity
  // Note: req.body must be the RAW buffer for verification
  const payload = JSON.stringify(req.body); 
  const [t, te, li] = signature.split(',');
  const timestamp = t.split('=')[1];
  const paymongoHash = te ? te.split('=')[1] : li.split('=')[1];

  const baseString = timestamp + "." + payload;
  const calculatedHash = crypto
    .createHmac('sha256', webhookSecret)
    .update(baseString)
    .digest('hex');

  if (calculatedHash !== paymongoHash) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body.data.attributes;
  const type = event.type; // e.g., 'checkout_session.payment.paid'

  if (type === 'checkout_session.payment.paid') {
    const session = event.data.attributes;
    const { userId, address, contactNumber, instructions } = session.metadata;

    try {
      // 2. Fetch Cart and Prepare Order
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      
      const orderItems = cart.items.map(item => ({
        productId: item.productId._id,
        name: item.productId.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color
      }));

      // 3. Update Stock Atomically
      for (const item of cart.items) {
        await Product.updateOne(
          { _id: item.productId._id, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": -item.quantity, stock: -item.quantity } }
        );
      }

      // 4. Save Final Order
      const newOrder = new Order({
        userId,
        items: orderItems,
        shippingInfo: { address, contactNumber, deliveryInstructions: instructions },
        totalAmount: cart.totalAmount,
        paymentMethod: 'PayMongo',
        status: 'Order in Progress', // Since it's paid, it jumps to progress
        paymentId: session.payment_intent_id
      });

      await newOrder.save();

      // 5. Cleanup
      await Cart.findOneAndDelete({ userId });
      const user = await User.findById(userId);
      await sendOrderConfirmation(newOrder, user);

      console.log(`✅ Order ${newOrder._id} finalized via Webhook`);
      res.status(200).json({ received: true });

    } catch (err) {
      console.error("Webhook Order Processing Error:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.status(200).send('Event ignored');
  }
};