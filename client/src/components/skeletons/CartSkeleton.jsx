import React from 'react';
import Skeleton from '../ui/Skeleton';

const CartSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-40">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3">
          <Skeleton className="h-12 w-64" /> {/* Title */}
          <Skeleton className="h-3 w-32 opacity-40" /> {/* Subtitle */}
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </header>

      <div className="space-y-12">
        {[1, 2].map((batch) => (
          <section key={batch} className="space-y-4">
            <Skeleton className="h-4 w-40 ml-2" /> {/* Batch Date */}
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div key={item} className="flex flex-col md:flex-row p-5 bg-base-100 border border-base-300 rounded-[24px] gap-4">
                  <div className="flex items-center gap-6 flex-1">
                    <Skeleton className="h-6 w-6" /> {/* Checkbox */}
                    <Skeleton className="w-20 h-20 rounded-2xl shrink-0" /> {/* Image */}
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-1/2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-10 w-28 rounded-xl" /> {/* Qty Picker */}
                    <Skeleton className="h-6 w-20" /> {/* Subtotal */}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default CartSkeleton;