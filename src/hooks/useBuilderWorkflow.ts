'use client'

import { useReducer, useCallback } from 'react'
import {
  builderReducer,
  initialBuilderState,
  canSendMessage,
  isLoading,
  getPhaseLabel,
  type BuilderState,
  type BuilderPhase,
} from '@/lib/workflow'
import { postDraft, postMatch, postRender, postConfirm, postTemplate } from '@/lib/api'
import { classifyError, isApiError, type ApiError } from '@/lib/errors'
import type { OutputTarget, ReuseMode, Artifact, MatchCandidate, HashHit } from '@/lib/contracts'

export interface UseBuilderWorkflowReturn {
  state: BuilderState
  phase: BuilderPhase
  phaseLabel: string
  isLoading: boolean
  canSendMessage: boolean

  // Actions
  sendMessage: (text: string, outputTarget: OutputTarget, reuseMode: ReuseMode) => Promise<void>
  confirm: (edits?: string) => Promise<void>
  reject: () => void
  useTemplate: (templateId: string, outputTarget: OutputTarget) => Promise<void>
  createNew: () => void
  saveTemplate: (title: string, tags: string[]) => Promise<void>
  reset: () => void
  retry: () => void
}

export function useBuilderWorkflow(): UseBuilderWorkflowReturn {
  const [state, dispatch] = useReducer(builderReducer, initialBuilderState)

  const sendMessage = useCallback(
    async (text: string, outputTarget: OutputTarget, reuseMode: ReuseMode) => {
      dispatch({ type: 'START_DRAFT', inputText: text })

      try {
        // Step 1: Create draft
        const draftRes = await postDraft({
          input_text: text,
          output_target: outputTarget,
          reuse_mode: reuseMode,
        })
        dispatch({ type: 'DRAFT_SUCCESS', draftId: draftRes.draft_id })

        // Step 2: Match templates
        try {
          const matchRes = await postMatch({
            input_text: text,
            types: ['lead_campaign_json', 'lead_job_json', 'call_prompt', 'enrichment_prompt'],
            top_k: 5,
          })

          if (matchRes.hash_hit && reuseMode !== 'alwaysNew') {
            dispatch({ type: 'MATCH_HASH_HIT', hashHit: matchRes.hash_hit })

            // Auto-render for hash hit
            try {
              const renderRes = await postRender({
                template_id: matchRes.hash_hit.template_id,
                output_target: outputTarget,
              })
              dispatch({
                type: 'RENDER_SUCCESS',
                artifact: { type: outputTarget, content: renderRes.content },
              })
            } catch (renderError) {
              const error = isApiError(renderError) ? renderError : classifyError(renderError)
              dispatch({ type: 'RENDER_ERROR', error })
            }
          } else if (matchRes.candidates.length > 0) {
            dispatch({ type: 'MATCH_CANDIDATES', candidates: matchRes.candidates })
          } else {
            dispatch({ type: 'MATCH_NO_RESULTS' })
          }
        } catch {
          // Match errors are non-fatal
          dispatch({ type: 'MATCH_ERROR', error: { kind: 'server', message: 'Match failed', retryable: true } })
        }
      } catch (error) {
        const apiError = isApiError(error) ? error : classifyError(error)
        dispatch({ type: 'DRAFT_ERROR', error: apiError })
      }
    },
    []
  )

  const confirm = useCallback(
    async (edits?: string) => {
      if (!state.draftId) return

      dispatch({ type: 'START_CONFIRM' })

      try {
        const res = await postConfirm({
          draft_id: state.draftId,
          output_target: (state.artifact?.type as OutputTarget) || 'lead_campaign_json',
          edits_text: edits,
        })
        dispatch({ type: 'CONFIRM_SUCCESS', artifact: res.artifact })
      } catch (error) {
        const apiError = isApiError(error) ? error : classifyError(error)
        dispatch({ type: 'CONFIRM_ERROR', error: apiError })
      }
    },
    [state.draftId, state.artifact?.type]
  )

  const reject = useCallback(() => {
    dispatch({ type: 'REJECT' })
  }, [])

  const useTemplate = useCallback(
    async (templateId: string, outputTarget: OutputTarget) => {
      dispatch({ type: 'SELECT_TEMPLATE', templateId })

      try {
        const renderRes = await postRender({
          template_id: templateId,
          output_target: outputTarget,
        })
        dispatch({
          type: 'RENDER_SUCCESS',
          artifact: { type: outputTarget, content: renderRes.content },
        })
      } catch (error) {
        const apiError = isApiError(error) ? error : classifyError(error)
        dispatch({ type: 'RENDER_ERROR', error: apiError })
      }
    },
    []
  )

  const createNew = useCallback(() => {
    dispatch({ type: 'CREATE_NEW' })
  }, [])

  const saveTemplate = useCallback(
    async (title: string, tags: string[]) => {
      if (!state.artifact) return

      dispatch({ type: 'START_SAVE' })

      try {
        await postTemplate({
          type: state.artifact.type,
          title,
          tags,
          content: state.artifact.content as Record<string, unknown>,
        })
        dispatch({ type: 'SAVE_SUCCESS' })
      } catch (error) {
        const apiError = isApiError(error) ? error : classifyError(error)
        dispatch({ type: 'SAVE_ERROR', error: apiError })
      }
    },
    [state.artifact]
  )

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const retry = useCallback(() => {
    dispatch({ type: 'RETRY' })
  }, [])

  return {
    state,
    phase: state.phase,
    phaseLabel: getPhaseLabel(state.phase),
    isLoading: isLoading(state.phase),
    canSendMessage: canSendMessage(state.phase),
    sendMessage,
    confirm,
    reject,
    useTemplate,
    createNew,
    saveTemplate,
    reset,
    retry,
  }
}

// Re-export types
export type { BuilderState, BuilderPhase, Artifact, MatchCandidate, HashHit, ApiError }
