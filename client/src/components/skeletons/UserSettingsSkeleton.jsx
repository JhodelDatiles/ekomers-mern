import React from 'react';
import Skeleton from '../ui/Skeleton';

export const UserSettingsSkeleton = () => {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <header className="flex items-center gap-6 bg-base-200 p-8 rounded-[32px] border border-base-300">
        <Skeleton className="w-24 h-24 rounded-3xl shrink-0" />
        <div className="space-y-3 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-3 w-32 opacity-40" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-base-100 border border-base-300 rounded-[32px] p-8 space-y-6">
           <Skeleton className="h-4 w-32" />
           <div className="space-y-4">
             <Skeleton className="h-14 w-full rounded-xl" />
             <Skeleton className="h-14 w-full rounded-xl" />
           </div>
        </div>
        <div className="space-y-6">
          <div className="bg-base-100 border border-base-300 rounded-[32px] p-8 space-y-6">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
};

export default UserSettingsSkeleton;