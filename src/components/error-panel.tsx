"use client"

import { AlertCircle, WifiOff, Clock, Lock, Search, Copy, Timer, Server, RotateCw, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ApiError } from "@/lib/errors"
import { errorUIMap } from "@/lib/errors"

const iconMap = {
  WifiOff,
  Clock,
  AlertCircle,
  Lock,
  Search,
  Copy,
  Timer,
  Server,
}

interface ErrorPanelProps {
  error: ApiError
  onRetry?: () => void
  onReset?: () => void
}

export function ErrorPanel({ error, onRetry, onReset }: ErrorPanelProps) {
  const uiConfig = errorUIMap[error.kind]
  const IconComponent = iconMap[uiConfig.icon as keyof typeof iconMap] || AlertCircle

  const colorClasses = {
    yellow: "border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    red: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
    orange: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    gray: "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
  }

  return (
    <div data-testid="error.panel" data-error-kind={error.kind} className="w-full p-4">
      <Alert
        className={colorClasses[uiConfig.color as keyof typeof colorClasses]}
        data-testid={`error.kind.${error.kind}`}
      >
        <IconComponent className="h-5 w-5" />
        <AlertTitle className="font-semibold">Error: {error.kind}</AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p data-testid="error.message" className="text-sm">
            {error.message}
          </p>
          {error.statusCode && <p className="text-xs opacity-70">Status Code: {error.statusCode}</p>}
          <div className="flex gap-2 mt-4">
            {error.retryable && onRetry && (
              <Button
                data-testid="error.retry-button"
                onClick={onRetry}
                size="sm"
                variant="outline"
                className="gap-2 bg-transparent"
              >
                <RotateCw className="h-4 w-4" />
                {uiConfig.action}
              </Button>
            )}
            {onReset && (
              <Button data-testid="error.reset-button" onClick={onReset} size="sm" variant="ghost" className="gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
