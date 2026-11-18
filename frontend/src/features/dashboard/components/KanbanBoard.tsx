import React, { useState } from 'react';
import { Plus, CheckCircle2, ChevronRight, Kanban as KanbanIcon } from 'lucide-react';
import { useToast } from '../../../stores/toastStore';

interface TaskCard {
  id: string;
  title: string;
  points: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assignee: string;
  column: 'todo' | 'in_progress' | 'review' | 'done';
}

const INITIAL_TASKS: TaskCard[] = [
  {
    id: 'TF-101',
    title: 'Custom User Authentication & Password Hashing',
    points: 5,
    priority: 'high',
    assignee: 'DM',
    column: 'done',
  },
  {
    id: 'TF-102',
    title: 'Dual-token session security & refresh cookies',
    points: 8,
    priority: 'urgent',
    assignee: 'AL',
    column: 'done',
  },
  {
    id: 'TF-103',
    title: 'Workspace Schema & Multi-Tenancy Isolation',
    points: 8,
    priority: 'urgent',
    assignee: 'DM',
    column: 'in_progress',
  },
  {
    id: 'TF-104',
    title: 'Role-Based Access Control (Admin, Member, Viewer)',
    points: 5,
    priority: 'high',
    assignee: 'RK',
    column: 'in_progress',
  },
  {
    id: 'TF-105',
    title: 'Sprint lifecycle atomic state transitions',
    points: 13,
    priority: 'high',
    assignee: 'AL',
    column: 'todo',
  },
  {
    id: 'TF-106',
    title: 'Automated sprint burndown velocity reporting',
    points: 5,
    priority: 'medium',
    assignee: 'MK',
    column: 'todo',
  },
  {
    id: 'TF-107',
    title: 'Audit log trigger service on priority change',
    points: 3,
    priority: 'medium',
    assignee: 'DM',
    column: 'review',
  },
];

export const KanbanBoard: React.FC = () => {
  const [tasks, setTasks] = useState<TaskCard[]>(INITIAL_TASKS);
  const addToast = useToast((state) => state.addToast);

  const moveTask = (taskId: string, direction: 'next' | 'prev') => {
    const columns: TaskCard['column'][] = ['todo', 'in_progress', 'review', 'done'];

    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const currentIndex = columns.indexOf(task.column);
        const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (newIndex >= 0 && newIndex < columns.length) {
          const nextCol = columns[newIndex];
          addToast({
            type: 'info',
            title: `Moved ${task.id}`,
            description: `Shifted to ${nextCol.replace('_', ' ').toUpperCase()}`,
          });
          return { ...task, column: nextCol };
        }
        return task;
      })
    );
  };

  const renderColumn = (
    title: string,
    columnKey: TaskCard['column'],
    badgeBg: string,
    badgeText: string
  ) => {
    const columnTasks = tasks.filter((t) => t.column === columnKey);

    return (
      <div className="flex-1 min-w-[270px] bg-slate-100/70 border border-slate-200 rounded-2xl p-4 flex flex-col">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              {title}
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badgeBg} ${badgeText}`}>
              {columnTasks.length}
            </span>
          </div>
          <button
            onClick={() =>
              addToast({
                type: 'info',
                title: 'New Issue',
                description: 'Issue creation modal will be available in Phase 5.',
              })
            }
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Task Cards Container */}
        <div className="space-y-3 flex-1 overflow-y-auto">
          {columnTasks.map((task) => (
            <div
              key={task.id}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow hover:border-slate-300 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                <span className="font-mono font-semibold text-blue-600">{task.id}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    task.priority === 'urgent'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : task.priority === 'high'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {task.priority}
                </span>
              </div>

              <div className="text-xs font-medium text-slate-800 leading-snug mb-3">
                {task.title}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">
                    {task.assignee}
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono font-medium">
                    {task.points} pts
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {columnKey !== 'done' && (
                    <button
                      onClick={() => moveTask(task.id, 'next')}
                      title="Move to next stage"
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-600 text-[10px] font-semibold text-slate-700 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <span>Advance</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  {columnKey === 'done' && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {columnTasks.length === 0 && (
            <div className="h-28 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
              No tickets
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <KanbanIcon className="w-4 h-4 text-blue-600" />
            <span>Active Sprint Board • Core Engineering</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive task workflow with atomic stage progression
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              addToast({
                type: 'info',
                title: 'New Issue',
                description: 'Issue creation will be enabled in Phase 5.',
              })
            }
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Issue</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto pb-2">
        {renderColumn('To Do', 'todo', 'bg-slate-200', 'text-slate-800')}
        {renderColumn('In Progress', 'in_progress', 'bg-blue-100', 'text-blue-800')}
        {renderColumn('In Review', 'review', 'bg-purple-100', 'text-purple-800')}
        {renderColumn('Done', 'done', 'bg-emerald-100', 'text-emerald-800')}
      </div>
    </div>
  );
};
