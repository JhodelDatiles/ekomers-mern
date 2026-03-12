import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, SearchX } from "lucide-react";
import Footer from "../components/Footer.jsx";
import ProductCard from "../components/CardProduct.jsx";
import ProductViewModal from "../components/modals/ProductViewModal.jsx";
import { productAPI } from "../services/api";
import ShopSkeleton from "../components/skeletons/ShopSkeleton";
import Pagination from "../components/Pagination";

const PRODUCTS_PER_PAGE = 12;

const LandingPage = () => {
  const [products, setProducts]         = useState([]);
  const [categories, setCategories]     = useState([]);
  const [pagination, setPagination]     = useState({ currentPage: 1, totalPages: 1, totalProducts: 0 });
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading]           = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage]   = useState(1);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeCategory]);

  const fetchShopData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productAPI.getProducts({
          page:     currentPage,
          limit:    PRODUCTS_PER_PAGE,
          search:   searchQuery,
          category: activeCategory === "All" ? "" : activeCategory,
        }),
        productAPI.getCategories(),
      ]);

      setProducts(prodRes?.products || []);
      setPagination(prodRes?.pagination || { currentPage: 1, totalPages: 1, totalProducts: 0 });
      setCategories(["All", ...(Array.isArray(catRes) ? catRes : [])]);
    } catch (err) {
      console.error("Error loading shop data", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, activeCategory]);

  useEffect(() => { fetchShopData(); }, [fetchShopData]);

  const handleClearFilters = () => {
    setActiveCategory("All");
    setSearchParams({});
    setCurrentPage(1);
  };

  return (
    <div className="bg-base-200 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row gap-8">

        {/* SIDEBAR */}
        <aside className="w-full md:w-64 space-y-6 shrink-0">
          <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 sticky top-24">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest mb-6 opacity-50">
              <Filter className="w-3 h-3" /> Filter by Category
            </h3>
            <div className="flex flex-wrap md:flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`btn btn-sm justify-start font-black uppercase tracking-tighter italic border-none ${
                    activeCategory === cat
                      ? "btn-primary shadow-md"
                      : "btn-ghost opacity-60 hover:opacity-100"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col gap-6">
          {loading ? (
            <ShopSkeleton />
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onQuickView={(p) => setSelectedProduct(p)}
                  />
                ))}
              </div>

              {/* PAGINATION */}
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                pageSize={PRODUCTS_PER_PAGE}
                totalItems={pagination.totalProducts}
                label="Products"
                variant="light"
              />
            </>
          ) : (
            <div className="text-center py-24 bg-base-100 rounded-3xl border-2 border-dashed border-base-300">
              <SearchX className="mx-auto w-16 h-16 opacity-10 mb-4" />
              <h2 className="text-2xl font-black italic uppercase">No items found</h2>
              <button
                onClick={handleClearFilters}
                className="btn btn-primary btn-md mt-6 shadow-lg uppercase italic font-black"
              >
                Clear Filters
              </button>
            </div>
          )}
        </main>
      </div>

      {selectedProduct && (
        <ProductViewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <Footer />
    </div>
  );
};

export default LandingPage;