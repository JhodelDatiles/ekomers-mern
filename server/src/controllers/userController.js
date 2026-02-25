import User from '../models/userSchema.js';
import { v2 as cloudinary } from 'cloudinary'; // Ensure Cloudinary is configured
import { sendSecurityCode } from '../services/emailService.js';
import bcrypt from 'bcrypt'

//---------- GET USER ----------
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//---------- UPDATE USER PROFILE ----------
export const updateProfile = async (req, res) => {
  try {
    const { fullName, phone, address, profilePic, username, gender, dob } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update standard profile fields
    if (username) user.username = username;
    if (fullName) user.fullName = fullName;
    if (phone) user.phone = phone; 
    if (gender) user.gender = gender;
    if (dob) user.dob = dob;

    // Standardize Address Array
    if (address && Array.isArray(address)) {
      user.address = address;
      // Tells Mongoose to deep-check the array for changes
      user.markModified('address'); 
    }

    await user.save();
    res.status(200).json({ message: "Profile synchronized", user });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};


// ... getProfile and updateProfile remain the same ...

// @desc    Step 1: Request OTP for sensitive actions
// src/controllers/userController.js
export const requestSecurityCode = async (req, res) => {
  try {
    const { type } = req.body;
    const user = await User.findById(req.user.id);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = code;
    user.codeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log("Attempting to send email to:", user.email); // LOG 1

    const emailSent = await sendSecurityCode(user, code, type);
    
    if (!emailSent) {
      console.log("Email service returned FALSE"); // LOG 2
      return res.status(500).json({ message: "Email service failed" });
    }

    res.status(200).json({ message: "Code sent!" });
  } catch (error) {
    console.error("CRASH IN REQUEST_CODE:", error); // LOG 3
    res.status(500).json({ message: error.message });
  }
};

// @desc    Step 2a: Verify OTP and Change Password
export const verifyPasswordChange = async (req, res) => {
  try {
    const { current, new: newPassword, code } = req.body;
    const user = await User.findById(req.user.id);

    if (user.verificationCode !== code || Date.now() > user.codeExpires) {
      return res.status(400).json({ message: "Invalid or expired security code" });
    }

    const isMatch = await bcrypt.compare(current, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password incorrect" });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear OTP fields
    user.verificationCode = undefined;
    user.codeExpires = undefined;
    user.tokenVersion += 1; // Force logout other sessions
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Step 2b: Verify OTP and Delete Account
export const verifyAccountDeletion = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user.id);

    if (user.verificationCode !== code || Date.now() > user.codeExpires) {
      return res.status(400).json({ message: "Invalid or expired security code" });
    }

    if (user.profilePic?.publicId) {
      await cloudinary.uploader.destroy(user.profilePic.publicId);
    }

    await User.findByIdAndDelete(req.user.id);
    res.clearCookie('token');
    res.status(200).json({ message: "Account successfully terminated" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed" });
  }
};