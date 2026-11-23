import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserCheck,
  Flame,
  Activity,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useAuthStore } from '../../stores/authStore';
import { analyticsApi } from './analyticsApi';
import type { WorkspaceDashboardSummary } from './types';

interface DashboardOverviewProps {
  onNavigateToTab: (tab: 'overview' | 'kanban' | 'backlog' | 'analytics') => void;
  onOpenWorkItem?: (itemNumber: number) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateToTab,
  onOpenWorkItem,
}) => {
  const { activeWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();

  const [summary, setSummary] = useState<WorkspaceDashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadSummary = useCallback(async (isRefresh = false) => {
    if (!activeWorkspace) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await analyticsApi.getWorkspaceDashboardSummary(activeWorkspace.slug);
      setSummary(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const priorityColor = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'HIGH':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'MEDIUM':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Health Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              {activeWorkspace?.name || 'Workspace'} Executive Overview
            </div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.display_name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-xs text-blue-100 mt-1 max-w-xl">
              Here is your daily engineering pulse across sprints, assigned tasks, and delivery milestones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadSummary(true)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all"
              title="Refresh overview metrics"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('analytics')}
              className="px-4 py-2 bg-white text-blue-700 text-xs font-bold rounded-lg shadow-sm hover:bg-blue-50 active:scale-95 transition-all flex items-center gap-1.5"
            >
              View Analytics
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Quick Stats */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/15 text-xs">
          <div>
            <span className="text-blue-200 text-[11px] block">Assigned to You</span>
            <span className="text-xl font-bold text-white">{summary?.assigned_to_me_count ?? 0} items</span>
          </div>
          <div>
            <span className="text-blue-200 text-[11px] block">Overdue Tasks</span>
            <span className={`text-xl font-bold ${summary?.overdue_count ? 'text-amber-300' : 'text-white'}`}>
              {summary?.overdue_count ?? 0}
            </span>
          </div>
          <div>
            <span className="text-blue-200 text-[11px] block">Blocked Items</span>
            <span className={`text-xl font-bold ${summary?.blocked_count ? 'text-rose-300' : 'text-white'}`}>
              {summary?.blocked_count ?? 0}
            </span>
          </div>
          <div>
            <span className="text-blue-200 text-[11px] block">Active Sprints</span>
            <span className="text-xl font-bold text-white">{summary?.active_sprints?.length ?? 0} live</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Assigned to Me) + Right (Active Sprints & Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Assigned to Me Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Your Action Items</h3>
                  <p className="text-xs text-slate-500">Tasks assigned to you requiring attention</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('backlog')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Go to Backlog
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading your tasks...</div>
              ) : summary?.assigned_to_me_items?.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  You have no pending assigned tasks! All clear.
                </div>
              ) : (
                summary?.assigned_to_me_items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                    onClick={() => onOpenWorkItem?.(item.item_number)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors shrink-0">
                        {item.key_identifier}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>{item.project_name}</span>
                          <span>•</span>
                          <span className={`px-1.5 py-0.2 rounded border font-medium text-[10px] ${priorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                          {item.is_overdue && (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Sprints Health Scorecard */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Active Sprints Progress</h3>
                  <p className="text-xs text-slate-500">Real-time delivery progress across active iterations</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToTab('kanban')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Go to Active Board
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {summary?.active_sprints?.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No active sprints in progress. Start a sprint from the backlog to track live delivery.
                </div>
              ) : (
                summary?.active_sprints?.map((sprint) => (
                  <div key={sprint.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{sprint.name}</span>
                          <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-medium">
                            {sprint.project_name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {sprint.done_items} of {sprint.total_items} tickets closed
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900">{sprint.completed_points} / {sprint.planned_points} pts</span>
                        <p className="text-[11px] font-semibold text-blue-600">{sprint.completion_percentage}%</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${sprint.completion_percentage}%` }}
                        className="h-full bg-blue-600 rounded-full transition-all duration-700"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {sprint.days_remaining} days remaining
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('kanban')}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Open Kanban &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Attention Alerts & Recent Activity */}
        <div className="space-y-6">
          {/* Recent Activity Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {summary?.recent_activity?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No recent activity logged yet.</p>
              ) : (
                summary?.recent_activity?.map((act) => (
                  <div key={act.id} className="text-xs flex items-start gap-2.5 pb-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-800">
                        <strong>{act.actor_name}</strong> {act.event_type.toLowerCase().replace(/_/g, ' ')}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
