import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  FolderKanban,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useProjectStore } from '../../stores/projectStore';
import { apiClient } from '../../lib/api';
import { analyticsApi } from './analyticsApi';
import type { SprintReportData, ProjectVelocityData } from './types';
import { BurndownChart } from './components/BurndownChart';
import { VelocityChart } from './components/VelocityChart';
import { SprintScorecard } from './components/SprintScorecard';
import { SprintBreakdown } from './components/SprintBreakdown';
import { AnalyticsSkeleton } from './components/AnalyticsSkeleton';

export const SprintAnalyticsPage: React.FC = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const { activeProject } = useProjectStore();

  const [sprints, setSprints] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [report, setReport] = useState<SprintReportData | null>(null);
  const [velocity, setVelocity] = useState<ProjectVelocityData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch available sprints list
  const loadSprints = useCallback(async () => {
    if (!activeWorkspace || !activeProject) return;
    try {
      const res = await apiClient.get<Array<{ id: string; name: string; status: string }>>(
        `/workspaces/${activeWorkspace.slug}/projects/${activeProject.slug}/sprints/`
      );
      const data = res.data;
      setSprints(data);

      // Auto-select active sprint first, or latest sprint
      const active = data.find((s) => s.status === 'ACTIVE');
      if (active) {
        setSelectedSprintId(active.id);
      } else if (data.length > 0) {
        setSelectedSprintId(data[0].id);
      }
    } catch {
      // ignore
    }
  }, [activeWorkspace, activeProject]);

  // 2. Fetch Report & Velocity data
  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (!activeWorkspace || !activeProject) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Load Velocity
      const velocityData = await analyticsApi.getProjectVelocity(
        activeWorkspace.slug,
        activeProject.slug,
        10
      );
      setVelocity(velocityData);

      // Load Sprint Report if sprint selected
      if (selectedSprintId) {
        const reportData = await analyticsApi.getSprintReport(
          activeWorkspace.slug,
          activeProject.slug,
          selectedSprintId
        );
        setReport(reportData);
      } else {
        setReport(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load sprint analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWorkspace, activeProject, selectedSprintId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
        <FolderKanban className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Active Project Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select a project to view burndown charts and velocity metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Sprint Picker */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {activeProject.key} Analytics
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              Live Scrum Metrics
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Sprint Reports & Delivery Analytics
          </h1>
        </div>

        {/* Sprint Dropdown and Refresh */}
        <div className="flex items-center gap-3">
          {sprints.length > 0 && (
            <div className="relative">
              <select
                aria-label="Select Sprint"
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.status === 'ACTIVE' ? '(Active)' : `(${s.status})`}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-50"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          {/* 1. Scorecards */}
          {report && <SprintScorecard report={report} />}

          {/* 2. Burndown Chart */}
          {report ? (
            <BurndownChart data={report.summary} />
          ) : (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No sprint report available. Create or start a sprint to track burndown.</p>
            </div>
          )}

          {/* 3. Bottom Grid: Velocity History + Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {velocity && <VelocityChart data={velocity} />}
            {report && <SprintBreakdown report={report} />}
          </div>
        </>
      )}
    </div>
  );
};
