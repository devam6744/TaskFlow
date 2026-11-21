import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCheck,
  CheckSquare,
  MessageSquare,
  Zap,
  Award,
  AlertTriangle,
  Mail,
  Sliders,
  Loader2,
} from 'lucide-react';
import { useNotificationStore } from '../../../stores/notificationStore';
import type { NotificationItem } from '../../../stores/notificationStore';
import { useWorkspaceStore } from '../../../stores/workspaceStore';

interface Props {
  onOpenSettings: () => void;
  onNavigateToWorkItem?: (itemNumber: number) => void;
}

export const NotificationBell: React.FC<Props> = ({ onOpenSettings, onNavigateToWorkItem }) => {
  const { activeWorkspace } = useWorkspaceStore();
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    fetchUnreadCount(activeWorkspace?.id);
    fetchNotifications(activeWorkspace?.id);

    const interval = setInterval(() => {
      fetchUnreadCount(activeWorkspace?.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [activeWorkspace?.id, fetchUnreadCount, fetchNotifications]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications(activeWorkspace?.id);
    }
    setIsOpen(!isOpen);
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);

    // If notification has a work item payload, open work item
    const itemNumber = notif.payload?.item_number;
    if (itemNumber && onNavigateToWorkItem) {
      onNavigateToWorkItem(itemNumber);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <CheckSquare className="w-4 h-4 text-blue-600" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'SPRINT_STARTED':
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'SPRINT_COMPLETED':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'TASK_OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'WORKSPACE_INVITE':
        return <Mail className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimeAgo = (isoString: string): string => {
    try {
      const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 172800) return 'yesterday';
      return `${Math.floor(diff / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className={`relative p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
          isOpen
            ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-xs'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
        }`}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-in zoom-in-50 duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead(activeWorkspace?.id)}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {isLoading && notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-xs">Loading alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-700">No notifications yet</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  You're all caught up! New alerts will appear here.
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-left ${
                    item.is_read
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-blue-50/30 hover:bg-blue-50/60'
                  }`}
                >
                  {/* Icon badge */}
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    {getEventIcon(item.event_type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs truncate ${item.is_read ? 'font-medium text-slate-800' : 'font-bold text-slate-900'}`}>
                        {item.title}
                      </span>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>

                    {item.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      <span>{formatTimeAgo(item.created_at)}</span>
                      {item.actor && (
                        <>
                          <span>&bull;</span>
                          <span className="truncate">by {item.actor.display_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenSettings();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer text-[11px] font-medium"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Notification Settings</span>
            </button>

            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>Async via Celery &bull; Redis</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
