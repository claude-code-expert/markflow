import { create } from 'zustand';

const STORAGE_KEY = 'mf-sidebar-expanded';
const SIDEBAR_OPEN_KEY = 'mf-sidebar-open';

function loadExpanded(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {
    // ignore
  }
  return new Set();
}

function saveExpanded(ids: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function loadSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(SIDEBAR_OPEN_KEY);
    if (raw !== null) return raw === 'true';
  } catch {
    // ignore
  }
  return true;
}

interface SidebarState {
  expandedCategoryIds: Set<number>;
  isSidebarOpen: boolean;
  refreshKey: number;
  toggleCategory: (id: number) => void;
  toggleSidebar: () => void;
  expandCategory: (id: number) => void;
  collapseCategory: (id: number) => void;
  refresh: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  expandedCategoryIds: loadExpanded(),
  isSidebarOpen: loadSidebarOpen(),
  refreshKey: 0,

  toggleCategory: (id) =>
    set((state) => {
      const next = new Set(state.expandedCategoryIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveExpanded(next);
      return { expandedCategoryIds: next };
    }),

  expandCategory: (id) =>
    set((state) => {
      if (state.expandedCategoryIds.has(id)) return state;
      const next = new Set(state.expandedCategoryIds);
      next.add(id);
      saveExpanded(next);
      return { expandedCategoryIds: next };
    }),

  collapseCategory: (id) =>
    set((state) => {
      if (!state.expandedCategoryIds.has(id)) return state;
      const next = new Set(state.expandedCategoryIds);
      next.delete(id);
      saveExpanded(next);
      return { expandedCategoryIds: next };
    }),

  toggleSidebar: () =>
    set((state) => {
      const next = !state.isSidebarOpen;
      try {
        localStorage.setItem(SIDEBAR_OPEN_KEY, String(next));
      } catch {
        // ignore
      }
      return { isSidebarOpen: next };
    }),

  refresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
