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
useEffect(() => {
  const checkAuth = async () => {
    const storedUser = localStorage.getItem('user');
    
    // Even if no storedUser, we should try to fetch once 
    // to see if a valid HTTP-only cookie session exists.
    try {
      const response = await authAPI.getCurrentUser();
      if (response?.user) {
        setUser(response.user); 
      } else if (response) {
        // Fallback if the backend sends the user object directly without the .user wrapper
        setUser(response);
      }
    } catch (err) {
      console.warn("[Auth] Initial check failed, attempting silent recovery...");
      
      // If 401, the interceptor in api.js will already try to refresh.
      // We just need to ensure we don't wipe the user state prematurely 
      // unless the refresh actually fails.
      if (err.response?.status === 401) {
         // The interceptor's 'auth-synchronized' event will catch this 
         // and update the state automatically!
      } else {
         // Only clear if it's a non-401 fatal error
         // setUser(null); 
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
        <div className="min-h-screen flex items-center justify-center bg-[#1a1c23]">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);