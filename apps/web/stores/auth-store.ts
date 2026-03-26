import { create } from 'zustand';
import { apiFetch, setAccessToken, clearAccessToken } from '../lib/api';
import type { User, LoginResponse, UserResponse } from '../lib/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password, rememberMe = false) => {
    const response = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, rememberMe },
    });
    setAccessToken(response.accessToken);
    set({ user: response.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      clearAccessToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  fetchUser: async () => {
    try {
      const response = await apiFetch<UserResponse>('/users/me');
      set({ user: response.user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
