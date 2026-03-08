import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Filter, SearchX } from "lucide-react";
import Footer from "../components/Footer.jsx";
import ProductCard from "../components/CardProduct.jsx";
import ProductViewModal from "../components/modals/ProductViewModal.jsx";
import { productAPI } from "../services/api";
import ShopSkeleton from "../components/skeletons/ShopSkeleton";

const LandingPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
  const [selectedProduct, setSelectedProduct] = useState(null);

  // For fetching shop data
  useEffect(() => {
    const fetchShopData = async () => {
      setLoading(true);
      try {
        const prodRes = await productAPI.getProducts();
        const catRes = await productAPI.getCategories();
        setProducts(prodRes?.products || []);
        setCategories(["All", ...(Array.isArray(catRes) ? catRes : [])]);
      } catch (err) {
        console.error("Error loading shop data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShopData();
  }, []);
  // useMemo memorizes a computed value so it doesn't recalculate on every re-render
  // Only when its dependencies change ( product name and category).
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const searchMatch =
        searchQuery === "" || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const categoryMatch =
        activeCategory === "All" || // "All" selected? pass everything
         p.category === activeCategory; // or product's category matches selected category 
      return searchMatch && categoryMatch; // product only passes if BOTH checks are true
    });
  }, [products, searchQuery, activeCategory]);

  return (
    <div className="bg-base-200 min-h-screen font-sans">
      <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row gap-8">
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 space-y-6">
          <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-300 sticky top-24">
            <h3 className="flex items-center gap-2 font-black text-xs uppercase tracking-widest mb-6 opacity-50">
              <Filter className="w-3 h-3" /> Filter by Category
            </h3>
            <div className="flex flex-wrap md:flex-col gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)} // clicking sets the active category
                  className={`btn btn-sm justify-start font-black uppercase tracking-tighter italic border-none ${
                    activeCategory === cat
                      ? "btn-primary shadow-md"
                      : "btn-ghost opacity-60 hover:opacity-100"
                  }`}
                >
                  {cat} {/* displays category name */}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* PRODUCT GRID */}
        <main className="flex-1">
          {loading ? ( 
            <ShopSkeleton /> // 1. still fetching → show skeleton loader
          ) : filteredProducts.length > 0 ? (
            // 2. has products → show product grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onQuickView={(p) => setSelectedProduct(p)} // clicking quick view sets selected product
                />
              ))}
            </div>
          ) : (
            // 3. no products found → show empty state
            <div className="text-center py-24 bg-base-100 rounded-3xl border-2 border-dashed border-base-300">
              <SearchX className="mx-auto w-16 h-16 opacity-10 mb-4" />
              <h2 className="text-2xl font-black italic uppercase">
                No items found
              </h2>
              <button
                onClick={() => {
                  setActiveCategory("All");
                  setSearchParams({});
                }}
                className="btn btn-primary btn-md mt-6 shadow-lg uppercase italic font-black"
              >
                Clear Filters
              </button>
            </div>
          )}
        </main>
      </div>
      {/* Only renders the modal if a product is selected */}
      {selectedProduct && (
        <ProductViewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)} // closing modal clears selected product
        />
      )}
      {/* FOOTER */}
      <Footer />
    </div>
  );
};

export default LandingPage;
