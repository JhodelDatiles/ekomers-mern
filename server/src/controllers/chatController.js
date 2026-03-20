import Conversation from '../models/Conversationschema.js';
import Message from '../models/Messageschema.js';
import Order from '../models/orderSchema.js';

// ─────────────────────────────────────────────────────────────────
// USER: Get or create a conversation for a specific order
// POST /api/chat/conversations
// Body: { orderId }
// ─────────────────────────────────────────────────────────────────
export const getOrCreateConversation = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    // Verify the order belongs to this user
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Return existing conversation if one exists for this order
    let conversation = await Conversation.findOne({ orderId, userId });

    if (!conversation) {
      conversation = await Conversation.create({
        userId,
        orderId,
        orderSnapshot: {
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          status: order.status,
          itemCount: order.items?.length || 0
        },
        subject: `Order #${order.orderId || order._id.toString().slice(-8).toUpperCase()}`
      });
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('getOrCreateConversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// USER: Get all conversations for the logged-in user
// GET /api/chat/conversations
// ─────────────────────────────────────────────────────────────────
export const getUserConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.id })
      .sort({ lastMessageAt: -1 });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// ADMIN: Get all conversations across all users
// GET /api/chat/admin/conversations
// ─────────────────────────────────────────────────────────────────
export const getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({})
      .populate('userId', 'username email profilePic')
      .sort({ lastMessageAt: -1 });
    res.status(200).json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// Get messages for a conversation
// GET /api/chat/conversations/:id/messages
// ─────────────────────────────────────────────────────────────────
export const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    // Security: non-admins can only read their own conversations
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    if (!isAdmin && String(conversation.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username profilePic');

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// Send a message (user or admin)
// POST /api/chat/conversations/:id/messages
// Body: { content }
// ─────────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const isAdmin = req.user.role === 'admin';

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Security: non-admins can only message their own conversations
    if (!isAdmin && String(conversation.userId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (conversation.status === 'closed') {
      return res.status(400).json({ message: 'This conversation is closed.' });
    }

    const message = await Message.create({
      conversationId: id,
      senderId: req.user.id,
      senderRole: isAdmin ? 'admin' : 'user',
      content: content.trim()
    });

    // Update conversation metadata
    conversation.lastMessage = content.trim().slice(0, 100);
    conversation.lastMessageAt = new Date();
    if (isAdmin) {
      conversation.unreadByUser += 1;
      conversation.unreadByAdmin = 0; // Admin read by sending
    } else {
      conversation.unreadByAdmin += 1;
      conversation.unreadByUser = 0; // User read by sending
    }
    await conversation.save();

    const populated = await message.populate('senderId', 'username profilePic');

    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${id}`).emit('new_message', populated);
      // Notify admin room of unread count change
      if (!isAdmin) {
        io.to('admins').emit('conversation_updated', {
          conversationId: id,
          lastMessage: conversation.lastMessage,
          unreadByAdmin: conversation.unreadByAdmin
        });
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// Mark conversation as read (from the perspective of the caller)
// PUT /api/chat/conversations/:id/read
// ─────────────────────────────────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';

    const conversation = await Conversation.findById(id);
    if (!conversation) return res.status(404).json({ message: 'Not found' });

    if (isAdmin) {
      conversation.unreadByAdmin = 0;
    } else {
      conversation.unreadByUser = 0;
    }
    await conversation.save();

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// ADMIN: Close a conversation
// PUT /api/chat/admin/conversations/:id/close
// ─────────────────────────────────────────────────────────────────
export const closeConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );
    if (!conversation) return res.status(404).json({ message: 'Not found' });

    const io = req.app.get('io');
    if (io) {
      io.to(`conv_${req.params.id}`).emit('conversation_closed', { conversationId: req.params.id });
    }

    res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────
// Get total unread count for the logged-in user/admin
// GET /api/chat/unread-count
// ─────────────────────────────────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    let count;
    if (isAdmin) {
      // Sum all unreadByAdmin across all open conversations
      const result = await Conversation.aggregate([
        { $match: { status: 'open' } },
        { $group: { _id: null, total: { $sum: '$unreadByAdmin' } } }
      ]);
      count = result[0]?.total || 0;
    } else {
      const result = await Conversation.aggregate([
        { $match: { userId: req.user._id, status: 'open' } },
        { $group: { _id: null, total: { $sum: '$unreadByUser' } } }
      ]);
      count = result[0]?.total || 0;
    }

    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};