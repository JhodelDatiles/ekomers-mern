import React from 'react';
import Skeleton from '../ui/Skeleton';

const AddressSkeletonList = () => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {[1, 2].map((i) => (
        <div key={i} className="p-6 bg-base-200/50 rounded-[32px] border border-white/5 flex justify-between items-center">
          <div className="flex gap-6 items-center">
            {/* Icon Square */}
            <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
            <div className="space-y-3">
              {/* Name */}
              <Skeleton className="h-6 w-48" />
              {/* Address Line */}
              <Skeleton className="h-3 w-64 opacity-50" />
              {/* Phone */}
              <Skeleton className="h-3 w-32 opacity-30" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AddressSkeletonList;