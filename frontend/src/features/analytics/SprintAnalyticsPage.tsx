import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  FolderKanban,
  Calendar,
  AlertCircle,
  Activity,
  Layers,
  History,
  Users,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useProjectStore } from '../../stores/projectStore';
import { apiClient } from '../../lib/api';
import { analyticsApi } from './analyticsApi';
import type { SprintReportData, ProjectVelocityData } from './types';
import { AnalyticsSkeleton } from './components/AnalyticsSkeleton';
import { SprintPulseTab } from './components/SprintPulseTab';
import { WorkBreakdownTab } from './components/WorkBreakdownTab';
import { SprintHistoryTab } from './components/SprintHistoryTab';
import { TeamContributionsTab } from './components/TeamContributionsTab';

type AnalyticsTab = 'pulse' | 'work' | 'history' | 'team';

export const SprintAnalyticsPage: React.FC = () => {
  const { activeWorkspace } = useWorkspaceStore();
  const { activeProject } = useProjectStore();

  const [activeTab, setActiveTab] = useState<AnalyticsTab>('pulse');
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
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
        <FolderKanban className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Active Project Selected</h3>
        <p className="text-xs text-slate-500 mt-1">Select a project to view burndown charts and velocity metrics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================= HEADER & TABS CARD ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {activeProject.key} · {activeProject.name}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot"></span>
                Live Tracking
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1.5">
              Reports & Insights
            </h1>
          </div>

          {/* Right Action: Sprint selector & Refresh */}
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
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              title="Refresh analytics data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* 4 Navigation Tabs */}
        <div className="flex items-center gap-6 mt-5 border-b border-slate-100 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pulse')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pulse'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Sprint Pulse
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('work')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'work'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Work Breakdown
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Sprint History
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`pb-2.5 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'team'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Team Contributions
          </button>
        </div>
      </div>

      {/* ================= ERROR BANNER ================= */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ================= TAB PANELS ================= */}
      {loading ? (
        <AnalyticsSkeleton />
      ) : (
        <>
          {/* TAB 1: SPRINT PULSE */}
          {activeTab === 'pulse' &&
            (report ? (
              <SprintPulseTab report={report} />
            ) : (
              <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No Sprint Report Available</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Select or create an active sprint to track real-time burndown and completion pulse.
                </p>
              </div>
            ))}

          {/* TAB 2: WORK BREAKDOWN */}
          {activeTab === 'work' &&
            (report ? (
              <WorkBreakdownTab report={report} />
            ) : (
              <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
                <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No Work Items in Sprint</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Add stories, tasks, bugs, or improvements to this sprint to visualize work breakdown.
                </p>
              </div>
            ))}

          {/* TAB 3: SPRINT HISTORY */}
          {activeTab === 'history' &&
            (velocity ? (
              <SprintHistoryTab velocity={velocity} />
            ) : (
              <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
                <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No Historical Velocity Data</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Complete sprints to view delivery comparisons and velocity trends over time.
                </p>
              </div>
            ))}

          {/* TAB 4: TEAM CONTRIBUTIONS */}
          {activeTab === 'team' &&
            (report ? (
              <TeamContributionsTab report={report} />
            ) : (
              <div className="p-10 text-center bg-white border border-slate-200 rounded-2xl shadow-xs">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No Team Member Activity</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Assign tasks in this sprint to visualize individual member contributions.
                </p>
              </div>
            ))}
        </>
      )}
    </div>
  );
};