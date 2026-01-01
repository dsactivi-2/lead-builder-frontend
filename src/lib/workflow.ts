// Workflow State Machine

import type { ApiError } from "./errors"
import type { Artifact, MatchCandidate, HashHit } from "./contracts"

export type BuilderPhase =
  | "idle" // Startseite, kein Draft
  | "drafting" // POST /draft läuft
  | "matching" // POST /match läuft
  | "hash_hit" // Exakter Match gefunden, warte auf User
  | "candidates" // Ähnliche Templates gefunden
  | "editing" // User bearbeitet Edits-Textarea
  | "confirming" // POST /confirm läuft
  | "artifact_ready" // Artifact erstellt, bereit zum Export/Save
  | "saving" // POST /template läuft
  | "error" // Fehler aufgetreten

export interface BuilderState {
  phase: BuilderPhase
  draftId: string | null
  artifact: Artifact | null
  error: ApiError | null
  matchCandidates: MatchCandidate[]
  hashHit: HashHit | null
}

export const initialState: BuilderState = {
  phase: "idle",
  draftId: null,
  artifact: null,
  error: null,
  matchCandidates: [],
  hashHit: null,
}

// Phase Transition Helpers
export function canTransitionTo(from: BuilderPhase, to: BuilderPhase): boolean {
  const transitions: Record<BuilderPhase, BuilderPhase[]> = {
    idle: ["drafting"],
    drafting: ["matching", "error"],
    matching: ["hash_hit", "candidates", "editing", "error"],
    hash_hit: ["artifact_ready", "editing", "error"],
    candidates: ["artifact_ready", "editing", "error"],
    editing: ["confirming", "idle"],
    confirming: ["artifact_ready", "error"],
    artifact_ready: ["saving", "idle"],
    saving: ["artifact_ready", "error"],
    error: ["idle", "editing"],
  }

  return transitions[from]?.includes(to) ?? false
}

// Phase UI State Helpers
export function isLoading(phase: BuilderPhase): boolean {
  return ["drafting", "matching", "confirming", "saving"].includes(phase)
}

export function canSendMessage(phase: BuilderPhase): boolean {
  return phase === "idle"
}

export function canEditDraft(phase: BuilderPhase): boolean {
  return phase === "editing"
}

export function canConfirmDraft(phase: BuilderPhase): boolean {
  return phase === "editing"
}

export function canSaveTemplate(phase: BuilderPhase): boolean {
  return phase === "artifact_ready"
}

export function canExportArtifact(phase: BuilderPhase): boolean {
  return phase === "artifact_ready"
}
