import { create } from 'zustand';
import { apiClient } from '../lib/api';

export interface CommentAuthor {
  id: string;
  email: string;
  display_name: string;
}

export interface WorkItemComment {
  id: string;
  work_item: string;
  author: CommentAuthor;
  body: string;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface WorkItemAttachment {
  id: string;
  work_item: string;
  uploader: CommentAuthor;
  file_url: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  actor: CommentAuthor | null;
  object_type: string;
  object_id: string;
  event_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface WorkItemDependency {
  id: string;
  blocking_item: {
    id: string;
    item_number: number;
    key_identifier: string;
    title: string;
    type: string;
    status: string;
    priority: string;
  };
  blocked_item: {
    id: string;
    item_number: number;
    key_identifier: string;
    title: string;
    type: string;
    status: string;
    priority: string;
  };
  dependency_type: string;
  created_at: string;
}

interface CollaborationState {
  comments: WorkItemComment[];
  attachments: WorkItemAttachment[];
  activity: ActivityEvent[];
  dependencies: WorkItemDependency[];
  loading: boolean;
  error: string | null;

  fetchCollaborationData: (workspaceSlug: string, projectSlug: string, itemNumber: number) => Promise<void>;
  addComment: (workspaceSlug: string, projectSlug: string, itemNumber: number, body: string) => Promise<void>;
  deleteComment: (workspaceSlug: string, projectSlug: string, itemNumber: number, commentId: string) => Promise<void>;
  uploadAttachment: (workspaceSlug: string, projectSlug: string, itemNumber: number, file: File) => Promise<void>;
  deleteAttachment: (workspaceSlug: string, projectSlug: string, itemNumber: number, attachmentId: string) => Promise<void>;
  addDependency: (workspaceSlug: string, projectSlug: string, itemNumber: number, blockingItemNumber: number) => Promise<void>;
  removeDependency: (workspaceSlug: string, projectSlug: string, itemNumber: number, depId: string) => Promise<void>;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  comments: [],
  attachments: [],
  activity: [],
  dependencies: [],
  loading: false,
  error: null,

  fetchCollaborationData: async (workspaceSlug, projectSlug, itemNumber) => {
    set({ loading: true, error: null });
    try {
      const baseUrl = `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}`;

      const [commentsRes, attachmentsRes, activityRes, depsRes] = await Promise.all([
        apiClient.get<WorkItemComment[]>(`${baseUrl}/comments/`),
        apiClient.get<WorkItemAttachment[]>(`${baseUrl}/attachments/`),
        apiClient.get<ActivityEvent[]>(`${baseUrl}/activity/`),
        apiClient.get<WorkItemDependency[]>(`${baseUrl}/dependencies/`),
      ]);

      set({
        comments: commentsRes.data,
        attachments: attachmentsRes.data,
        activity: activityRes.data,
        dependencies: depsRes.data,
        loading: false,
      });
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || err.message || 'Failed to load collaboration data',
        loading: false,
      });
    }
  },

  addComment: async (workspaceSlug, projectSlug, itemNumber, body) => {
    const res = await apiClient.post<WorkItemComment>(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}/comments/`,
      { body }
    );
    set((state) => ({
      comments: [...state.comments, res.data],
    }));
    // Refresh activity feed
    try {
      const actRes = await apiClient.get<ActivityEvent[]>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}/activity/`
      );
      set({ activity: actRes.data });
    } catch {}
  },

  deleteComment: async (workspaceSlug, projectSlug, itemNumber, commentId) => {
    await apiClient.delete(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}/comments/${commentId}/`
    );
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== commentId),
    }));
  },

  uploadAttachment: async (workspaceSlug, projectSlug, itemNumber, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.post<WorkItemAttachment>(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}/attachments/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    set((state) => ({
      attachments: [res.data, ...state.attachments],
    }));
    // Refresh activity feed
    try {
      const actRes = await apiClient.get<ActivityEvent[]>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}/activity/`
      );
      set({ activity: actRes.data });
    } catch {}
  },

  deleteAttachment: async (workspaceSlug, projectSlug, itemNumber, attachmentId) => {
    await apiClient.delete(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}/attachments/${attachmentId}/`
    );
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== attachmentId),
    }));
  },

  addDependency: async (workspaceSlug, projectSlug, itemNumber, blockingItemNumber) => {
    const res = await apiClient.post<WorkItemDependency>(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}/dependencies/`,
      { blocking_item_number: blockingItemNumber }
    );
    set((state) => ({
      dependencies: [...state.dependencies, res.data],
    }));
  },

  removeDependency: async (workspaceSlug, projectSlug, itemNumber, depId) => {
    await apiClient.delete(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/items/${itemNumber}/dependencies/${depId}/`
    );
    set((state) => ({
      dependencies: state.dependencies.filter((d) => d.id !== depId),
    }));
  },
}));
