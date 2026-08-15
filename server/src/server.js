import { config } from "./envconfig.js";
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import cors from "cors";
import conn from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import { initSocket } from "./config/Chatsocket.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminSettingsRoutes from "./routes/adminSettingsRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminReportRoutes from "./routes/adminReportRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import mapRoutes from "./routes/mapRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import aiChatRoutes from "./routes/aiChatRoutes.js";


const app = express();
const httpServer = createServer(app); // Wrap express in http server for Socket.IO
app.set("trust proxy", 1);
const PORT = config.port || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. CORS CONFIGURATION
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "https://appointed-melida-biserially.ngrok-free.dev",
  config.clientUrl,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.includes(origin);
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log("CORS Rejected Origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "paymongo-signature",
      "ngrok-skip-browser-warning",
    ],
    exposedHeaders: ["set-cookie"],
  }),
);

// 2. BODY PARSING
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({
    message: "E-commerce API is running!",
    mode: config.isProduction ? "production" : "development",
  });
});

// 4. API ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/ai-chat", aiChatRoutes);

// 5. ADMIN SPECIFIC ROUTES
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/settings", adminSettingsRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/sales-report", adminReportRoutes);

// 6. PRODUCTION STATIC FILES
if (config.isProduction) {
  const clientDistPath = path.join(__dirname, "..", "..", "client", "dist");

  app.use(
    express.static(clientDistPath, {
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.set("Cache-Control", "no-cache, no-store, must-revalidate");
        } else {
          res.set("Cache-Control", "public, max-age=31536000, immutable");
        }
        if (filePath.endsWith(".gz")) {
          res.set("Content-Encoding", "gzip");
        }
      },
    }),
  );

  app.get("/*splat", (req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

// 7. 404 HANDLER
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// 8. GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong!",
    error: config.isProduction ? {} : err,
  });
});

// 9. SERVER STARTUP
const startServer = async () => {
  try {
    await conn();

    // Init Socket.IO — attach io instance to app for use in controllers
    const io = initSocket(httpServer, allowedOrigins);
    app.set("io", io);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`------------------------------------------------------`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
