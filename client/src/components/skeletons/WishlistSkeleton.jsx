import React from 'react';
import Skeleton from '../ui/Skeleton';

const WishlistSkeleton = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-6">
      {/* HEADER & SEARCH SKELETON */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64" /> {/* Title */}
          <Skeleton className="h-3 w-32 opacity-50" /> {/* Subtitle */}
        </div>
        <Skeleton className="h-12 w-full md:w-72 rounded-2xl" /> {/* Search Bar */}
      </div>

      {/* TIMELINE CONTENT SKELETON */}
      <div className="flex-1 overflow-hidden pr-2">
        <div className="space-y-12">
          {[1, 2].map((section) => (
            <section key={section} className="space-y-6">
              {/* DATE HEADER SKELETON */}
              <div className="flex items-center gap-4 py-2">
                <Skeleton className="w-4 h-4 rounded" /> {/* Icon */}
                <Skeleton className="h-3 w-40" /> {/* Date text */}
                <div className="h-[1px] bg-base-300 flex-1 opacity-10"></div>
              </div>

              {/* PRODUCT GRID SKELETON */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3].map((card) => (
                  <div key={card} className="space-y-4">
                    {/* The Card Body */}
                    <Skeleton className="h-64 w-full rounded-[32px]" /> 
                    {/* Title & Price lines */}
                    <div className="px-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/4 opacity-50" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistSkeleton;