import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Package2, Boxes } from "lucide-react";
import toast from "react-hot-toast";
import { adminProductAPI, productAPI, uploadAPI } from "../../services/api.js";
import ProductFormModal from "../../components/modals/ProductFormModal.jsx";
import ProductCategorySection from "../../components/ProductCategorySection.jsx";
import ConfirmationModal from "../../components/modals/ConfirmationModal.jsx"; // New Feature

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
  const [deletingId, setDeletingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableSizes, setAvailableSizes] = useState(["S", "M", "L", "XL", "XXL", "Free Size"]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // NEW FEATURE: Modal State
  const [confirmConfig, setConfirmConfig] = useState({ 
    isOpen: false, 
    id: null, 
    isBulk: false 
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        productAPI.getProducts(),
        productAPI.getCategories()
      ]);
      setProducts(prodRes?.products || prodRes || []);
      setCategories(Array.isArray(catRes) ? catRes : []);
    } catch (err) { 
      toast.error("Failed to load inventory data"); 
    } finally {
      setLoading(false);
    }
  };

  const groupedProducts = useMemo(() => {
    const filtered = products.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.reduce((acc, product) => {
      const cat = product.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {});
  }, [products, searchQuery]);

  const toggleCategorySelection = (items) => {
    const itemIds = items.map(p => p._id);
    const allSelected = itemIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...itemIds])]);
    }
  };

  // NEW FEATURE: Modal Triggers
  const requestDelete = (productId) => {
    setConfirmConfig({ isOpen: true, id: productId, isBulk: false });
  };

  const requestBulkDelete = (itemsToDelete) => {
    if (itemsToDelete.length === 0) return;
    setConfirmConfig({ isOpen: true, id: itemsToDelete, isBulk: true });
  };

  // NEW FEATURE: Consolidated Delete Execution
  const executeDelete = async () => {
    const { id, isBulk } = confirmConfig;
    const loadToast = toast.loading(isBulk ? "Executing bulk purge..." : "Deleting asset...");
    
    setDeletingId(isBulk ? 'bulk' : id);

    try {
      if (isBulk) {
        // Loop through the array of items provided to the modal
        for (const product of id) {
          await adminProductAPI.deleteProduct(product._id);
        }
        setSelectedIds([]);
        toast.success(`${id.length} items purged`, { id: loadToast });
      } else {
        await adminProductAPI.deleteProduct(id);
        toast.success("Asset removed from manifest", { id: loadToast });
      }
      
      setConfirmConfig({ isOpen: false, id: null, isBulk: false });
      fetchData(); 
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Operation failed", { id: loadToast });
    } finally {
      setDeletingId(null);
    }
  };

  // const handleFormSubmit = async (formData) => {
  //   setLoading(true);
  //   try {
  //     if (selectedProduct) {
  //       await adminProductAPI.updateProduct(selectedProduct._id, formData);
  //       toast.success("Product updated");
  //     } else {
  //       await adminProductAPI.createProduct(formData);
  //       toast.success("Product created");
  //     }
  //     setIsModalOpen(false);
  //     setSelectedProduct(null);
  //     fetchData();
  //   } catch (err) { 
  //     toast.error(err.response?.data?.message || "Operation failed"); 
  //     setLoading(false);
  //   }
  // };

  const handleFormSubmit = async (formData) => {
  setLoading(true);
  try {
    // THE FIX: Ensure backend receives 'basePrice'
    const dataToSubmit = {
      ...formData,
      basePrice: formData.price // Mapping the form's 'price' to 'basePrice'
    };

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
  return (
    <div className="h-[calc(100vh-180px)] overflow-y-auto no-scrollbar relative pr-2">
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
          <div className="flex w-full md:w-auto gap-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input 
                type="text" placeholder="Search Inventory..." 
                className="input input-bordered w-full pl-12 bg-white/5 border-none font-bold uppercase text-xs rounded-xl focus:ring-2 ring-primary/20 transition-all"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              className="btn btn-primary font-black italic uppercase rounded-xl px-8 active:scale-95 transition-all shadow-lg shadow-primary/10" 
              onClick={() => { setSelectedProduct(null); setIsModalOpen(true); }}
            >
              <Plus className="w-5 h-5" /> Add Item
            </button>
          </div>
        </div>
      </div>

      <div className="pb-20">
        {loading && products.length === 0 ? (
          <TableSkeleton />
        ) : Object.keys(groupedProducts).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-10">
            <Package2 className="w-32 h-32 mb-4" />
            <p className="font-black uppercase italic tracking-tighter text-2xl">Empty Manifest</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(groupedProducts).map(([category, items]) => (
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
        )}
      </div>

      {/* CONFIRMATION MODAL COMPONENT */}
      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.isBulk ? "Bulk Inventory Purge" : "Confirm Asset Deletion"}
        message={confirmConfig.isBulk 
          ? `You are about to permanently remove ${confirmConfig.id?.length} items and all associated assets. This action is irreversible.`
          : "Are you sure you want to delete this product? All images will be permanently removed from the server."
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