import express from 'express';
import {
  getOrCreateConversation,
  getUserConversations,
  getAllConversations,
  getMessages,
  sendMessage,
  markAsRead,
  closeConversation,
  getUnreadCount
} from '../controllers/chats/chatController.js';
import { protect, adminOnly } from '../middlewares/protect.js';

const router = express.Router();

// All routes require auth
router.use(protect);

// User routes
router.post('/conversations', getOrCreateConversation);
router.get('/conversations', getUserConversations);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);
router.put('/conversations/:id/read', markAsRead);
router.get('/unread-count', getUnreadCount);

// Admin routes
router.get('/admin/conversations', adminOnly, getAllConversations);
router.put('/admin/conversations/:id/close', adminOnly, closeConversation);

export default router;