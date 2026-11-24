import React from 'react';
import { Layers, AlertCircle, PieChart } from 'lucide-react';
import type { SprintReportData } from '../types';

interface WorkBreakdownTabProps {
  report: SprintReportData;
}

export const WorkBreakdownTab: React.FC<WorkBreakdownTabProps> = ({ report }) => {
  const { type_breakdown, priority_breakdown, points_breakdown, summary } = report;

  const totalItems = Math.max(summary.total_items_count || 1, 1);
  const totalPoints = Math.max(
    points_breakdown?.total_committed_points || summary.total_story_points || summary.planned_story_points || 1,
    1
  );

  // Type Breakdown Items
  const typesConfig = [
    { key: 'STORY', label: 'Stories', color: 'bg-blue-600', textColor: 'text-blue-700' },
    { key: 'BUG', label: 'Bugs', color: 'bg-rose-500', textColor: 'text-rose-700' },
    { key: 'TASK', label: 'Tasks', color: 'bg-amber-500', textColor: 'text-amber-700' },
    { key: 'IMPROVEMENT', label: 'Improvements', color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  ];

  // Priority Breakdown Items
  const prioritiesConfig = [
    { key: 'URGENT', label: 'Urgent', dotColor: 'bg-rose-500', barColor: 'bg-rose-500', textColor: 'text-rose-700' },
    { key: 'HIGH', label: 'High', dotColor: 'bg-amber-500', barColor: 'bg-amber-500', textColor: 'text-amber-700' },
    { key: 'MEDIUM', label: 'Medium', dotColor: 'bg-blue-500', barColor: 'bg-blue-500', textColor: 'text-blue-700' },
    { key: 'LOW', label: 'Low', dotColor: 'bg-slate-400', barColor: 'bg-slate-400', textColor: 'text-slate-600' },
  ];

  // Points Delivered vs Active vs To Do
  const donePoints = points_breakdown?.done_points || summary.completed_story_points || 0;
  const activePoints = points_breakdown?.active_points || 0;
  const todoPoints = Math.max(0, totalPoints - donePoints - activePoints);

  const donePct = Math.round((donePoints / totalPoints) * 100);
  const activePct = Math.round((activePoints / totalPoints) * 100);
  const todoPct = Math.max(0, 100 - donePct - activePct);

  return (
    <div className="space-y-6">
      {/* ================= TOP ROW: BY TYPE & BY PRIORITY ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TASKS BY TYPE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs fade-in">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900">Tasks by Type</h3>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-[11px] text-slate-400 mb-5">What kind of work is in this sprint?</p>

          <div className="space-y-4">
            {typesConfig.map((cfg) => {
              const item = type_breakdown?.[cfg.key] || { total: 0, completed: 0, points: 0 };
              const pct = Math.round((item.total / totalItems) * 100);
              return (
                <div key={cfg.key}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-700">{cfg.label}</span>
                    <span className="text-slate-900 font-mono">
                      {item.total} {item.total === 1 ? 'task' : 'tasks'} · {item.points} {item.points === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`${cfg.color} h-3 rounded-full bar-animate transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TASKS BY PRIORITY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs fade-in delay-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-900">Tasks by Priority</h3>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-[11px] text-slate-400 mb-5">Are high-priority items getting done first?</p>

          <div className="space-y-4">
            {prioritiesConfig.map((cfg) => {
              const item = priority_breakdown?.[cfg.key] || { total: 0, completed: 0, points: 0 };
              const completionPct = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
              const isAllDone = item.total > 0 && item.completed === item.total;

              return (
                <div key={cfg.key}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className={`${cfg.textColor} flex items-center gap-1.5`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`}></span> {cfg.label}
                    </span>
                    <span className="text-slate-900">
                      {item.total} {item.total === 1 ? 'task' : 'tasks'} ·{' '}
                      {isAllDone ? (
                        <span className="text-emerald-600 font-bold">Done ✓</span>
                      ) : (
                        <span className="text-slate-600">
                          {item.completed} of {item.total} Done
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className={`${
                        isAllDone ? 'bg-emerald-500' : cfg.barColor
                      } h-3 rounded-full bar-animate transition-all duration-700`}
                      style={{ width: `${completionPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ROW: STORY POINTS DELIVERED VS REMAINING ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs fade-in delay-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-900">Story Points Delivered vs Remaining</h3>
          <PieChart className="w-4 h-4 text-emerald-600" />
        </div>
        <p className="text-[11px] text-slate-400 mb-5">Visual split of completed work against what's left</p>

        {/* Multi-segment stacked bar */}
        <div className="flex items-center gap-1 h-10 rounded-xl overflow-hidden bg-slate-100 p-0.5">
          {donePoints > 0 && (
            <div
              className="bg-emerald-500 h-full rounded-lg flex items-center justify-center transition-all duration-700 min-w-16"
              style={{ width: `${donePct}%` }}
              title={`${donePoints} story points completed`}
            >
              <span className="text-[11px] font-bold text-white px-2 truncate">
                {donePoints} pts Done
              </span>
            </div>
          )}

          {activePoints > 0 && (
            <div
              className="bg-blue-500 h-full rounded-lg flex items-center justify-center transition-all duration-700 min-w-16"
              style={{ width: `${activePct}%` }}
              title={`${activePoints} story points active (In Progress / Review)`}
            >
              <span className="text-[11px] font-bold text-white px-2 truncate">
                {activePoints} pts Active
              </span>
            </div>
          )}

          {todoPoints > 0 && (
            <div
              className="bg-slate-200 h-full rounded-lg flex items-center justify-center transition-all duration-700 min-w-16"
              style={{ width: `${todoPct}%` }}
              title={`${todoPoints} story points not yet started`}
            >
              <span className="text-[11px] font-bold text-slate-600 px-2 truncate">
                {todoPoints} pts To Do
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2.5 font-mono">
          <span>0 pts</span>
          <span className="font-semibold text-slate-600">Total Committed: {totalPoints} pts</span>
        </div>
      </div>
    </div>
  );
};