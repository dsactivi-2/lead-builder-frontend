'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Etwas ist schiefgelaufen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
          </p>
          {error.message && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} data-testid="error-retry">
              Erneut versuchen
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Zur Startseite
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
