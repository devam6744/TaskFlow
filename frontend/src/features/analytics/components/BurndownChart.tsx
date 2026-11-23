import React, { useState, useRef, useId } from 'react';
import {
  TrendingDown,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { BurndownSummary, BurndownDataPoint } from '../types';

interface BurndownChartProps {
  data: BurndownSummary;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({ data }) => {
  const [metricMode, setMetricMode] = useState<'points' | 'items'>('points');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  const series = data.series || [];
  const hasData = series.length > 0;

  // Chart dimensions
  const svgWidth = 800;
  const svgHeight = 320;
  const margin = { top: 24, right: 32, bottom: 44, left: 48 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  // Max value calculation based on mode
  const maxVal = Math.max(
    metricMode === 'points' ? data.planned_story_points : data.total_items_count,
    ...series.map((d) => (metricMode === 'points' ? d.ideal : (d.remaining_items + d.completed_items) || 0)),
    ...series.map((d) => (metricMode === 'points' ? d.actual ?? 0 : d.remaining_items ?? 0)),
    5
  );

  const getX = (index: number) => {
    if (series.length <= 1) return margin.left + chartWidth / 2;
    return margin.left + (index / (series.length - 1)) * chartWidth;
  };

  const getY = (val: number | null) => {
    if (val === null || val === undefined) return margin.top + chartHeight;
    const clamped = Math.max(0, Math.min(val, maxVal));
    return margin.top + (1 - clamped / maxVal) * chartHeight;
  };

  // Generate Ideal line path
  const idealPath = series
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.ideal)}`)
    .join(' ');

  // Generate Actual line path (only for non-null actual values)
  const actualPoints = series
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.actual !== null);

  const actualPath = actualPoints
    .map(({ d, i }, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(i)} ${getY(metricMode === 'points' ? d.actual : d.remaining_items)}`)
    .join(' ');

  // Generate Area under actual curve
  let actualAreaPath = '';
  if (actualPoints.length > 0) {
    const firstX = getX(actualPoints[0].i);
    const lastX = getX(actualPoints[actualPoints.length - 1].i);
    const bottomY = margin.top + chartHeight;
    actualAreaPath = `${actualPath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Handle mousemove across SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || series.length <= 1) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relativeX = (mouseX / rect.width) * svgWidth - margin.left;
    const step = chartWidth / (series.length - 1);
    const index = Math.round(relativeX / step);
    if (index >= 0 && index < series.length) {
      setHoverIndex(index);
    } else {
      setHoverIndex(null);
    }
  };

  const activePoint: BurndownDataPoint | null =
    hoverIndex !== null && hoverIndex >= 0 && hoverIndex < series.length
      ? series[hoverIndex]
      : null;

  // Pace styling
  const paceConfig = {
    AHEAD: {
      label: 'Ahead of Schedule',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    ON_TRACK: {
      label: 'On Track',
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      dot: 'bg-blue-500',
      icon: Sparkles,
    },
    BEHIND: {
      label: 'Behind Schedule',
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      dot: 'bg-amber-500',
      icon: Clock,
    },
    AT_RISK: {
      label: 'At Risk',
      color: 'text-rose-700 bg-rose-50 border-rose-200',
      dot: 'bg-rose-500 animate-pulse',
      icon: AlertTriangle,
    },
  }[data.pace_status || 'ON_TRACK'];

  const PaceIcon = paceConfig.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header bar */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                Sprint Burndown Chart
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${paceConfig.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${paceConfig.dot}`} />
                  <PaceIcon className="w-3 h-3" />
                  {paceConfig.label}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ideal burndown velocity versus daily actual remaining effort
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('points')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                metricMode === 'points'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Story Points
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('items')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                metricMode === 'items'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Work Items
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="p-5 relative" ref={containerRef}>
        {!hasData ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
            <Layers className="w-8 h-8 stroke-[1.5] mb-2 text-slate-300" />
            No burndown snapshot data available for this sprint.
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = margin.top + pct * chartHeight;
                const val = Math.round(maxVal * (1 - pct));
                return (
                  <g key={idx}>
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={svgWidth - margin.right}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={margin.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Day Labels on X Axis */}
              {series.map((d, i) => {
                const x = getX(i);
                const y = margin.top + chartHeight + 20;
                // Don't crowd labels if many days
                const skip = series.length > 14 && i % 2 !== 0 && i !== series.length - 1;
                if (skip) return null;

                return (
                  <g key={i}>
                    <line
                      x1={x}
                      y1={margin.top + chartHeight}
                      x2={x}
                      y2={margin.top + chartHeight + 5}
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      className={`text-[10px] ${
                        d.is_today
                          ? 'fill-blue-600 font-bold'
                          : 'fill-slate-500 font-medium'
                      }`}
                    >
                      {d.display_date}
                    </text>
                  </g>
                );
              })}

              {/* Ideal Burn Line (Dashed Slate) */}
              <path
                d={idealPath}
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2"
                strokeDasharray="5 5"
                className="transition-all duration-300"
              />

              {/* Translucent Area Under Actual */}
              {actualAreaPath && (
                <path
                  d={actualAreaPath}
                  fill={`url(#${gradientId})`}
                  className="transition-all duration-500 ease-out"
                />
              )}

              {/* Actual Line (Vibrant Blue with Glow) */}
              {actualPath && (
                <path
                  d={actualPath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  filter="url(#glow)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {/* Actual Data Points Dots */}
              {actualPoints.map(({ d, i }) => {
                const cx = getX(i);
                const cy = getY(metricMode === 'points' ? d.actual : d.remaining_items);
                const isHovered = hoverIndex === i;

                return (
                  <g key={i}>
                    {d.is_today && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="8"
                        fill="#3B82F6"
                        fillOpacity="0.2"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? '6' : '4'}
                      fill="#FFFFFF"
                      stroke="#2563EB"
                      strokeWidth={isHovered ? '3' : '2'}
                      className="transition-all duration-150 cursor-pointer"
                    />
                  </g>
                );
              })}

              {/* Interactive Hover Vertical Guide Line */}
              {hoverIndex !== null && (
                <line
                  x1={getX(hoverIndex)}
                  y1={margin.top}
                  x2={getX(hoverIndex)}
                  y2={margin.top + chartHeight}
                  stroke="#2563EB"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              )}
            </svg>

            {/* Floating Popover Tooltip Card */}
            {activePoint && hoverIndex !== null && (
              <div
                style={{
                  left: `${Math.min(
                    Math.max(16, (getX(hoverIndex) / svgWidth) * 100),
                    80
                  )}%`,
                  top: '16px',
                }}
                className="absolute pointer-events-none transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-lg shadow-xl border border-slate-700/60 text-xs space-y-1.5 z-20 transition-all duration-150 min-w-[180px]"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1 gap-2">
                  <span className="font-semibold text-slate-200">
                    {activePoint.display_date} ({activePoint.day_label})
                  </span>
                  {activePoint.is_today && (
                    <span className="bg-blue-500/30 text-blue-300 text-[10px] px-1.5 py-0.2 rounded font-medium">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                      Actual Remaining:
                    </span>
                    <span className="font-bold text-white">
                      {activePoint.actual !== null
                        ? `${metricMode === 'points' ? activePoint.actual : activePoint.remaining_items} ${metricMode === 'points' ? 'pts' : 'items'}`
                        : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                      Ideal Guideline:
                    </span>
                    <span className="font-medium text-slate-300">
                      {activePoint.ideal} {metricMode === 'points' ? 'pts' : 'items'}
                    </span>
                  </div>

                  {activePoint.actual !== null && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">Pace Variance:</span>
                      {activePoint.actual <= activePoint.ideal ? (
                        <span className="text-emerald-400 font-semibold">
                          Ahead by {(activePoint.ideal - activePoint.actual).toFixed(1)} pts
                        </span>
                      ) : (
                        <span className="text-rose-400 font-semibold">
                          Behind by {(activePoint.actual - activePoint.ideal).toFixed(1)} pts
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-blue-600 rounded-full" />
            <span className="font-medium text-slate-800">Actual Remaining</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-0.5 bg-slate-400 border-b border-dashed border-slate-400" />
            <span className="font-medium text-slate-500">Ideal Guideline</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100" />
            <span className="font-medium text-slate-600">Daily Snapshot</span>
          </div>
        </div>
      </div>
    </div>
  );
};
