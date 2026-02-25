import React from 'react';

const SalesReportSkeleton = () => {
  return (
    <div className="space-y-10 animate-pulse">
      {/* HEADER SKELETON */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-3">
          <div className="h-12 w-64 bg-base-300 rounded-xl"></div>
          <div className="h-3 w-40 bg-base-300 rounded-full opacity-50"></div>
        </div>
        <div className="h-12 w-32 bg-base-300 rounded-2xl"></div>
      </header>

      {/* STATS SKELETON */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-base-200 border border-base-300 p-6 rounded-[32px] h-32 relative overflow-hidden">
            <div className="flex justify-between mb-4">
              <div className="w-10 h-10 bg-base-300 rounded-2xl"></div>
              <div className="w-12 h-5 bg-base-300 rounded-lg"></div>
            </div>
            <div className="w-20 h-3 bg-base-300 rounded-full mb-2"></div>
            <div className="w-32 h-8 bg-base-300 rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* CHART SKELETON */}
      <div className="bg-base-200 border border-base-300 p-8 rounded-[40px] h-[450px] flex flex-col justify-end gap-4">
        <div className="w-48 h-4 bg-base-300 rounded-full mb-8 self-start"></div>
        
        {/* Mocking the bars with different heights */}
        <div className="flex items-end justify-between gap-4 h-full px-4">
          {[60, 40, 80, 50, 90, 70, 45, 85, 30, 95].map((height, i) => (
            <div 
              key={i} 
              className="bg-base-300 rounded-t-xl w-full" 
              style={{ height: `${height}%`, opacity: (i + 1) / 10 }}
            ></div>
          ))}
        </div>
        
        {/* X-Axis labels skeleton */}
        <div className="flex justify-between gap-4 mt-4">
           {[1,2,3,4,5].map(i => (
             <div key={i} className="w-10 h-2 bg-base-300 rounded-full"></div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default SalesReportSkeleton;