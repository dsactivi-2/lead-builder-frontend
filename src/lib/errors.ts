// Error Classification System

export type ApiErrorKind =
  | "network" // Keine Verbindung, DNS, etc.
  | "timeout" // Request timed out (20s)
  | "validation" // 400 Bad Request, ungültige Daten
  | "permission" // 401/403 Unauthorized/Forbidden
  | "not_found" // 404 Resource nicht gefunden
  | "conflict" // 409 Conflict (z.B. Duplicate Title)
  | "rate_limit" // 429 Too Many Requests
  | "server" // 500+ Server Error

export interface ApiError {
  kind: ApiErrorKind
  message: string
  statusCode?: number
  retryable: boolean
  details?: Record<string, unknown>
}

export function classifyError(error: unknown, statusCode?: number): ApiError {
  // Network/Timeout
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return {
        kind: "timeout",
        message: "Request timed out after 20 seconds",
        retryable: true,
      }
    }
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to fetch")
    ) {
      return {
        kind: "network",
        message: "Network connection failed",
        retryable: true,
      }
    }
  }

  // HTTP Status Codes
  if (statusCode) {
    if (statusCode === 400) {
      return {
        kind: "validation",
        message: "Invalid request data",
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 401) {
      return {
        kind: "permission",
        message: "Unauthorized - authentication required",
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 403) {
      return {
        kind: "permission",
        message: "Forbidden - access denied",
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 404) {
      return {
        kind: "not_found",
        message: "Resource not found",
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 409) {
      return {
        kind: "conflict",
        message: "Conflict - resource already exists",
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 429) {
      return {
        kind: "rate_limit",
        message: "Too many requests - please wait",
        statusCode,
        retryable: true,
      }
    }
    if (statusCode >= 500) {
      return {
        kind: "server",
        message: "Server error - please try again",
        statusCode,
        retryable: true,
      }
    }
  }

  // Default fallback
  const message = error instanceof Error ? error.message : "Unknown error occurred"
  return {
    kind: "server",
    message,
    retryable: true,
  }
}

// Error UI Mapping for consistent UX
export const errorUIMap: Record<ApiErrorKind, { icon: string; action: string; color: string }> = {
  network: { icon: "WifiOff", action: "Check your connection", color: "yellow" },
  timeout: { icon: "Clock", action: "Try again", color: "yellow" },
  validation: { icon: "AlertCircle", action: "Check your input", color: "red" },
  permission: { icon: "Lock", action: "Login required", color: "red" },
  not_found: { icon: "Search", action: "Resource not found", color: "gray" },
  conflict: { icon: "Copy", action: "Use a different title", color: "orange" },
  rate_limit: { icon: "Timer", action: "Wait and retry", color: "yellow" },
  server: { icon: "Server", action: "Try again later", color: "red" },
}
