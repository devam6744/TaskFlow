import React from 'react';

export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3 relative overflow-hidden"
          >
            <div className="h-4 w-24 bg-slate-200 rounded-sm" />
            <div className="h-8 w-16 bg-slate-200 rounded-md" />
            <div className="h-3 w-32 bg-slate-100 rounded-sm" />
            {/* Shimmer gradient line */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite]" />
          </div>
        ))}
      </div>

      {/* Main Chart Skeleton */}
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded-sm" />
            <div className="h-3 w-64 bg-slate-100 rounded-sm" />
          </div>
          <div className="h-8 w-32 bg-slate-100 rounded-md" />
        </div>
        <div className="h-72 w-full bg-slate-50 border border-dashed border-slate-200 rounded-lg flex items-end justify-between p-6 gap-3">
          {[40, 75, 60, 90, 50, 70, 45, 80, 65, 30, 20].map((h, idx) => (
            <div
              key={idx}
              style={{ height: `${h}%` }}
              className="flex-1 bg-slate-200/60 rounded-t-sm"
            />
          ))}
        </div>
      </div>

      {/* Two Column Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded-sm" />
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-12 bg-slate-50 border border-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded-sm" />
          <div className="h-48 bg-slate-50 border border-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  );
};
