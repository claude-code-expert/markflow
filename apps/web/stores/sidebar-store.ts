import { create } from 'zustand';

interface SidebarState {
  expandedCategoryIds: Set<string>;
  isSidebarOpen: boolean;
  toggleCategory: (id: string) => void;
  toggleSidebar: () => void;
  expandCategory: (id: string) => void;
  collapseCategory: (id: string) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  expandedCategoryIds: new Set<string>(),
  isSidebarOpen: true,

  toggleCategory: (id) =>
    set((state) => {
      const next = new Set(state.expandedCategoryIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { expandedCategoryIds: next };
    }),

  expandCategory: (id) =>
    set((state) => {
      if (state.expandedCategoryIds.has(id)) return state;
      const next = new Set(state.expandedCategoryIds);
      next.add(id);
      return { expandedCategoryIds: next };
    }),

  collapseCategory: (id) =>
    set((state) => {
      if (!state.expandedCategoryIds.has(id)) return state;
      const next = new Set(state.expandedCategoryIds);
      next.delete(id);
      return { expandedCategoryIds: next };
    }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
