import Order from '../../models/orderSchema.js';
import Product from '../../models/productSchema.js';

export const getSalesReport = async (req, res) => {
  try {
    const { view = 'day' } = req.query;

    let format = '%Y-%m-%d';
    if (view === 'week') format = 'Week %V - %Y';
    if (view === 'month') format = '%B %Y';

    const validSaleCriteria = {
      paymentStatus: 'paid',
      status: { $nin: ['Cancelled', 'Cancellation Requested'] },
    };

    const [timeline, topProducts, recentOrders, lowStockProducts] = await Promise.all([
      Order.aggregate([
        { $match: validSaleCriteria },
        {
          $group: {
            _id: { $dateToString: { format, date: '$createdAt' } },
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Order.aggregate([
        { $match: validSaleCriteria },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.name' },
            unitsSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 10 },
      ]),

      Order.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select('orderId totalAmount status items createdAt')
        .lean(),

      Product.aggregate([
        { $addFields: { totalStock: { $sum: '$sizes.stock' } } },
        { $match: { 'sizes.stock': { $lte: 5 } } },
        { $sort: { totalStock: 1 } },
        { $limit: 10 },
        { $project: { name: 1, basePrice: 1, sizes: 1, category: 1, stock: '$totalStock' } }
      ]),
    ]);

    res.status(200).json({
      timeline: timeline || [],
      topProducts: topProducts || [],
      recentOrders: recentOrders || [],
      lowStockProducts: lowStockProducts || [],
    });
  } catch (error) {
    console.error('ADMIN_REPORT_ERROR:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};