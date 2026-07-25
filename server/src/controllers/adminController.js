import User from '../models/userSchema.js';
import Order from '../models/orderSchema.js';
import Product from '../models/productSchema.js';
import AdminSettings from '../models/adminSettingsSchema.js';
import { cloudinary } from '../config/cloudinary.js';

// ==========================================
// 1. USER MANAGEMENT
// ==========================================

// GET /api/admin/users
// Query params: page, limit, search, role
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = 'all',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / limitNum),
        totalUsers,
        limit: limitNum,
        hasMore: skip + users.length < totalUsers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const adminUpdateUser = async (req, res) => {
  try {
    // Only these fields may ever be touched through this endpoint.
    // Anything else in req.body (password, tokenVersion, isVerified,
    // verificationCode, etc.) is silently ignored, not applied.
    const ALLOWED_FIELDS = ['username', 'fullName', 'phone', 'gender', 'role'];

    const updates = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.role && !['user', 'admin'].includes(updates.role)) {
      return res.status(400).json({ message: 'Invalid role value' });
    }

    if (req.params.id === req.user.id && updates.role && updates.role !== 'admin') {
      return res.status(400).json({ message: 'You cannot demote yourself from Admin!' });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};

export const adminDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Admins cannot delete their own accounts!' });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'User deleted by admin' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Delete failed' });
  }
};

// ==========================================
// 2. ADMIN PRODUCT LISTING (with pagination)
// ==========================================

export const adminGetProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .sort({ category: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    const grouped = products.reduce((acc, product) => {
      const cat = product.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {});

    res.status(200).json({
      products,
      grouped,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalProducts / limitNum),
        totalProducts,
        limit: limitNum,
        hasMore: skip + products.length < totalProducts,
      },
    });
  } catch (error) {
    console.error('ADMIN_GET_PRODUCTS_ERROR:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
};

// ==========================================
// 3. GLOBAL STORE SETTINGS
// ==========================================

export const getStoreSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
  }
};

export const updateStoreSettings = async (req, res) => {
  try {
    const updateData = {
      storeName: req.body.storeName,
      storeDescription: req.body.storeDescription,
      newsletterTitle: req.body.newsletterTitle,
      newsletterSubtitle: req.body.newsletterSubtitle,
      lastUpdatedBy: req.user.id,
    };

    if (req.body.officeAddress) {
      updateData.officeAddress = JSON.parse(req.body.officeAddress);
    }

    if (req.body.socialLinks) {
      updateData.socialLinks = JSON.parse(req.body.socialLinks);
    }

    if (req.body.paymentMethodsRaw) {
      updateData.paymentMethods = req.body.paymentMethodsRaw
        .split(',')
        .map(method => method.trim().toUpperCase());
    }

    if (req.file) {
      const currentSettings = await AdminSettings.findOne();
      if (currentSettings?.storeLogo?.public_id) {
        await cloudinary.uploader.destroy(currentSettings.storeLogo.public_id);
      }
      updateData.storeLogo = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    const settings = await AdminSettings.findOneAndUpdate(
      {},
      { $set: updateData },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ message: 'Store settings updated!', settings });
  } catch (error) {
    console.error('CRITICAL SETTINGS ERROR:', error);
    res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};

// ==========================================
// 4. SALES REPORT
// ==========================================

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