import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { X, Plus, Check, GripVertical } from "lucide-react";

const CategorySection = ({ 
  categories, setCategories, selectedCategory, onSelect, 
  showAddCat, setShowAddCat, newCatName, setNewCatName, onAddCategory 
}) => {
  const removeCategory = (e, catToRemove) => {
    e.stopPropagation();
    setCategories(prev => prev.filter(c => c !== catToRemove));
    if (selectedCategory === catToRemove) onSelect("");
  };

  return (
    <div className="form-control">
      <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white mb-2 px-1">
        Category <span className="text-error font-bold">*</span>
      </label>
      <Droppable droppableId="drop-categories" direction="horizontal" type="CATEGORIES">
        {(provided) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef} 
            className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-2xl border border-white/10 min-h-[50px]"
          >
            {categories.map((cat, index) => (
              <Draggable key={`cat-${cat}`} draggableId={`draggable-cat-${cat}`} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`join bg-[#1a1c23] border border-white/10 rounded-xl overflow-hidden transition-all ${snapshot.isDragging ? "ring-2 ring-primary shadow-2xl scale-105" : ""}`}
                  >
                    <div {...provided.dragHandleProps} className="join-item px-2 flex items-center bg-white/5 cursor-grab">
                      <GripVertical size={14} className="opacity-30 text-white" />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => onSelect(cat)} 
                      className={`join-item px-4 py-1 font-bold uppercase text-[10px] transition-colors ${selectedCategory === cat ? "bg-primary text-black" : "text-white/70 hover:bg-white/5"}`}
                    >
                      {cat}
                    </button>
                    <button type="button" onClick={(e) => removeCategory(e, cat)} className="join-item px-2 text-error hover:bg-error/10 border-l border-white/5">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            <button type="button" onClick={() => setShowAddCat(!showAddCat)} className="btn btn-xs btn-circle btn-outline border-white/20 text-white/40 hover:text-white"><Plus size={14}/></button>
          </div>
        )}
      </Droppable>

{showAddCat && (
  <div className="mt-2 animate-in fade-in slide-in-from-top-1">
    <div className="join w-full max-w-[280px] border border-white/10 rounded-xl overflow-hidden">
      <input 
        type="text" 
        className={`input input-sm join-item w-full bg-[#1a1c23] text-white focus:outline-none transition-colors ${newCatName.length > 30 ? 'text-error' : ''}`} 
        placeholder="New category..." 
        value={newCatName} 
        onChange={(e) => setNewCatName(e.target.value)} 
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddCategory())} 
      />
      <button 
        type="button" 
        className="btn btn-sm btn-success join-item text-white border-none" 
        onClick={onAddCategory}
        disabled={newCatName.length > 30 || !newCatName.trim()}
      >
        <Check size={16} />
      </button>
    </div>
    <div className="flex justify-between items-center px-1 mt-1 max-w-[280px]">
       {newCatName.length > 30 && (
         <p className="text-[9px] font-black text-error uppercase italic">Too long</p>
       )}
       <span className={`text-[9px] font-bold ml-auto ${newCatName.length > 30 ? 'text-error' : 'opacity-20 text-white'}`}>
         {newCatName.length}/30
       </span>
    </div>
  </div>
)}
    </div>
  );
};

export default CategorySection;