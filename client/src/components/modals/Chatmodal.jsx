import React, { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, Package, Lock, MessageCircle } from "lucide-react";
import { useSocket } from "../../context/Socketcontext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const ChatModal = ({ isOpen, onClose, order }) => {
  const { user } = useAuth();
  const { getSocket } = useSocket();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false); // admin is typing
  const [isClosed, setIsClosed] = useState(false);

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const socket = getSocket();

  // ── Load or create conversation ──
  useEffect(() => {
    if (!isOpen || !order) return;

    const init = async () => {
      setLoading(true);
      try {
        // Get or create conversation for this order
        const { data: conv } = await api.post("/chat/conversations", {
          orderId: order._id,
        });
        setConversation(conv);
        setIsClosed(conv.status === "closed");

        // Load messages
        const { data: msgs } = await api.get(
          `/chat/conversations/${conv._id}/messages`,
        );
        setMessages(msgs);

        // Mark as read
        await api.put(`/chat/conversations/${conv._id}/read`);
      } catch (err) {
        console.error("Chat init error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isOpen, order?._id]);

  // ── Socket.IO events ──
  useEffect(() => {
    if (!socket || !conversation) return;

    socket.emit("join_conversation", conversation._id);

    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        // Deduplicate by _id
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Mark as read since modal is open
      api.put(`/chat/conversations/${conversation._id}/read`).catch(() => {});
    };

    const handleTypingStart = ({ role }) => {
      if (role === "admin") setIsTyping(true);
    };

    const handleTypingStop = () => setIsTyping(false);

    const handleClosed = () => setIsClosed(true);

    socket.on("new_message", handleNewMessage);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing_stop", handleTypingStop);
    socket.on("conversation_closed", handleClosed);

    return () => {
      socket.emit("leave_conversation", conversation._id);
      socket.off("new_message", handleNewMessage);
      socket.off("typing_start", handleTypingStart);
      socket.off("typing_stop", handleTypingStop);
      socket.off("conversation_closed", handleClosed);
    };
  }, [socket, conversation?._id]);

  // ── Auto-scroll ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!socket || !conversation) return;

    socket.emit("typing_start", { conversationId: conversation._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing_stop", { conversationId: conversation._id });
    }, 1500);
  };

  const handleSend = async () => {
    if (!input.trim() || !conversation || sending || isClosed) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    // Stop typing indicator
    if (socket)
      socket.emit("typing_stop", { conversationId: conversation._id });

    try {
      const { data: msg } = await api.post(
        `/chat/conversations/${conversation._id}/messages`,
        { content },
      );
      // Socket will deliver it to the other party; add locally immediately
      setMessages((prev) =>
        prev.find((m) => m._id === msg._id) ? prev : [...prev, msg],
      );
    } catch (err) {
      console.log(err)
      setInput(content); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#1a1c23] border border-white/10 w-full md:max-w-lg rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col h-[85vh] md:h-[600px] animate-in slide-in-from-bottom-4 md:zoom-in-95 duration-200">
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/20 rounded-2xl flex items-center justify-center">
              <MessageCircle size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-black uppercase italic text-white tracking-tight">
                Order Support
              </p>
              {order && (
                <p className="text-[9px] font-bold opacity-30 uppercase text-white flex items-center gap-1">
                  <Package size={9} />#{order._id?.slice(-8).toUpperCase()} · ₱
                  {order.totalAmount?.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isClosed && (
              <span className="text-[9px] font-black uppercase bg-error/10 text-error px-2 py-1 rounded-full flex items-center gap-1">
                <Lock size={9} /> Closed
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-white/30 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full opacity-30">
              <Loader2 size={24} className="animate-spin text-white" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20 text-center px-8">
              <MessageCircle size={32} className="text-white mb-3" />
              <p className="text-[10px] font-black uppercase italic text-white">
                Start the conversation. Describe your concern about this order.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe =
                String(msg.senderId?._id || msg.senderId) === String(user?._id);
              return (
                <div
                  key={msg._id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}
                  >
                    {!isMe && (
                      <span className="text-[9px] font-black uppercase opacity-30 text-white px-1">
                        {msg.senderRole === "admin"
                          ? "Support"
                          : msg.senderId?.username}
                      </span>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed
                        ${
                          isMe
                            ? "bg-primary text-black rounded-br-md"
                            : "bg-white/10 text-white rounded-bl-md"
                        }`}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[8px] opacity-20 text-white px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-white/50 px-4 py-2.5 rounded-2xl rounded-bl-md">
                <div className="flex gap-1 items-center">
                  <span
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-white/5 shrink-0">
          {isClosed ? (
            <div className="flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase opacity-30 text-white">
              <Lock size={12} /> This conversation has been closed
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                rows={1}
                placeholder="Type a message..."
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
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
