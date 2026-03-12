import React, { useState, useMemo } from "react";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";
import ProductCard from "../../components/CardProduct";
import ProductViewModal from "../../components/modals/ProductViewModal";
import { HeartOff, Calendar, Search } from "lucide-react";
import WishlistSkeleton from "../../components/skeletons/WishlistSkeleton";
import Pagination from "../../components/Pagination";

const ITEMS_PER_PAGE = 12;

export const WishlistPage = () => {
  const { loading: authLoading }                  = useAuth();
  const { wishlist: items, loading: wishlistLoading } = useWishlist();
  const [selectedProduct, setSelectedProduct]     = useState(null);
  const [searchQuery, setSearchQuery]             = useState("");
  const [currentPage, setCurrentPage]             = useState(1);

  // Filter + sort
  const filteredWishlist = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return list
      .filter(p => p?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [items, searchQuery]);

  // Reset page on search
  const handleSearch = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  // Paginate
  const totalPages    = Math.ceil(filteredWishlist.length / ITEMS_PER_PAGE);
  const paginatedList = filteredWishlist.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Group current page items by date
  const groupedByDate = paginatedList.reduce((acc, product) => {
    const dateValue = product.updatedAt || product.createdAt || new Date();
    const dateKey   = new Date(dateValue).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(product);
    return acc;
  }, {});

  const dates = Object.keys(groupedByDate);

  if (authLoading || wishlistLoading) return <WishlistSkeleton />;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-7xl mx-auto px-4 overflow-hidden">

      {/* STICKY HEADER */}
      <header className="pt-6 pb-6 shrink-0 bg-base-100 z-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              Wishlist <span className="text-primary">Timeline</span>
            </h1>
            <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">
              {filteredWishlist.length} Saved Items
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
            <input
              type="text"
              placeholder="Search timeline..."
              className="input input-bordered w-full pl-11 bg-base-200/50 rounded-2xl text-sm font-bold focus:border-primary border-none shadow-inner"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* SCROLLABLE CONTENT */}
      <main className="flex-1 overflow-y-auto pr-2 no-scrollbar pb-4">
        {dates.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 py-20 grayscale">
            <HeartOff className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-black uppercase tracking-tighter italic">Timeline Empty</h3>
          </div>
        ) : (
          <div className="space-y-12">
            {dates.map((date) => (
              <section key={date} className="space-y-6">
                <div className="flex items-center gap-4 sticky top-0 bg-base-100/90 backdrop-blur-md z-10 py-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h2 className="text-xs font-black uppercase tracking-widest italic">{date}</h2>
                  <div className="h-[1px] bg-base-content flex-1 opacity-10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </main>

      {/* PAGINATION */}
      {filteredWishlist.length > ITEMS_PER_PAGE && (
        <div className="shrink-0 bg-base-100 pt-2">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={filteredWishlist.length}
            label="Items"
            variant="light"
          />
        </div>
      )}

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