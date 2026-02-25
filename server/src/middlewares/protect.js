import jwt from 'jsonwebtoken';
import User from '../models/userSchema.js';

export const protect = async (req, res, next) => {
  try {
    // 1. Prioritize the httpOnly cookie (Secure & Recommended)
    let token = req.cookies?.accessToken;
    // 2. Fallback to Authorization Header (for Mobile/Postman)
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Session expired. Please login again." 
      });
    }
    // 3. Verify token
    // clockTolerance handles slight time mismatches between client/server
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET, { clockTolerance: 10 });
    // 4. Verification: Does the user still exist in the DB?
    // We select '-password' so sensitive data isn't leaked into req.user
    const currentUser = await User.findById(decoded.id).select('-password');
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: "The user belonging to this token no longer exists." 
      });
    }
    // 5. Grant access: Attach the full user object to the request
    req.user = currentUser;
    next();
  } catch (error) {
    // Specifically handle the expired error so the frontend interceptor knows to refresh
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: "Token expired", 
        isExpired: true 
      });
    }

    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/**
 * Authorization: Check if user has required role
 * Should always be used AFTER the protect middleware
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      success: false, 
      message: "Forbidden: You do not have permission to perform this action." 
    });
  }
};