import User from '../models/userSchema.js';
import AdminSettings from '../models/adminSettingsSchema.js';
import { cloudinary } from '../config/cloudinary.js';

// ==========================================
// 1. USER MANAGEMENT
// ==========================================

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const adminUpdateUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id && req.body.role && req.body.role !== 'admin') {
      return res.status(400).json({ message: "You cannot demote yourself from Admin!" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: req.body }, 
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

export const adminDeleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "Admins cannot delete their own accounts!" });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted by admin" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Delete failed" });
  }
};

// ==========================================
// 2. GLOBAL STORE SETTINGS
// ==========================================

export const getStoreSettings = async (req, res) => {
  try {
    let settings = await AdminSettings.findOne();
    if (!settings) {
      settings = await AdminSettings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch settings", error: error.message });
  }
};

export const updateStoreSettings = async (req, res) => {
  try {
    const updateData = {
      storeName: req.body.storeName,
      storeDescription: req.body.storeDescription,
      newsletterTitle: req.body.newsletterTitle,
      newsletterSubtitle: req.body.newsletterSubtitle,
      lastUpdatedBy: req.user.id
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

    // --- CLOUDINARY CLEANUP LOGIC ---
    if (req.file) {
      // 1. Find existing settings to get the old public_id
      const currentSettings = await AdminSettings.findOne();
      
      // 2. If an old logo exists, delete it from Cloudinary
      if (currentSettings?.storeLogo?.public_id) {
        await cloudinary.uploader.destroy(currentSettings.storeLogo.public_id);
      }

      // 3. Set the new logo data
      updateData.storeLogo = {
        url: req.file.path,
        public_id: req.file.filename
      };
    }

    const settings = await AdminSettings.findOneAndUpdate(
      {}, 
      { $set: updateData },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json({ message: "Store settings updated!", settings });
  } catch (error) {
    console.error("CRITICAL SETTINGS ERROR:", error);
    res.status(500).json({ message: "Failed to update settings", error: error.message });
  }
};

// PUT /api/admin/orders/:id
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body; 
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    // SUCCESS: Now saving to the field the frontend actually reads
    if (status) {
      order.orderStatus = status; 
    }

    const updatedOrder = await order.save();
    res.status(200).json({ message: "Manifest updated", order: updatedOrder });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};