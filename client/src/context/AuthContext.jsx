import { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── SYNC WATCHER ───
  // Listens for auth-synchronized event fired by axios interceptor after silent token refresh
  useEffect(() => {
    const handleSync = (event) => {
      if (event.detail) setUser(event.detail);
    };
    window.addEventListener('auth-synchronized', handleSync);
    return () => window.removeEventListener('auth-synchronized', handleSync);
  }, []);

  // ─── INITIAL AUTH CHECK ───
  // Always verify session with server on load — httpOnly cookies are sent automatically
  // No localStorage check needed — cookies handle persistence
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getCurrentUser();
        if (response?.user) setUser(response.user);
      } catch (err) {
        // 401 = no valid session — user stays null
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = (userData) => setUser(userData);

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setUser(null);
    }
  };

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