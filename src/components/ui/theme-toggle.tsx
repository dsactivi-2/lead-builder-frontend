"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

type Theme = "light" | "dark" | "system"

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("system")

  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored) setTheme(stored)
  }, [])

  React.useEffect(() => {
    const root = document.documentElement
    localStorage.setItem("theme", theme)

    if (theme === "dark") {
      root.classList.add("dark")
    } else if (theme === "light") {
      root.classList.remove("dark")
    } else {
      // system
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (systemDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
  }, [theme])

  const cycleTheme = () => {
    setTheme((current) => {
      if (current === "light") return "dark"
      if (current === "dark") return "system"
      return "light"
    })
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor

  return (
    <Button variant="ghost" size="icon" onClick={cycleTheme} data-testid="theme-toggle" aria-label="Toggle theme">
      <Icon className="h-5 w-5" />
    </Button>
  )
}
