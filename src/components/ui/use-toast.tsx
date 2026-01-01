'use client'

import { useState, useCallback } from 'react'

export type ToastVariant = 'default' | 'destructive'

export interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastState {
  toasts: Toast[]
}

let toastCounter = 0

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
      const id = `toast-${++toastCounter}`
      const newToast: Toast = { id, title, description, variant }

      setState((prev) => ({ toasts: [...prev.toasts, newToast] }))

      // Auto-dismiss nach 3 Sekunden
      setTimeout(() => {
        setState((prev) => ({
          toasts: prev.toasts.filter((t) => t.id !== id),
        }))
      }, 3000)

      // Console log für Debugging (da wir kein visuelles Toast-UI haben)
      const prefix = variant === 'destructive' ? '❌' : '✅'
      console.log(`${prefix} Toast: ${title}${description ? ` - ${description}` : ''}`)
    },
    []
  )

  const dismiss = useCallback((id: string) => {
    setState((prev) => ({
      toasts: prev.toasts.filter((t) => t.id !== id),
    }))
  }, [])

  return {
    toast,
    toasts: state.toasts,
    dismiss,
  }
}
