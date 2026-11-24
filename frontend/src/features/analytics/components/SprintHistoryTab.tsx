import React from 'react';
import { History, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';
import type { ProjectVelocityData } from '../types';

interface SprintHistoryTabProps {
  velocity: ProjectVelocityData;
}

export const SprintHistoryTab: React.FC<SprintHistoryTabProps> = ({ velocity }) => {
  // Use sprint_history_cards if available; otherwise fall back to velocity.sprints
  const historyCards = velocity.sprint_history_cards || [];

  // Prepare velocity trend bars: chronological order
  const trendItems = velocity.sprints || [];

  // Find max delivered points for height scaling
  const maxPoints = Math.max(
    ...trendItems.map((s) => s.completed_points),
    ...historyCards.map((c) => c.delivered_points),
    15
  );

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* SPRINT PERFORMANCE HISTORY */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs fade-in">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Sprint Performance History</h3>
            <History className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {historyCards.length} {historyCards.length === 1 ? 'sprint' : 'sprints'} tracked
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-6">
          How did past sprints perform? Compare planned commitments vs delivered story points.
        </p>

        {historyCards.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No sprint history available yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Complete or activate sprints in this project to see historical performance comparisons.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {historyCards.map((card) => {
              const planned = Math.max(card.planned_points, 1);
              const delivered = card.delivered_points;
              const deliveredPct = Math.min(100, Math.round((delivered / planned) * 100));

              return (
                <div
                  key={card.sprint_id}
                  className={`p-4 rounded-xl border transition-all ${
                    card.is_active
                      ? 'border-blue-200 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                      {card.sprint_name}
                      {card.is_active ? (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide">
                          Active
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wide flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                        </span>
                      )}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {formatDate(card.start_date)} → {formatDate(card.end_date)}
                    </span>
                  </div>

                  {/* Planned Bar */}
                  <div className="flex items-center gap-3 text-xs mb-1.5">
                    <span className="text-slate-500 w-16 text-[11px] font-medium">Planned</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                      <div className="bg-slate-400 h-3.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <span className="font-mono font-bold text-slate-700 w-14 text-right text-[11px]">
                      {card.planned_points} pts
                    </span>
                  </div>

                  {/* Delivered Bar */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 w-16 text-[11px] font-medium">Delivered</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-3.5 overflow-hidden">
                      <div
                        className={`${
                          card.is_active ? 'bg-blue-600' : 'bg-emerald-500'
                        } h-3.5 rounded-full bar-animate transition-all duration-700`}
                        style={{ width: `${deliveredPct}%` }}
                      ></div>
                    </div>
                    <span
                      className={`font-mono font-bold w-14 text-right text-[11px] ${
                        card.is_active ? 'text-blue-700' : 'text-emerald-700'
                      }`}
                    >
                      {card.delivered_points} pts
                    </span>
                  </div>

                  {/* Note / Delivery rate */}
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span>
                      Delivery Rate:{' '}
                      <span
                        className={`font-bold ${
                          card.delivery_rate >= 80 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {card.delivery_rate}%
                      </span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{card.note}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VELOCITY TREND LINE */}
        {trendItems.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                Velocity Trend (Points Delivered per Sprint)
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                Trend:{' '}
                <span
                  className={`font-bold ${
                    velocity.trend === 'INCREASING'
                      ? 'text-emerald-600'
                      : velocity.trend === 'DECREASING'
                      ? 'text-rose-600'
                      : 'text-slate-700'
                  }`}
                >
                  {velocity.trend}
                </span>
              </span>
            </div>

            {/* Column Bars */}
            <div className="flex items-end gap-3 sm:gap-4 h-32 pt-4 px-2">
              {trendItems.map((s, idx) => {
                const heightPct = Math.max(12, Math.round((s.completed_points / maxPoints) * 100));
                return (
                  <div key={s.sprint_id || idx} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                    <span className="text-[11px] font-bold text-slate-700 font-mono">
                      {s.completed_points}
                    </span>
                    <div className="w-full bg-slate-100 rounded-t-lg flex items-end justify-center relative overflow-hidden" style={{ height: '70%' }}>
                      <div
                        className="w-full bg-emerald-500 rounded-t-lg col-animate transition-all duration-700 hover:bg-emerald-600"
                        style={{ height: `${heightPct}%` }}
                        title={`${s.sprint_name}: ${s.completed_points} pts delivered`}
                      ></div>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate max-w-full font-medium" title={s.sprint_name}>
                      {s.sprint_name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Benchmark average line */}
            <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="w-6 border-t-2 border-dashed border-slate-400"></span>
              <span>
                Average Velocity:{' '}
                <span className="font-bold text-slate-700">{velocity.average_velocity} pts/sprint</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};