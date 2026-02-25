import React from 'react';
import Skeleton from '../ui/Skeleton';

const OrderManifestSkeleton = () => {
  return (
    <div className="space-y-4 w-full">
      {/* Header Skeleton */}
      <div className="mb-8 space-y-3">
        <Skeleton className="h-10 w-64" /> {/* "Orders Manifest" Title */}
        <div className="flex gap-4 border-b border-white/5 pb-2">
          <Skeleton className="h-4 w-16" /> <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" /> <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* List Skeletons - Generating 3 cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-base-200/40 border border-white/5 rounded-[32px] p-6 flex items-center justify-between shadow-xl">
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" /> {/* ID Hash */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" /> {/* Date */}
              <Skeleton className="h-3 w-32 opacity-50" /> {/* Time */}
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-full" /> {/* Status Badge */}
        </div>
      ))}
    </div>
  );
};

export default OrderManifestSkeleton;