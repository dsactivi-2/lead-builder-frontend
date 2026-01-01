'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from './button'
import { useDarkMode } from '@/hooks/useDarkMode'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useDarkMode()

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      title={`Theme: ${theme} (${resolvedTheme})`}
      data-testid="theme-toggle"
    >
      {theme === 'system' ? (
        <Monitor className="h-4 w-4" />
      ) : resolvedTheme === 'dark' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  )
}
