import React, { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  Award,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import type { SprintReportData } from '../types';

interface SprintPulseTabProps {
  report: SprintReportData;
}

export const SprintPulseTab: React.FC<SprintPulseTabProps> = ({ report }) => {
  const { summary, status_breakdown, bugs_summary, blocked_count = 0 } = report;

  // 1. Completion Percentage Math
  const totalItems = summary.total_items_count || 1;
  const completedItems = summary.completed_items_count || 0;
  const inProgressItems =
    (status_breakdown?.IN_PROGRESS?.count || 0) + (status_breakdown?.IN_REVIEW?.count || 0);
  const notStartedItems = status_breakdown?.TODO?.count || 0;

  const completionPct = Math.min(100, Math.round((completedItems / totalItems) * 100));

  // Circular ring calculation (r=40 -> C=251.2)
  const circumference = 251.2;
  const strokeOffset = circumference - (circumference * completionPct) / 100;

  // 2. Format Dates
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // 3. Burndown chart SVG interactive state
  const series = summary.series || [];
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  // SVG coordinates math
  const svgWidth = 700;
  const svgHeight = 180;
  const padLeft = 50;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 25;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(summary.planned_story_points || 1, summary.total_story_points || 1, 10);

  const getCoord = (idx: number, val: number | null) => {
    const x = padLeft + (idx / Math.max(series.length - 1, 1)) * chartW;
    const y = val === null ? padTop + chartH : padTop + chartH - (val / maxVal) * chartH;
    return { x, y };
  };

  // Points for ideal line
  const idealPoints = series
    .map((s, idx) => {
      const { x, y } = getCoord(idx, s.ideal);
      return `${x},${y}`;
    })
    .join(' ');

  // Points for actual polyline (only for non-future / non-null points)
  const actualItems = series.filter((s) => s.actual !== null);
  const actualPoints = actualItems
    .map((s) => {
      const idx = series.indexOf(s);
      const { x, y } = getCoord(idx, s.actual);
      return `${x},${y}`;
    })
    .join(' ');

  // Gradient area underneath actual
  let areaPolygon = '';
  if (actualItems.length > 0) {
    const firstCoord = getCoord(0, actualItems[0].actual);
    const lastCoord = getCoord(actualItems.length - 1, actualItems[actualItems.length - 1].actual);
    areaPolygon = `${firstCoord.x},${padTop + chartH} ${actualPoints} ${lastCoord.x},${padTop + chartH}`;
  }

  // Handle Burndown hover
  const handleBurnMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (series.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, relX / rect.width));
    const idx = Math.min(series.length - 1, Math.round(pct * (series.length - 1)));
    setHoverIndex(idx);
    setHoverX(relX);
  };

  const handleBurnMouseLeave = () => {
    setHoverIndex(null);
  };

  // Pace badge helper
  const getPaceBadge = () => {
    switch (summary.pace_status) {
      case 'AHEAD':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Ahead of Schedule
          </span>
        );
      case 'BEHIND':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Behind Schedule
          </span>
        );
      case 'AT_RISK':
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            At Risk
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            On Track
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= TOP ROW: COMPLETION RING + 4 KPI TILES ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* SPRINT COMPLETION RING */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lift fade-in">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Sprint Completion</span>
            <CheckCircle2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#2563eb"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  strokeDashoffset={strokeOffset}
                  className="ring-animate"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-900">{completionPct}%</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Done</span>
              </div>
            </div>
            <div className="space-y-2.5 text-xs flex-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                <span className="text-slate-600 font-medium">Completed</span>
                <span className="font-bold text-slate-900 ml-auto">
                  {completedItems} / {totalItems}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className="text-slate-600 font-medium">In Progress</span>
                <span className="font-bold text-slate-900 ml-auto">{inProgressItems}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0"></span>
                <span className="text-slate-600 font-medium">Not Started</span>
                <span className="font-bold text-slate-900 ml-auto">{notStartedItems}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 KEY SPRINT METRIC TILES */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Card 1: Story Points */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lift fade-in delay-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Story Points</span>
                <Award className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {summary.completed_story_points}{' '}
                <span className="text-xs font-semibold text-slate-400">
                  / {summary.total_story_points || summary.planned_story_points} pts
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full bar-animate"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (summary.completed_story_points /
                          (summary.total_story_points || summary.planned_story_points || 1)) *
                          100
                      )
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Card 2: Days Left */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lift fade-in delay-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Days Left</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1">{summary.days_remaining}</div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-mono truncate">
              {formatDate(summary.start_date)} → {formatDate(summary.end_date)}
            </div>
          </div>

          {/* Card 3: Bugs Open */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lift fade-in delay-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bugs Open</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div
                className={`text-2xl font-black mt-1 ${
                  (bugs_summary?.total || 0) > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {bugs_summary?.total || 0}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              {(bugs_summary?.total || 0) > 0 ? (
                <span>
                  {bugs_summary?.high || 0} High · {bugs_summary?.medium || 0} Medium
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold">All Clear</span>
              )}
            </div>
          </div>

          {/* Card 4: Blocked */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs lift fade-in delay-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Blocked</span>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div
                className={`text-2xl font-black mt-1 ${
                  blocked_count > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {blocked_count}
              </div>
            </div>
            <div className="text-[11px] mt-2">
              {blocked_count > 0 ? (
                <span className="text-rose-600 font-semibold">Needs Attention</span>
              ) : (
                <span className="text-emerald-600 font-semibold">All Clear</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ROW: BURNDOWN CHART + TASK FLOW STRIP ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* BURNDOWN SPARKLINE CHART */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs fade-in delay-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Sprint Burndown</h3>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Remaining story points over time</p>
            </div>
            {getPaceBadge()}
          </div>

          {/* SVG Interactive Container */}
          <div
            className="relative h-48 w-full select-none cursor-crosshair"
            onMouseMove={handleBurnMouseMove}
            onMouseLeave={handleBurnMouseLeave}
          >
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = padTop + chartH * (1 - pct);
                const val = Math.round(maxVal * pct);
                return (
                  <g key={i}>
                    <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={padLeft - 8} y={y + 3} fontSize="10" fill="#94a3b8" textAnchor="end" className="font-mono">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Baseline bottom line */}
              <line
                x1={padLeft}
                y1={padTop + chartH}
                x2={svgWidth - padRight}
                y2={padTop + chartH}
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              {/* Ideal guide line (dashed) */}
              {idealPoints && (
                <polyline
                  points={idealPoints}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                />
              )}

              {/* Actual area fill */}
              {areaPolygon && <polygon points={areaPolygon} fill="url(#burnGrad)" />}

              {/* Actual remaining sparkline */}
              {actualPoints && (
                <polyline
                  points={actualPoints}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="spark-line"
                />
              )}

              {/* Data dots on actual line */}
              {actualItems.map((s) => {
                const idx = series.indexOf(s);
                const { x, y } = getCoord(idx, s.actual);
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={hoverIndex === idx ? 6 : 4}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all duration-150"
                  />
                );
              })}

              {/* Today vertical marker line */}
              {series.map((s, idx) => {
                if (!s.is_today) return null;
                const { x } = getCoord(idx, 0);
                return (
                  <g key={`today-${idx}`}>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={padTop + chartH}
                      stroke="#2563eb"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                      opacity="0.6"
                    />
                    <text
                      x={x}
                      y={svgHeight - 6}
                      fontSize="9"
                      fill="#2563eb"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      Today
                    </text>
                  </g>
                );
              })}

              {/* X Axis Date labels (sample 4 labels) */}
              {series.length > 0 &&
                [0, Math.floor(series.length / 3), Math.floor((2 * series.length) / 3), series.length - 1].map(
                  (idx) => {
                    const s = series[idx];
                    if (!s) return null;
                    const { x } = getCoord(idx, 0);
                    return (
                      <text
                        key={`lbl-${idx}`}
                        x={x}
                        y={svgHeight - 6}
                        fontSize="9"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        {s.display_date}
                      </text>
                    );
                  }
                )}

              {/* Interactive Crosshair vertical line */}
              {hoverIndex !== null && (
                <line
                  x1={getCoord(hoverIndex, 0).x}
                  y1={padTop}
                  x2={getCoord(hoverIndex, 0).x}
                  y2={padTop + chartH}
                  stroke="#0f172a"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.8"
                />
              )}
            </svg>

            {/* Hover Tooltip */}
            {hoverIndex !== null && series[hoverIndex] && (
              <div
                className="absolute top-2 pointer-events-none bg-slate-900 text-white text-[11px] font-mono px-3 py-2 rounded-lg shadow-xl z-30 transition-transform"
                style={{
                  left: `${Math.min(window.innerWidth > 600 ? 500 : 250, Math.max(10, hoverX - 70))}px`,
                }}
              >
                <div className="font-bold text-slate-200">{series[hoverIndex].display_date} ({series[hoverIndex].day_label})</div>
                <div className="text-blue-300">
                  Remaining:{' '}
                  <span className="font-bold">
                    {series[hoverIndex].actual !== null ? `${series[hoverIndex].actual} pts` : '—'}
                  </span>
                </div>
                <div className="text-slate-400">
                  Ideal: <span className="font-semibold">{series[hoverIndex].ideal} pts</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TASK STATUS FLOW STRIP */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs fade-in delay-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Task Flow</h3>
            <p className="text-[11px] text-slate-400 mb-5">Where are your sprint tasks right now?</p>

            <div className="space-y-4">
              {/* Stage: Done */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Done
                  </span>
                  <span className="font-bold text-slate-900">{status_breakdown?.DONE?.count || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-5 rounded-full bar-animate flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all"
                    style={{
                      width: `${Math.max(
                        10,
                        Math.round(((status_breakdown?.DONE?.count || 0) / totalItems) * 100)
                      )}%`,
                    }}
                  >
                    {Math.round(((status_breakdown?.DONE?.count || 0) / totalItems) * 100)}%
                  </div>
                </div>
              </div>

              {/* Stage: In Review */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> In Review
                  </span>
                  <span className="font-bold text-slate-900">{status_breakdown?.IN_REVIEW?.count || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-purple-500 h-5 rounded-full bar-animate flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all"
                    style={{
                      width: `${Math.max(
                        8,
                        Math.round(((status_breakdown?.IN_REVIEW?.count || 0) / totalItems) * 100)
                      )}%`,
                    }}
                  >
                    {Math.round(((status_breakdown?.IN_REVIEW?.count || 0) / totalItems) * 100)}%
                  </div>
                </div>
              </div>

              {/* Stage: In Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> In Progress
                  </span>
                  <span className="font-bold text-slate-900">{status_breakdown?.IN_PROGRESS?.count || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-5 rounded-full bar-animate flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all"
                    style={{
                      width: `${Math.max(
                        8,
                        Math.round(((status_breakdown?.IN_PROGRESS?.count || 0) / totalItems) * 100)
                      )}%`,
                    }}
                  >
                    {Math.round(((status_breakdown?.IN_PROGRESS?.count || 0) / totalItems) * 100)}%
                  </div>
                </div>
              </div>

              {/* Stage: To Do */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> To Do
                  </span>
                  <span className="font-bold text-slate-900">{status_breakdown?.TODO?.count || 0}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="bg-slate-400 h-5 rounded-full bar-animate flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all"
                    style={{
                      width: `${Math.max(
                        8,
                        Math.round(((status_breakdown?.TODO?.count || 0) / totalItems) * 100)
                      )}%`,
                    }}
                  >
                    {Math.round(((status_breakdown?.TODO?.count || 0) / totalItems) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
            Total {totalItems} items · {summary.completed_items_count} delivered
          </div>
        </div>
      </div>
    </div>
  );
};