import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    // Snapshot of order info so admin doesn't need to populate every time
    orderSnapshot: {
      orderId: String,       // e.g. "ORD-123456"
      totalAmount: Number,
      status: String,
      itemCount: Number
    },
    subject: {
      type: String,
      default: 'Order Support'
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    lastMessage: {
      type: String,
      default: ''
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    unreadByAdmin: {
      type: Number,
      default: 0
    },
    unreadByUser: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;