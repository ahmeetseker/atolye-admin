import { useSyncExternalStore } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  variant?: ToastVariant
  duration?: number
}

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration: number
  createdAt: number
}

/** Maximum number of toasts visible simultaneously. Older ones are evicted FIFO. */
export const MAX_VISIBLE = 3
/** Default auto-dismiss in ms. */
export const DEFAULT_DURATION = 4000

type Listener = () => void

let toasts: Toast[] = []
const listeners = new Set<Listener>()
let idCounter = 0

function emit() {
  for (const l of listeners) l()
}

function subscribe(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function getSnapshot() {
  return toasts
}

function getServerSnapshot() {
  return toasts
}

/** Push a new toast onto the queue. Newest on top; older ones evicted past MAX_VISIBLE. */
export function pushToast(message: string, opts: ToastOptions = {}): string {
  idCounter += 1
  const id = `t-${idCounter}-${Date.now()}`
  const next: Toast = {
    id,
    message,
    variant: opts.variant ?? 'info',
    duration: opts.duration ?? DEFAULT_DURATION,
    createdAt: Date.now(),
  }
  // newest first
  const merged = [next, ...toasts]
  // FIFO eviction past the cap so the visible stack never exceeds MAX_VISIBLE
  toasts = merged.slice(0, MAX_VISIBLE)
  emit()
  return id
}

export function dismissToast(id: string) {
  const before = toasts.length
  toasts = toasts.filter((t) => t.id !== id)
  if (toasts.length !== before) emit()
}

export function clearToasts() {
  if (toasts.length === 0) return
  toasts = []
  emit()
}

/**
 * React subscription hook — returns current toasts via useSyncExternalStore so
 * the store stays plain TS (no provider, no context, no extra deps).
 */
export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Consumer API. Stable callbacks — safe to use in effect deps. */
export function useToast(): {
  toast: (message: string, opts?: ToastOptions) => string
  dismiss: (id: string) => void
  clear: () => void
} {
  return {
    toast: pushToast,
    dismiss: dismissToast,
    clear: clearToasts,
  }
}
