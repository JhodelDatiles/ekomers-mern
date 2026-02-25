import React from "react";

const DashboardSkeleton = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)] bg-base-200 animate-pulse">
      {/* SIDEBAR SKELETON */}
      <aside className="w-full md:w-72 bg-base-100 border-r border-base-300">
        <div className="p-6 border-b border-base-200">
          <div className="w-24 h-2 bg-base-200 rounded mb-2" />
          <div className="w-40 h-6 bg-base-200 rounded-lg" />
        </div>
        <nav className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-full h-12 bg-base-200 rounded-xl" />
          ))}
          <div className="divider opacity-50 pt-4"></div>
          <div className="w-full h-10 bg-error/5 rounded-xl" />
        </nav>
      </aside>

      {/* MAIN CONTENT SKELETON */}
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-6xl mx-auto bg-base-100 p-8 rounded-3xl border border-base-300 min-h-full">
          {/* Header placeholder */}
          <div className="flex items-center gap-4 mb-10">
            <div className="h-10 w-2 bg-base-200 rounded-full" />
            <div className="w-48 h-8 bg-base-200 rounded-lg" />
          </div>
          {/* Content lines */}
          <div className="space-y-4">
            <div className="w-full h-32 bg-base-200/50 rounded-2xl" />
            <div className="w-full h-64 bg-base-200/50 rounded-2xl" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardSkeleton;