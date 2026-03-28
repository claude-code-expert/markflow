import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore } from '../../stores/toast-store';

describe('toast-store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a toast with default info type', () => {
    useToastStore.getState().addToast({ message: 'Hello' });
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.message).toBe('Hello');
    expect(toasts[0]!.type).toBe('info');
  });

  it('adds a success toast with 3s duration', () => {
    useToastStore.getState().addToast({ message: 'Saved', type: 'success' });
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0]!.type).toBe('success');
    expect(toasts[0]!.duration).toBe(3000);
  });

  it('adds an error toast with 5s duration', () => {
    useToastStore.getState().addToast({ message: 'Error', type: 'error' });
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0]!.type).toBe('error');
    expect(toasts[0]!.duration).toBe(5000);
  });

  it('auto-removes toast after duration', () => {
    useToastStore.getState().addToast({ message: 'Temporary', type: 'success' });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(3000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('limits toasts to max 3, removing oldest', () => {
    const { addToast } = useToastStore.getState();
    addToast({ message: 'First', duration: 0 });
    addToast({ message: 'Second', duration: 0 });
    addToast({ message: 'Third', duration: 0 });
    addToast({ message: 'Fourth', duration: 0 });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(3);
    expect(toasts[0]!.message).toBe('Second');
    expect(toasts[2]!.message).toBe('Fourth');
  });

  it('removes a specific toast by id', () => {
    useToastStore.getState().addToast({ message: 'Keep', duration: 0 });
    useToastStore.getState().addToast({ message: 'Remove', duration: 0 });
    const toasts = useToastStore.getState().toasts;
    const removeId = toasts[1]!.id;

    useToastStore.getState().removeToast(removeId);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    const remaining = useToastStore.getState().toasts;
    expect(remaining[0]!.message).toBe('Keep');
  });

  it('clears all toasts', () => {
    useToastStore.getState().addToast({ message: 'One', duration: 0 });
    useToastStore.getState().addToast({ message: 'Two', duration: 0 });
    useToastStore.getState().clearAll();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
