import React from 'react';
import Skeleton from '../ui/Skeleton';

const CheckoutSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-8 space-y-6">
        <Skeleton className="h-40 w-full rounded-[32px]" /> {/* Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-[24px]" /> {/* Recipient */}
          <Skeleton className="h-28 rounded-[24px]" /> {/* Contact */}
        </div>
        <Skeleton className="h-48 rounded-[24px]" /> {/* Address Box */}
      </div>
      <div className="lg:col-span-4">
        <div className="bg-primary/10 rounded-[40px] p-10 space-y-8">
          <Skeleton className="h-8 w-32 bg-primary/20" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full bg-primary/20" />
            <Skeleton className="h-4 w-full bg-primary/20" />
            <Skeleton className="h-4 w-2/3 bg-primary/20" />
          </div>
          <Skeleton className="h-24 w-full rounded-[28px] bg-primary/30" />
        </div>
      </div>
    </div>
  );
};

export default CheckoutSkeleton;