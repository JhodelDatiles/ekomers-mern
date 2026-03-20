import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Package, Search, Loader2, Send, X, Lock, CheckCircle, User, RefreshCw } from 'lucide-react';
import { useSocket } from '../../context/Socketcontext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminChatPage = () => {
  const { user } = useAuth();
  const { getSocket, resetUnread } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const socket = getSocket();

  // Reset unread badge when admin opens this page
  useEffect(() => {
    resetUnread();
  }, [resetUnread]);

  // Load all conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/admin/conversations');
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages for selected conversation
  const openConversation = async (conv) => {
    setActiveConv(conv);
    setMsgLoading(true);
    setMessages([]);

    try {
      const { data } = await api.get(`/chat/conversations/${conv._id}/messages`);
      setMessages(data);
      await api.put(`/chat/conversations/${conv._id}/read`);

      // Update unread count locally
      setConversations(prev =>
        prev.map(c => c._id === conv._id ? { ...c, unreadByAdmin: 0 } : c)
      );
    } catch (err) {
      console.error('Failed to load messages');
    } finally {
      setMsgLoading(false);
    }
  };

  // Socket.IO events
  useEffect(() => {
    if (!socket || !activeConv) return;

    socket.emit('join_conversation', activeConv._id);

    const handleNewMessage = (msg) => {
      setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);
      // Auto-mark as read since conversation is open
      api.put(`/chat/conversations/${activeConv._id}/read`).catch(() => {});
    };

    const handleTypingStart = ({ role }) => {
      if (role === 'user') setIsTyping(true);
    };

    const handleTypingStop = () => setIsTyping(false);

    socket.on('new_message', handleNewMessage);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);

    return () => {
      socket.emit('leave_conversation', activeConv._id);
      socket.off('new_message', handleNewMessage);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
    };
  }, [socket, activeConv?._id]);

  // Real-time: new conversations from users
  useEffect(() => {
    if (!socket) return;

    const handleConvUpdated = ({ conversationId, lastMessage, unreadByAdmin }) => {
      setConversations(prev => {
        const exists = prev.find(c => c._id === conversationId);
        if (!exists) {
          fetchConversations(); // New conversation — reload list
          return prev;
        }
        return prev.map(c =>
          c._id === conversationId
            ? { ...c, lastMessage, unreadByAdmin, lastMessageAt: new Date() }
            : c
        ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      });
    };

    socket.on('conversation_updated', handleConvUpdated);
    return () => socket.off('conversation_updated', handleConvUpdated);
  }, [socket, fetchConversations]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socket || !activeConv) return;
    socket.emit('typing_start', { conversationId: activeConv._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: activeConv._id });
    }, 1500);
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return;
    if (activeConv.status === 'closed') return toast.error('Conversation is closed');
    const content = input.trim();
    setInput('');
    setSending(true);
    if (socket) socket.emit('typing_stop', { conversationId: activeConv._id });

    try {
      const { data: msg } = await api.post(`/chat/conversations/${activeConv._id}/messages`, { content });
      setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);
    } catch (err) {
      setInput(content);
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = async (convId) => {
    try {
      await api.put(`/chat/admin/conversations/${convId}/close`);
      setConversations(prev => prev.map(c => c._id === convId ? { ...c, status: 'closed' } : c));
      if (activeConv?._id === convId) setActiveConv(prev => ({ ...prev, status: 'closed' }));
      toast.success('Conversation closed');
    } catch {
      toast.error('Failed to close');
    }
  };

  const filtered = conversations.filter(c =>
    c.userId?.username?.toLowerCase().includes(search.toLowerCase()) ||
    c.subject?.toLowerCase().includes(search.toLowerCase()) ||
    c.orderSnapshot?.orderId?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadByAdmin || 0), 0);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-base-100 rounded-[32px] overflow-hidden border border-base-300">

      {/* SIDEBAR */}
      <div className="w-80 border-r border-white/5 flex flex-col shrink-0">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black uppercase italic tracking-tight text-white flex items-center gap-2">
              <MessageCircle size={16} className="text-primary" /> Inbox
              {totalUnread > 0 && (
                <span className="bg-primary text-black text-[9px] font-black px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </h2>
            <button onClick={fetchConversations} className="text-white/20 hover:text-white transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-primary/50"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12 opacity-30">
              <Loader2 size={20} className="animate-spin text-white" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 opacity-20">
              <MessageCircle size={28} className="text-white mb-2" />
              <p className="text-[10px] font-black uppercase italic text-white">No conversations</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv._id}
                onClick={() => openConversation(conv)}
                className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/5 transition-all
                  ${activeConv?._id === conv._id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {conv.userId?.profilePic?.url ? (
                        <img src={conv.userId.profilePic.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <User size={12} className="text-white/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase italic text-white truncate">
                        {conv.userId?.username || 'Unknown'}
                      </p>
                      <p className="text-[9px] opacity-30 text-white truncate">{conv.subject}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {conv.unreadByAdmin > 0 && (
                      <span className="bg-primary text-black text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                        {conv.unreadByAdmin}
                      </span>
                    )}
                    {conv.status === 'closed' && (
                      <Lock size={10} className="text-white/20" />
                    )}
                  </div>
                </div>
                {conv.lastMessage && (
                  <p className="text-[9px] opacity-30 text-white mt-1.5 truncate pl-9">
                    {conv.lastMessage}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      {!activeConv ? (
        <div className="flex-1 flex flex-col items-center justify-center opacity-20">
          <MessageCircle size={48} className="text-white mb-3" />
          <p className="text-[10px] font-black uppercase italic text-white">Select a conversation</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-black uppercase italic text-white">
                  {activeConv.userId?.username || 'Customer'}
                </p>
                <p className="text-[9px] opacity-30 text-white flex items-center gap-1">
                  <Package size={9} />
                  {activeConv.subject}
                  {activeConv.orderSnapshot?.status && (
                    <span className="ml-1 text-primary">· {activeConv.orderSnapshot.status}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeConv.status === 'open' && (
                <button
                  onClick={() => handleClose(activeConv._id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase text-white/40 hover:text-white transition-colors"
                >
                  <CheckCircle size={11} /> Close
                </button>
              )}
              {activeConv.status === 'closed' && (
                <span className="flex items-center gap-1 px-3 py-1.5 bg-error/10 rounded-xl text-[9px] font-black uppercase text-error">
                  <Lock size={9} /> Closed
                </span>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {msgLoading ? (
              <div className="flex items-center justify-center h-full opacity-30">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isMe = msg.senderRole === 'admin';
                  return (
                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && (
                          <span className="text-[9px] font-black uppercase opacity-30 text-white px-1">
                            {msg.senderId?.username || 'Customer'}
                          </span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed
                          ${isMe
                            ? 'bg-primary text-black rounded-br-md'
                            : 'bg-white/10 text-white rounded-bl-md'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[8px] opacity-20 text-white px-1">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-white/50 px-4 py-2.5 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5 shrink-0">
            {activeConv.status === 'closed' ? (
              <div className="flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase opacity-30 text-white">
                <Lock size={12} /> Conversation closed
              </div>
            ) : (
              <div className="flex gap-2">
                <textarea
                  rows={1}
                  placeholder="Reply to customer..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-primary/50 transition-colors font-medium"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center text-black shrink-0 disabled:opacity-30 hover:brightness-110 transition-all active:scale-95 self-end"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatPage;