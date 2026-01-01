import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createDraft, matchTemplates, renderTemplate, confirmDraft, getTemplates, saveTemplate } from "./api"
import {
  DraftResponseSchema,
  MatchResponseSchema,
  RenderResponseSchema,
  ConfirmResponseSchema,
  TemplatesResponseSchema,
} from "./contracts"

// Mock the RUNTIME config to enable real fetch
vi.mock("@/config/runtime", () => ({
  RUNTIME: {
    apiBaseUrl: "http://test-api.example.com",
    workspaceId: "ws_test",
    userId: "u_test",
  },
}))

describe("Error Classification", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("classifies network error correctly", async () => {
    // Mock fetch to throw network error
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("fetch failed"))

    await expect(createDraft("Test", "lead_campaign_json", "auto")).rejects.toMatchObject({
      kind: "network",
      retryable: true,
    })
  })

  it("classifies timeout correctly", async () => {
    vi.spyOn(global, "fetch").mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const error = new Error("timeout")
          error.name = "AbortError"
          setTimeout(() => reject(error), 100)
        }),
    )

    await expect(createDraft("Test", "lead_campaign_json", "auto")).rejects.toMatchObject({
      kind: "timeout",
      retryable: true,
    })
  })

  it("classifies conflict (409) correctly", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: () => Promise.resolve('{"message": "Template title already exists"}'),
    } as Response)

    await expect(saveTemplate("lead_campaign_json", "Duplicate", [], {})).rejects.toMatchObject({
      kind: "conflict",
      retryable: false,
    })
  })

  it("classifies validation error (400) correctly", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('{"message": "Invalid request data"}'),
    } as Response)

    await expect(createDraft("", "lead_campaign_json", "auto")).rejects.toMatchObject({
      kind: "validation",
      retryable: false,
    })
  })

  it("classifies rate limit (429) correctly", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('{"message": "Too many requests"}'),
    } as Response)

    await expect(createDraft("Test", "lead_campaign_json", "auto")).rejects.toMatchObject({
      kind: "rate_limit",
      retryable: true,
    })
  })

  it("classifies server error (500) correctly", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('{"message": "Internal server error"}'),
    } as Response)

    await expect(createDraft("Test", "lead_campaign_json", "auto")).rejects.toMatchObject({
      kind: "server",
      retryable: true,
    })
  })
})

describe("Contract Validation", () => {
  it("validates draft response schema", async () => {
    const validResponse = {
      draft_id: "dr_123",
      understanding: {
        summary_bullets: ["Test"],
        assumptions: [],
        questions: [],
      },
    }

    expect(() => DraftResponseSchema.parse(validResponse)).not.toThrow()
  })

  it("rejects invalid draft_id format", () => {
    const invalidResponse = {
      draft_id: "invalid-format", // Should be dr_\d+
      understanding: {
        summary_bullets: ["Test"],
        assumptions: [],
        questions: [],
      },
    }

    expect(() => DraftResponseSchema.parse(invalidResponse)).toThrow()
  })

  it("rejects invalid understanding format", () => {
    const invalidResponse = {
      draft_id: "dr_123",
      understanding: {
        summary_bullets: "not an array", // Should be array
        assumptions: [],
        questions: [],
      },
    }

    expect(() => DraftResponseSchema.parse(invalidResponse)).toThrow()
  })

  it("validates match response with hash hit", () => {
    const validResponse = {
      normalized_text: "test",
      hash_hit: {
        template_id: "tpl_1",
        type: "lead_campaign_json",
        title: "Test Template",
      },
      candidates: [],
    }

    expect(() => MatchResponseSchema.parse(validResponse)).not.toThrow()
  })

  it("validates match response with candidates", () => {
    const validResponse = {
      normalized_text: "test",
      hash_hit: null,
      candidates: [
        {
          template_id: "tpl_1",
          type: "lead_campaign_json",
          score: 0.95,
          title: "Test",
        },
      ],
    }

    expect(() => MatchResponseSchema.parse(validResponse)).not.toThrow()
  })

  it("rejects invalid score range", () => {
    const invalidResponse = {
      normalized_text: "test",
      hash_hit: null,
      candidates: [
        {
          template_id: "tpl_1",
          type: "lead_campaign_json",
          score: 1.5, // Should be 0-1
          title: "Test",
        },
      ],
    }

    expect(() => MatchResponseSchema.parse(invalidResponse)).toThrow()
  })
})

// Note: Mock Mode Behavior tests are in api.mock.test.ts (no RUNTIME mock)

describe("Edge Cases", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("handles empty response gracefully", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    } as Response)

    await expect(createDraft("Test", "lead_campaign_json", "auto")).rejects.toMatchObject({
      kind: "validation",
      message: "Invalid API response format",
    })
  })

  it("handles malformed JSON", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve("not valid json {"),
    } as Response)

    await expect(createDraft("Test", "lead_campaign_json", "auto")).rejects.toThrow()
  })

  it("handles missing required fields", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            // Missing draft_id
            understanding: {
              summary_bullets: ["Test"],
              assumptions: [],
              questions: [],
            },
          }),
        ),
    } as Response)

    await expect(createDraft("Test", "lead_campaign_json", "auto")).rejects.toMatchObject({
      kind: "validation",
      message: "Invalid API response format",
    })
  })
})

// Note: Workflow Integration tests are in api.mock.test.ts (use mock mode)
