'use client'

import { toast as globalToast, ToastVariant } from './toaster'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
}

export function useToast() {
  return {
    toast: (options: ToastOptions) => globalToast(options),
  }
}

// Re-export for direct usage
export { toast } from './toaster'
