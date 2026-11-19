import { create } from 'zustand';
import { apiClient } from '../lib/api';
import type { UserSummary } from './workspaceStore';
import type { WorkItem } from './backlogStore';

export interface Sprint {
  id: string;
  name: string;
  sprint_goal: string;
  start_date: string | null;
  end_date: string | null;
  actual_started_at: string | null;
  actual_completed_at: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  planned_story_points: number;
  completed_story_points: number;
  created_by: UserSummary | null;
  created_at: string;
  updated_at: string;
  total_items: number;
  total_story_points: number;
  done_items: number;
  done_story_points: number;
  items?: WorkItem[];
}

export interface KanbanBoardData {
  active_sprint: Sprint | null;
  days_remaining: number;
  columns: {
    TODO: WorkItem[];
    IN_PROGRESS: WorkItem[];
    IN_REVIEW: WorkItem[];
    DONE: WorkItem[];
  };
}

interface SprintState {
  sprints: Sprint[];
  activeSprint: Sprint | null;
  boardData: KanbanBoardData | null;
  isLoading: boolean;
  error: string | null;

  fetchSprints: (workspaceSlug: string, projectSlug: string) => Promise<Sprint[]>;
  createSprint: (
    workspaceSlug: string,
    projectSlug: string,
    data: {
      name: string;
      sprint_goal?: string;
      start_date?: string | null;
      end_date?: string | null;
    }
  ) => Promise<Sprint>;
  startSprint: (
    workspaceSlug: string,
    projectSlug: string,
    sprintId: string,
    data: {
      sprint_goal: string;
      start_date?: string | null;
      end_date?: string | null;
    }
  ) => Promise<Sprint>;
  completeSprint: (
    workspaceSlug: string,
    projectSlug: string,
    sprintId: string,
    data: {
      rollover_to_backlog?: boolean;
      next_sprint_id?: string | null;
    }
  ) => Promise<Sprint>;
  cancelSprint: (workspaceSlug: string, projectSlug: string, sprintId: string) => Promise<Sprint>;
  addItemsToSprint: (
    workspaceSlug: string,
    projectSlug: string,
    sprintId: string,
    itemNumbers: number[]
  ) => Promise<void>;
  removeItemsFromSprint: (
    workspaceSlug: string,
    projectSlug: string,
    sprintId: string,
    itemNumbers: number[]
  ) => Promise<void>;
  fetchBoard: (workspaceSlug: string, projectSlug: string) => Promise<KanbanBoardData>;
  transitionWorkItemStatus: (
    workspaceSlug: string,
    projectSlug: string,
    itemNumber: number,
    newStatus: string
  ) => Promise<void>;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  sprints: [],
  activeSprint: null,
  boardData: null,
  isLoading: false,
  error: null,

  fetchSprints: async (workspaceSlug, projectSlug) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<Sprint[]>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/`
      );
      const sprints = response.data;
      const active = sprints.find((s) => s.status === 'ACTIVE') || null;
      set({ sprints, activeSprint: active, isLoading: false });
      return sprints;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.detail || 'Failed to fetch sprints',
      });
      return [];
    }
  },

  createSprint: async (workspaceSlug, projectSlug, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<Sprint>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/`,
        data
      );
      const newSprint = response.data;
      set((state) => ({
        sprints: [newSprint, ...state.sprints],
        isLoading: false,
      }));
      return newSprint;
    } catch (err: any) {
      set({ isLoading: false });
      const message =
        err.response?.data?.name?.[0] ||
        err.response?.data?.end_date?.[0] ||
        err.response?.data?.detail ||
        'Failed to create sprint';
      throw new Error(message);
    }
  },

  startSprint: async (workspaceSlug, projectSlug, sprintId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<Sprint>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/${sprintId}/start/`,
        data
      );
      const started = response.data;
      set((state) => ({
        sprints: state.sprints.map((s) => (s.id === started.id ? started : s)),
        activeSprint: started,
        isLoading: false,
      }));
      return started;
    } catch (err: any) {
      set({ isLoading: false });
      const message =
        err.response?.data?.sprint_goal?.[0] ||
        err.response?.data?.end_date?.[0] ||
        (Array.isArray(err.response?.data) ? err.response?.data[0] : null) ||
        err.response?.data?.detail ||
        'Failed to start sprint';
      throw new Error(message);
    }
  },

  completeSprint: async (workspaceSlug, projectSlug, sprintId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<Sprint>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/${sprintId}/complete/`,
        data
      );
      const completed = response.data;
      set((state) => ({
        sprints: state.sprints.map((s) => (s.id === completed.id ? completed : s)),
        activeSprint: state.activeSprint?.id === sprintId ? null : state.activeSprint,
        isLoading: false,
      }));
      // Refresh board
      get().fetchBoard(workspaceSlug, projectSlug);
      return completed;
    } catch (err: any) {
      set({ isLoading: false });
      const message =
        (Array.isArray(err.response?.data) ? err.response?.data[0] : null) ||
        err.response?.data?.detail ||
        'Failed to complete sprint';
      throw new Error(message);
    }
  },

  cancelSprint: async (workspaceSlug, projectSlug, sprintId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<Sprint>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/${sprintId}/cancel/`
      );
      const cancelled = response.data;
      set((state) => ({
        sprints: state.sprints.map((s) => (s.id === cancelled.id ? cancelled : s)),
        activeSprint: state.activeSprint?.id === sprintId ? null : state.activeSprint,
        isLoading: false,
      }));
      get().fetchBoard(workspaceSlug, projectSlug);
      return cancelled;
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.detail || 'Failed to cancel sprint');
    }
  },

  addItemsToSprint: async (workspaceSlug, projectSlug, sprintId, itemNumbers) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/${sprintId}/add-items/`,
        { item_numbers: itemNumbers }
      );
      await get().fetchSprints(workspaceSlug, projectSlug);
      await get().fetchBoard(workspaceSlug, projectSlug);
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.detail || 'Failed to add items to sprint');
    }
  },

  removeItemsFromSprint: async (workspaceSlug, projectSlug, sprintId, itemNumbers) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.post(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/sprints/${sprintId}/remove-items/`,
        { item_numbers: itemNumbers }
      );
      await get().fetchSprints(workspaceSlug, projectSlug);
      await get().fetchBoard(workspaceSlug, projectSlug);
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.detail || 'Failed to remove items from sprint');
    }
  },

  fetchBoard: async (workspaceSlug, projectSlug) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<KanbanBoardData>(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/board/`
      );
      set({
        boardData: response.data,
        activeSprint: response.data.active_sprint,
        isLoading: false,
      });
      return response.data;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.detail || 'Failed to load board',
      });
      return {
        active_sprint: null,
        days_remaining: 0,
        columns: { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] },
      };
    }
  },

  transitionWorkItemStatus: async (workspaceSlug, projectSlug, itemNumber, newStatus) => {
    try {
      // Optimistic update on boardData
      const prevBoard = get().boardData;
      if (prevBoard) {
        let movedItem: WorkItem | null = null;
        const newCols: typeof prevBoard.columns = {
          TODO: [],
          IN_PROGRESS: [],
          IN_REVIEW: [],
          DONE: [],
        };

        for (const colKey of Object.keys(prevBoard.columns) as (keyof typeof prevBoard.columns)[]) {
          for (const itm of prevBoard.columns[colKey]) {
            if (itm.item_number === itemNumber) {
              movedItem = { ...itm, status: newStatus as any };
            } else {
              newCols[colKey].push(itm);
            }
          }
        }

        if (movedItem && (newStatus in newCols)) {
          (newCols as any)[newStatus].push(movedItem);
          set({
            boardData: {
              ...prevBoard,
              columns: newCols,
            },
          });
        }
      }

      await apiClient.post(
        `/workspaces/${workspaceSlug}/projects/${projectSlug}/work-items/${itemNumber}/status/`,
        { status: newStatus }
      );
    } catch (err: any) {
      // Rollback on failure
      get().fetchBoard(workspaceSlug, projectSlug);
      throw new Error(err.response?.data?.status?.[0] || 'Failed to transition card status');
    }
  },
}));
