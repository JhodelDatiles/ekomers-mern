import Product from "../../models/productSchema.js";
import { cloudinary } from "../../config/cloudinary.js";

// POST /api/admin/products - Create product
export const adminCreateProduct = async (req, res) => {
  const {
    name,
    description,
    basePrice,
    category,
    images,
    sizes,
    colors,
    isActive,
  } = req.body;

  try {
    if (!images || images.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one product image is required" });
    }

    const product = new Product({
      name,
      description,
      basePrice: Number(basePrice) || 0,
      category,
      images,
      sizes: sizes.map((s) => ({
        size: s.size,
        stock: Number(s.stock) || 0,
        price: Number(s.price) || Number(basePrice) || 0,
      })),
      colors,
      isActive: isActive !== undefined ? isActive : true,
    });

    await product.save();
    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.error("CREATE ERROR:", error);

    // AUTOMATIC ROLLBACK: Delete images from Cloudinary if DB save fails
    if (images && images.length > 0) {
      try {
        const deletePromises = images
          .filter((img) => img.publicId)
          .map((img) => cloudinary.uploader.destroy(img.publicId));
        await Promise.all(deletePromises);
        console.log("Successfully cleaned up orphaned images after failure.");
      } catch (cleanupError) {
        console.error("Cleanup Error during rollback:", cleanupError);
      }
    }
    res
      .status(500)
      .json({ message: "Failed to create product", error: error.message });
  }
};

// GET /api/admin/products-list - Paginated product listing
export const adminGetProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, search = "", category = "" } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    const [products, totalProducts] = await Promise.all([
      Product.find(query)
        .sort({ category: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query),
    ]);

    const grouped = products.reduce((acc, product) => {
      const cat = product.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(product);
      return acc;
    }, {});

    res.status(200).json({
      products,
      grouped,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalProducts / limitNum),
        totalProducts,
        limit: limitNum,
        hasMore: skip + products.length < totalProducts,
      },
    });
  } catch (error) {
    console.error("ADMIN_GET_PRODUCTS_ERROR:", error);
    res
      .status(500)
      .json({ message: "Error fetching products", error: error.message });
  }
};

// PUT /api/admin/products/:id - Update product
export const adminUpdateProduct = async (req, res) => {
  try {
    const { basePrice, sizes, ...rest } = req.body;
    const updateData = { ...rest };

    if (basePrice) updateData.basePrice = Number(basePrice);
    if (sizes) {
      updateData.sizes = sizes.map((s) => ({
        size: s.size,
        stock: Number(s.stock) || 0,
        price: Number(s.price) || Number(basePrice) || 0,
      }));
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedProduct)
      return res.status(404).json({ message: "Product not found" });
    res
      .status(200)
      .json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

export const adminDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find product first to get image references
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found in database" });
    }

    // 2. Delete images from Cloudinary (Safe Loop)
    if (
      product.images &&
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      try {
        const deletePromises = product.images
          .filter((img) => img && img.publicId) // Ensure publicId exists
          .map((img) => cloudinary.uploader.destroy(img.publicId));

        // allSettled ensures if one image fails, the others (and the DB delete) continue
        await Promise.allSettled(deletePromises);
      } catch (cloudErr) {
        console.error(
          "Cloudinary asset cleanup partial failure:",
          cloudErr.message,
        );
      }
    }

    // 3. Delete the product record
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Product and associated assets removed successfully",
    });
  } catch (error) {
    // Check your backend terminal for this log!
    console.error("CRITICAL DELETE ERROR:", error);
    res.status(500).json({
      message: "Server encountered an error during deletion",
      error: error.message,
    });
  }
};
