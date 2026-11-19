import React, { useState } from 'react';
import { Play, X, Loader2, Calendar, Target, AlertCircle } from 'lucide-react';
import { useSprintStore, type Sprint } from '../../stores/sprintStore';
import { useToast } from '../../stores/toastStore';

interface StartSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: Sprint | null;
  workspaceSlug: string;
  projectSlug: string;
  onSprintStarted?: () => void;
}

export const StartSprintModal: React.FC<StartSprintModalProps> = ({
  isOpen,
  onClose,
  sprint,
  workspaceSlug,
  projectSlug,
  onSprintStarted,
}) => {
  const [sprintGoal, setSprintGoal] = useState(sprint?.sprint_goal || '');
  const [startDate, setStartDate] = useState(
    sprint?.start_date || new Date().toISOString().split('T')[0]
  );
  // Default end date: 14 days from start
  const defaultEnd = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const [endDate, setEndDate] = useState(sprint?.end_date || defaultEnd);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { startSprint } = useSprintStore();
  const addToast = useToast((state) => state.addToast);

  if (!isOpen || !sprint) return null;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintGoal.trim()) {
      setErrorMessage('A Sprint Goal is required before starting the sprint.');
      return;
    }

    if (startDate && endDate && endDate <= startDate) {
      setErrorMessage('End date must be strictly after start date.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await startSprint(workspaceSlug, projectSlug, sprint.id, {
        sprint_goal: sprintGoal.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
      });

      addToast({
        type: 'success',
        title: 'Sprint Activated',
        description: `"${sprint.name}" is now live! Track work on the Sprint Board.`,
      });

      onClose();
      if (onSprintStarted) onSprintStarted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start sprint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-5 z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">
                Start Sprint: {sprint.name}
              </h3>
              <p className="text-xs text-slate-500">
                Lock committed story points and start tracking work items.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sprint Summary Pill Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Committed Work Items
            </span>
            <span className="font-bold text-slate-800 text-sm">{sprint.total_items} items</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              Planned Velocity
            </span>
            <span className="font-bold text-blue-600 text-sm">
              {sprint.total_story_points} story points
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleStart} className="space-y-4">
          {/* Sprint Goal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-600" />
              <span>Sprint Goal (Mandatory in Scrum) <span className="text-rose-500">*</span></span>
            </label>
            <textarea
              required
              rows={2}
              value={sprintGoal}
              onChange={(e) => setSprintGoal(e.target.value)}
              placeholder="e.g. Implement user registration, login, and workspace management"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all resize-none"
            />
          </div>

          {/* Date Duration Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !sprintGoal.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              <span>Activate Sprint</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
