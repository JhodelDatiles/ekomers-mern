import User from '../models/userSchema.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Helper to determine cookie security based on environment
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
    const { username, email, password } = req.body;
    const findEmail = await User.findOne({ email: email.toLowerCase() });
    if (findEmail) return res.status(409).json({ message: "Email already exists!" });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user'
    });
    await user.save();
    setTokenCookies(res, user);
    res.status(201).json({
      message: "User registered successfully!",
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials!" });
    }
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