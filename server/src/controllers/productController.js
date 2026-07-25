import Product from "../models/productSchema.js";

export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      color,
      size,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    // let query = { isActive: true };
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);

      query.$or = [
        { basePrice: priceFilter },
        { price: priceFilter },
        { "sizes.price": priceFilter },
      ];
    }

    if (color) {
      query.colors = color;
    }

    if (size) {
      query.sizes = {
        $elemMatch: {
          size: size,
          stock: { $gt: 0 },
        },
      };
    }

    let sortOption = {};
    switch (sort) {
      case "price_asc":
        sortOption = { basePrice: 1, price: 1 };
        break;
      case "price_desc":
        sortOption = { basePrice: -1, price: -1 };
        break;
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "name_asc":
        sortOption = { name: 1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortOption)
        .limit(Number(limit))
        .skip(skip)
        .lean(),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasMore: skip + products.length < total,
      },
    });
  } catch (error) {
    console.error("GET_PRODUCTS_ERROR:", error);
    res
      .status(500)
      .json({ message: "Error fetching products", error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product" });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories" });
  }
};
