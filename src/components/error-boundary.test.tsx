import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ErrorBoundary } from "./error-boundary"

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error message")
  }
  return <div data-testid="child-content">Child content</div>
}

describe("ErrorBoundary", () => {
  // Suppress console.error during tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalError
  })

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId("child-content")).toBeInTheDocument()
    expect(screen.queryByTestId("ui.errorBoundary")).not.toBeInTheDocument()
  })

  it("renders error UI when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId("ui.errorBoundary")).toBeInTheDocument()
    expect(screen.getByTestId("ui.errorBoundary.message")).toHaveTextContent("Test error message")
    expect(screen.queryByTestId("child-content")).not.toBeInTheDocument()
  })

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom fallback</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument()
    expect(screen.queryByTestId("ui.errorBoundary")).not.toBeInTheDocument()
  })

  it("has retry button that calls handleReset", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId("ui.errorBoundary")).toBeInTheDocument()

    // Click retry button - this resets the error state
    const retryButton = screen.getByTestId("ui.errorBoundary.retry")
    expect(retryButton).toBeInTheDocument()
    expect(retryButton).toHaveTextContent("Try Again")

    // Note: Clicking retry will re-render, but since ThrowError still throws,
    // it will immediately catch the error again. This tests that the button is clickable.
    fireEvent.click(retryButton)

    // ErrorBoundary is still shown because ThrowError throws again
    expect(screen.getByTestId("ui.errorBoundary")).toBeInTheDocument()
  })

  it("has reload button", () => {
    // Mock window.location.reload
    const reloadMock = vi.fn()
    Object.defineProperty(window, "location", {
      value: { reload: reloadMock },
      writable: true,
    })

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId("ui.errorBoundary.reload")).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("ui.errorBoundary.reload"))
    expect(reloadMock).toHaveBeenCalled()
  })
})
