import React from 'react';
import {
  Target,
  CheckCircle2,
  GitCommit,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
} from 'lucide-react';
import type { SprintReportData } from '../types';

interface SprintScorecardProps {
  report: SprintReportData;
}

export const SprintScorecard: React.FC<SprintScorecardProps> = ({ report }) => {
  const { summary, scope_delta } = report;

  const planned = summary.planned_story_points || 0;
  const completed = summary.completed_story_points || 0;
  const remaining = summary.remaining_story_points || 0;
  const completionRate = summary.completion_percentage || 0;

  const netScope = scope_delta.net_scope_change || 0;
  const hasScopeChange = scope_delta.points_added_mid_sprint > 0 || scope_delta.points_removed_mid_sprint > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Committed vs Completed Story Points */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sprint Progress
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <Target className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{completed}</span>
          <span className="text-sm font-medium text-slate-500">/ {planned} pts</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            style={{ width: `${Math.min(completionRate, 100)}%` }}
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              completionRate >= 100
                ? 'bg-emerald-500'
                : completionRate >= 75
                ? 'bg-blue-600'
                : 'bg-amber-500'
            }`}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
          <span>{summary.completed_items_count} of {summary.total_items_count} items done</span>
          <span className="font-semibold text-slate-700">{remaining} pts left</span>
        </div>
      </div>

      {/* 2. Completion Percentage */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Delivery Rate
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{completionRate}%</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            completionRate >= 100
              ? 'bg-emerald-100 text-emerald-800'
              : completionRate >= 70
              ? 'bg-blue-100 text-blue-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {completionRate >= 100 ? 'Target Met' : completionRate >= 70 ? 'On Track' : 'Needs Focus'}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Sprint Status: <strong className="text-slate-800">{summary.status}</strong></span>
        </div>
      </div>

      {/* 3. Scope Delta (Mid-Sprint Changes) */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Scope Delta
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
            <GitCommit className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${
            netScope > 0 ? 'text-amber-600' : netScope < 0 ? 'text-blue-600' : 'text-slate-900'
          }`}>
            {netScope > 0 ? `+${netScope}` : netScope}
          </span>
          <span className="text-sm font-medium text-slate-500">pts net change</span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs">
          {hasScopeChange ? (
            <>
              {scope_delta.points_added_mid_sprint > 0 && (
                <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  +{scope_delta.points_added_mid_sprint} added
                </span>
              )}
              {scope_delta.points_removed_mid_sprint > 0 && (
                <span className="inline-flex items-center text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  -{scope_delta.points_removed_mid_sprint} removed
                </span>
              )}
            </>
          ) : (
            <span className="text-slate-500">No scope creep detected</span>
          )}
        </div>
      </div>

      {/* 4. Sprint Timeline */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Timeline
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900">{summary.days_remaining}</span>
          <span className="text-sm font-medium text-slate-500">days left</span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>{summary.start_date ? new Date(summary.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</span>
          <span className="w-12 h-px bg-slate-200 inline-block" />
          <span>{summary.end_date ? new Date(summary.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</span>
        </div>
      </div>
    </div>
  );
};
