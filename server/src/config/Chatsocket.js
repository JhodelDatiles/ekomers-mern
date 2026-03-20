import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

export const initSocket = (httpServer, allowedOrigins) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    },
    path: '/socket.io'
  });

  // ── AUTH MIDDLEWARE ──
  // Reads the accessToken httpOnly cookie for auth
  // Falls back to auth.token for clients that pass it in handshake
  io.use((socket, next) => {
    try {
      let token = null;

      // Try cookie first (browser clients)
      const rawCookie = socket.handshake.headers.cookie;
      if (rawCookie) {
        const parsed = cookie.parse(rawCookie);
        token = parsed.accessToken;
      }

      // Fallback: client passed token in handshake.auth
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
      socket.userId = String(decoded.id);
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: user ${socket.userId} (${socket.userRole})`);

    // Each user joins their personal room for direct notifications
    socket.join(`user_${socket.userId}`);

    // Admins join the shared admin room for broadcast alerts
    if (socket.userRole === 'admin') {
      socket.join('admins');
    }

    // ── JOIN a conversation room ──
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv_${conversationId}`);
      console.log(`📬 User ${socket.userId} joined conv_${conversationId}`);
    });

    // ── LEAVE a conversation room ──
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    // ── TYPING indicators ──
    socket.on('typing_start', ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit('typing_start', {
        userId: socket.userId,
        role: socket.userRole
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(`conv_${conversationId}`).emit('typing_stop', {
        userId: socket.userId
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: user ${socket.userId}`);
    });
  });

  return io;
};