import { describe, it, expect } from "vitest"
import { canTransitionTo, isLoading, canSendMessage, canConfirmDraft, canSaveTemplate } from "./workflow"

describe("Workflow State Machine", () => {
  describe("Phase Transitions", () => {
    it("allows idle -> drafting", () => {
      expect(canTransitionTo("idle", "drafting")).toBe(true)
    })

    it("allows drafting -> matching", () => {
      expect(canTransitionTo("drafting", "matching")).toBe(true)
    })

    it("allows drafting -> error", () => {
      expect(canTransitionTo("drafting", "error")).toBe(true)
    })

    it("allows matching -> hash_hit", () => {
      expect(canTransitionTo("matching", "hash_hit")).toBe(true)
    })

    it("allows matching -> candidates", () => {
      expect(canTransitionTo("matching", "candidates")).toBe(true)
    })

    it("allows matching -> editing", () => {
      expect(canTransitionTo("matching", "editing")).toBe(true)
    })

    it("allows hash_hit -> artifact_ready", () => {
      expect(canTransitionTo("hash_hit", "artifact_ready")).toBe(true)
    })

    it("allows hash_hit -> editing", () => {
      expect(canTransitionTo("hash_hit", "editing")).toBe(true)
    })

    it("allows candidates -> artifact_ready", () => {
      expect(canTransitionTo("candidates", "artifact_ready")).toBe(true)
    })

    it("allows candidates -> editing", () => {
      expect(canTransitionTo("candidates", "editing")).toBe(true)
    })

    it("allows editing -> confirming", () => {
      expect(canTransitionTo("editing", "confirming")).toBe(true)
    })

    it("allows editing -> idle", () => {
      expect(canTransitionTo("editing", "idle")).toBe(true)
    })

    it("allows confirming -> artifact_ready", () => {
      expect(canTransitionTo("confirming", "artifact_ready")).toBe(true)
    })

    it("allows artifact_ready -> saving", () => {
      expect(canTransitionTo("artifact_ready", "saving")).toBe(true)
    })

    it("allows saving -> artifact_ready", () => {
      expect(canTransitionTo("saving", "artifact_ready")).toBe(true)
    })

    it("allows error -> idle", () => {
      expect(canTransitionTo("error", "idle")).toBe(true)
    })

    it("denies invalid transitions", () => {
      expect(canTransitionTo("idle", "confirming")).toBe(false)
      expect(canTransitionTo("artifact_ready", "drafting")).toBe(false)
      expect(canTransitionTo("candidates", "confirming")).toBe(false)
    })
  })

  describe("Phase Helpers", () => {
    it("identifies loading phases", () => {
      expect(isLoading("drafting")).toBe(true)
      expect(isLoading("matching")).toBe(true)
      expect(isLoading("confirming")).toBe(true)
      expect(isLoading("saving")).toBe(true)
      expect(isLoading("idle")).toBe(false)
      expect(isLoading("editing")).toBe(false)
    })

    it("identifies when messages can be sent", () => {
      expect(canSendMessage("idle")).toBe(true)
      expect(canSendMessage("drafting")).toBe(false)
      expect(canSendMessage("editing")).toBe(false)
    })

    it("identifies when draft can be confirmed", () => {
      expect(canConfirmDraft("editing")).toBe(true)
      expect(canConfirmDraft("idle")).toBe(false)
      expect(canConfirmDraft("artifact_ready")).toBe(false)
    })

    it("identifies when template can be saved", () => {
      expect(canSaveTemplate("artifact_ready")).toBe(true)
      expect(canSaveTemplate("editing")).toBe(false)
      expect(canSaveTemplate("saving")).toBe(false)
    })
  })
})
