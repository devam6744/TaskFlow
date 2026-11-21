import { create } from 'zustand';
import { apiClient } from '../lib/api';

export interface NotificationActor {
  id: string;
  email: string;
  display_name: string;
}

export interface NotificationItem {
  id: string;
  event_type:
    | 'TASK_ASSIGNED'
    | 'COMMENT_ADDED'
    | 'SPRINT_STARTED'
    | 'SPRINT_COMPLETED'
    | 'TASK_OVERDUE'
    | 'STATUS_CHANGED'
    | 'WORKSPACE_INVITE';
  title: string;
  description: string;
  target_url: string;
  payload: Record<string, any>;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
  actor: NotificationActor | null;
  workspace_id: string | null;
}

export interface NotificationPreference {
  id: string;
  event_type: string;
  event_type_display: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  workspace_id: string | null;
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreference[];
  isPreferencesOpen: boolean;
  fetchNotifications: (workspaceId?: string, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: (workspaceId?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (workspaceId?: string) => Promise<void>;
  fetchPreferences: (workspaceId?: string) => Promise<void>;
  updatePreference: (
    eventType: string,
    inApp?: boolean,
    email?: boolean,
    workspaceId?: string | null
  ) => Promise<void>;
  setIsPreferencesOpen: (open: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: [],
  isPreferencesOpen: false,

  fetchNotifications: async (workspaceId?: string, unreadOnly?: boolean) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (workspaceId) params.append('workspace_id', workspaceId);
      if (unreadOnly) params.append('unread_only', 'true');
      params.append('limit', '30');

      const res = await apiClient.get<NotificationItem[]>(`/notifications/?${params.toString()}`);
      set({ notifications: res.data, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async (workspaceId?: string) => {
    try {
      const params = new URLSearchParams();
      if (workspaceId) params.append('workspace_id', workspaceId);

      const res = await apiClient.get<{ unread_count: number }>(`/notifications/unread-count/?${params.toString()}`);
      set({ unreadCount: res.data.unread_count });
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  markAsRead: async (id: string) => {
    try {
      const res = await apiClient.post<NotificationItem>(`/notifications/${id}/read/`);
      set((state) => {
        const updated = state.notifications.map((n) => (n.id === id ? res.data : n));
        const newUnread = Math.max(0, state.unreadCount - 1);
        return { notifications: updated, unreadCount: newUnread };
      });
    } catch (err) {
      console.error(`Failed to mark notification ${id} as read:`, err);
    }
  },

  markAllAsRead: async (workspaceId?: string) => {
    try {
      await apiClient.post('/notifications/read-all/', { workspace_id: workspaceId });
      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  fetchPreferences: async (workspaceId?: string) => {
    try {
      const params = new URLSearchParams();
      if (workspaceId) params.append('workspace_id', workspaceId);

      const res = await apiClient.get<NotificationPreference[]>(`/notifications/preferences/?${params.toString()}`);
      set({ preferences: res.data });
    } catch (err) {
      console.error('Failed to fetch notification preferences:', err);
    }
  },

  updatePreference: async (
    eventType: string,
    inApp?: boolean,
    email?: boolean,
    workspaceId?: string | null
  ) => {
    try {
      const payload: Record<string, any> = { event_type: eventType };
      if (inApp !== undefined) payload.in_app_enabled = inApp;
      if (email !== undefined) payload.email_enabled = email;
      if (workspaceId !== undefined) payload.workspace_id = workspaceId;

      const res = await apiClient.patch<NotificationPreference>('/notifications/preferences/', payload);
      set((state) => {
        const exists = state.preferences.some((p) => p.event_type === eventType);
        const updated = exists
          ? state.preferences.map((p) => (p.event_type === eventType ? res.data : p))
          : [...state.preferences, res.data];
        return { preferences: updated };
      });
    } catch (err) {
      console.error('Failed to update preference:', err);
      throw err;
    }
  },

  setIsPreferencesOpen: (open: boolean) => set({ isPreferencesOpen: open }),
}));
