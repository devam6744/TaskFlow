import React, { useState } from 'react';
import { Building2, X, Loader2, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToast } from '../../stores/toastStore';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (slug: string) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { createWorkspace } = useWorkspaceStore();
  const addToast = useToast((state) => state.addToast);

  if (!isOpen) return null;

  // Real-time slug preview
  const slugPreview = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Workspace name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const workspace = await createWorkspace(name.trim(), description.trim());
      addToast({
        type: 'success',
        title: 'Workspace Created',
        description: `Workspace "${workspace.name}" has been created successfully.`,
      });
      setName('');
      setDescription('');
      onClose();
      if (onCreated) {
        onCreated(workspace.slug);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create workspace.');
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
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-6 sm:p-7 overflow-hidden z-10 transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Create New Workspace
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Establish an isolated environment for your team's projects.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Workspace Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. Core Engineering, Mobile App Team"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              autoFocus
            />
            {slugPreview && (
              <div className="mt-1.5 text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <span>URL Slug:</span>
                <span className="text-blue-600 font-semibold">/workspaces/{slugPreview}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of this team or organization's scope..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all resize-none"
            />
          </div>

          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <p className="text-[11px] text-blue-900/80 leading-relaxed">
                As the creator, you will automatically be assigned the <strong>Owner</strong> role with complete administrative control. You can invite team members and delegate Admin permissions anytime.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
