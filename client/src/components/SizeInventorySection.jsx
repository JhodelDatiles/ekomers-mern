import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { X, Plus, Check, GripVertical } from "lucide-react";

const SizeInventorySection = ({
  availableSizes,
  setAvailableSizes,
  selectedSizes,
  onToggleSize,
  showAddSize,
  setShowAddSize,
  newSizeName,
  setNewSizeName,
  onAddSize,
  onUpdateSizeData,
}) => {
  const removeSize = (e, sizeToRemove) => {
    e.stopPropagation();
    setAvailableSizes((prev) => prev.filter((s) => s !== sizeToRemove));
    // The parent handles filtering the formData.sizes via state sync
  };

  return (
    //---------------------------------------------------------------------
    //SIZE PRICE AND INVENTORY SECTION ON EDIT AND CREATE PRODUCT MODAL
    //---------------------------------------------------------------------
    <div className="form-control">
      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white mb-2 px-1">
        Sizes, Price & Inventory
      </label>
      <div className="bg-white/5 rounded-2xl border border-white/10 p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((size) => {
            const isSelected = selectedSizes.some((s) => s.size === size);
            return (
              <div key={size} className="join">
                <button
                  type="button"
                  onClick={() => onToggleSize(size)}
                  className={`btn btn-xs join-item px-3 font-bold ${isSelected ? "bg-secondary text-white" : "bg-white/5 text-white/40"}`}
                >
                  {size}
                </button>
                <button
                  type="button"
                  onClick={(e) => removeSize(e, size)}
                  className="btn btn-xs join-item px-2 border-l border-white/5 bg-white/5 text-error"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setShowAddSize(!showAddSize)}
            className="btn btn-xs btn-circle btn-outline border-white/20 text-white/40"
          >
            <Plus size={14} />
          </button>
        </div>

        {showAddSize && (
          <div className="mt-2 animate-in fade-in slide-in-from-top-1">
            <div className="join w-full max-w-50 border border-white/10 rounded-xl overflow-hidden">
              <input
                type="text"
                required
                className={`input input-sm join-item w-full bg-[#1a1c23] text-white focus:outline-none ${newSizeName.length > 8 ? "text-error" : ""}`}
                placeholder="e.g. XXL"
                value={newSizeName}
                onChange={(e) => setNewSizeName(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-sm btn-success join-item text-white border-none"
                onClick={onAddSize}
                disabled={newSizeName.length > 8 || !newSizeName.trim()}
              >
                <Check size={16} />
              </button>
            </div>
            <div className="flex justify-between items-center px-1 mt-1 max-w-50">
              <span
                className={`text-[9px] font-bold ml-auto ${newSizeName.length > 8 ? "text-error" : "opacity-20 text-white"}`}
              >
                {newSizeName.length}/8
              </span>
            </div>
          </div>
        )}

        {selectedSizes.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-[#1a1c23]">
            <table className="table w-full">
              <thead className="bg-white/5 text-white/30 text-[10px] uppercase font-black">
                <tr>
                  <th className="w-10"></th>
                  <th>Size</th>
                  <th>Stock</th>
                  <th>Price (₱)</th>
                </tr>
              </thead>
              <Droppable droppableId="drop-sizes" type="SIZES">
                {(provided) => (
                  <tbody {...provided.droppableProps} ref={provided.innerRef}>
                    {selectedSizes.map((s, index) => (
                      <Draggable
                        key={`size-${s.size}`}
                        draggableId={`draggable-size-${s.size}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <tr
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border-b border-white/5 ${snapshot.isDragging ? "bg-[#242731]" : ""}`}
                          >
                            <td
                              {...provided.dragHandleProps}
                              className="cursor-grab text-center"
                            >
                              <GripVertical
                                size={16}
                                className="opacity-20 text-white mx-auto"
                              />
                            </td>
                            <td className="font-bold italic text-white">
                              {s.size}
                            </td>
                            <td>
                              <input
                                type="number"
                                required
                                min="0"
                                className="input input-xs bg-[#242731] border-white/10 text-white w-20"
                                value={s.stock}
                                onChange={(e) =>
                                  onUpdateSizeData(
                                    s.size,
                                    "stock",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                required
                                min="0"
                                className="input input-xs bg-[#242731] border-white/10 text-white w-28"
                                value={s.price}
                                onChange={(e) =>
                                  onUpdateSizeData(
                                    s.size,
                                    "price",
                                    e.target.value,
                                  )
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SizeInventorySection;
