import Order from '../models/orderSchema.js';
import Product from '../models/productSchema.js'; // 👈 ADD THIS LINE

// GET /api/admin/orders - Get all orders across the platform
export const getAllOrders = async (req, res) => {
  try {
    // Populate userId to get the name/email of the buyer
    const orders = await Order.find({})
      .populate('userId', 'name email username') 
      .sort({ createdAt: -1 });

    // Ensure we return an object with an 'orders' array to match your frontend logic
    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // 🚀 STOCK RESTORATION LOGIC
    // Only run if transitioning TO 'Cancelled' and not already there
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
      console.log(`🛠️ Admin finalizing cancellation for ${order._id}. Restoring stock...`);
      
      // Create an array of update promises
      const stockUpdates = order.items.map(item => {
        if (!item.productId) return Promise.resolve(); // Skip if productId is missing
        
        return Product.updateOne(
          { _id: item.productId, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": item.quantity } }
        );
      });

      // Run all updates at once
      await Promise.all(stockUpdates);
      console.log("✅ Stock restored successfully.");
    }

    order.status = status;
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    console.error("❌ UPDATE STATUS ERROR:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};