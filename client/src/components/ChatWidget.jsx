import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Minimize2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch store name on mount
  useEffect(() => {
    const fetchStoreName = async () => {
      try {
        const { data } = await api.get('/settings');
        const name = data?.storeName || 'MN+LA';
        setStoreName(name);
        // Set welcome message once we have the store name
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hey! 👋 I'm your ${name} support assistant. Ask me anything about your orders, products, shipping, or returns.`,
        }]);
      } catch {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: "Hey! 👋 I'm your support assistant. Ask me anything about your orders, products, shipping, or returns.",
        }]);
      }
    };
    fetchStoreName();
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);
  
  // Only show for logged-in users
  if (!user) return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Hey! 👋 I'm your ${storeName} support assistant. Ask me anything about your orders, products, shipping, or returns.`,
    }]);
    setInput('');
    setUnreadCount(0);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { id: Date.now(), role: 'user', content: trimmed };
    const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMessage];

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history for API — only role + content
      const apiMessages = newMessages.map(({ role, content }) => ({ role, content }));

      const { data } = await api.post('/chat', { messages: apiMessages });

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.reply,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If chat is closed, increment unread badge
      if (!isOpen || isMinimized) {
        setUnreadCount(c => c + 1);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendDirect = async (text) => {
  if (isLoading) return;
  const userMessage = { id: Date.now(), role: 'user', content: text };
  const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMessage];
  setMessages(prev => [...prev, userMessage]);
  setIsLoading(true);
  try {
    const apiMessages = newMessages.map(({ role, content }) => ({ role, content }));
    const { data } = await api.post('/chat', { messages: apiMessages });
    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.reply }]);
  } catch {
    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
  } finally {
    setIsLoading(false);
  }
};

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Where's my order?",
    "How do I return an item?",
    "What's your shipping policy?",
  ];

  return (
    <>
      {/* FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-primary text-primary-content shadow-2xl shadow-primary/40 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group"
          aria-label="Open chat support"
        >
          <MessageCircle size={22} className="group-hover:rotate-12 transition-transform duration-200" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-error-content text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* CHAT PANEL */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-[9999] w-[360px] flex flex-col bg-base-100 border border-base-300 rounded-[28px] shadow-2xl shadow-black/40 transition-all duration-300 overflow-hidden ${
            isMinimized ? 'h-[68px]' : 'h-[520px]'
          }`}
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 bg-primary/10 border-b border-primary/10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <Bot size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase italic tracking-widest">Support Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-[9px] font-bold uppercase opacity-40 tracking-widest">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="btn btn-ghost btn-xs btn-circle"
                aria-label="Minimize"
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={handleClose}
                className="btn btn-ghost btn-xs btn-circle"
                aria-label="Close chat"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* MESSAGES */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                        <Sparkles size={11} className="text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] px-4 py-3 rounded-2xl text-[12px] font-medium leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-content rounded-br-sm'
                          : 'bg-base-200 text-base-content rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                      <Sparkles size={11} className="text-primary" />
                    </div>
                    <div className="bg-base-200 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-base-content/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                {/* SUGGESTED QUESTIONS (only at start) */}
                {messages.length === 1 && !isLoading && (
                  <div className="flex flex-col gap-2 mt-2">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          handleSendDirect(q);
                        }}
                        className="text-left px-4 py-2.5 rounded-xl border border-primary/20 text-[11px] font-bold uppercase italic hover:bg-primary/10 hover:border-primary/40 transition-all text-primary/70"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* INPUT */}
              <div className="px-4 pb-4 pt-2 shrink-0 border-t border-base-200">
                <div className="flex items-end gap-2 bg-base-200 rounded-2xl px-4 py-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 bg-transparent text-[12px] font-medium resize-none outline-none py-1.5 max-h-24 placeholder:opacity-30 placeholder:uppercase placeholder:text-[10px] placeholder:tracking-wider"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="btn btn-primary btn-circle btn-sm shrink-0 disabled:opacity-30 transition-all active:scale-90"
                    aria-label="Send message"
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
                <p className="text-center text-[9px] opacity-20 font-bold uppercase tracking-widest mt-2">
                  Powered by AI · MN+LA Support
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;