import React from 'react';
import { Users } from 'lucide-react';
import type { SprintReportData, AssigneeBreakdownItem } from '../types';

interface TeamContributionsTabProps {
  report: SprintReportData;
}

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', bar: 'bg-blue-600' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', bar: 'bg-purple-600' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', bar: 'bg-amber-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', bar: 'bg-emerald-600' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', bar: 'bg-indigo-600' },
];

export const TeamContributionsTab: React.FC<TeamContributionsTabProps> = ({ report }) => {
  const assignees: AssigneeBreakdownItem[] = report.assignee_breakdown || [];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs fade-in">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Team Member Contributions</h3>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {assignees.length} {assignees.length === 1 ? 'contributor' : 'contributors'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-6">
          Who completed what in the current sprint: points delivered, active tasks, and status breakdown.
        </p>

        {assignees.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No member assignments in this sprint</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Assign work items to team members to see individual contribution metrics.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignees.map((member, idx) => {
              const colorTheme = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const tasks = member.tasks || [];

              return (
                <div
                  key={member.email || member.name || idx}
                  className="p-4 rounded-xl border border-slate-100 hover:border-slate-300 transition-all lift"
                >
                  {/* Top: Avatar, Name, Points */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full ${colorTheme.bg} border-2 ${colorTheme.border} flex items-center justify-center text-xs font-bold ${colorTheme.text} shrink-0`}
                      >
                        {member.initials || 'US'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{member.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {member.email ? member.email : 'Unassigned'} · {member.total_items}{' '}
                          {member.total_items === 1 ? 'task' : 'tasks'} assigned
                        </div>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {member.total_points} pts
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center sm:justify-end gap-1.5">
                        <span>{member.completed_items} Done</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-blue-600">{member.active_items} Active</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">{member.todo_items} To Do</span>
                      </div>
                    </div>
                  </div>

                  {/* Task Pills */}
                  {tasks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tasks.map((task) => {
                        let badgeStyle = 'bg-slate-50 text-slate-600 border-slate-200';
                        let labelSuffix = 'To Do';

                        if (task.status === 'DONE') {
                          badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
                          labelSuffix = 'Done ✓';
                        } else if (task.status === 'IN_REVIEW') {
                          badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
                          labelSuffix = 'In Review';
                        } else if (task.status === 'IN_PROGRESS') {
                          badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
                          labelSuffix = 'In Progress';
                        }

                        return (
                          <span
                            key={task.id}
                            className={`px-2 py-0.5 text-[10px] rounded-full border transition-transform hover:scale-105 cursor-default ${badgeStyle}`}
                            title={`${task.key_identifier}: ${task.title} (${task.story_points || 0} pts)`}
                          >
                            {task.key_identifier} {labelSuffix}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Contribution bar */}
                  <div className="mt-3.5 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`${colorTheme.bar} h-2 rounded-full bar-animate transition-all duration-700`}
                      style={{ width: `${Math.min(100, member.percentage_of_sprint_points)}%` }}
                    ></div>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 font-medium">
                    {member.percentage_of_sprint_points}% of sprint's total story points
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};