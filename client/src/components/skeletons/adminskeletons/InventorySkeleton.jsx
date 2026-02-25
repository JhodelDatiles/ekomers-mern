import React from "react";
import { Boxes, Search } from "lucide-react";

const InventorySkeleton = () => {
  return (
    <div className="h-[calc(100vh-180px)] overflow-hidden pr-2 animate-pulse">
      {/* HEADER SKELETON */}
      <div className="sticky top-0 z-40 bg-base-100 pb-6 pt-2">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <div className="h-10 w-48 bg-white/10 rounded-lg" />
            <div className="h-3 w-32 bg-white/5 rounded" />
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <div className="h-12 w-full md:w-72 bg-white/5 rounded-xl border border-white/5" />
            <div className="h-12 w-32 bg-primary/20 rounded-xl" />
          </div>
        </div>
      </div>

      {/* CATEGORY SECTIONS SKELETON */}
      {[1, 2].map((section) => (
        <div key={section} className="mb-12 space-y-6">
          {/* Category Title bar */}
          <div className="flex items-center gap-4">
            <div className="h-6 w-40 bg-white/10 rounded" />
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* Product Grid/List Mockup */}
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((item) => (
              <div 
                key={item} 
                className="h-20 w-full bg-white/5 border border-white/5 rounded-2xl flex items-center px-6 gap-6"
              >
                <div className="h-10 w-10 bg-white/10 rounded-lg" /> {/* Image placeholder */}
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-white/10 rounded" />
                  <div className="h-3 w-20 bg-white/5 rounded" />
                </div>
                <div className="h-8 w-16 bg-white/10 rounded-full" /> {/* Price tag */}
                <div className="h-10 w-24 bg-white/5 rounded-lg" /> {/* Action buttons */}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InventorySkeleton;