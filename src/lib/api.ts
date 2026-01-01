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

// ===== Mock Database (In-Memory) =====
type MockTemplate = {
  template_id: string
  type: OutputTarget
  title: string
  tags: string[]
  content: Record<string, unknown> | string
  usage_count: number
  last_used_at?: string
}

const mockDb: { templates: MockTemplate[] } = {
  templates: [
    {
      template_id: "tpl_10",
      type: "lead_campaign_json",
      title: "SHK Westbalkan DE",
      tags: ["SHK", "DE", "Westbalkan"],
      content: { type: "lead_campaign", name: "SHK Westbalkan DE", search_spec: { limit: 200 } },
      usage_count: 12,
      last_used_at: new Date().toISOString(),
    },
    {
      template_id: "tpl_11",
      type: "call_prompt",
      title: "Call Script – Erstkontakt Firma",
      tags: ["Sales", "Erstkontakt"],
      content: "Guten Tag, mein Name ist... [CALL SCRIPT]",
      usage_count: 8,
      last_used_at: new Date().toISOString(),
    },
  ],
}

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
    await new Promise((r) => setTimeout(r, 200))
    const mockResponse = {
      draft_id: `dr_${Math.floor(Math.random() * 10000)}`,
      understanding: {
        summary_bullets: [
          `Input erkannt: ${input_text.slice(0, 60)}${input_text.length > 60 ? "…" : ""}`,
          "Ziel: Kampagne / Suchauftrag erstellen",
        ],
        assumptions: ["Start sofort", "Kein Stopdatum (sofern nicht angegeben)"],
        questions: ["Soll Jobboards-Suche erlaubt sein?"],
      },
      proposed_intent_spec: { raw: input_text },
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
    await new Promise((r) => setTimeout(r, 150))
    const lower = input_text.toLowerCase()

    // Hash hit detection: exact match keywords
    if (lower.includes("exact") || lower.includes("gleich wie vorher") || lower.includes("wie letztes mal")) {
      return MatchResponseSchema.parse({
        normalized_text: "normalized:<EXACT>",
        hash_hit: { template_id: "tpl_10", type: "lead_campaign_json", title: "SHK Westbalkan DE" },
        candidates: [],
      })
    }

    // Return candidates from mockDb
    const candidates = mockDb.templates
      .filter((t) => types.includes(t.type))
      .slice(0, top_k)
      .map((t, i) => ({
        template_id: t.template_id,
        type: t.type,
        score: Math.max(0.5, 0.95 - i * 0.07), // Decreasing scores
        title: t.title,
      }))

    return MatchResponseSchema.parse({
      normalized_text: "normalized:<SIMILAR>",
      hash_hit: null,
      candidates,
    })
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
    await new Promise((r) => setTimeout(r, 150))

    // Find template in mockDb
    const tpl = mockDb.templates.find((t) => t.template_id === template_id)
    if (tpl) {
      // Update usage stats
      tpl.usage_count += 1
      tpl.last_used_at = new Date().toISOString()
      return RenderResponseSchema.parse({ content: tpl.content })
    }

    // Fallback for unknown templates
    const mockResponse = {
      content: output_target.includes("json")
        ? { type: output_target, name: "Unknown Template", template_id }
        : `Rendered template: ${template_id}`,
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
    await new Promise((r) => setTimeout(r, 120))
    const q = (query ?? "").toLowerCase().trim()

    const items = mockDb.templates
      .filter((t) => (type ? t.type === type : true))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) || t.tags.join(",").toLowerCase().includes(q) : true))
      .map((t) => ({
        template_id: t.template_id,
        type: t.type,
        title: t.title,
        tags: t.tags,
        usage_count: t.usage_count,
        last_used_at: t.last_used_at,
      }))

    return TemplatesResponseSchema.parse({ items })
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
  content: unknown,
): Promise<CreateTemplateResponse> {
  if (isMockMode) {
    await new Promise((r) => setTimeout(r, 150))

    // Check for duplicate title
    const exists = mockDb.templates.some((t) => t.title.trim().toLowerCase() === title.trim().toLowerCase())
    if (exists) {
      throw {
        kind: "conflict",
        message: "Template title already exists",
        statusCode: 409,
        retryable: false,
      } as ApiError
    }

    // Add to mockDb
    const template_id = `tpl_${Math.floor(Math.random() * 100000)}`
    mockDb.templates.unshift({
      template_id,
      type,
      title,
      tags: tags ?? [],
      content: content as Record<string, unknown> | string,
      usage_count: 0,
      last_used_at: new Date().toISOString(),
    })

    return CreateTemplateResponseSchema.parse({ template_id, version: 1 })
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
