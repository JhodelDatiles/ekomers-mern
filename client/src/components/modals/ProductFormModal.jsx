import { useState, useEffect, useRef } from "react";
import {
  X,
  Upload,
  Package,
  Check,
  Plus,
  Trash2,
  Tag,
  AlignLeft,
  Palette,
} from "lucide-react";
import { DragDropContext } from "@hello-pangea/dnd";
import toast from "react-hot-toast";
import { uploadAPI } from "../../services/api.js";
import FormInput from "../ui/FormInput";
import ModalContainer from "../modals/ModalContainer";
import CategorySection from "../CategorySection";
import SizeInventorySection from "../SizeInventorySection";

const ProductFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  setCategories,
  availableSizes,
  setAvailableSizes,
  loading,
}) => {
  const initialFormState = {
    name: "",
    description: "",
    basePrice: 0,
    category: "",
    sizes: [],
    colors: [],
    images: [],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [showAddSize, setShowAddSize] = useState(false);
  const [newSizeName, setNewSizeName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newColor, setNewColor] = useState("");

  // Ref for background tracking (prevents re-render loops)
  const sessionImagesRef = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setFormData(
        initialData
          ? {
              ...initialFormState,
              ...initialData,
              images: initialData.images || [],
            }
          : initialFormState,
      );
      sessionImagesRef.current = []; // Reset tracking on open
    }
  }, [isOpen, initialData]);

  // NEW: Automatic Cleanup Feature
  useEffect(() => {
    return () => {
      const imagesToClean = sessionImagesRef.current;
      if (imagesToClean.length > 0) {
        imagesToClean.forEach((img) => {
          if (img.publicId) {
            uploadAPI
              .deleteImage(img.publicId)
              .catch((err) => console.error("Auto-cleanup failed", err));
          }
        });
      }
    };
  }, []);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, type } = result;
    if (type === "CATEGORIES") {
      const items = Array.from(categories);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setCategories(items);
    } else if (type === "SIZES") {
      const items = Array.from(formData.sizes);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setFormData({ ...formData, sizes: items });
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (formData.name.length > 40)
      return toast.error("Name exceeds 40 characters");
    if (formData.description.length > 500)
      return toast.error("Description exceeds 500 characters");
    if (!formData.name.trim()) return toast.error("Product name is required");
    if (formData.basePrice <= 0)
      return toast.error("Please set a valid base price");
    if (!formData.category) return toast.error("Please select a category");
    if (!formData.description.trim())
      return toast.error("Description is required");
    if (formData.sizes.length === 0)
      return toast.error("Select at least one size");
    if (formData.images.length === 0)
      return toast.error("Please upload at least one image");

    try {
      await onSubmit(formData);
      sessionImagesRef.current = []; // Prevent cleanup on success
      onClose();
    } catch (err) {
      // Error handling logic preserved
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const loadToast = toast.loading("Uploading images...");
    try {
      const res = await uploadAPI.uploadMultiple(files);

      // Update Ref for background cleanup
      sessionImagesRef.current = [...sessionImagesRef.current, ...res.images];

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...res.images],
      }));

      toast.success("Images uploaded", { id: loadToast });
    } catch (err) {
      toast.error("Upload failed", { id: loadToast });
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleRemoveImage = async (index, publicId) => {
    if (!window.confirm("Remove this image?")) return;
    try {
      if (publicId) await uploadAPI.deleteImage(publicId);
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
      // Sync Ref
      sessionImagesRef.current = sessionImagesRef.current.filter(
        (img) => img.publicId !== publicId,
      );
      toast.success("Image removed");
    } catch (err) {
      toast.error("Failed to delete image");
    }
  };

  const handleClearImages = async () => {
    if (formData.images.length === 0 || !window.confirm("Clear all images?"))
      return;
    const loadToast = toast.loading("Cleaning up...");
    try {
      const deletePromises = formData.images
        .filter((img) => img.publicId)
        .map((img) => uploadAPI.deleteImage(img.publicId));
      await Promise.all(deletePromises);
      setFormData((prev) => ({ ...prev, images: [] }));
      sessionImagesRef.current = [];
      toast.success("Cleared", { id: loadToast });
    } catch (err) {
      toast.error("Cleanup error", { id: loadToast });
    }
  };

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      loading={loading || uploading}
    >
      <div className="bg-[#1a1c23] border border-white/10 rounded-3xl shadow-2xl w-full max-w-[640px] overflow-hidden flex flex-col h-[90vh] mx-auto">
        <div className="bg-[#242731] px-6 py-4 flex justify-between items-center border-b border-white/5 text-white">
          <h3 className="font-bold flex items-center gap-2 uppercase italic tracking-tighter">
            <Package className="text-primary w-5 h-5" />{" "}
            {initialData ? "Edit" : "New"} Product
          </h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-6 overflow-y-auto flex-1 no-scrollbar"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Product Name"
                icon={Tag}
                required
                maxLength={40}
                placeholder="e.g. Vintage Oversized Tee"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <div className="form-control">
                <div className="flex justify-between items-end mb-1 px-1">
                  <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">
                    Base Price (₱) *
                  </label>
                </div>
                <input
                  type="number"
                  required
                  className="input bg-[#1a1c23] border border-white/10 rounded-2xl text-white font-mono font-bold focus:border-primary transition-all"
                  value={formData.basePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, basePrice: e.target.value })
                  }
                />
              </div>
            </div>

            <CategorySection
              categories={categories}
              setCategories={setCategories}
              selectedCategory={formData.category}
              onSelect={(cat) => setFormData({ ...formData, category: cat })}
              showAddCat={showAddCat}
              setShowAddCat={setShowAddCat}
              newCatName={newCatName}
              setNewCatName={setNewCatName}
              onAddCategory={() => {
                if (!newCatName.trim()) return;
                if (!categories.includes(newCatName))
                  setCategories((prev) => [...prev, newCatName]);
                setFormData((p) => ({ ...p, category: newCatName }));
                setShowAddCat(false);
                setNewCatName("");
              }}
            />

            <div className="form-control">
              <div className="flex justify-between items-end mb-1 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white flex items-center gap-2">
                  <AlignLeft size={12} /> Description *
                </label>
                <span
                  className={`text-[10px] font-bold transition-all duration-300 ${
                    formData.description.length > 500
                      ? "text-error animate-pulse scale-110"
                      : "opacity-20 text-white"
                  }`}
                >
                  {formData.description.length}/500
                </span>
              </div>
              <textarea
                required
                className={`textarea textarea-bordered bg-[#1a1c23] rounded-2xl h-28 text-white font-medium transition-all duration-300 custom-scrollbar w-full 
                  ${
                    formData.description.length > 500
                      ? "border-error focus:border-error ring-2 ring-error/10 bg-error/5"
                      : "border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  }`}
                placeholder="Describe style, material, and fit..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
              <div className="h-4 mt-1 px-1">
                {formData.description.length > 500 && (
                  <p className="text-[10px] font-black text-error animate-in slide-in-from-top-1 duration-300 uppercase italic tracking-tight">
                    Exceeded 500 characters
                  </p>
                )}
              </div>
            </div>

            <SizeInventorySection
              availableSizes={availableSizes}
              setAvailableSizes={setAvailableSizes}
              selectedSizes={formData.sizes}
              showAddSize={showAddSize}
              setShowAddSize={setShowAddSize}
              newSizeName={newSizeName}
              setNewSizeName={setNewSizeName}
              onToggleSize={(size) =>
                setFormData((prev) => {
                  const isSelected = prev.sizes.find((s) => s.size === size);
                  if (isSelected)
                    return {
                      ...prev,
                      sizes: prev.sizes.filter((s) => s.size !== size),
                    };
                  return {
                    ...prev,
                    sizes: [
                      ...prev.sizes,
                      { size: size, stock: 0, price: prev.basePrice || 0 },
                    ],
                  };
                })
              }
              onAddSize={() => {
                const upper = newSizeName.toUpperCase().trim();
                if (!upper) return;
                if (!availableSizes.includes(upper))
                  setAvailableSizes((p) => [...p, upper]);
                setNewSizeName("");
                setShowAddSize(false);
              }}
              onUpdateSizeData={(size, field, val) =>
                setFormData((prev) => ({
                  ...prev,
                  sizes: prev.sizes.map((s) =>
                    s.size === size
                      ? { ...s, [field]: parseFloat(val) || 0 }
                      : s,
                  ),
                }))
              }
            />

            <div className="form-control">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">
                  Images *
                </label>
                {formData.images.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearImages}
                    className="btn btn-ghost btn-xs text-error gap-1 uppercase font-black text-[9px]"
                  >
                    <Trash2 size={12} /> Clear All
                  </button>
                )}
              </div>
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center bg-white/5 relative group hover:border-primary/50 transition-all">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <Upload
                  className={`mx-auto mb-2 transition-all ${uploading ? "animate-bounce text-primary" : "text-white/20"}`}
                  size={32}
                />
                <p className="text-[10px] font-black uppercase text-white/40">
                  {uploading ? "Uploading..." : "Click or Drag Images"}
                </p>
              </div>
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2 custom-scrollbar">
                {formData.images.map((img, i) => (
                  <div
                    key={i}
                    className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group flex-shrink-0"
                  >
                    <img
                      src={img.url || img}
                      className="w-full h-full object-cover"
                      alt="Product"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i, img.publicId)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                    >
                      <X className="text-white" size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </DragDropContext>

        <div className="p-6 border-t border-white/5 bg-[#1a1c23] flex gap-3">
          <button
            type="button"
            className="btn btn-ghost flex-1 text-white/50 uppercase font-black italic"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="btn btn-primary flex-1 font-black shadow-xl uppercase italic"
            disabled={loading || uploading}
          >
            {loading ? "Saving..." : initialData ? "Update" : "Launch"}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
};

export default ProductFormModal;
