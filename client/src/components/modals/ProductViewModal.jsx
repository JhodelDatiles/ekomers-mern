import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, ShoppingCart, Heart, CreditCard, Loader2, Minus, Plus, Ban } from "lucide-react";
import { useWishlist } from "../../context/WishlistContext"; 
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";

const ProductViewModal = ({ product, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [processingBuyNow, setProcessingBuyNow] = useState(false);
  
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  
  if (!product) return null;

  const descriptionText = product.description || "No description provided.";
  const isScrollable = descriptionText.length > 150;
  
  const liked = isInWishlist(product?._id);
  const selectedSizeData = product.sizes?.find(s => s.size === selectedSize);
  const maxAvailable = selectedSizeData?.stock || 0;
  const currentPrice = selectedSizeData ? selectedSizeData.price : (product.basePrice || product.sizes?.[0]?.price || product.price);
  const productImage = product.images?.[0]?.url || product.images?.[0];
  
  const totalStock = product.sizes?.reduce((acc, s) => acc + s.stock, 0) || 0;
  const isSoldOut = totalStock <= 0;

  const handleQuantityChange = (val) => {
    if (val < 1) return;
    if (val > maxAvailable) { 
      toast.error(`ONLY ${maxAvailable} UNITS REMAINING`); 
      return; 
    }
    setQuantity(val);
  };

  const handleAddToCart = async () => {
    if (!selectedSize) { toast.error("PLEASE SELECT A SIZE FIRST!"); return; }
    setAddingToCart(true);
    try {
      await addToCart(product._id, quantity, selectedSize, currentPrice); 
      toast.success("ADDED TO BAG!");
      onClose();
    } catch (err) { toast.error("FAILED TO ADD."); } finally { setAddingToCart(false); }
  };

  const handleBuyNow = () => {
    if (!selectedSize) { toast.error("PLEASE SELECT A SIZE FIRST!"); return; }
    setProcessingBuyNow(true);
    const directPurchaseItem = [{
      _id: `direct-${Date.now()}`, 
      productId: { _id: product._id, name: product.name, images: product.images, category: product.category },
      quantity, size: selectedSize, price: currentPrice
    }];
    setTimeout(() => {
      onClose();
      navigate("/checkout", { state: { items: directPurchaseItem, total: currentPrice * quantity, isDirectPurchase: true } });
      setProcessingBuyNow(false);
    }, 600);
  };

  return (
    <div className="modal modal-open backdrop-blur-sm p-2 md:p-4">
      {/* Container: Changed max-h and added overflow-y-auto for mobile */}
      <div className="modal-box max-w-4xl p-0 bg-base-100 border border-base-300 shadow-2xl overflow-y-auto md:overflow-hidden relative rounded-2xl h-auto max-h-[95vh] md:max-h-[85vh]">
        
        {/* Close Button: Slightly larger hit area for mobile */}
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-50 bg-base-100/50 backdrop-blur-md" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row min-h-full">
          
          {/* LEFT SIDE: Image + Description */}
          <div className="w-full md:w-[45%] bg-base-200 flex flex-col border-b md:border-b-0 md:border-r border-base-300">
            {/* Image: Proportional on mobile, constrained on desktop */}
            <div className="relative w-full aspect-square md:aspect-auto md:flex-1 flex items-center justify-center bg-base-300/20 overflow-hidden">
              <img 
                src={productImage} 
                className={`w-full h-full object-cover transition-all duration-500 ${isSoldOut ? 'grayscale opacity-40 scale-105' : 'hover:scale-110'}`} 
                alt={product.name} 
              />
              
              {isSoldOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10">
                  <div className="bg-error text-error-content px-6 py-2 rounded-full font-black uppercase italic tracking-tighter text-lg shadow-2xl border-2 border-white/20 -rotate-12">
                    Sold Out
                  </div>
                </div>
              )}
            </div>

            {/* Description: Collapsible-like behavior or shorter max-height for mobile */}
            <div className="p-4 md:p-5 flex flex-col bg-base-200/50">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-50 flex items-center gap-2">
                <span className="w-4 h-[2px] bg-primary"></span> Details
              </h3>
              
              <div className={`custom-scrollbar ${isScrollable ? 'overflow-y-auto max-h-[80px] md:max-h-[120px]' : ''}`}>
                <p className="text-[11px] md:text-xs leading-relaxed text-base-content/70 whitespace-pre-wrap">
                  {descriptionText}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Purchase Logic */}
          <div className="w-full md:w-[55%] p-5 md:p-8 flex flex-col justify-between bg-base-100">
            <div className="flex flex-col">
              <div className="badge badge-primary badge-sm mb-2 uppercase font-black text-[9px] italic tracking-widest">{product.category}</div>
              <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter leading-none mb-2 break-words">
                {product.name}
              </h2>
              <p className="text-2xl font-black text-primary italic mb-6">
                {isSoldOut ? "UNAVAILABLE" : `₱${currentPrice?.toLocaleString()}`}
              </p>

              {/* Size Selection: Responsive Grid */}
              <div className="mb-6">
                <span className="text-[10px] font-black uppercase opacity-40 tracking-widest block mb-3">Select Size</span>
                <div className="grid grid-cols-3 gap-2">
                  {product.sizes?.map((s) => (
                    <button
                      key={s.size}
                      disabled={s.stock <= 0 || !user}
                      onClick={() => { setSelectedSize(s.size); setQuantity(1); }}
                      className={`relative flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all
                        ${selectedSize === s.size ? "border-primary bg-primary/5 text-primary" : "border-base-300"}
                        ${s.stock <= 0 ? "opacity-20 cursor-not-allowed bg-base-200" : "hover:border-primary/50"}
                      `}
                    >
                      <span className="text-xs md:text-sm font-black italic uppercase">{s.size}</span>
                      {s.stock > 0 && (
                        <span className={`text-[8px] font-bold mt-0.5 uppercase ${s.stock < 5 ? 'text-error' : 'opacity-40'}`}>
                          {s.stock} Left
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              {selectedSize && maxAvailable > 0 && (
                <div className="flex items-center justify-between bg-base-200/50 p-3 rounded-xl border border-base-300 mb-6">
                   <span className="text-[9px] font-black uppercase opacity-50">Quantity</span>
                   <div className="flex items-center bg-base-100 rounded-lg p-0.5 border border-base-300">
                      <button onClick={() => handleQuantityChange(quantity - 1)} className="btn btn-ghost btn-xs" disabled={quantity <= 1}><Minus size={12}/></button>
                      <span className="w-8 text-center text-xs font-black italic">{quantity}</span>
                      <button onClick={() => handleQuantityChange(quantity + 1)} className="btn btn-ghost btn-xs" disabled={quantity >= maxAvailable}><Plus size={12}/></button>
                   </div>
                </div>
              )}
            </div>

            {/* Actions: Stacked for better mobile reach */}
            <div className="space-y-3 mt-4">
              {!user ? (
                <Link to="/login" className="btn btn-primary w-full h-12 rounded-xl font-black uppercase italic shadow-lg shadow-primary/20">Login to Buy</Link>
              ) : isSoldOut ? (
                <button disabled className="btn btn-ghost w-full h-12 rounded-xl font-black uppercase italic border-2 border-base-300 gap-2">
                  <Ban size={18} /> Sold Out
                </button>
              ) : (
                <>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-primary flex-1 h-12 rounded-xl font-black uppercase italic shadow-lg shadow-primary/20" 
                      onClick={handleAddToCart} 
                      disabled={addingToCart || !selectedSize}
                    >
                      {addingToCart ? <Loader2 className="animate-spin w-4 h-4" /> : <><ShoppingCart size={16} /> Add to Bag</>}
                    </button>
                    <button 
                      className={`btn h-12 w-12 rounded-xl border-2 transition-all ${liked ? "bg-error text-white border-error shadow-lg shadow-error/20" : "border-base-300 hover:border-error hover:text-error"}`} 
                      onClick={() => toggleWishlist(product)}
                    >
                      <Heart size={18} className={liked ? "fill-current" : ""} />
                    </button>
                  </div>
                  <button 
                    onClick={handleBuyNow} 
                    disabled={!selectedSize || processingBuyNow} 
                    className="btn btn-neutral w-full h-12 rounded-xl font-black uppercase italic border-none"
                  >
                    {processingBuyNow ? <Loader2 className="animate-spin w-4 h-4" /> : <><CreditCard size={16} /> Buy Now</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop bg-black/60" onClick={onClose}></div>
    </div>
  );
};

export default ProductViewModal;