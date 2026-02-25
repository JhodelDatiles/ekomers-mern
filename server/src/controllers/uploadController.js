import User from '../models/userSchema.js';
import { v2 as cloudinary } from 'cloudinary';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    // 1. Find the user to get the old publicId
    const user = await User.findById(req.user.id);
    const oldPublicId = user?.profilePic?.publicId;

    // 2. Update the User document immediately with the new image data
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        profilePic: { 
          url: req.file.path, 
          publicId: req.file.filename 
        } 
      },
      { new: true }
    ).select('-password');

    // 3. Cleanup: If an old image existed, delete it from Cloudinary
    if (oldPublicId) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
        console.log("Cloudinary: Old image replaced and deleted.");
      } catch (err) {
        console.error("Cloudinary Cleanup Failed:", err);
      }
    }

    res.status(200).json({
      message: "Profile picture updated successfully",
      profilePic: updatedUser.profilePic,
      user: updatedUser // Return user so frontend can update global state
    });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};


export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images provided" });
    }

    const images = req.files.map(file => ({
      url: file.path,
      publicId: file.filename
    }));

    res.status(200).json({ 
      success: true,
      images 
    });
  } catch (error) {
    res.status(500).json({ message: "Server failed to process images", error: error.message });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) return res.status(400).json({ message: "No publicId provided" });

    // Core Cloudinary destruction
    const result = await cloudinary.uploader.destroy(publicId);

    res.status(200).json({ message: "Image deleted successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Image deletion failed" });
  }
};