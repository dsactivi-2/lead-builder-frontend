'use client'

import { AlertCircle, WifiOff, Clock, Lock, Search, Copy, Timer, Server, RefreshCw, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ApiError, ApiErrorKind } from '@/lib/errors'

interface ErrorPanelProps {
  error: ApiError
  onRetry?: () => void
  onReset?: () => void
}

const iconMap: Record<ApiErrorKind, React.ReactNode> = {
  network: <WifiOff className="h-5 w-5" />,
  timeout: <Clock className="h-5 w-5" />,
  validation: <AlertCircle className="h-5 w-5" />,
  permission: <Lock className="h-5 w-5" />,
  not_found: <Search className="h-5 w-5" />,
  conflict: <Copy className="h-5 w-5" />,
  rate_limit: <Timer className="h-5 w-5" />,
  server: <Server className="h-5 w-5" />,
}

const colorMap: Record<ApiErrorKind, string> = {
  network: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  timeout: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  validation: 'bg-red-100 text-red-800 border-red-300',
  permission: 'bg-red-100 text-red-800 border-red-300',
  not_found: 'bg-gray-100 text-gray-800 border-gray-300',
  conflict: 'bg-orange-100 text-orange-800 border-orange-300',
  rate_limit: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  server: 'bg-red-100 text-red-800 border-red-300',
}

const labelMap: Record<ApiErrorKind, string> = {
  network: 'Netzwerkfehler',
  timeout: 'Zeitüberschreitung',
  validation: 'Ungültige Eingabe',
  permission: 'Keine Berechtigung',
  not_found: 'Nicht gefunden',
  conflict: 'Konflikt',
  rate_limit: 'Zu viele Anfragen',
  server: 'Serverfehler',
}

export function ErrorPanel({ error, onRetry, onReset }: ErrorPanelProps) {
  const icon = iconMap[error.kind]
  const colorClasses = colorMap[error.kind]
  const label = labelMap[error.kind]

  return (
    <Card
      className={`border-2 ${colorClasses}`}
      data-testid="error.panel"
      data-error-kind={error.kind}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-3" data-testid={`error.kind.${error.kind}`}>
          <div className="flex-shrink-0 mt-0.5">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {label}
              </Badge>
              {error.statusCode && (
                <Badge variant="secondary" className="text-xs">
                  HTTP {error.statusCode}
                </Badge>
              )}
            </div>
            <p className="text-sm font-medium" data-testid="error.message">
              {error.message}
            </p>
            {error.retryable && (
              <p className="text-xs text-muted-foreground mt-1">
                Dieser Fehler kann erneut versucht werden.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {error.retryable && onRetry && (
            <Button
              variant="default"
              size="sm"
              onClick={onRetry}
              data-testid="error.retry-button"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Erneut versuchen
            </Button>
          )}
          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              data-testid="error.reset-button"
            >
              <X className="h-4 w-4 mr-1" />
              Zurücksetzen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
