import { Trash2, Edit, AlertTriangle, PackageSearch, Loader2 } from "lucide-react";

const ProductCategorySection = ({ 
  category, 
  items, 
  selectedIds, 
  toggleCategorySelection, 
  handleBulkDelete, 
  handleDeleteProduct, 
  setSelectedProduct, 
  setIsModalOpen, 
  loading,
  deletingId // Ensure this is passed from AdminProducts.jsx
}) => {
  const selectedInCategory = items.filter((item) => selectedIds.includes(item._id));
  const isCategoryFullySelected = selectedInCategory.length === items.length && items.length > 0;

  return (
    <section className="group animate-in fade-in duration-700">
      {/* CATEGORY HEADER */}
      <div className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-white/5">
        <div className="flex items-center gap-4">
          <div className="bg-primary w-1.5 h-8 rounded-full shadow-[0_0_15px_rgba(var(--p),0.5)]"></div>
          <h2 className="text-3xl font-black tracking-tighter capitalize italic text-white">{category}</h2>
          <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-black text-primary uppercase">
            {items.length} Units
          </span>
        </div>

        <div className="flex items-center gap-3">
          {selectedInCategory.length > 0 && (
            <button 
              className="btn btn-error btn-sm gap-2 font-black uppercase text-[10px] tracking-widest active:scale-95" 
              onClick={handleBulkDelete}
              disabled={loading}
            >
              <Trash2 size={14} /> Purge ({selectedInCategory.length})
            </button>
          )}

          <button 
            onClick={() => toggleCategorySelection(items)}
            className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all active:scale-95 font-black uppercase text-[10px] tracking-widest ${
              isCategoryFullySelected 
                ? "bg-primary border-primary text-black" 
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
            }`}
          >
            {isCategoryFullySelected ? "Deselect Group" : "Select Group"}
          </button>
        </div>
      </div>

      {/* PRODUCT TABLE */}
      <div className="mt-6 bg-[#0a0a0a]/40 border border-white/5 rounded-[24px] overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto no-scrollbar">
          <table className="table w-full border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] uppercase tracking-[0.2em] text-white/30 border-b border-white/5">
                <th className="w-16 text-center">Sel</th>
                <th className="w-24">Asset</th>
                <th>Manifest</th>
                <th>Valuation</th>
                <th>Status</th>
                <th className="text-right pr-8">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((product) => {
                const prices = product.sizes?.map(s => s.price) || [];
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                const totalStock = product.sizes?.reduce((acc, s) => acc + (s.stock || 0), 0);
                const isItemSelected = selectedIds.includes(product._id);
                const isDeleting = deletingId === product._id;

                return (
                  <tr 
                    key={product._id} 
                    className={`group/row transition-all duration-300 ${
                      isItemSelected ? "bg-primary/[0.03] border-l-2 border-l-primary" : "border-l-2 border-l-transparent hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="text-center">
                      <input 
                        type="checkbox" 
                        className="checkbox checkbox-primary checkbox-sm rounded-md" 
                        checked={isItemSelected} 
                        onChange={() => toggleCategorySelection([product])} 
                      />
                    </td>
                    <td>
                      <div className="avatar">
                        <div className="w-14 h-14 rounded-xl border border-white/10 bg-neutral shadow-2xl group-hover/row:scale-110 transition-transform duration-500">
                          <img 
                            src={product.images?.[0]?.url || "/placeholder.png"} 
                            alt={product.name} 
                            className="object-cover"
                            onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=NA"; }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-5">
                      <div className="font-black text-white uppercase tracking-tight text-md">
                        {product.name}
                      </div>
                      <div className="text-[9px] opacity-30 font-mono tracking-tighter mt-0.5">
                        {product._id.toUpperCase()}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-black text-primary text-md">
                          ₱{minPrice.toLocaleString()}
                        </span>
                        {minPrice !== maxPrice && (
                          <span className="text-[10px] opacity-30 font-bold uppercase">Up to ₱{maxPrice.toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-2">
                        <span className={`text-[10px] font-black uppercase flex items-center gap-2 ${
                          totalStock === 0 ? "text-error" : totalStock < 10 ? "text-warning" : "text-success"
                        }`}>
                          <span className={`relative flex h-2 w-2`}>
                            {totalStock < 10 && (
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${totalStock === 0 ? "bg-error" : "bg-warning"}`}></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${totalStock === 0 ? "bg-error" : totalStock < 10 ? "bg-warning" : "bg-success"}`}></span>
                          </span>
                          {totalStock === 0 ? "Depleted" : `${totalStock} in Reserve`}
                        </span>
                        
                        <div className="flex flex-wrap gap-1">
                          {product.sizes?.map(s => (
                            <div key={s.size} className={`text-[9px] px-2 py-0.5 rounded-md font-black border ${
                              s.stock === 0 
                                ? "bg-error/5 text-error/40 border-error/10" 
                                : "bg-white/5 border-white/5 text-white/40"
                            }`}>
                              {s.size}: <span className={s.stock > 0 ? "text-white/70" : ""}>{s.stock}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <button 
                          disabled={isDeleting}
                          onClick={() => { setSelectedProduct(product); setIsModalOpen(true); }} 
                          className="btn btn-ghost btn-square btn-sm hover:bg-primary hover:text-black transition-all disabled:opacity-30"
                        >
                          <Edit size={16} />
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteProduct(product._id)} 
                          disabled={isDeleting}
                          className={`btn btn-ghost btn-square btn-sm hover:bg-error hover:text-white transition-all ${isDeleting ? "bg-error/20 text-error" : ""}`}
                        >
                          {isDeleting ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ProductCategorySection;