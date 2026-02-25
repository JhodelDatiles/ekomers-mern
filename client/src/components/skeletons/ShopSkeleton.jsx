import React from "react";

const ShopSkeleton = () => {
  return (
    <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row gap-8 animate-pulse">
      {/* SIDEBAR SKELETON */}
      {/* <aside className="w-full md:w-64 space-y-6">
        <div className="bg-base-100 p-6 rounded-2xl border border-base-300 sticky top-24">
          <div className="w-32 h-3 bg-base-300 rounded mb-6 opacity-50" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-full h-8 bg-base-200 rounded-lg" />
            ))}
          </div>
        </div>
      </aside> */}

      {/* GRID SKELETON */}
      <main className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-base-100 rounded-[32px] border border-base-300 overflow-hidden h-[400px]">
              <div className="w-full h-48 bg-base-200" />
              <div className="p-6 space-y-4">
                <div className="w-2/3 h-4 bg-base-200 rounded" />
                <div className="w-full h-3 bg-base-200 rounded" />
                <div className="flex justify-between items-center pt-4">
                  <div className="w-20 h-6 bg-base-200 rounded-lg" />
                  <div className="w-12 h-12 bg-base-200 rounded-2xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ShopSkeleton;