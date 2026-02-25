import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { wishlistAPI } from '../services/api'; 

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlist([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Changed: directly getting the response since api.js returns response.data
      const response = await wishlistAPI.getWishlist();
      
      // Safety: check if response itself is the object or if it has a products key
      const products = response?.products || (Array.isArray(response) ? response : []);
      setWishlist(products);
    } catch (error) {
      console.error("Wishlist fetch error:", error);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchWishlist();
    }
  }, [authLoading, fetchWishlist]);

  const toggleWishlist = useCallback(async (product) => {
    if (!user) {
      toast.error("PLEASE LOGIN TO SAVE ITEMS", { id: 'auth-err' });
      return;
    }

    // Capture state before request for the toast logic
    const isRemoving = wishlist.some(item => item._id === product._id);

    try {
      const response = await wishlistAPI.toggleWishlist(product._id);
      
      // Update state with the new list from backend
      setWishlist(response?.products || []);

      if (isRemoving) {
        toast.error(`${product.name.toUpperCase()} REMOVED`, { icon: '💔', id: product._id });
      } else {
        toast.success(`${product.name.toUpperCase()} SAVED!`, { icon: '❤️', id: product._id });
      }
    } catch (error) {
      console.error("Toggle error:", error);
      toast.error("COULD NOT UPDATE WISHLIST");
    }
  }, [user, wishlist]);

  const isInWishlist = useCallback((productId) => {
    return Array.isArray(wishlist) && wishlist.some((item) => item?._id === productId);
  }, [wishlist]);

  const value = useMemo(() => ({
    wishlist,
    toggleWishlist,
    isInWishlist,
    wishlistCount: Array.isArray(wishlist) ? wishlist.length : 0,
    loading: loading || authLoading
  }), [wishlist, toggleWishlist, isInWishlist, loading, authLoading]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);