import { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (err) {
      return null;
    }
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const handleSync = (event) => {
    if (event.detail) {
      setUser(event.detail); // Snap to the fresh user data immediately
      localStorage.setItem('user', JSON.stringify(event.detail));
    }
  };

  window.addEventListener('auth-synchronized', handleSync);
  return () => window.removeEventListener('auth-synchronized', handleSync);
}, []);
  // 1. SYNC WATCHER
  // This automatically keeps localStorage updated whenever the 'user' state changes.
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

// 2. INITIAL AUTH CHECK (Inside AuthContext.jsx)
// Inside AuthContext.jsx
useEffect(() => {
  const checkAuth = async () => {
    const storedUser = localStorage.getItem('user');

    // 🚀 IMPROVEMENT: If no user is in localStorage, don't ping the server.
    // This prevents the 401 error in the console for guests.
    if (!storedUser) {
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.getCurrentUser();
      if (response?.user) {
        setUser(response.user);
      }
    } catch (err) {
      // If the token is actually invalid/expired, the interceptor will try to refresh.
      // If that fails, we clear the state.
      if (err.response?.status === 401) {
        setUser(null);
        localStorage.removeItem('user');
      }
    } finally {
      setLoading(false);
    }
  };

  checkAuth();
}, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setUser(null);
    }
  };

  // We expose setUser so that Profile/Address components can update the global user state
  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
{loading ? (
  <div className="min-h-screen flex items-center justify-center bg-base-300">
    <div className="flex flex-col items-center gap-4">
      <span className="loading loading-spinner loading-lg text-primary"></span>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
        Syncing Session
      </p>
    </div>
  </div>
) : (
  children
)}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);