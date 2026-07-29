import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, RotateCcw, Bot, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const QUICK_REPLIES = [
  "What products do you have?",
  "How do I cancel an order?",
  "How long does refund take?",
  "What sizes are available?",
  "Track my order",
];

const AIChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hey! 👋 I'm the EKOMERS support bot. I can help you with products, orders, cancellations, and refunds. What's up?`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setUnread(0);
    }
  }, [isOpen]);

  // Don't show for admin users — they have full dashboard access
  if (user?.role === 'admin') return null;

  const sendMessage = async (content) => {
    const text = (content || input).trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/ai-chat', {
        // Send last 8 messages as context (skip initial assistant greeting from context)
        messages: updatedMessages.slice(-8).map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      const assistantMsg = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, assistantMsg]);

      // If widget is closed, show unread badge
      if (!isOpen) setUnread(prev => prev + 1);

    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try the **Chat with Seller** button on your order card to reach our support team directly."
      }, err]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: `Hey! 👋 I'm the EKOMERS support bot. I can help you with products, orders, cancellations, and refunds. What's up?`
    }]);
    setInput('');
  };

  // Simple markdown-ish bold renderer
  const renderContent = (text) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1
        ? <strong key={i}>{part}</strong>
        : part
    );
  };

  return (
    <>
      {/* FLOATING BUTTON */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`fixed bottom-6 right-6 z-[400] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-90
          ${isOpen ? 'bg-base-300 text-base-content' : 'bg-primary text-primary-content shadow-primary/40'}
        `}
        aria-label="AI Support Chat"
      >
        {isOpen ? (
          <ChevronDown size={22} />
        ) : (
          <Sparkles size={22} />
        )}
        {/* Unread badge */}
        {!isOpen && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unread}
          </span>
        )}
      </button>

      {/* CHAT PANEL */}
      <div
        className={`fixed bottom-24 right-6 z-[400] w-[360px] max-w-[calc(100vw-24px)] bg-base-100 border border-base-300 rounded-[28px] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right
          ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'}
        `}
        style={{ height: '480px' }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-200 bg-primary/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Bot size={18} className="text-primary-content" />
            </div>
            <div>
              <p className="text-xs font-black uppercase italic tracking-tight">AI Support</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[9px] font-bold opacity-40 uppercase">Online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={reset}
              className="p-2 hover:bg-base-200 rounded-full text-base-content/30 hover:text-base-content transition-colors"
              title="Reset chat"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-base-200 rounded-full text-base-content/30 hover:text-base-content transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* NOT LOGGED IN WARNING */}
        {!user && (
          <div className="mx-4 mt-3 p-3 bg-warning/10 border border-warning/20 rounded-2xl shrink-0">
            <p className="text-[10px] font-bold text-warning/80 uppercase leading-relaxed">
              Log in to get order-specific help. General questions still work without logging in.
            </p>
          </div>
        )}

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Bot size={12} className="text-primary" />
                </div>
              )}
              <div
                className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-primary text-primary-content rounded-br-md font-medium'
                    : 'bg-base-200 text-base-content rounded-bl-md font-medium'
                  }`}
              >
                {renderContent(msg.content)}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mr-2 mt-1 shrink-0">
                <Bot size={12} className="text-primary" />
              </div>
              <div className="bg-base-200 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-base-content/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-base-content/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-base-content/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* QUICK REPLIES — only shown on first message */}
        {messages.length === 1 && !loading && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr}
                onClick={() => sendMessage(qr)}
                className="text-[10px] font-bold bg-base-200 hover:bg-primary hover:text-primary-content px-3 py-1.5 rounded-full transition-all uppercase tracking-tight"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        {/* INPUT */}
        <div className="px-4 pb-4 pt-2 border-t border-base-200 shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask anything..."
              className="flex-1 bg-base-200 border border-base-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors font-medium"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-content shrink-0 disabled:opacity-30 hover:brightness-110 transition-all active:scale-95"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIChatWidget;