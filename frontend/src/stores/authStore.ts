import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const getStoredRefreshToken = () => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('taskflow_rf') : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: getStoredRefreshToken(),
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    if (refreshToken) {
      try {
        localStorage.setItem('taskflow_rf', refreshToken);
      } catch {
        // ignore
      }
    }
    set({
      user,
      accessToken,
      refreshToken: refreshToken || getStoredRefreshToken(),
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setAccessToken: (accessToken) =>
    set({
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    }),

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    }),

  logout: () => {
    try {
      localStorage.removeItem('taskflow_rf');
    } catch {
      // ignore
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
