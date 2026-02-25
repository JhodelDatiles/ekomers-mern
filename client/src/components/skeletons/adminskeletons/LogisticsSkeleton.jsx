import React from "react";
import { Calendar, ChevronRight, Search } from "lucide-react";

const LogisticsSkeleton = () => {
  return (
    <div className="p-6 h-[calc(100vh-100px)] overflow-hidden animate-pulse">
      {/* HEADER SKELETON */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-white/10 rounded-lg" />
          <div className="h-3 w-32 bg-white/5 rounded" />
        </div>
        <div className="h-12 w-full md:w-80 bg-white/5 rounded-full border border-white/10" />
      </header>

      {/* GROUPS SKELETON */}
      {[1, 2].map((group) => (
        <section key={group} className="mb-12 space-y-6">
          {/* Week Label */}
          <div className="flex items-center gap-4 opacity-20">
            <Calendar size={14} />
            <div className="h-3 w-24 bg-white/20 rounded" />
            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          {/* User Cards */}
          {[1, 2].map((user) => (
            <div key={user} className="bg-white/5 border border-white/5 rounded-[24px] p-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <ChevronRight size={20} className="text-white/10" />
                  <div className="h-5 w-40 bg-white/10 rounded" />
                </div>
                <div className="h-3 w-20 bg-white/5 rounded" />
              </div>
              
              {/* Table Rows Mockup */}
              <div className="mt-6 space-y-4">
                {[1, 2].map((row) => (
                  <div key={row} className="flex items-center justify-between py-2 border-t border-white/5">
                    <div className="h-3 w-16 bg-white/10 rounded" />
                    <div className="h-4 w-24 bg-white/10 rounded" />
                    <div className="h-6 w-32 bg-white/10 rounded-full" />
                    <div className="h-8 w-20 bg-white/20 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

export default LogisticsSkeleton;