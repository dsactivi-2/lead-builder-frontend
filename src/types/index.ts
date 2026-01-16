// Re-export types from contracts (Single Source of Truth)
export type {
  OutputTarget,
  ReuseMode,
  Artifact,
  MatchCandidate,
  TemplateItem,
} from "@/lib/contracts"

// Chat Message (Frontend-specific, not in API contracts)
export interface ChatMessage {
  role: "user" | "assistant"
  text?: string // Für User-Messages und Error-Messages
  understanding?: {
    // Für Assistant-Messages nach Draft
    summary_bullets: string[]
    assumptions: string[]
    questions: string[]
  }
  draftId?: string // Für Confirm/Reject
}

// Runtime Config
export interface RuntimeConfig {
  apiBaseUrl: string
  workspaceId: string
  userId: string
}
