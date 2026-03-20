import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_URL_PROD || '';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    // Only connect when user is logged in
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Avoid double-connecting
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true, // sends httpOnly cookies automatically
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
    });

    // Track admin unread badge
    socket.on('conversation_updated', ({ unreadByAdmin }) => {
      if (user.role === 'admin' && unreadByAdmin > 0) {
        setChatUnread(prev => prev + 1);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user?._id]); // reconnect only when user identity changes

  const getSocket = useCallback(() => socketRef.current, []);
  const resetUnread = useCallback(() => setChatUnread(0), []);

  return (
    <SocketContext.Provider value={{ getSocket, connected, chatUnread, setChatUnread, resetUnread }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);