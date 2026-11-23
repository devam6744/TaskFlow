import React, { useState } from 'react';
import { Layers, Users, BookOpen, CheckSquare, Bug, Wrench } from 'lucide-react';
import type { SprintReportData } from '../types';

interface SprintBreakdownProps {
  report: SprintReportData;
}

export const SprintBreakdown: React.FC<SprintBreakdownProps> = ({ report }) => {
  const [activeTab, setActiveTab] = useState<'type' | 'assignee'>('type');

  const { type_breakdown, assignee_breakdown } = report;

  const typeConfig: Record<string, { label: string; icon: any; color: string; bar: string }> = {
    STORY: { label: 'Story', icon: BookOpen, color: 'text-emerald-700 bg-emerald-50', bar: 'bg-emerald-500' },
    TASK: { label: 'Task', icon: CheckSquare, color: 'text-blue-700 bg-blue-50', bar: 'bg-blue-500' },
    BUG: { label: 'Bug', icon: Bug, color: 'text-rose-700 bg-rose-50', bar: 'bg-rose-500' },
    IMPROVEMENT: { label: 'Improvement', icon: Wrench, color: 'text-purple-700 bg-purple-50', bar: 'bg-purple-500' },
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Header with Tabs */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Sprint Delivery Breakdown</h3>
          <p className="text-xs text-slate-500 mt-0.5">Progress distributed by issue category and member contributions</p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('type')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'type' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            By Type
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('assignee')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'assignee' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            By Assignee
          </button>
        </div>
      </div>

      <div className="p-5">
        {activeTab === 'type' ? (
          <div className="space-y-4">
            {Object.keys(type_breakdown).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No work items categorized yet.</p>
            ) : (
              Object.entries(type_breakdown).map(([typeName, stats]) => {
                const config = typeConfig[typeName] || {
                  label: typeName,
                  icon: Layers,
                  color: 'text-slate-700 bg-slate-50',
                  bar: 'bg-slate-500',
                };
                const Icon = config.icon;
                const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

                return (
                  <div key={typeName} className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded-md ${config.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{config.label}</span>
                        <span className="text-[11px] text-slate-500">
                          ({stats.completed} of {stats.total} resolved)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{stats.points} pts</span>
                        <span className="text-xs font-semibold text-blue-600">{completionPct}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${completionPct}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${config.bar}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {assignee_breakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No assigned members in this sprint.</p>
            ) : (
              assignee_breakdown.map((member) => {
                const completionPct =
                  member.total_items > 0 ? Math.round((member.completed_items / member.total_items) * 100) : 0;

                return (
                  <div key={member.email} className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{member.name}</p>
                          <p className="text-[10px] text-slate-500">{member.email}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800">{member.completed_points} / {member.total_points} pts</span>
                        <p className="text-[11px] text-blue-600 font-semibold">{completionPct}%</p>
                      </div>
                    </div>

                    {/* Member Progress Bar */}
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${completionPct}%` }}
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
