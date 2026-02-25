import React, { useState, useMemo } from 'react';
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext"; 
import ProductCard from "../../components/CardProduct"; 
import ProductViewModal from "../../components/modals/ProductViewModal";
import { HeartOff, Calendar, Search, Loader2 } from "lucide-react";
import WishlistSkeleton from "../../components/skeletons/WishlistSkeleton";

export const WishlistPage = () => {
  const { loading: authLoading } = useAuth();
  const { wishlist: items, loading: wishlistLoading } = useWishlist();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter and Sort: Ensures 'items' is treated as an array to prevent .filter crashes
  const filteredWishlist = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list
      .filter(p => p?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [items, searchQuery]);

  // Grouping logic: Organize products by the date they were last updated/saved
  const groupedByDate = filteredWishlist.reduce((acc, product) => {
    const dateValue = product.updatedAt || product.createdAt || new Date();
    const dateKey = new Date(dateValue).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(product);
    return acc;
  }, {});

  const dates = Object.keys(groupedByDate);

  // PREVENT CRASH: Show loading spinner while fetching from MongoDB
  if (authLoading || wishlistLoading) return <WishlistSkeleton />;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Wishlist Timeline</h1>
          <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">Recently Saved Items</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
          <input 
            type="text"
            placeholder="Search timeline..."
            className="input input-bordered w-full pl-11 bg-base-200/50 rounded-2xl text-sm font-bold focus:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* TIMELINE SECTION */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {dates.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 py-20">
             <HeartOff className="w-12 h-12 mb-4" />
             <h3 className="text-lg font-black uppercase tracking-tighter italic">Timeline Empty</h3>
          </div>
        ) : (
          <div className="space-y-12">
            {dates.map((date) => (
              <section key={date} className="space-y-6">
                {/* STICKY DATE HEADER */}
                <div className="flex items-center gap-4 sticky top-0 bg-base-100/90 backdrop-blur-md z-10 py-2">
                   <Calendar className="w-4 h-4 text-primary" />
                   <h2 className="text-xs font-black uppercase tracking-widest">{date}</h2>
                   <div className="h-[1px] bg-base-300 flex-1 opacity-20"></div>
                </div>

                {/* PRODUCT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {groupedByDate[date].map((product) => (
                    <ProductCard 
                      key={product._id} 
                      product={product} 
                      onQuickView={(p) => setSelectedProduct(p)} 
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* MODAL VIEW */}
      {selectedProduct && (
        <ProductViewModal
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
};

export default WishlistPage;