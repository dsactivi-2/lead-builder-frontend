"use client"

import { useState, useCallback } from "react"
import { initialState, type BuilderState, type BuilderPhase, canTransitionTo } from "@/lib/workflow"
import type { Artifact, OutputTarget, ReuseMode } from "@/lib/contracts"
import type { ApiError } from "@/lib/errors"
import { createDraft, matchTemplates, confirmDraft, renderTemplate } from "@/lib/api"

export function useBuilderWorkflow() {
  const [state, setState] = useState<BuilderState>(initialState)

  const transitionTo = useCallback((phase: BuilderPhase, updates: Partial<BuilderState> = {}) => {
    setState((prev) => {
      if (!canTransitionTo(prev.phase, phase)) {
        console.warn(`[v0] Invalid transition from ${prev.phase} to ${phase}`)
        return prev
      }
      console.log(`[v0] Workflow transition: ${prev.phase} → ${phase}`)
      return { ...prev, phase, ...updates }
    })
  }, [])

  const setError = useCallback(
    (error: ApiError) => {
      console.error("[v0] Workflow error:", error)
      transitionTo("error", { error })
    },
    [transitionTo],
  )

  const reset = useCallback(() => {
    console.log("[v0] Workflow reset")
    setState(initialState)
  }, [])

  // Action: Send Message
  const sendMessage = useCallback(
    async (inputText: string, outputTarget: OutputTarget, reuseMode: ReuseMode) => {
      try {
        transitionTo("drafting")

        const draftResponse = await createDraft(inputText, outputTarget, reuseMode)

        transitionTo("matching", { draftId: draftResponse.draft_id })

        const matchResponse = await matchTemplates(inputText, [outputTarget], 5)

        // Decision tree based on reuseMode
        if (reuseMode !== "alwaysNew" && matchResponse.hash_hit) {
          // Hash hit found, auto-render if not alwaysNew
          transitionTo("hash_hit", {
            hashHit: matchResponse.hash_hit,
            matchCandidates: matchResponse.candidates,
          })

          // Auto-render hash hit
          const renderResponse = await renderTemplate(matchResponse.hash_hit.template_id, outputTarget)

          const artifact: Artifact = {
            type: outputTarget,
            content: renderResponse.content,
          }

          transitionTo("artifact_ready", { artifact })
        } else if (matchResponse.candidates.length > 0) {
          // Show candidates
          transitionTo("candidates", {
            matchCandidates: matchResponse.candidates,
            hashHit: null,
          })
        } else {
          // No matches, go to editing
          transitionTo("editing", {
            matchCandidates: [],
            hashHit: null,
          })
        }
      } catch (error) {
        setError(error as ApiError)
      }
    },
    [transitionTo, setError],
  )

  // Action: Select Template from Candidates
  const selectTemplate = useCallback(
    async (templateId: string, outputTarget: OutputTarget) => {
      try {
        const renderResponse = await renderTemplate(templateId, outputTarget)

        const artifact: Artifact = {
          type: outputTarget,
          content: renderResponse.content,
        }

        transitionTo("artifact_ready", { artifact })
      } catch (error) {
        setError(error as ApiError)
      }
    },
    [transitionTo, setError],
  )

  // Action: Create New (from hash_hit or candidates)
  const createNew = useCallback(() => {
    transitionTo("editing", { hashHit: null, matchCandidates: [] })
  }, [transitionTo])

  // Action: Confirm Draft
  const confirmEdits = useCallback(
    async (editsText: string) => {
      if (!state.draftId) {
        console.error("[v0] No draft ID available")
        return
      }

      try {
        transitionTo("confirming")

        const confirmResponse = await confirmDraft(state.draftId, editsText)

        transitionTo("artifact_ready", { artifact: confirmResponse.artifact })
      } catch (error) {
        setError(error as ApiError)
      }
    },
    [state.draftId, transitionTo, setError],
  )

  // Action: Reject Draft
  const rejectDraft = useCallback(() => {
    transitionTo("idle", { draftId: null })
  }, [transitionTo])

  return {
    state,
    sendMessage,
    selectTemplate,
    createNew,
    confirmEdits,
    rejectDraft,
    reset,
    setError,
  }
}
