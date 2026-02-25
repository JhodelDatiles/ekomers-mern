import React from 'react';
import Skeleton from '../ui/Skeleton';

export const DashboardOverviewSkeleton = () => {
  return (
    <div className="space-y-10">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-3 w-40 opacity-40" />
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-[32px]" />
        <Skeleton className="h-32 rounded-[32px]" />
        <Skeleton className="h-32 rounded-[32px]" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end px-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="bg-base-100 rounded-[32px] border border-base-300 p-6">
           <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-base-300 last:border-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverviewSkeleton;