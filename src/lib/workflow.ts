/**
 * Workflow State Machine
 * Manages the Lead Builder phase transitions
 */

import type { Artifact, MatchCandidate, HashHit } from './contracts'
import type { ApiError } from './errors'

export type BuilderPhase =
  | 'idle'           // Start state, no draft
  | 'drafting'       // POST /draft in progress
  | 'matching'       // POST /match in progress
  | 'hash_hit'       // Exact match found, waiting for user
  | 'candidates'     // Similar templates found
  | 'editing'        // User editing before confirm
  | 'confirming'     // POST /confirm in progress
  | 'artifact_ready' // Artifact created, ready for export/save
  | 'saving'         // POST /template in progress
  | 'error'          // Error occurred

export interface BuilderState {
  phase: BuilderPhase
  draftId: string | null
  artifact: Artifact | null
  error: ApiError | null
  matchCandidates: MatchCandidate[]
  hashHit: HashHit | null
  inputText: string
}

export const initialBuilderState: BuilderState = {
  phase: 'idle',
  draftId: null,
  artifact: null,
  error: null,
  matchCandidates: [],
  hashHit: null,
  inputText: '',
}

export type BuilderAction =
  | { type: 'START_DRAFT'; inputText: string }
  | { type: 'DRAFT_SUCCESS'; draftId: string }
  | { type: 'DRAFT_ERROR'; error: ApiError }
  | { type: 'START_MATCH' }
  | { type: 'MATCH_HASH_HIT'; hashHit: HashHit }
  | { type: 'MATCH_CANDIDATES'; candidates: MatchCandidate[] }
  | { type: 'MATCH_NO_RESULTS' }
  | { type: 'MATCH_ERROR'; error: ApiError }
  | { type: 'SELECT_TEMPLATE'; templateId: string }
  | { type: 'CREATE_NEW' }
  | { type: 'START_CONFIRM' }
  | { type: 'CONFIRM_SUCCESS'; artifact: Artifact }
  | { type: 'CONFIRM_ERROR'; error: ApiError }
  | { type: 'START_SAVE' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; error: ApiError }
  | { type: 'RENDER_SUCCESS'; artifact: Artifact }
  | { type: 'RENDER_ERROR'; error: ApiError }
  | { type: 'REJECT' }
  | { type: 'RESET' }
  | { type: 'RETRY' }

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'START_DRAFT':
      return {
        ...state,
        phase: 'drafting',
        inputText: action.inputText,
        error: null,
      }

    case 'DRAFT_SUCCESS':
      return {
        ...state,
        phase: 'matching',
        draftId: action.draftId,
      }

    case 'DRAFT_ERROR':
      return {
        ...state,
        phase: 'error',
        error: action.error,
      }

    case 'START_MATCH':
      return {
        ...state,
        phase: 'matching',
      }

    case 'MATCH_HASH_HIT':
      return {
        ...state,
        phase: 'hash_hit',
        hashHit: action.hashHit,
        matchCandidates: [],
      }

    case 'MATCH_CANDIDATES':
      return {
        ...state,
        phase: 'candidates',
        matchCandidates: action.candidates,
        hashHit: null,
      }

    case 'MATCH_NO_RESULTS':
      return {
        ...state,
        phase: 'editing',
        matchCandidates: [],
        hashHit: null,
      }

    case 'MATCH_ERROR':
      // Match errors are non-fatal, continue to editing
      return {
        ...state,
        phase: 'editing',
        matchCandidates: [],
        hashHit: null,
      }

    case 'SELECT_TEMPLATE':
      return {
        ...state,
        phase: 'confirming',
      }

    case 'CREATE_NEW':
      return {
        ...state,
        phase: 'editing',
        hashHit: null,
        matchCandidates: [],
      }

    case 'START_CONFIRM':
      return {
        ...state,
        phase: 'confirming',
      }

    case 'CONFIRM_SUCCESS':
      return {
        ...state,
        phase: 'artifact_ready',
        artifact: action.artifact,
        error: null,
      }

    case 'CONFIRM_ERROR':
      return {
        ...state,
        phase: 'error',
        error: action.error,
      }

    case 'RENDER_SUCCESS':
      return {
        ...state,
        phase: 'artifact_ready',
        artifact: action.artifact,
        error: null,
      }

    case 'RENDER_ERROR':
      return {
        ...state,
        phase: 'error',
        error: action.error,
      }

    case 'START_SAVE':
      return {
        ...state,
        phase: 'saving',
      }

    case 'SAVE_SUCCESS':
      return {
        ...state,
        phase: 'artifact_ready',
        error: null,
      }

    case 'SAVE_ERROR':
      return {
        ...state,
        phase: 'error',
        error: action.error,
      }

    case 'REJECT':
      return {
        ...initialBuilderState,
      }

    case 'RESET':
      return {
        ...initialBuilderState,
      }

    case 'RETRY':
      return {
        ...state,
        phase: 'idle',
        error: null,
      }

    default:
      return state
  }
}

/**
 * Check if current phase allows user input
 */
export function canSendMessage(phase: BuilderPhase): boolean {
  return phase === 'idle' || phase === 'artifact_ready' || phase === 'error'
}

/**
 * Check if current phase is a loading state
 */
export function isLoading(phase: BuilderPhase): boolean {
  return phase === 'drafting' || phase === 'matching' || phase === 'confirming' || phase === 'saving'
}

/**
 * Get phase display name (German)
 */
export function getPhaseLabel(phase: BuilderPhase): string {
  const labels: Record<BuilderPhase, string> = {
    idle: 'Bereit',
    drafting: 'Analysiere...',
    matching: 'Suche Templates...',
    hash_hit: 'Exakter Treffer',
    candidates: 'Ähnliche gefunden',
    editing: 'Bearbeitung',
    confirming: 'Erstelle Artefakt...',
    artifact_ready: 'Fertig',
    saving: 'Speichere Template...',
    error: 'Fehler',
  }
  return labels[phase]
}
