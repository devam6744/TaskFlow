import { create } from 'zustand';
import { apiClient } from '../lib/api';
import type { UserSummary } from './workspaceStore';

export interface Project {
  id: string;
  name: string;
  slug: string;
  key: string;
  description: string;
  visibility: 'WORKSPACE' | 'PRIVATE';
  status: 'ACTIVE' | 'ARCHIVED';
  lead: UserSummary | null;
  created_by: UserSummary;
  start_date: string | null;
  target_date: string | null;
  definition_of_done: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  backlog_count: number;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: (workspaceSlug: string) => Promise<Project[]>;
  setActiveProject: (project: Project | null) => void;
  createProject: (
    workspaceSlug: string,
    data: {
      name: string;
      key?: string;
      description?: string;
      visibility?: 'WORKSPACE' | 'PRIVATE';
      definition_of_done?: string;
    }
  ) => Promise<Project>;
  archiveProject: (workspaceSlug: string, projectSlug: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async (workspaceSlug: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<Project[]>(`/workspaces/${workspaceSlug}/projects/`);
      const projects = response.data;
      const currentActive = get().activeProject;

      let nextActive: Project | null = null;
      if (currentActive) {
        nextActive = projects.find((p) => p.id === currentActive.id) || projects[0] || null;
      } else {
        nextActive = projects[0] || null;
      }

      set({ projects, activeProject: nextActive, isLoading: false });
      return projects;
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.detail || 'Failed to fetch projects',
      });
      return [];
    }
  },

  setActiveProject: (project: Project | null) => {
    set({ activeProject: project });
  },

  createProject: async (workspaceSlug: string, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<Project>(
        `/workspaces/${workspaceSlug}/projects/`,
        data
      );
      const newProject = response.data;
      set((state) => ({
        projects: [newProject, ...state.projects],
        activeProject: newProject,
        isLoading: false,
      }));
      return newProject;
    } catch (err: any) {
      set({ isLoading: false });
      const message =
        err.response?.data?.name?.[0] ||
        err.response?.data?.key?.[0] ||
        err.response?.data?.detail ||
        'Failed to create project';
      throw new Error(message);
    }
  },

  archiveProject: async (workspaceSlug: string, projectSlug: string) => {
    await apiClient.post(`/workspaces/${workspaceSlug}/projects/${projectSlug}/archive/`);
    set((state) => {
      const remaining = state.projects.filter((p) => p.slug !== projectSlug);
      return {
        projects: remaining,
        activeProject: remaining[0] || null,
      };
    });
  },
}));
