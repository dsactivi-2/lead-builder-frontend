import { RUNTIME } from "@/config/runtime"
import type { z } from "zod"
import {
  DraftResponseSchema,
  MatchResponseSchema,
  RenderResponseSchema,
  ConfirmResponseSchema,
  TemplatesResponseSchema,
  CreateTemplateResponseSchema,
  type OutputTarget,
  type ReuseMode,
  type DraftResponse,
  type MatchResponse,
  type RenderResponse,
  type ConfirmResponse,
  type TemplatesResponse,
  type CreateTemplateResponse,
} from "./contracts"
import { classifyError, type ApiError } from "./errors"

const TIMEOUT_MS = 20_000 // 20 Sekunden

async function fetchWithValidation<T>(url: string, options: RequestInit, schema: z.ZodSchema<T>): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    })

    const text = await response.text()
    const data = text.trim() ? JSON.parse(text) : null

    if (!response.ok) {
      const error = classifyError(null, response.status)
      error.message = data?.message || data?.error || error.message
      if (data) {
        error.details = data
      }
      throw error
    }

    // Zod validation
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      console.error("[v0] Contract violation:", parsed.error.issues)
      throw {
        kind: "validation",
        message: "Invalid API response format",
        retryable: false,
        details: { zodIssues: parsed.error.issues },
      } as ApiError
    }

    return parsed.data
  } catch (error) {
    // Re-throw if already ApiError
    if ((error as ApiError).kind) throw error
    // Otherwise classify
    throw classifyError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}

const isMockMode = !RUNTIME.apiBaseUrl || RUNTIME.apiBaseUrl.trim() === ""

// POST /v1/builder/draft
export async function createDraft(
  input_text: string,
  output_target: OutputTarget,
  reuse_mode: ReuseMode,
): Promise<DraftResponse> {
  if (isMockMode) {
    await new Promise((r) => setTimeout(r, 800))
    const mockResponse = {
      draft_id: "dr_mock_1234",
      understanding: {
        summary_bullets: ["Ziel: 200 Leads generieren", "Region: München"],
        assumptions: ["Start sofort möglich"],
        questions: ["Sind Jobboards erlaubt?"],
      },
      proposed_intent_spec: {},
    }
    return DraftResponseSchema.parse(mockResponse)
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/builder/draft`
  return fetchWithValidation(
    url,
    {
      method: "POST",
      body: JSON.stringify({
        workspace_id: RUNTIME.workspaceId,
        user_id: RUNTIME.userId,
        input_text,
        output_target,
        reuse_mode,
      }),
    },
    DraftResponseSchema,
  )
}

// POST /v1/templates/match
export async function matchTemplates(input_text: string, types: OutputTarget[], top_k = 5): Promise<MatchResponse> {
  if (isMockMode) {
    await new Promise((r) => setTimeout(r, 600))
    const mockResponse = {
      normalized_text: input_text,
      hash_hit: null,
      candidates: [
        {
          template_id: "tpl_1",
          type: "lead_campaign_json" as OutputTarget,
          score: 0.93,
          title: "SHK Westbalkan DE",
        },
        {
          template_id: "tpl_2",
          type: "call_prompt" as OutputTarget,
          score: 0.86,
          title: "Call Script",
        },
      ],
    }
    return MatchResponseSchema.parse(mockResponse)
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates/match`
  return fetchWithValidation(
    url,
    {
      method: "POST",
      body: JSON.stringify({
        workspace_id: RUNTIME.workspaceId,
        input_text,
        types,
        top_k,
      }),
    },
    MatchResponseSchema,
  )
}

// POST /v1/templates/render
export async function renderTemplate(
  template_id: string,
  output_target: OutputTarget,
  parameters: object = {},
): Promise<RenderResponse> {
  if (isMockMode) {
    await new Promise((r) => setTimeout(r, 500))
    const mockResponse = {
      content: output_target.includes("json")
        ? { type: output_target, name: "Mock Template", search_spec: { limit: 200 } }
        : "This is a mock rendered template content.",
    }
    return RenderResponseSchema.parse(mockResponse)
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates/render`
  return fetchWithValidation(
    url,
    {
      method: "POST",
      body: JSON.stringify({
        workspace_id: RUNTIME.workspaceId,
        template_id,
        parameters,
        output_target,
      }),
    },
    RenderResponseSchema,
  )
}

// POST /v1/builder/confirm
export async function confirmDraft(draft_id: string, edits_text = ""): Promise<ConfirmResponse> {
  if (isMockMode) {
    await new Promise((r) => setTimeout(r, 1000))
    const mockResponse = {
      artifact: {
        artifact_id: "art_mock_1",
        type: "lead_campaign_json" as OutputTarget,
        content: {
          type: "lead_campaign",
          name: "München SHK Campaign",
          search_spec: { limit: 200, location: "München" },
        },
      },
      save_suggestion: {
        should_save_as_template: true,
        title: "München SHK Campaign",
      },
    }
    return ConfirmResponseSchema.parse(mockResponse)
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/builder/confirm`
  return fetchWithValidation(
    url,
    {
      method: "POST",
      body: JSON.stringify({
        workspace_id: RUNTIME.workspaceId,
        draft_id,
        confirmation: true,
        edits_text,
      }),
    },
    ConfirmResponseSchema,
  )
}

// GET /v1/templates
export async function getTemplates(type?: OutputTarget, query?: string): Promise<TemplatesResponse> {
  if (isMockMode) {
    await new Promise((r) => setTimeout(r, 400))
    const mockResponse = {
      items: [
        {
          template_id: "tpl_1",
          type: "lead_campaign_json" as OutputTarget,
          title: "SHK Westbalkan DE",
          tags: ["SHK", "DE", "Westbalkan"],
          usage_count: 12,
          last_used_at: new Date().toISOString(),
        },
        {
          template_id: "tpl_2",
          type: "call_prompt" as OutputTarget,
          title: "Call Script",
          tags: ["Sales"],
          usage_count: 5,
        },
      ],
    }
    return TemplatesResponseSchema.parse(mockResponse)
  }

  const params = new URLSearchParams({ workspace_id: RUNTIME.workspaceId })
  if (type) params.append("type", type)
  if (query) params.append("query", query)

  const url = `${RUNTIME.apiBaseUrl}/v1/templates?${params}`
  return fetchWithValidation(url, { method: "GET" }, TemplatesResponseSchema)
}

// POST /v1/templates
export async function saveTemplate(
  type: OutputTarget,
  title: string,
  tags: string[],
  content: any,
): Promise<CreateTemplateResponse> {
  if (isMockMode) {
    await new Promise((r) => setTimeout(r, 500))
    const existingTitles = ["SHK Westbalkan DE", "Call Script"]
    if (existingTitles.includes(title)) {
      throw {
        kind: "conflict",
        message: "Template title already exists",
        statusCode: 409,
        retryable: false,
      } as ApiError
    }
    const mockResponse = {
      template_id: "tpl_new_" + Date.now(),
      version: 1,
    }
    return CreateTemplateResponseSchema.parse(mockResponse)
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates`
  return fetchWithValidation(
    url,
    {
      method: "POST",
      body: JSON.stringify({
        workspace_id: RUNTIME.workspaceId,
        type,
        title,
        tags,
        content,
      }),
    },
    CreateTemplateResponseSchema,
  )
}
