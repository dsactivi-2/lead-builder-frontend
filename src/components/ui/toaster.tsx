'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type ToastVariant = 'default' | 'destructive'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

// Global toast state
let toastListeners: ((toasts: Toast[]) => void)[] = []
let toasts: Toast[] = []
let toastCounter = 0

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]))
}

export function toast({ title, description, variant = 'default' }: Omit<Toast, 'id'>) {
  const id = `toast-${++toastCounter}`
  const newToast: Toast = { id, title, description, variant }
  toasts = [...toasts, newToast]
  notifyListeners()

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notifyListeners()
  }, 4000)
}

export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    toastListeners.push(setCurrentToasts)
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setCurrentToasts)
    }
  }, [])

  if (currentToasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {currentToasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-full duration-300',
            t.variant === 'destructive'
              ? 'bg-red-600 text-white border-red-700'
              : 'bg-white text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-700'
          )}
          data-testid="ui.toast"
        >
          <div className="font-semibold text-sm">{t.title}</div>
          {t.description && <div className="text-sm opacity-90 mt-1">{t.description}</div>}
        </div>
      ))}
    </div>
  )
}
