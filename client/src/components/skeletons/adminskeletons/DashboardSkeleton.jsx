import React from "react";

const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white/5 rounded-[32px]" />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[450px] bg-white/5 rounded-[40px]" />
        <div className="h-[450px] bg-white/5 rounded-[40px]" />
      </div>

      {/* Low Stock Skeleton */}
      <div className="h-60 bg-white/5 rounded-[40px]" />

      {/* Logs Skeleton */}
      <div className="h-32 bg-white/5 rounded-[40px]" />
    </div>
  );
};

export default DashboardSkeleton;