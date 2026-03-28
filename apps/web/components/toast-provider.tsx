'use client';

import { useToastStore } from '../stores/toast-store';
import type { Toast, ToastType } from '../stores/toast-store';

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-gray-900 text-white',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium
        animate-in slide-in-from-bottom-2 fade-in duration-200
        ${typeStyles[toast.type]}`}
      role="alert"
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="opacity-70 hover:opacity-100 text-current"
        aria-label="닫기"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}
