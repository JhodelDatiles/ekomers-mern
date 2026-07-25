import Wishlist from '../models/wishlistSchema.js';

// GET /api/wishlist
export const getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user.id })
      .populate('products', 'name images basePrice sizes');

    if (!wishlist) {
      return res.status(200).json({ products: [] });
    }
    res.status(200).json(wishlist);
  } catch (error) {
    res.status(500).json({ message: "Error fetching wishlist" });
  }
};

// POST /api/wishlist/toggle
export const toggleWishlistItem = async (req, res) => {
  try {
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ userId: req.user.id });

    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.user.id, products: [productId] });
    } else {
      const isAdded = wishlist.products.includes(productId);
      if (isAdded) {
        // Remove if exists
        wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
      } else {
        // Add if not exists
        wishlist.products.push(productId);
      }
    }

    await wishlist.save();
    const updatedWishlist = await wishlist.populate('products', 'name images basePrice sizes');
    res.status(200).json(updatedWishlist);
  } catch (error) {
    res.status(500).json({ message: "Error updating wishlist" });
  }
};