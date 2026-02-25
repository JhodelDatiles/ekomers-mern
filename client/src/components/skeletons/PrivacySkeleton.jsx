import React from "react";

const PrivacySkeleton = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
      {/* Security Credentials Card Skeleton */}
      <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 h-[400px] flex flex-col">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-6 h-6 bg-white/10 rounded-lg" />
          <div className="w-32 h-6 bg-white/10 rounded-lg" />
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="w-20 h-3 bg-white/10 rounded" />
            <div className="w-full h-12 bg-white/5 rounded-xl" />
          </div>
          <div className="space-y-2">
            <div className="w-20 h-3 bg-white/10 rounded" />
            <div className="w-full h-12 bg-white/5 rounded-xl" />
          </div>
          <div className="w-full h-12 bg-white/10 rounded-xl mt-4" />
        </div>
      </div>

      {/* Danger Zone Card Skeleton */}
      <div className="bg-error/5 border border-error/10 rounded-[32px] p-8 h-[400px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 bg-error/20 rounded-lg" />
            <div className="w-24 h-6 bg-error/20 rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="w-full h-3 bg-error/10 rounded" />
            <div className="w-3/4 h-3 bg-error/10 rounded" />
          </div>
        </div>
        <div className="w-full h-14 bg-error/20 rounded-xl border border-error/30" />
      </div>
    </div>
  );
};

export default PrivacySkeleton;