import { create } from 'zustand';
import { apiClient } from '../lib/api';

export interface UserSummary {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  owner: UserSummary;
  settings_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  current_user_role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
  members_count: number;
}

export interface WorkspaceMember {
  id: string;
  user: UserSummary;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'ACTIVE' | 'SUSPENDED';
  joined_at: string;
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expires_at: string;
  created_at: string;
  invited_by: UserSummary;
}

interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  isLoading: boolean;
  error: string | null;

  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (ws: Workspace | null) => void;
  createWorkspace: (name: string, description?: string) => Promise<Workspace>;
  updateWorkspace: (slug: string, data: Partial<Workspace>) => Promise<Workspace>;
  archiveWorkspace: (slug: string) => Promise<void>;

  fetchMembers: (slug: string) => Promise<void>;
  inviteMember: (slug: string, email: string, role: string) => Promise<{ invite: WorkspaceInvite; raw_token: string }>;
  removeMember: (slug: string, userId: string) => Promise<void>;
  updateMemberRole: (slug: string, userId: string, newRole: string) => Promise<void>;

  fetchInvites: (slug: string) => Promise<void>;
  revokeInvite: (slug: string, inviteId: string) => Promise<void>;
  acceptInvite: (token: string) => Promise<{ workspace: { id: string; name: string; slug: string }; role: string }>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  members: [],
  invites: [],
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get<Workspace[]>('/workspaces/');
      const workspaces = response.data;
      const currentActive = get().activeWorkspace;

      let nextActive: Workspace | null = null;
      if (currentActive) {
        nextActive = workspaces.find((w) => w.id === currentActive.id) || workspaces[0] || null;
      } else {
        nextActive = workspaces[0] || null;
      }

      set({ workspaces, activeWorkspace: nextActive, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.response?.data?.detail || 'Failed to fetch workspaces',
      });
    }
  },

  setActiveWorkspace: (ws: Workspace | null) => {
    set({ activeWorkspace: ws });
    if (ws) {
      get().fetchMembers(ws.slug);
    }
  },

  createWorkspace: async (name: string, description: string = '') => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post<Workspace>('/workspaces/', {
        name,
        description,
      });
      const newWorkspace = response.data;
      set((state) => ({
        workspaces: [newWorkspace, ...state.workspaces],
        activeWorkspace: newWorkspace,
        isLoading: false,
      }));
      return newWorkspace;
    } catch (err: any) {
      set({ isLoading: false });
      const message =
        err.response?.data?.name?.[0] ||
        err.response?.data?.detail ||
        'Failed to create workspace';
      throw new Error(message);
    }
  },

  updateWorkspace: async (slug: string, data: Partial<Workspace>) => {
    const response = await apiClient.patch<Workspace>(`/workspaces/${slug}/`, data);
    const updated = response.data;
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.slug === slug ? updated : w)),
      activeWorkspace: state.activeWorkspace?.slug === slug ? updated : state.activeWorkspace,
    }));
    return updated;
  },

  archiveWorkspace: async (slug: string) => {
    await apiClient.post(`/workspaces/${slug}/archive/`);
    set((state) => {
      const remaining = state.workspaces.filter((w) => w.slug !== slug);
      return {
        workspaces: remaining,
        activeWorkspace: remaining[0] || null,
      };
    });
  },

  fetchMembers: async (slug: string) => {
    try {
      const response = await apiClient.get<WorkspaceMember[]>(`/workspaces/${slug}/members/`);
      set({ members: response.data });
    } catch {
      // Ignored for non-members
    }
  },

  inviteMember: async (slug: string, email: string, role: string) => {
    const response = await apiClient.post(`/workspaces/${slug}/invites/`, {
      email,
      role,
    });
    const { raw_token, ...invite } = response.data;
    set((state) => ({ invites: [invite as WorkspaceInvite, ...state.invites] }));
    return { invite: invite as WorkspaceInvite, raw_token };
  },

  removeMember: async (slug: string, userId: string) => {
    await apiClient.delete(`/workspaces/${slug}/members/${userId}/`);
    set((state) => ({
      members: state.members.filter((m) => m.user.id !== userId),
    }));
  },

  updateMemberRole: async (slug: string, userId: string, newRole: string) => {
    const response = await apiClient.patch<WorkspaceMember>(
      `/workspaces/${slug}/members/${userId}/`,
      { role: newRole }
    );
    set((state) => ({
      members: state.members.map((m) => (m.user.id === userId ? response.data : m)),
    }));
  },

  fetchInvites: async (slug: string) => {
    try {
      const response = await apiClient.get<WorkspaceInvite[]>(`/workspaces/${slug}/invites/`);
      set({ invites: response.data });
    } catch {
      // Handled silently
    }
  },

  revokeInvite: async (slug: string, inviteId: string) => {
    await apiClient.delete(`/workspaces/${slug}/invites/${inviteId}/`);
    set((state) => ({
      invites: state.invites.filter((inv) => inv.id !== inviteId),
    }));
  },

  acceptInvite: async (token: string) => {
    const response = await apiClient.post('/workspaces/invites/accept/', { token });
    await get().fetchWorkspaces();
    return response.data;
  },
}));
