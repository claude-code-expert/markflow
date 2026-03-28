import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (params: { message: string; type?: ToastType; duration?: number }) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const MAX_TOASTS = 3;

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: ({ message, type = 'info', duration }) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const autoDuration = duration ?? (type === 'error' ? 5000 : 3000);

    set((state) => {
      const newToasts = [...state.toasts, { id, message, type, duration: autoDuration }];
      if (newToasts.length > MAX_TOASTS) {
        return { toasts: newToasts.slice(-MAX_TOASTS) };
      }
      return { toasts: newToasts };
    });

    if (autoDuration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, autoDuration);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAll: () => {
    set({ toasts: [] });
  },
}));
