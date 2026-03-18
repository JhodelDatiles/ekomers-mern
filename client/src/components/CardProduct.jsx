import { ShoppingCart, Heart, Eye } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

const ProductCard = ({ product, onQuickView }) => {
  const { user } = useAuth(); // Get user status
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const displayImage = product.images?.[0]?.url || product.images?.[0];
  const liked = isInWishlist(product._id);
  const inStockSizes = product.sizes?.filter(s => s.stock > 0) || [];

  const handleWishlistClick = (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error("PLEASE LOGIN TO ADD TO WISHLIST!", { icon: "🔒" });
      return;
    }
    toggleWishlist(product);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    
    // 1. Check if logged in
    if (!user) {
      toast.error("PLEASE LOGIN TO SHOP!", { icon: "🔒" });
      return;
    }
    
    // 2. If multiple sizes exist or item is out of stock, open modal
    if (inStockSizes.length !== 1) {
      onQuickView(product);
      return;
    }

    // 3. Auto-add only if there is exactly 1 size option
    try {
      const selectedSize = inStockSizes[0]?.size || "OS";
      await addToCart(product._id, 1, selectedSize);
      toast.success("ADDED TO BAG!");
    } catch (err) {
      toast.error("FAILED TO ADD");
    }
  };

  return (
    <div 
      onClick={() => onQuickView && onQuickView(product)}
      className="group relative bg-base-100 border border-base-300 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 cursor-pointer"
    >
      <div className="aspect-square overflow-hidden bg-base-200 relative">
        <img
          src={displayImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { e.target.src = "https://placehold.co/400x400?text=No+Image"; }}
        />
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-white/90 p-3 rounded-full text-black scale-75 group-hover:scale-100 transition-transform duration-300">
             <Eye size={24} />
          </div>
        </div>

        <button 
          onClick={handleWishlistClick}
          className={`absolute top-4 right-4 z-10 btn btn-circle btn-sm border-none shadow-lg ${liked ? "bg-error text-white" : "bg-white text-black"}`}
        >
          <Heart size={16} className={liked ? "fill-current" : ""} />
        </button>
      </div>

      <div className="p-5">
        <span className="text-[10px] font-black uppercase opacity-40 tracking-widest italic">{product.category}</span>
        <h3 className="font-black uppercase italic text-lg truncate mb-1 tracking-tighter">{product.name}</h3>

        <div className="flex flex-wrap gap-1 mb-3">
          {product.sizes?.map((s, idx) => (
            <span 
              key={idx} 
              className={`relative text-[9px] font-bold border border-base-300 px-1.5 py-0.5 rounded uppercase 
                ${s.stock <= 0 ? "opacity-30 bg-base-300" : "bg-base-200/50"}`}
            >
              {s.size}
              {s.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-base-content rotate-[25deg]"></div>
                </div>
              )}
            </span>
          ))}
        </div>

        <div className="flex justify-between items-center mt-auto">
          <p className="text-xl font-black text-primary italic">₱{product.sizes?.[0]?.price}</p>
          <button 
            onClick={handleAddToCart}
            className="btn btn-primary btn-sm btn-circle shadow-lg"
            disabled={inStockSizes.length === 0 && user} // Only disable if out of stock AND logged in
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;