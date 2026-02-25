import React from "react";

const UserManagementSkeleton = () => {
  return (
    <div className="h-[calc(100vh-120px)] overflow-hidden pr-2 animate-pulse">
      {/* HEADER SKELETON */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <div className="h-10 w-64 bg-base-300 rounded-xl mb-2" />
          <div className="h-3 w-32 bg-base-300 rounded opacity-50" />
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          {[1, 2].map((i) => (
            <div key={i} className="bg-base-200/50 px-6 py-4 rounded-[2rem] border border-base-300 min-w-[120px] flex flex-col items-center gap-2">
              <div className="h-2 w-12 bg-base-300 rounded" />
              <div className="h-8 w-10 bg-base-300 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* SEARCH/FILTER SKELETON */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="h-12 flex-1 bg-base-200/50 rounded-2xl border border-base-300" />
        <div className="h-12 w-40 bg-base-200/50 rounded-2xl border border-base-300" />
      </div>

      {/* TABLE SKELETON */}
      <div className="bg-base-100 border border-base-300 rounded-[2.5rem] overflow-hidden">
        <div className="bg-base-200/40 h-14 w-full border-b border-base-300" />
        <div className="p-6 space-y-6">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between py-2 border-b border-base-200 last:border-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-base-300 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-base-300 rounded" />
                  <div className="h-3 w-32 bg-base-300 rounded opacity-50" />
                </div>
              </div>
              <div className="hidden md:block space-y-2">
                <div className="h-3 w-40 bg-base-300 rounded" />
                <div className="h-2 w-20 bg-base-300 rounded opacity-50" />
              </div>
              <div className="h-6 w-20 bg-base-300 rounded-full" />
              <div className="h-8 w-8 bg-base-300 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagementSkeleton;