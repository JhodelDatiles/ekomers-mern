import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { cartAPI } from "../services/api"; 
import { toast } from "react-hot-toast";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState({ items: [], totalAmount: 0 });
  const [loading, setLoading] = useState(true);

  /**
   * 1. FETCH CART
   */
  const fetchCart = useCallback(async (showLoading = true) => {
    if (!user) {
      setCart({ items: [], totalAmount: 0 });
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      const data = await cartAPI.getCart(); 
      
      const sanitizedItems = (data?.items || []).map(item => ({
        ...item,
        _id: item._id, 
      }));

      setCart({
        items: sanitizedItems,
        totalAmount: data?.totalAmount || 0
      });
    } catch (error) {
      console.error("Error fetching cart:", error);
      setCart({ items: [], totalAmount: 0 });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      fetchCart();
    } else {
      setCart({ items: [], totalAmount: 0 });
      setLoading(false);
    }
  }, [user, authLoading, fetchCart]);

  /**
   * 2. ADD TO CART
   */
  const addToCart = async (productId, quantity, size, color = "Default") => {
    try {
      if (!user) {
        toast.error("PLEASE LOGIN TO ADD TO BAG");
        throw new Error("Login required");
      }
      
      await cartAPI.addToCart({ productId, quantity, size, color });
      await fetchCart(false);
      
    } catch (error) {
      console.error("Cart Add Error:", error);
      toast.error(error.response?.data?.message || "COULD NOT ADD ITEM");
      throw error; 
    }
  };

  /**
   * 3. UPDATE QUANTITY (🎯 THE MISSING PIECE)
   * This sends the new quantity to the server and updates local state.
   */
const updateQuantity = async (itemId, quantity) => {
  const originalCart = { ...cart };

  // ⚡ SPEED OPTIMIZATION: Update UI instantly
  setCart(prev => ({
    ...prev,
    items: prev.items.map(item => 
      item._id === itemId ? { ...item, quantity } : item
    ),
    totalAmount: prev.items.reduce((acc, item) => {
      const q = item._id === itemId ? quantity : item.quantity;
      return acc + (q * item.price);
    }, 0)
  }));

  try {
    const data = await cartAPI.updateCartItem(itemId, quantity);
    // Silent sync with server in background
    if (data && typeof data.items[0]?.productId === 'object') {
      setCart(data);
    }
  } catch (error) {
    setCart(originalCart); // Rollback only on error
    toast.error("SYNC FAILED");
  }
};

  /**
   * 4. REMOVE FROM CART
   */
  const removeFromCart = async (itemId) => {
    try {
      const data = await cartAPI.removeFromCart(itemId); 
      
      if (!data.items.length || typeof data.items[0]?.productId === 'object') {
        setCart(data);
      } else {
        await fetchCart(false); 
      }
      
      toast.success("ITEM REMOVED", { id: 'cart-remove' });
    } catch (error) {
      console.error("Cart Remove Error:", error);
      toast.error("COULD NOT REMOVE ITEM");
    }
  };

  /**
   * 5. UPDATE LOCAL CART AFTER PAYMENT
   */
  const updateLocalCartAfterPayment = useCallback((paidCartItemIds) => {
    setCart(prev => {
      const remainingItems = prev.items.filter(item => !paidCartItemIds.includes(item._id));
      const newTotal = remainingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        ...prev,
        items: remainingItems,
        totalAmount: newTotal
      };
    });
  }, []);

  /**
   * 6. CLEAR CART
   */
  const clearCart = useCallback(async () => {
    try {
      setCart({ items: [], totalAmount: 0 });
      if (cartAPI.clearCart) {
        await cartAPI.clearCart();
      }
    } catch (error) {
      console.error("Failed to clear cart:", error);
      fetchCart(false);
    }
  }, [fetchCart]);

  const cartItemCount = useMemo(() => {
    return cart.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  }, [cart.items]);

  const value = useMemo(() => ({
    cart,
    addToCart,
    updateQuantity, // 🎯 EXPORTED NOW
    removeFromCart,
    clearCart,
    updateLocalCartAfterPayment,
    fetchCart,
    cartItemCount,
    loading: loading || authLoading
  }), [cart, fetchCart, clearCart, updateLocalCartAfterPayment, cartItemCount, loading, authLoading]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);