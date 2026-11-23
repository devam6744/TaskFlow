import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
} from 'lucide-react';
import type { ProjectVelocityData, VelocitySprintItem } from '../types';

interface VelocityChartProps {
  data: ProjectVelocityData;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({ data }) => {
  const [hoveredSprint, setHoveredSprint] = useState<VelocitySprintItem | null>(null);

  const sprints = data.sprints || [];
  const hasSprints = sprints.length > 0;

  // Max value calculation for Y axis scaling
  const maxPts = Math.max(
    ...sprints.map((s) => Math.max(s.planned_points, s.completed_points)),
    data.average_velocity || 10,
    10
  );

  const trendConfig = {
    INCREASING: {
      label: 'Increasing Trend',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      icon: TrendingUp,
    },
    STABLE: {
      label: 'Stable Velocity',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      icon: Minus,
    },
    DECREASING: {
      label: 'Decreasing Trend',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      icon: TrendingDown,
    },
  }[data.trend || 'STABLE'];

  const TrendIcon = trendConfig.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              Team Velocity History
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${trendConfig.color}`}>
                <TrendIcon className="w-3.5 h-3.5" />
                {trendConfig.label}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Completed story points over past sprints with historical capacity benchmark
            </p>
          </div>
        </div>

        {/* Average Badge */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <Award className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-slate-600">Average Velocity:</span>
          <span className="text-sm font-bold text-slate-900">{data.average_velocity} pts</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-6">
        {!hasSprints ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
            <BarChart3 className="w-8 h-8 stroke-[1.5] mb-2 text-slate-300" />
            No completed sprints found for velocity analysis yet.
            <span className="text-xs text-slate-400 mt-1">Complete a sprint to unlock team velocity trends.</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visual Bars Container */}
            <div className="relative h-64 flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 border-b border-slate-200">
              {/* Benchmark Line (Average Velocity) */}
              {data.average_velocity > 0 && (
                <div
                  style={{ bottom: `${(data.average_velocity / maxPts) * 100}%` }}
                  className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400 z-10 pointer-events-none flex items-center justify-end pr-2 transition-all duration-500"
                >
                  <span className="bg-amber-100/90 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded -translate-y-1/2 shadow-xs">
                    Avg: {data.average_velocity} pts
                  </span>
                </div>
              )}

              {/* Grouped Bars per Sprint */}
              {sprints.map((s) => {
                const plannedH = Math.max(4, (s.planned_points / maxPts) * 100);
                const completedH = Math.max(4, (s.completed_points / maxPts) * 100);
                const isHovered = hoveredSprint?.sprint_id === s.sprint_id;

                return (
                  <div
                    key={s.sprint_id}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                    onMouseEnter={() => setHoveredSprint(s)}
                    onMouseLeave={() => setHoveredSprint(null)}
                  >
                    {/* Completion rate bubble on hover */}
                    <div className="mb-2 text-[11px] font-bold text-slate-700 transition-opacity">
                      {s.completed_points} pts
                    </div>

                    {/* Bar pair */}
                    <div className="w-full max-w-[56px] flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                      {/* Planned Bar */}
                      <div
                        style={{ height: `${plannedH}%` }}
                        className="w-1/2 bg-slate-200 rounded-t-sm transition-all duration-500 group-hover:bg-slate-300"
                        title={`Planned: ${s.planned_points} pts`}
                      />

                      {/* Completed Bar */}
                      <div
                        style={{ height: `${completedH}%` }}
                        className={`w-1/2 rounded-t-sm transition-all duration-500 ${
                          isHovered ? 'ring-2 ring-blue-400' : ''
                        } ${
                          s.completion_rate >= 100
                            ? 'bg-emerald-600 group-hover:bg-emerald-500'
                            : s.completion_rate >= 75
                            ? 'bg-blue-600 group-hover:bg-blue-500'
                            : 'bg-amber-500 group-hover:bg-amber-400'
                        }`}
                        title={`Completed: ${s.completed_points} pts (${s.completion_rate}%)`}
                      />
                    </div>

                    {/* Sprint Name below */}
                    <span className="mt-3 text-[11px] font-medium text-slate-600 truncate max-w-full text-center group-hover:text-blue-600 transition-colors">
                      {s.sprint_name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Interactive Tooltip Card on Hover */}
            {hoveredSprint && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{hoveredSprint.sprint_name}</span>
                  {hoveredSprint.completed_at && (
                    <span className="text-slate-500">
                      Completed on {new Date(hoveredSprint.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-600">
                    Planned: <strong className="text-slate-900">{hoveredSprint.planned_points} pts</strong>
                  </span>
                  <span className="text-slate-600">
                    Completed: <strong className="text-blue-600">{hoveredSprint.completed_points} pts</strong>
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    hoveredSprint.completion_rate >= 100
                      ? 'bg-emerald-100 text-emerald-800'
                      : hoveredSprint.completion_rate >= 75
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {hoveredSprint.completion_rate}% Delivered
                  </span>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-slate-200" />
                <span className="font-medium text-slate-600">Planned Committed Points</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-blue-600" />
                <span className="font-medium text-slate-800">Completed Delivered Points</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-0.5 border-t-2 border-dashed border-amber-400" />
                <span className="font-medium text-amber-700">Average Velocity Benchmark</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
