import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import type { Workspace, WorkspacesResponse } from '../lib/types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (ws: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,

  fetchWorkspaces: async () => {
    set({ isLoading: true });
    try {
      const response = await apiFetch<WorkspacesResponse>('/workspaces');
      set({ workspaces: response.workspaces, isLoading: false });
    } catch {
      set({ workspaces: [], isLoading: false });
    }
  },

  setCurrentWorkspace: (ws) => set({ currentWorkspace: ws }),
}));
