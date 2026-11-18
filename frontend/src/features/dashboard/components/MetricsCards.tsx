import React from 'react';
import { TrendingUp, CheckCircle2, Layers, Users } from 'lucide-react';

export const MetricsCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Metric 1 */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Sprint Velocity</span>
          <TrendingUp className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">32</span>
          <span className="text-xs text-slate-500">/ 48 points burned</span>
        </div>
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: '67%' }} />
        </div>
      </div>

      {/* Metric 2 */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Sprint Progress</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">68%</span>
          <span className="text-xs text-emerald-600 font-semibold">+8% this week</span>
        </div>
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '68%' }} />
        </div>
      </div>

      {/* Metric 3 */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Active Work Items</span>
          <Layers className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">14</span>
          <span className="text-xs text-slate-500">tickets in cycle</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span>7 completed • 4 in progress</span>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Team Capacity</span>
          <Users className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">6 Devs</span>
          <span className="text-xs text-slate-500">assigned</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
          <span className="text-emerald-600 font-semibold">100% capacity utilized</span>
        </div>
      </div>
    </div>
  );
};
