/**
 * API Error Classification System
 * Classifies errors by type for appropriate UI handling
 */

export type ApiErrorKind =
  | 'network'      // No connection, DNS failure, etc.
  | 'timeout'      // Request timed out (20s)
  | 'validation'   // 400 Bad Request, invalid data
  | 'permission'   // 401/403 Unauthorized/Forbidden
  | 'not_found'    // 404 Resource not found
  | 'conflict'     // 409 Conflict (e.g., duplicate title)
  | 'rate_limit'   // 429 Too Many Requests
  | 'server'       // 500+ Server Error

export interface ApiError {
  kind: ApiErrorKind
  message: string
  statusCode?: number
  retryable: boolean
  details?: Record<string, unknown>
}

/**
 * Classify an error based on its type and HTTP status code
 */
export function classifyError(error: unknown, statusCode?: number): ApiError {
  // Network/Timeout errors
  if (error instanceof Error) {
    if (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout')) {
      return {
        kind: 'timeout',
        message: 'Request timed out. Please try again.',
        retryable: true,
      }
    }
    if (
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('failed to fetch')
    ) {
      return {
        kind: 'network',
        message: 'Network error. Check your connection.',
        retryable: true,
      }
    }
  }

  // HTTP Status Code classification
  if (statusCode) {
    if (statusCode === 400) {
      return {
        kind: 'validation',
        message: 'Invalid request data.',
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 401) {
      return {
        kind: 'permission',
        message: 'Authentication required.',
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 403) {
      return {
        kind: 'permission',
        message: 'Access denied.',
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 404) {
      return {
        kind: 'not_found',
        message: 'Resource not found.',
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 409) {
      return {
        kind: 'conflict',
        message: 'Conflict - resource already exists.',
        statusCode,
        retryable: false,
      }
    }
    if (statusCode === 429) {
      return {
        kind: 'rate_limit',
        message: 'Too many requests. Please wait.',
        statusCode,
        retryable: true,
      }
    }
    if (statusCode >= 500) {
      return {
        kind: 'server',
        message: 'Server error. Please try again later.',
        statusCode,
        retryable: true,
      }
    }
  }

  // Default to server error
  return {
    kind: 'server',
    message: error instanceof Error ? error.message : 'Unknown error occurred.',
    retryable: true,
  }
}

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'kind' in error &&
    'message' in error &&
    'retryable' in error
  )
}

/**
 * UI mapping for error kinds
 */
export const errorUIConfig: Record<ApiErrorKind, { icon: string; color: string; action: string }> = {
  network: { icon: 'WifiOff', color: 'yellow', action: 'Check connection' },
  timeout: { icon: 'Clock', color: 'yellow', action: 'Try again' },
  validation: { icon: 'AlertCircle', color: 'red', action: 'Check input' },
  permission: { icon: 'Lock', color: 'red', action: 'Login required' },
  not_found: { icon: 'Search', color: 'gray', action: 'Resource missing' },
  conflict: { icon: 'Copy', color: 'orange', action: 'Change title' },
  rate_limit: { icon: 'Timer', color: 'yellow', action: 'Wait and retry' },
  server: { icon: 'Server', color: 'red', action: 'Try again later' },
}
