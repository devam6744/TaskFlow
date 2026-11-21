import React, { useEffect, useState } from 'react';
import { X, Bell, Mail, Check, Sliders, Shield } from 'lucide-react';
import { useNotificationStore } from '../../../stores/notificationStore';
import { useWorkspaceStore } from '../../../stores/workspaceStore';
import { useToast } from '../../../stores/toastStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EVENT_TYPE_LABELS: Record<string, { title: string; desc: string }> = {
  TASK_ASSIGNED: {
    title: 'Task Assigned',
    desc: 'When someone assigns or reassigns a work item to you.',
  },
  COMMENT_ADDED: {
    title: 'Task Comments',
    desc: 'When someone comments on a work item you are assigned to.',
  },
  SPRINT_STARTED: {
    title: 'Sprint Started',
    desc: 'When a new sprint is officially activated in your project.',
  },
  SPRINT_COMPLETED: {
    title: 'Sprint Completed',
    desc: 'When an active sprint is finalized with velocity calculation.',
  },
  TASK_OVERDUE: {
    title: 'Overdue Reminders',
    desc: 'Daily digest when an assigned work item passes its due date.',
  },
  WORKSPACE_INVITE: {
    title: 'Workspace Invitations',
    desc: 'Alerts regarding workspace access and invitation requests.',
  },
  STATUS_CHANGED: {
    title: 'Status Changes',
    desc: 'When work items move across Kanban columns.',
  },
};

export const NotificationPreferencesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { activeWorkspace } = useWorkspaceStore();
  const { preferences, fetchPreferences, updatePreference } = useNotificationStore();
  const addToast = useToast((state) => state.addToast);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPreferences(activeWorkspace?.id);
    }
  }, [isOpen, activeWorkspace?.id, fetchPreferences]);

  if (!isOpen) return null;

  const handleToggle = async (eventType: string, channel: 'in_app' | 'email', currentValue: boolean) => {
    const key = `${eventType}_${channel}`;
    setUpdatingKey(key);
    try {
      if (channel === 'in_app') {
        await updatePreference(eventType, !currentValue, undefined, activeWorkspace?.id);
      } else {
        await updatePreference(eventType, undefined, !currentValue, activeWorkspace?.id);
      }
      addToast({
        type: 'success',
        title: 'Preference Updated',
        description: `Updated alert channel for ${EVENT_TYPE_LABELS[eventType]?.title || eventType}.`,
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Update Failed',
        description: 'Could not save notification preference.',
      });
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Notification Settings</h2>
              <p className="text-xs text-slate-500">
                Configure alert delivery channels for {activeWorkspace ? activeWorkspace.name : 'all workspaces'}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Event Trigger</span>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-slate-400" /> In-App
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {preferences.map((pref) => {
              const meta = EVENT_TYPE_LABELS[pref.event_type] || {
                title: pref.event_type_display || pref.event_type,
                desc: 'Alert trigger for this business event.',
              };

              return (
                <div key={pref.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 pr-2">
                    <div className="text-sm font-semibold text-slate-800">{meta.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{meta.desc}</div>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    {/* In-App Toggle */}
                    <button
                      type="button"
                      disabled={updatingKey === `${pref.event_type}_in_app`}
                      onClick={() => handleToggle(pref.event_type, 'in_app', pref.in_app_enabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        pref.in_app_enabled ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                      title={pref.in_app_enabled ? 'Disable In-App alert' : 'Enable In-App alert'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          pref.in_app_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* Email Toggle */}
                    <button
                      type="button"
                      disabled={updatingKey === `${pref.event_type}_email`}
                      onClick={() => handleToggle(pref.event_type, 'email', pref.email_enabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        pref.email_enabled ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                      title={pref.email_enabled ? 'Disable Email alert' : 'Enable Email alert'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          pref.email_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 mt-4 text-xs text-slate-500">
            <Shield className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span>
                Transactional security notifications (password resets, invitation approvals) cannot be disabled.
                Email alerts are dispatched asynchronously via Upstash Redis and Gmail SMTP.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
