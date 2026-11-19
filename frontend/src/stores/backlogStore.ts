import { create } from 'zustand';
import { apiClient } from '../lib/api';
import type { UserSummary } from './workspaceStore';

export interface WorkItem {
  id: string;
  item_number: number;
  key_identifier: string;
  title: string;
  description: string;
  type: 'STORY' | 'TASK' | 'BUG' | 'IMPROVEMENT';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  story_points: number | null;
  acceptance_criteria: string;
  reporter: UserSummary;
  assignee: UserSummary | null;
  due_date: string | null;
  backlog_order: number;
  sprint_id: string | null;
  created_at: string;
  updated_at: string;
}

interface BacklogState {
  workItems: WorkItem[];
  isLoading: boolean;
  error: string | null;

  fetchBacklog: (workspaceSlug: string, projectSlug: string) => Promise<WorkItem[]>;
  createWorkItem: (
    workspaceSlug: string,
    projectSlug: string,
    data: {
      title: string;
      type?: string;
      priority?: string;
      description?: string;
      story_points?: number | null;
      acceptance_criteria?: string;
      assignee_id?: string | null;
      due_date?: string | null;
    }
  ) => Promise<WorkItem>;
  updateWorkItem: (
    workspaceSlug: string,
    projectSlug: string,
    itemNumber: number,
    data: Partial<WorkItem> & { assignee_id?: string | null }
  ) => Promise<WorkItem>;
  reorderWorkItem: (
    workspaceSlug: string,
    projectSlug: string,
    itemNumber: number,
    prevItemId?: string | null,
    nextItemId?: string | null
  ) => Promise<WorkItem>;
  deleteWorkItem: (workspaceSlug: string, projectSlug: string, itemNumber: number) => Promise<void>;
}

export const useBacklogStore = create<BacklogState>((set) => ({
  workItems: [],
  isLoading: false,
  error: null,

  fetchBacklog: async (workspaceSlug: string, projectSlug: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<WorkItem[]>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/backlog/`
      );
      set({ workItems: response.data, isLoading: false });
      return response.data;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.detail || 'Failed to fetch backlog',
      });
      return [];
    }
  },

  createWorkItem: async (workspaceSlug: string, projectSlug: string, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<WorkItem>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/backlog/`,
        data
      );
      const newItem = response.data;
      set((state) => ({
        workItems: [...state.workItems, newItem],
        isLoading: false,
      }));
      return newItem;
    } catch (err: any) {
      set({ isLoading: false });
      const message =
        err.response?.data?.title?.[0] ||
        err.response?.data?.story_points?.[0] ||
        err.response?.data?.detail ||
        'Failed to create work item';
      throw new Error(message);
    }
  },

  updateWorkItem: async (workspaceSlug: string, projectSlug: string, itemNumber: number, data) => {
    const response = await apiClient.patch<WorkItem>(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/work-items/${itemNumber}/`,
      data
    );
    const updated = response.data;
    set((state) => ({
      workItems: state.workItems.map((item) => (item.id === updated.id ? updated : item)),
    }));
    return updated;
  },

  reorderWorkItem: async (workspaceSlug: string, projectSlug: string, itemNumber: number, prevItemId, nextItemId) => {
    const response = await apiClient.post<WorkItem>(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/work-items/${itemNumber}/reorder/`,
      {
        prev_item_id: prevItemId || null,
        next_item_id: nextItemId || null,
      }
    );
    const reordered = response.data;

    // Refetch or locally resort by backlog_order
    set((state) => {
      const updated = state.workItems.map((item) => (item.id === reordered.id ? reordered : item));
      updated.sort((a, b) => a.backlog_order - b.backlog_order);
      return { workItems: updated };
    });

    return reordered;
  },

  deleteWorkItem: async (workspaceSlug: string, projectSlug: string, itemNumber: number) => {
    await apiClient.delete(
      `/workspaces/${workspaceSlug}/projects/${projectSlug}/work-items/${itemNumber}/`
    );
    set((state) => ({
      workItems: state.workItems.filter((item) => item.item_number !== itemNumber),
    }));
  },
}));
