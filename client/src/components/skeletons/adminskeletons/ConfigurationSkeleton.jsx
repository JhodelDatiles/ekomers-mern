import React from "react";

const ConfigurationSkeleton = () => {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-pulse">
      {/* HEADER SKELETON */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-base-300 rounded-2xl w-14 h-14" />
          <div className="space-y-2">
            <div className="h-8 w-64 bg-base-300 rounded-lg" />
            <div className="h-3 w-40 bg-base-300 rounded opacity-50" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MAIN FORM COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Branding Asset Card */}
            <div className="h-40 bg-base-200 rounded-[32px] border border-base-300 p-6 flex items-center gap-4">
              <div className="w-24 h-24 bg-base-300 rounded-3xl" />
              <div className="space-y-2 flex-1">
                <div className="h-8 bg-base-300 rounded-xl w-full" />
                <div className="h-3 bg-base-300 rounded w-1/2 mx-auto" />
              </div>
            </div>
            {/* Store Name Card */}
            <div className="h-40 bg-base-200 rounded-[32px] border border-base-300 p-6 flex flex-col justify-end">
              <div className="h-3 w-20 bg-base-300 rounded mb-2" />
              <div className="h-12 bg-base-300 rounded-xl w-full" />
            </div>
          </div>

          {/* Description Card */}
          <div className="h-40 bg-base-200 rounded-[32px] border border-base-300 p-6">
             <div className="h-3 w-32 bg-base-300 rounded mb-4" />
             <div className="h-20 bg-base-300 rounded-xl w-full" />
          </div>

          {/* Logistics Card */}
          <div className="h-64 bg-base-200 rounded-[32px] border border-base-300 p-6 space-y-4">
             <div className="h-3 w-40 bg-base-300 rounded mb-2" />
             <div className="grid grid-cols-2 gap-4">
                <div className="h-12 bg-base-300 rounded-xl col-span-2" />
                <div className="h-12 bg-base-300 rounded-xl" />
                <div className="h-12 bg-base-300 rounded-xl" />
             </div>
          </div>
          
          {/* Big Deploy Button */}
          <div className="h-16 bg-base-300 rounded-2xl w-full" />
        </div>

        {/* SIDEBAR PREVIEW SKELETON */}
        <aside className="lg:col-span-1">
          <div className="h-3 w-32 bg-base-300 rounded mb-6 ml-2" />
          <div className="h-[500px] bg-neutral rounded-[40px] border border-white/5 p-8 flex flex-col items-center space-y-8">
            <div className="w-28 h-28 bg-white/10 rounded-3xl" />
            <div className="w-3/4 h-8 bg-white/10 rounded-lg" />
            <div className="w-full h-32 bg-black/20 rounded-3xl" />
            <div className="w-full h-24 bg-black/20 rounded-3xl" />
            <div className="w-full h-8 bg-white/5 rounded-xl" />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ConfigurationSkeleton;