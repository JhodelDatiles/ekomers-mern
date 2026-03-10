import rateLimit from 'express-rate-limit';

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per window
  message: { message: 'Too many attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: 'Too many password reset attempts. Try again in 1 hour.' },
});

export { authLimiter, forgotPasswordLimiter };