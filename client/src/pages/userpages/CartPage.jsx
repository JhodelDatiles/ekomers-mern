import React, { useState, useMemo } from 'react';
import { useCart } from "../../context/CartContext";
import { Link, useNavigate } from "react-router-dom";
import { 
  Trash2, Plus, Minus, ArrowRight, 
  Loader2, ShoppingBag, CheckSquare, Square, 
  CheckCircle2 
} from "lucide-react";
import toast from 'react-hot-toast';
import CartSkeleton from "../../components/skeletons/CartSkeleton";

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, loading: cartLoading } = useCart();
  const navigate = useNavigate();
  
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  /**
   * 🛠️ FIX 1: Memoize cartItems to stabilize references.
   */
  const cartItems = useMemo(() => cart?.items || [], [cart?.items]);

  /**
   * 🛠️ FIX 2: GroupedCart now uses the stable cartItems reference.
   */
  const groupedCart = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const dateKey = new Date(item.updatedAt || new Date()).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      });
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    }, {});
  }, [cartItems]);

  /**
   * 🛠️ FIX 3: selectedTotal now uses the stable cartItems reference.
   */
  const selectedTotal = useMemo(() => {
    return cartItems
      .filter(item => selectedIds.includes(item._id))
      .reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [cartItems, selectedIds]);

  const handleQuantityChange = async (item, newQty) => {
    if (newQty < 1) return;

    const sizeData = item.productId?.sizes?.find(s => s.size === item.size);
    const stockLimit = sizeData ? sizeData.stock : 999; 

    if (newQty > item.quantity && newQty > stockLimit) {
      return toast.error(`MAX STOCK REACHED: ${stockLimit}`, { id: 'stock' });
    }

    setProcessingId(item._id);
    try {
      await updateQuantity(item._id, newQty);
    } finally {
      setProcessingId(null);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === cartItems.length && cartItems.length !== 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cartItems.map(item => item._id));
    }
  };

  /**
   * 🚀 Added toast.promise for Bulk Delete
   */
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm("PURGE SELECTED ITEMS?")) return;
    
    setIsDeleting(true);
    
    const deletePromise = Promise.all(selectedIds.map(id => removeFromCart(id)));

    toast.promise(deletePromise, {
      loading: 'Purging inventory...',
      success: 'Selected items removed.',
      error: 'Failed to purge items.',
    });

    try {
      await deletePromise;
      setSelectedIds([]);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 🚀 Added toast.promise for Individual Delete
   */
  const handleSingleDelete = async (id) => {
    const deletePromise = removeFromCart(id);
    
    toast.promise(deletePromise, {
      loading: 'Removing item...',
      success: 'Item removed.',
      error: 'Failed to remove item.',
    });
    
    await deletePromise;
  };

  const handleCheckout = () => {
    if (selectedIds.length === 0) return toast.error("SELECT ITEMS TO INITIALIZE");
    const itemsToBuy = cartItems.filter(item => selectedIds.includes(item._id));
    navigate('/checkout', { state: { items: itemsToBuy, total: selectedTotal } });
  };

  if (cartLoading && cartItems.length === 0) {
    return <CartSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-40">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Shopping <span className="text-primary">Bag</span></h1>
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">Inventory Manifest</p>
        </div>
        {cartItems.length > 0 && (
          <div className="flex items-center gap-6">
            {selectedIds.length > 0 && (
              <button onClick={handleBulkDelete} disabled={isDeleting} className="btn btn-error btn-outline btn-xs px-4 rounded-xl font-black italic">
                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} PURGE ({selectedIds.length})
              </button>
            )}
            <button onClick={toggleSelectAll} className="flex items-center gap-2 group">
              <div className={selectedIds.length === cartItems.length && cartItems.length !== 0 ? "text-primary" : "opacity-30"}>
                {selectedIds.length === cartItems.length && cartItems.length !== 0 ? <CheckCircle2 size={20} /> : <Square size={20} />}
              </div>
              <span className="text-[11px] font-black uppercase italic tracking-widest">Select All</span>
            </button>
          </div>
        )}
      </header>

      <div className="space-y-12">
        {cartItems.length === 0 ? (
          <div className="text-center py-20 bg-base-200/30 rounded-[40px] border-2 border-dashed border-base-300">
            <ShoppingBag className="mx-auto mb-4 opacity-10" size={48} />
            <Link to="/" className="btn btn-primary btn-sm rounded-full italic font-black">Browse Products</Link>
          </div>
        ) : (
          Object.entries(groupedCart).map(([date, items]) => (
            <section key={date} className="space-y-4">
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 italic ml-2">Batch: {date}</h2>
              <div className="space-y-3">
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item._id);
                  const isUpdating = processingId === item._id;
                  const stock = item.productId?.sizes?.find(s => s.size === item.size)?.stock || 0;
                  const isAtMax = item.quantity >= stock;

                  return (
                    <div key={item._id} className={`flex flex-col md:flex-row md:items-center p-5 bg-base-100 border transition-all rounded-[24px] gap-4 ${isSelected ? "border-primary bg-primary/5 shadow-xl" : "border-base-300"}`}>
                      <div className="flex items-center gap-6 flex-1">
                        <button onClick={() => setSelectedIds(prev => isSelected ? prev.filter(i => i !== item._id) : [...prev, item._id])} className={isSelected ? "text-primary" : "opacity-20"}>
                          {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                        </button>
                        <div className="relative w-20 h-20 bg-base-200 rounded-2xl overflow-hidden shrink-0">
                          <img src={item.productId?.images?.[0]?.url || item.productId?.images?.[0]} className="w-full h-full object-cover" alt="" />
                          {isUpdating && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={20} className="animate-spin text-white" /></div>}
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <h3 className="font-black uppercase italic text-lg truncate">{item.productId?.name}</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black bg-base-300 px-2 py-0.5 rounded uppercase">SIZE: {item.size}</span>
                            <span className="text-xs font-black text-primary italic">₱{item.price?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0">
                        <div className="flex items-center bg-base-300/50 rounded-xl p-1">
                          <button onClick={() => handleQuantityChange(item, item.quantity - 1)} disabled={item.quantity <= 1 || isUpdating} className="btn btn-ghost btn-xs h-8 w-8 hover:bg-primary"><Minus size={14}/></button>
                          <span className="w-10 text-center text-sm font-black italic">{item.quantity}</span>
                          <button onClick={() => handleQuantityChange(item, item.quantity + 1)} disabled={isAtMax || isUpdating} className="btn btn-ghost btn-xs h-8 w-8 hover:bg-primary">
                            <Plus size={14} className={isAtMax ? "opacity-20" : ""} />
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black italic">₱{(item.price * item.quantity).toLocaleString()}</span>
                          <button onClick={() => handleSingleDelete(item._id)} className="btn btn-ghost btn-circle btn-sm text-error/30 hover:text-error"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-base-100/80 backdrop-blur-2xl border-t border-base-content/5 p-6 z-[100] shadow-2xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black opacity-40 uppercase">{selectedIds.length} SELECTED</span>
              <span className="text-4xl font-black text-primary italic">₱{selectedTotal?.toLocaleString()}</span>
            </div>
            <button onClick={handleCheckout} disabled={selectedIds.length === 0} className="btn btn-primary h-16 px-12 rounded-2xl font-black italic uppercase text-xl">
              Initialize Checkout <ArrowRight size={24} className="ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;