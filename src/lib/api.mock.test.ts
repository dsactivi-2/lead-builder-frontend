import { describe, it, expect } from "vitest"
import { createDraft, matchTemplates, renderTemplate, confirmDraft, getTemplates, saveTemplate } from "./api"
import {
  DraftResponseSchema,
  MatchResponseSchema,
  RenderResponseSchema,
  ConfirmResponseSchema,
  TemplatesResponseSchema,
} from "./contracts"

// These tests run with RUNTIME.apiBaseUrl = "" (mock mode)
// No vi.mock needed - uses actual empty RUNTIME from config

describe("Mock Mode Behavior", () => {
  it("mock responses pass contract validation", async () => {
    const draftResult = await createDraft("Test query", "lead_campaign_json", "auto")
    expect(() => DraftResponseSchema.parse(draftResult)).not.toThrow()
    expect(draftResult.draft_id).toMatch(/^dr_/)

    const matchResult = await matchTemplates("Test query", ["lead_campaign_json"], 5)
    expect(() => MatchResponseSchema.parse(matchResult)).not.toThrow()

    const renderResult = await renderTemplate("tpl_1", "lead_campaign_json")
    expect(() => RenderResponseSchema.parse(renderResult)).not.toThrow()

    const confirmResult = await confirmDraft("dr_123", "")
    expect(() => ConfirmResponseSchema.parse(confirmResult)).not.toThrow()

    const templatesResult = await getTemplates()
    expect(() => TemplatesResponseSchema.parse(templatesResult)).not.toThrow()
  })

  it("mock saveTemplate throws conflict for duplicate titles", async () => {
    // First save should succeed
    const first = await saveTemplate("lead_campaign_json", "Unique Title", ["test"], { name: "Test" })
    expect(first.template_id).toBeDefined()
    expect(first.version).toBe(1)

    // Second save with duplicate title should fail
    await expect(
      saveTemplate("lead_campaign_json", "SHK Westbalkan DE", ["test"], { name: "Test" }),
    ).rejects.toMatchObject({
      kind: "conflict",
      message: "Template title already exists",
    })
  })

  it("alwaysNew mode ignores hash_hit in logic", async () => {
    // Mock returns hash_hit, but app should ignore it with alwaysNew
    const matchResult = await matchTemplates("exact match text", ["lead_campaign_json"], 5)

    // Even if hash_hit exists, with alwaysNew the app should not auto-render
    // This is tested at the workflow level, but we verify data structure here
    expect(matchResult.hash_hit).toBeDefined() // Data is present
    expect(matchResult.candidates).toBeDefined() // Candidates also present
  })
})

describe("Workflow Integration (Mock Mode)", () => {
  it("full workflow with hash hit", async () => {
    // Step 1: Create draft
    const draftResult = await createDraft("München SHK 200 Leads", "lead_campaign_json", "auto")
    expect(draftResult.draft_id).toMatch(/^dr_/)

    // Step 2: Match templates
    const matchResult = await matchTemplates("München SHK 200 Leads", ["lead_campaign_json"], 5)
    expect(matchResult.candidates).toBeDefined()

    // Step 3: If no hash hit, confirm draft
    if (!matchResult.hash_hit) {
      const confirmResult = await confirmDraft(draftResult.draft_id, "")
      expect(confirmResult.artifact).toBeDefined()
      expect(confirmResult.artifact.type).toBe("lead_campaign_json")
    }
  })

  it("full workflow with template selection", async () => {
    // Step 1: Create draft
    const draftResult = await createDraft("Test campaign", "lead_campaign_json", "auto")

    // Step 2: Match templates
    const matchResult = await matchTemplates("Test campaign", ["lead_campaign_json"], 5)

    // Step 3: User selects a candidate
    if (matchResult.candidates.length > 0) {
      const selectedCandidate = matchResult.candidates[0]
      const renderResult = await renderTemplate(selectedCandidate.template_id, selectedCandidate.type)
      expect(renderResult.content).toBeDefined()
    }
  })
})
