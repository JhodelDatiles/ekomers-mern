import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import conn from './config/db.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js'; // Settings/General Admin
import adminProductRoutes from './routes/adminProductRoutes.js';
import adminOrderRoutes from './routes/adminOrderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import mapRoutes from './routes/map.js'; 
import wishlistRoutes from './routes/wishlistRoutes.js'; 

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Allows cookies to be secure over ngrok
const PORT = process.env.PORT || 5000;

// 1. CORS CONFIGURATION
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'https://appointed-melida-biserially.ngrok-free.dev', 
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || origin.includes('ngrok-free.dev');
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log("❌ CORS Rejected Origin:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'paymongo-signature', 
    'ngrok-skip-browser-warning'
  ],
  exposedHeaders: ['set-cookie']
}));

// 2. BODY PARSING & WEBHOOK RAW BODY CAPTURE
// 🚀 CRITICAL: We capture the raw buffer here for PayMongo Signature Verification
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('/api/orders/webhook')) {
      req.rawBody = buf.toString(); 
    }
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. HEALTH CHECK
app.get('/', (req, res) => {
  res.json({ message: 'E-commerce API is running!', mode: process.env.NODE_ENV });
});

// 4. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);     // Includes DELETE /api/cart/clear
app.use('/api/orders', orderRoutes);   // Includes POST /api/orders/webhook
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/map', mapRoutes); 

// 5. ADMIN SPECIFIC ROUTES (Structured for clarity)
app.use('/api/', adminRoutes); // Matching your settingsAPI in frontend
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/orders', adminOrderRoutes);

// 6. 404 HANDLER
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// 7. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err 
  });
});

// 8. SERVER STARTUP
const startServer = async () => {
  try {
    await conn(); // Database Connection
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Webhook URL: https://appointed-melida-biserially.ngrok-free.dev/api/orders/webhook`);
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

startServer();