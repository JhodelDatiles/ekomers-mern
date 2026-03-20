import Order from '../models/orderSchema.js';
import Product from '../models/productSchema.js';

// Helper: resolve date filter from period OR explicit from/to
const getDateFilter = ({ period, dateFrom, dateTo }) => {
  // Custom range takes priority
  if (dateFrom || dateTo) {
    const filter = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      filter.$gte = from;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filter.$lte = to;
    }
    return Object.keys(filter).length ? filter : null;
  }

  if (!period || period === 'all') return null;
  const now  = new Date();
  let from;
  if (period === 'day') {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    from = new Date(now);
    from.setDate(now.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    from = new Date(now);
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    return null;
  }
  return { $gte: from, $lte: now };
};

// GET /api/admin/orders/users
export const getOrderUsers = async (req, res) => {
  try {
    const {
      search   = '',
      page     = 1,
      limit    = 10,
      period   = 'all',
      dateFrom = '',
      dateTo   = '',
    } = req.query;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const dateFilter = getDateFilter({ period, dateFrom, dateTo });

    const basePipeline = [
      ...(dateFilter ? [{ $match: { createdAt: dateFilter } }] : []),
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      ...(search ? [{
        $match: {
          $or: [
            { 'user.username': { $regex: search, $options: 'i' } },
            { 'user.email':    { $regex: search, $options: 'i' } },
          ]
        }
      }] : []),
      {
        $group: {
          _id:         '$userId',
          username:    { $first: '$user.username' },
          email:       { $first: '$user.email' },
          totalOrders: { $sum: 1 },
          lastOrderAt: { $max: '$createdAt' },
        }
      },
      { $sort: { lastOrderAt: -1 } },
    ];

    const [countResult, users] = await Promise.all([
      Order.aggregate([...basePipeline, { $count: 'total' }]),
      Order.aggregate([...basePipeline, { $skip: skip }, { $limit: limitNum }]),
    ]);

    const totalUsers = countResult[0]?.total || 0;

    res.status(200).json({
      users,
      pagination: {
        currentPage: pageNum,
        totalPages:  Math.ceil(totalUsers / limitNum),
        totalUsers,
        limit:       limitNum,
      },
    });
  } catch (error) {
    console.error('getOrderUsers error:', error);
    res.status(500).json({ message: 'Error fetching order users', error: error.message });
  }
};

// GET /api/admin/orders/by-user/:userId
export const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [orders, totalOrders] = await Promise.all([
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments({ userId }),
    ]);

    res.status(200).json({
      orders,
      pagination: {
        currentPage: pageNum,
        totalPages:  Math.ceil(totalOrders / limitNum),
        totalOrders,
        limit:       limitNum,
      },
    });
  } catch (error) {
    console.error('getOrdersByUser error:', error);
    res.status(500).json({ message: 'Error fetching user orders', error: error.message });
  }
};

// GET /api/admin/orders — kept for backwards compat
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('userId', 'name email username')
      .sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
};

// PUT /api/admin/orders/:id — Admin updates order status manually
// NOTE: Stock restoration is NO LONGER handled here.
// Auto-cancellations (via cancelOrder) already restore stock + trigger refund.
// This handler is only for admin moving orders through shipping stages.
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
 
    // Safety guard: if an order was already auto-cancelled by the user,
    // the admin should not be able to resurrect it through this endpoint.
    if (order.status === 'Cancelled' && status !== 'Cancelled') {
      return res.status(400).json({ 
        message: "This order was already cancelled and cannot be reactivated." 
      });
    }
 
    order.status = status;
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    console.error("❌ UPDATE STATUS ERROR:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};