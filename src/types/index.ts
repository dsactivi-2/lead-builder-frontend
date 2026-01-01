// Output Types
export type OutputTarget = "lead_campaign_json" | "lead_job_json" | "call_prompt" | "enrichment_prompt"

// Reuse Modes - must match lib/contracts.ts
export type ReuseMode =
  | "auto" // Auto-detect (hash hit = reuse, sonst create)
  | "alwaysNew" // Immer neu erstellen
  | "libraryOnly" // Immer aus Library

// Chat Message
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

// Artifact
export interface Artifact {
  type: OutputTarget
  content: any // JSON object oder string
}

// Match Candidate
export interface MatchCandidate {
  template_id: string
  type: OutputTarget
  score: number
  title: string
}

// Template Item
export interface TemplateItem {
  template_id: string
  type: OutputTarget
  title: string
  tags: string[]
  usage_count: number
  last_used_at?: string
}

// Runtime Config
export interface RuntimeConfig {
  apiBaseUrl: string
  workspaceId: string
  userId: string
}
