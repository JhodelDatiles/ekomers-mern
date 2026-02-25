import Cart from '../models/cartSchema.js';
import Product from '../models/productSchema.js';

// GET /api/cart - Get user cart
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId', 'name images price sizes');
    if (!cart) {
      return res.status(200).json({ items: [], totalAmount: 0 });
    }
    res.status(200).json(cart);
  } catch (error) {
    console.error("Fetch Cart Error:", error);
    res.status(500).json({ message: "Error fetching cart" });
  }
};

// POST /api/cart - Add to cart
export const addToCart = async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body;
    
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const sizeEntry = product.sizes.find(s => s.size === size);
    if (!sizeEntry) {
      return res.status(400).json({ message: "Selected size is invalid or unavailable" });
    }

    const itemPrice = sizeEntry.price; 
    let cart = await Cart.findOne({ userId: req.user.id });

    if (cart) {
      const itemIndex = cart.items.findIndex(p => 
        p.productId.toString() === productId && p.size === size && p.color === color
      );

      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ productId, quantity, price: itemPrice, size, color });
      }
    } else {
      cart = new Cart({
        userId: req.user.id,
        items: [{ productId, quantity, price: itemPrice, size, color }]
      });
    }

    cart.totalAmount = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
    await cart.save();
    
    const updatedCart = await cart.populate('items.productId', 'name images price sizes');
    res.status(200).json(updatedCart);
  } catch (error) {
    console.error("Add to Cart Error:", error);
    res.status(500).json({ message: "Error adding to cart" });
  }
};

// PUT /api/cart/:itemId - Update quantity
// controllers/cartController.js
export const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId: req.user.id });
    const item = cart.items.find((i) => i._id.toString() === itemId);

    item.quantity = quantity;
    cart.totalAmount = cart.items.reduce((acc, i) => acc + i.quantity * i.price, 0);

    await cart.save();
    
    // 🎯 CRITICAL: Added 'sizes' to populate so frontend can stop the count
    const updatedCart = await cart.populate('items.productId', 'name images price sizes');
    res.status(200).json(updatedCart);
  } catch (error) {
    res.status(500).json({ message: "Error updating cart" });
  }
};

// DELETE /api/cart/:itemId - Remove from cart
export const removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);
    cart.totalAmount = cart.items.reduce((acc, item) => acc + item.quantity * item.price, 0);

    await cart.save();
    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({ message: "Error removing item" });
  }
};

// 🚀 NEW: clearCart - This is the export your routes are missing!
export const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    // Find the cart and delete it entirely
    await Cart.findOneAndDelete({ userId });
    
    console.log(`🧹 Logistics: Cart manifest wiped for user ${userId}`);
    
    // Return the empty structure the frontend expects
    res.status(200).json({ 
      items: [], 
      totalAmount: 0, 
      message: "Bag cleared successfully" 
    });
  } catch (error) {
    console.error("Clear Cart Error:", error);
    res.status(500).json({ message: "Failed to wipe bag" });
  }
};