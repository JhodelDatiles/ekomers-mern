import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Package2, Boxes, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { adminProductAPI, productAPI } from "../../services/api.js";
import ProductFormModal from "../../components/modals/ProductFormModal.jsx";
import ProductCategorySection from "../../components/ProductCategorySection.jsx";
import ConfirmationModal from "../../components/modals/ConfirmationModal.jsx";
import AdminPagination from "../../components/AdminPagination";

const TableSkeleton = () => (
  <div className="space-y-12 animate-pulse">
    {[1, 2].map((i) => (
      <div key={i} className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-48 bg-white/5 rounded-lg" />
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <div className="h-64 w-full bg-white/[0.02] border border-white/5 rounded-[24px]" />
      </div>
    ))}
  </div>
);

const AdminProducts = () => {
  const [deletingId, setDeletingId]           = useState(null);
  const [grouped, setGrouped]                 = useState({});
  const [pagination, setPagination]           = useState({ currentPage: 1, totalPages: 1, totalProducts: 0 });
  const [categories, setCategories]           = useState([]);
  const [availableSizes, setAvailableSizes]   = useState(["S", "M", "L", "XL", "XXL", "Free Size"]);
  const [isModalOpen, setIsModalOpen]         = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter]   = useState(""); // ← NEW
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedIds, setSelectedIds]         = useState([]);
  const [currentPage, setCurrentPage]         = useState(1);
  const [pageSize, setPageSize]               = useState(10);
  const [confirmConfig, setConfirmConfig]     = useState({ isOpen: false, id: null, isBulk: false });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page on any filter change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, categoryFilter, pageSize]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        adminProductAPI.getProducts({
          page: currentPage,
          limit: pageSize,
          search: debouncedSearch,
          category: categoryFilter,   // ← passed to backend
        }),
        productAPI.getCategories(),
      ]);
      setGrouped(prodRes.grouped || {});
      setPagination(prodRes.pagination || { currentPage: 1, totalPages: 1, totalProducts: 0 });
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (err) {
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleCategorySelection = (items) => {
    const itemIds = items.map(p => p._id);
    const allSelected = itemIds.every(id => selectedIds.includes(id));
    if (allSelected) setSelectedIds(prev => prev.filter(id => !itemIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...itemIds])]);
  };

  const requestDelete = (productId) => setConfirmConfig({ isOpen: true, id: productId, isBulk: false });
  const requestBulkDelete = (items) => {
    if (items.length === 0) return;
    setConfirmConfig({ isOpen: true, id: items, isBulk: true });
  };

  const executeDelete = async () => {
    const { id, isBulk } = confirmConfig;
    const loadToast = toast.loading(isBulk ? "Executing bulk purge..." : "Deleting asset...");
    setDeletingId(isBulk ? "bulk" : id);
    try {
      if (isBulk) {
        for (const product of id) await adminProductAPI.deleteProduct(product._id);
        setSelectedIds([]);
        toast.success(`${id.length} items purged`, { id: loadToast });
      } else {
        await adminProductAPI.deleteProduct(id);
        toast.success("Asset removed from manifest", { id: loadToast });
      }
      setConfirmConfig({ isOpen: false, id: null, isBulk: false });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed", { id: loadToast });
    } finally {
      setDeletingId(null);
    }
  };

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    try {
      const dataToSubmit = { ...formData, basePrice: formData.price };
      if (selectedProduct) {
        await adminProductAPI.updateProduct(selectedProduct._id, dataToSubmit);
        toast.success("Product updated");
      } else {
        await adminProductAPI.createProduct(dataToSubmit);
        toast.success("Product created");
      }
      setIsModalOpen(false);
      setSelectedProduct(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
      setLoading(false);
    }
  };

  const isEmpty = Object.keys(grouped).length === 0;

  return (
    <div className="h-[calc(100vh-180px)] overflow-y-auto no-scrollbar relative pr-2">

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-40 bg-base-100 pb-6 pt-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
              <Boxes className="text-primary w-10 h-10 shadow-[0_0_15px_rgba(var(--p),0.3)]" /> Inventory
            </h1>
            <p className="text-[10px] opacity-30 font-black uppercase tracking-[0.3em] mt-1">
              Stock Control & Asset Management
            </p>
          </div>

          <div className="flex w-full md:w-auto gap-3 flex-wrap md:flex-nowrap">
            {/* Search */}
            <div className="relative w-full md:w-60">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                type="text"
                placeholder="Search Inventory..."
                className="input input-bordered w-full pl-12 bg-white/5 border-none font-bold uppercase text-xs rounded-xl focus:ring-2 ring-primary/20 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category filter ← NEW */}
            <div className="relative w-full md:w-48">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="select select-bordered w-full pl-9 bg-white/5 border-none font-black uppercase text-[10px] rounded-xl tracking-widest text-white focus:ring-2 ring-primary/20 transition-all"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#121212] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Add button */}
            <button
              className="btn btn-primary font-black italic uppercase rounded-xl px-6 active:scale-95 transition-all shadow-lg shadow-primary/10 whitespace-nowrap"
              onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
            >
              <Plus className="w-5 h-5" /> Add Item
            </button>
          </div>
        </div>

        {/* Active category badge */}
        {categoryFilter && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 text-white">Filtered by:</span>
            <button
              onClick={() => setCategoryFilter("")}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
            >
              {categoryFilter} ✕
            </button>
          </div>
        )}
      </div>

      <div className="pb-8">
        {loading ? (
          <TableSkeleton />
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-10">
            <Package2 className="w-32 h-32 mb-4" />
            <p className="font-black uppercase italic tracking-tighter text-2xl">
              {categoryFilter ? `No products in "${categoryFilter}"` : "Empty Manifest"}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-12">
              {Object.entries(grouped).map(([category, items]) => (
                <ProductCategorySection
                  key={category}
                  category={category}
                  items={items}
                  selectedIds={selectedIds}
                  toggleCategorySelection={toggleCategorySelection}
                  handleBulkDelete={() => requestBulkDelete(items.filter(i => selectedIds.includes(i._id)))}
                  handleDeleteProduct={requestDelete}
                  deletingId={deletingId}
                  setSelectedProduct={setSelectedProduct}
                  setIsModalOpen={setIsModalOpen}
                  loading={loading}
                />
              ))}
            </div>

            <AdminPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={pagination.totalProducts}
              label="Products"
            />
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.isBulk ? "Bulk Inventory Purge" : "Confirm Asset Deletion"}
        message={confirmConfig.isBulk
          ? `You are about to permanently remove ${confirmConfig.id?.length} items. This action is irreversible.`
          : "Are you sure? All images will be permanently removed from the server."
        }
        loading={deletingId !== null}
        onConfirm={executeDelete}
        onCancel={() => setConfirmConfig({ isOpen: false, id: null, isBulk: false })}
      />

      {isModalOpen && (
        <ProductFormModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
          onSubmit={handleFormSubmit}
          initialData={selectedProduct}
          categories={categories}
          setCategories={setCategories}
          availableSizes={availableSizes}
          setAvailableSizes={setAvailableSizes}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AdminProducts;