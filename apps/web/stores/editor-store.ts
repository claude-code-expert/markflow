import { create } from 'zustand';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface EditorState {
  documentId: string | null;
  content: string;
  title: string;
  saveStatus: SaveStatus;
  setDocument: (id: string, title: string, content: string) => void;
  setContent: (content: string) => void;
  setTitle: (title: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  documentId: null,
  content: '',
  title: '',
  saveStatus: 'saved',

  setDocument: (id, title, content) =>
    set({ documentId: id, title, content, saveStatus: 'saved' }),

  setContent: (content) => set({ content, saveStatus: 'unsaved' }),

  setTitle: (title) => set({ title, saveStatus: 'unsaved' }),

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  reset: () =>
    set({
      documentId: null,
      content: '',
      title: '',
      saveStatus: 'saved',
    }),
}));
