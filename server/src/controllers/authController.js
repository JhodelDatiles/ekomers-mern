import User from '../models/userSchema.js';
import { sendVerificationEmail, sendSecurityCode } from '../services/emailService.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    path: '/',
    secure: true, 
    sameSite: 'none', 
  };
};

const setTokenCookies = (res, user) => {
  const accessToken = jwt.sign(
    { id: user._id, role: user.role }, 
    process.env.ACCESS_SECRET, 
    { expiresIn: '15m' } 
  );
  
  const refreshToken = jwt.sign(
    { id: user._id }, 
    process.env.REFRESH_SECRET, 
    { expiresIn: '7d' }
  );

  const cookieOptions = getCookieOptions();

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, 
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });
};

export const register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(409).json({ message: "User already exists" });

    const token = crypto.randomBytes(32).toString('hex');

    const user = await User.create({ 
      email, 
      password, 
      username, 
      isVerified: true  // ← auto-verify on register
      // verificationToken: token 
    });

    // 🚀 WRAP EMAIL IN A TRY-CATCH
    try {
      await sendVerificationEmail(user);
    } catch (emailErr) {
      console.error("❌ Email Service Failed:", emailErr.message);
      // We don't return 500 here because the user WAS created successfully.
    }

    res.status(201).json({ 
      message: "Registration successful! Please check your email to verify." 
    });

  } catch (error) {
    console.error("🔥 Global Register Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token." });
    }

    user.isVerified = true;
    user.verificationToken = undefined; // Clear the token once used
    await user.save();

    res.status(200).json({ message: "Email verified successfully! You can now login." });
  } catch (error) {
    res.status(500).json({ message: "Verification failed", error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.verificationCode = code;
    user.codeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendSecurityCode(user, code, 'password');

    res.json({ message: "Security code sent to your email!" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      verificationCode: code,
      codeExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    // Hash new password
    // const salt = await bcrypt.genSalt(10);
    // user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear security fields
    user.password = newPassword;
    user.verificationCode = undefined;
    user.codeExpires = undefined;
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const resendVerification = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.isVerified) return res.status(400).json({ message: "Already verified" });

  // Use verificationToken to match your verifyEmail function
  const newToken = crypto.randomBytes(32).toString('hex');
  user.verificationToken = newToken; 
  await user.save();

  await sendVerificationEmail(user);

  res.status(200).json({ message: "Verification email sent!" });
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log("User found:", !!user);
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password Match:", isMatch);
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials!" });
    }
    // 🛑 CHECK VERIFICATION STATUS
    // if (!user.isVerified) {
    //   return res.status(403).json({ 
    //     message: "Please verify your email address before logging in." 
    //   });
    // }
    setTokenCookies(res, user);

    // 🚀 NEW FEATURE: Fetch full user profile to include addresses for instant UI sync
    const fullUser = await User.findById(user._id).select('-password');

    res.json({
      message: "Login successful",
      user: fullUser // Sending fullUser instead of partial data
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "Session expired" });

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    const cookieOptions = getCookieOptions();

    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 🚀 NEW FEATURE: Send the full user back so the Interceptor can broadcast it
    const fullUser = await User.findById(user._id).select('-password');
    res.status(200).json({ 
      message: "Token refreshed",
      user: fullUser 
    });

  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = (req, res) => {
  const options = getCookieOptions();
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
  res.status(200).json({ message: 'Logged out' });
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};