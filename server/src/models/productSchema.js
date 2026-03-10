import mongoose from 'mongoose';

const sizeSchema = new mongoose.Schema({
  size: { type: String, required: true },
  stock: { type: Number, default: 0, min: 0 },
  price: { type: Number, required: true, min: 0 } // Price now lives here
});
const productSchema = new mongoose.Schema(
  {
    // _id is handled automatically by Mongoose
    name: { type: String, required: true, trim: true },
    description: { type: String },
    basePrice: { type: Number }, // Optional: use this for "Starting at" labels
    category: { type: String, index: true }, // Indexing helps with search performance
    images: [{
      url: String,
      publicId: String
    }],
    stock: { type: Number, default: 0 },
    sizes: [sizeSchema],
    colors: [String],
    specifications: {
      type: Map, // Map is often better than 'Mixed' for key-value pairs
      of: mongoose.Schema.Types.Mixed
    },
    isActive: { type: Boolean, default: true },
  },
  { 
    timestamps: true // Automatically manages createdAt and updatedAt
  }
);
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ name: 'text' }); // enables text search
const Product = mongoose.model('Product', productSchema);

export default Product;