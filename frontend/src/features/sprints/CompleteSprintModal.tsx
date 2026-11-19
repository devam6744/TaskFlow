import React, { useState } from 'react';
import { CheckCircle2, X, Loader2, AlertCircle } from 'lucide-react';
import { useSprintStore, type Sprint } from '../../stores/sprintStore';
import { useToast } from '../../stores/toastStore';

interface CompleteSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprint: Sprint | null;
  workspaceSlug: string;
  projectSlug: string;
  onSprintCompleted?: () => void;
}

export const CompleteSprintModal: React.FC<CompleteSprintModalProps> = ({
  isOpen,
  onClose,
  sprint,
  workspaceSlug,
  projectSlug,
  onSprintCompleted,
}) => {
  const [rolloverToBacklog, setRolloverToBacklog] = useState(true);
  const [nextSprintId, setNextSprintId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { sprints, completeSprint } = useSprintStore();
  const addToast = useToast((state) => state.addToast);

  if (!isOpen || !sprint) return null;

  // Planned sprints for optional rollover target
  const plannedSprints = sprints.filter(
    (s) => s.status === 'PLANNING' && s.id !== sprint.id
  );

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await completeSprint(workspaceSlug, projectSlug, sprint.id, {
        rollover_to_backlog: rolloverToBacklog,
        next_sprint_id: !rolloverToBacklog ? nextSprintId : null,
      });

      addToast({
        type: 'success',
        title: 'Sprint Completed',
        description: `"${sprint.name}" closed. Velocity metrics recorded successfully.`,
      });

      onClose();
      if (onSprintCompleted) onSprintCompleted();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete sprint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = sprint.done_items;
  const incompleteCount = Math.max(0, sprint.total_items - completedCount);

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
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">
                Complete Sprint: {sprint.name}
              </h3>
              <p className="text-xs text-slate-500">
                Close sprint time-box and archive completed deliverables.
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

        {/* Tally Metrics Box */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
              Completed (Done)
            </span>
            <span className="font-bold text-emerald-800 text-base">
              {completedCount} items • {sprint.done_story_points} pts
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 block">
              Incomplete (Rollover)
            </span>
            <span className="font-bold text-amber-800 text-base">
              {incompleteCount} items
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleComplete} className="space-y-4">
          {incompleteCount > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-800">
                What should happen to the {incompleteCount} incomplete items?
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors text-xs">
                  <input
                    type="radio"
                    name="rollover"
                    checked={rolloverToBacklog}
                    onChange={() => setRolloverToBacklog(true)}
                    className="text-blue-600 focus:ring-blue-600"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">Move to Product Backlog</div>
                    <div className="text-[11px] text-slate-500">
                      Items will return to the backlog for re-prioritization.
                    </div>
                  </div>
                </label>

                {plannedSprints.length > 0 && (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors text-xs">
                    <input
                      type="radio"
                      name="rollover"
                      checked={!rolloverToBacklog}
                      onChange={() => {
                        setRolloverToBacklog(false);
                        if (!nextSprintId && plannedSprints[0]) {
                          setNextSprintId(plannedSprints[0].id);
                        }
                      }}
                      className="text-blue-600 focus:ring-blue-600 mt-0.5"
                    />
                    <div className="flex-1 space-y-1.5">
                      <div className="font-semibold text-slate-800">Move to Next Planned Sprint</div>
                      {!rolloverToBacklog && (
                        <select
                          value={nextSprintId}
                          onChange={(e) => setNextSprintId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        >
                          {plannedSprints.map((ps) => (
                            <option key={ps.id} value={ps.id}>
                              {ps.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

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
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Complete Sprint</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
