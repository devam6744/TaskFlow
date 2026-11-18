import React from 'react';
import { TrendingUp, CheckCircle, ShieldCheck, Database, Zap } from 'lucide-react';

export const MetricsCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Metric 1 */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Sprint Velocity</span>
          <TrendingUp className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-white">32</span>
          <span className="text-xs text-slate-400">/ 48 points burned</span>
        </div>
        <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: '67%' }} />
        </div>
      </div>

      {/* Metric 2 */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Sprint Completion</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-white">71.4%</span>
          <span className="text-xs text-emerald-400 font-semibold">+12% vs last cycle</span>
        </div>
        <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '71.4%' }} />
        </div>
      </div>

      {/* Metric 3 */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Security & Tokens</span>
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-white">Zero-Trust</span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>HttpOnly Rotation Active</span>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Supabase PG 17</span>
          <Database className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-extrabold text-white">32 ms</span>
          <span className="text-xs text-slate-400">query latency</span>
        </div>
        <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
          <Zap className="w-3.5 h-3.5" />
          <span>PostgreSQL pool healthy</span>
        </div>
      </div>
    </div>
  );
};
