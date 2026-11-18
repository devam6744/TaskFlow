import React, { useState } from 'react';
import { Plus, CheckCircle2, ChevronRight } from 'lucide-react';
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
    title: 'Custom User Model with UUID & Email Identity',
    points: 5,
    priority: 'high',
    assignee: 'DS',
    column: 'done',
  },
  {
    id: 'TF-102',
    title: 'Dual-Token JWT Rotation with HttpOnly Cookies',
    points: 8,
    priority: 'urgent',
    assignee: 'AL',
    column: 'done',
  },
  {
    id: 'TF-103',
    title: 'Supabase PostgreSQL 17 connection & migrations',
    points: 3,
    priority: 'medium',
    assignee: 'MK',
    column: 'done',
  },
  {
    id: 'TF-104',
    title: 'Workspace Schema & Multi-Tenancy Isolation Middleware',
    points: 8,
    priority: 'urgent',
    assignee: 'DS',
    column: 'in_progress',
  },
  {
    id: 'TF-105',
    title: 'Workspace Member RBAC permissions (Admin/Member/Viewer)',
    points: 5,
    priority: 'high',
    assignee: 'RK',
    column: 'in_progress',
  },
  {
    id: 'TF-106',
    title: 'Sprint lifecycle atomic state transitions',
    points: 13,
    priority: 'high',
    assignee: 'AL',
    column: 'todo',
  },
  {
    id: 'TF-107',
    title: 'Audit log triggers on workitem priority change',
    points: 5,
    priority: 'medium',
    assignee: 'MK',
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
    color: string,
    badgeBg: string
  ) => {
    const columnTasks = tasks.filter((t) => t.column === columnKey);

    return (
      <div className="flex-1 min-w-[260px] bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col backdrop-blur-sm">
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {title}
            </span>
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${badgeBg}`}>
              {columnTasks.length}
            </span>
          </div>
          <button className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800/60 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Task Cards Container */}
        <div className="space-y-3 flex-1 overflow-y-auto">
          {columnTasks.map((task) => (
            <div
              key={task.id}
              className="p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 shadow-sm transition-all duration-200 group"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span className="font-mono font-semibold text-indigo-400">{task.id}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    task.priority === 'urgent'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : task.priority === 'high'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-700/50 text-slate-300'
                  }`}
                >
                  {task.priority}
                </span>
              </div>

              <div className="text-xs font-medium text-slate-200 leading-snug mb-3 line-clamp-2">
                {task.title}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold text-[10px] flex items-center justify-center">
                    {task.assignee}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono font-medium">
                    {task.points} pts
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  {columnKey !== 'done' && (
                    <button
                      onClick={() => moveTask(task.id, 'next')}
                      title="Move to next stage"
                      className="px-2 py-1 rounded bg-slate-700/60 hover:bg-indigo-600 text-[10px] font-semibold text-slate-200 hover:text-white flex items-center gap-0.5 transition-colors"
                    >
                      <span>Advance</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                  {columnKey === 'done' && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {columnTasks.length === 0 && (
            <div className="h-28 rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-xs text-slate-500">
              No work items
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            Active Sprint 1 • Live Kanban Board
          </h3>
          <p className="text-xs text-slate-400">
            Interactive drag & advance state execution machine
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all">
            <Plus className="w-3.5 h-3.5" />
            <span>Create Issue</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {renderColumn('To Do', 'todo', 'bg-slate-400', 'bg-slate-800 text-slate-300')}
        {renderColumn('In Progress', 'in_progress', 'bg-indigo-400', 'bg-indigo-950 text-indigo-300')}
        {renderColumn('In Review', 'review', 'bg-amber-400', 'bg-amber-950 text-amber-300')}
        {renderColumn('Done', 'done', 'bg-emerald-400', 'bg-emerald-950 text-emerald-300')}
      </div>
    </div>
  );
};
