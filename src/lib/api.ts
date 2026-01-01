import { RUNTIME } from '@/config/runtime'
import { classifyError, isApiError, type ApiError } from './errors'
import {
  DraftResponseSchema,
  MatchResponseSchema,
  RenderResponseSchema,
  ConfirmResponseSchema,
  TemplatesResponseSchema,
  CreateTemplateResponseSchema,
  validateResponse,
  type OutputTarget,
  type ReuseMode,
  type DraftResponse,
  type MatchResponse,
  type RenderResponse,
  type ConfirmResponse,
  type TemplatesResponse,
  type CreateTemplateResponse,
} from './contracts'

const TIMEOUT_MS = 20_000

// ===== Mock mode =====
const isMockMode = !RUNTIME.apiBaseUrl || RUNTIME.apiBaseUrl.trim() === ''

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
      template_id: 'tpl_10',
      type: 'lead_campaign_json',
      title: 'SHK Westbalkan DE',
      tags: ['SHK', 'DE', 'Westbalkan'],
      content: { type: 'lead_campaign', name: 'SHK Westbalkan DE', search_spec: { limit: 200 } },
      usage_count: 12,
      last_used_at: new Date().toISOString(),
    },
  ],
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })

    // safe parse (empty body safe)
    const text = await response.text()
    const data = text.trim() ? JSON.parse(text) : null

    if (!response.ok) {
      const apiError = classifyError(null, response.status)
      apiError.message = data?.message || data?.error || apiError.message
      apiError.details = data
      throw apiError
    }

    return data
  } catch (error: unknown) {
    if (isApiError(error)) throw error
    throw classifyError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}

// ===== Public API with Zod Validation =====

export async function postDraft(args: {
  input_text: string
  output_target: OutputTarget
  reuse_mode: ReuseMode
}): Promise<DraftResponse> {
  if (isMockMode) {
    await sleep(200)
    const mockResponse = {
      draft_id: `dr_${Math.floor(Math.random() * 10000)}`,
      understanding: {
        summary_bullets: [
          `Input erkannt: ${args.input_text.slice(0, 60)}${args.input_text.length > 60 ? '…' : ''}`,
          'Ziel: Kampagne / Suchauftrag erstellen',
        ],
        assumptions: ['Start sofort', 'Kein Stopdatum (sofern nicht angegeben)'],
        questions: ['Soll Jobboards-Suche erlaubt sein?'],
      },
      proposed_intent_spec: { raw: args.input_text },
    }
    return validateResponse(DraftResponseSchema, mockResponse, 'POST /v1/builder/draft')
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/builder/draft`
  const data = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      user_id: RUNTIME.userId,
      input_text: args.input_text,
      output_target: args.output_target,
      reuse_mode: args.reuse_mode,
    }),
  })
  return validateResponse(DraftResponseSchema, data, 'POST /v1/builder/draft')
}

export async function postMatch(args: {
  input_text: string
  types: OutputTarget[]
  top_k: number
}): Promise<MatchResponse> {
  if (isMockMode) {
    await sleep(150)
    const lower = args.input_text.toLowerCase()
    if (lower.includes('exact') || lower.includes('gleich wie vorher')) {
      const mockResponse = {
        normalized_text: 'normalized:<EXACT>',
        hash_hit: { template_id: 'tpl_hash', type: 'lead_campaign_json' as const, title: 'Exact template' },
        candidates: [],
      }
      return validateResponse(MatchResponseSchema, mockResponse, 'POST /v1/templates/match')
    }
    const mockResponse = {
      normalized_text: 'normalized:<SIMILAR>',
      hash_hit: null,
      candidates: [
        { template_id: 'tpl_10', type: 'lead_campaign_json' as const, score: 0.93, title: 'SHK Westbalkan DE' },
        { template_id: 'tpl_11', type: 'call_prompt' as const, score: 0.86, title: 'Call Script – Erstkontakt Firma' },
      ],
    }
    return validateResponse(MatchResponseSchema, mockResponse, 'POST /v1/templates/match')
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates/match`
  const data = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      input_text: args.input_text,
      types: args.types,
      top_k: args.top_k,
    }),
  })
  return validateResponse(MatchResponseSchema, data, 'POST /v1/templates/match')
}

export async function postRender(args: {
  template_id: string
  parameters?: Record<string, unknown>
  output_target: OutputTarget
}): Promise<RenderResponse> {
  if (isMockMode) {
    await sleep(150)
    const tpl = mockDb.templates.find((t) => t.template_id === args.template_id)
    if (tpl) {
      tpl.usage_count += 1
      tpl.last_used_at = new Date().toISOString()
      const mockResponse = { content: tpl.content }
      return validateResponse(RenderResponseSchema, mockResponse, 'POST /v1/templates/render')
    }
    const mockResponse = {
      content: { type: args.output_target, name: 'Unknown template', template_id: args.template_id },
    }
    return validateResponse(RenderResponseSchema, mockResponse, 'POST /v1/templates/render')
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates/render`
  const data = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      template_id: args.template_id,
      parameters: args.parameters ?? {},
      output_target: args.output_target,
    }),
  })
  return validateResponse(RenderResponseSchema, data, 'POST /v1/templates/render')
}

export async function postConfirm(args: {
  draft_id: string
  output_target: OutputTarget
  edits_text?: string
}): Promise<ConfirmResponse> {
  if (isMockMode) {
    await sleep(220)
    const mockResponse = {
      artifact: {
        artifact_id: `art_${Math.floor(Math.random() * 10000)}`,
        type: args.output_target,
        content:
          args.output_target === 'call_prompt' || args.output_target === 'enrichment_prompt'
            ? `PROMPT (${args.output_target})\nDraft: ${args.draft_id}\nEdits: ${args.edits_text || '(none)'}`
            : {
                type: args.output_target,
                draft_id: args.draft_id,
                edits: args.edits_text ?? '',
                search_spec: { limit: 200 },
                created_at: new Date().toISOString(),
              },
      },
      save_suggestion: { should_save_as_template: true, title: 'New Template' },
    }
    return validateResponse(ConfirmResponseSchema, mockResponse, 'POST /v1/builder/confirm')
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/builder/confirm`
  const data = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      draft_id: args.draft_id,
      confirmation: true,
      edits_text: args.edits_text ?? '',
    }),
  })
  return validateResponse(ConfirmResponseSchema, data, 'POST /v1/builder/confirm')
}

export async function getTemplates(args: {
  type?: OutputTarget
  query?: string
}): Promise<TemplatesResponse> {
  if (isMockMode) {
    await sleep(120)
    const q = (args.query ?? '').toLowerCase().trim()
    const items = mockDb.templates
      .filter((t) => (args.type ? t.type === args.type : true))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) || t.tags.join(',').toLowerCase().includes(q) : true))
      .map((t) => ({
        template_id: t.template_id,
        type: t.type,
        title: t.title,
        tags: t.tags,
        usage_count: t.usage_count,
        last_used_at: t.last_used_at,
      }))
    const mockResponse = { items }
    return validateResponse(TemplatesResponseSchema, mockResponse, 'GET /v1/templates')
  }

  const params = new URLSearchParams()
  params.set('workspace_id', RUNTIME.workspaceId)
  if (args.type) params.set('type', args.type)
  if (args.query) params.set('query', args.query)

  const url = `${RUNTIME.apiBaseUrl}/v1/templates?${params.toString()}`
  const data = await fetchWithTimeout(url, { method: 'GET' })
  return validateResponse(TemplatesResponseSchema, data, 'GET /v1/templates')
}

export async function postTemplate(args: {
  type: OutputTarget
  title: string
  tags: string[]
  content: Record<string, unknown> | string
}): Promise<CreateTemplateResponse> {
  if (isMockMode) {
    await sleep(150)
    const exists = mockDb.templates.some((t) => t.title.trim().toLowerCase() === args.title.trim().toLowerCase())
    if (exists) {
      const error: ApiError = {
        kind: 'conflict',
        message: 'Template title already exists',
        statusCode: 409,
        retryable: false,
      }
      throw error
    }
    const template_id = `tpl_${Math.floor(Math.random() * 100000)}`
    mockDb.templates.unshift({
      template_id,
      type: args.type,
      title: args.title,
      tags: args.tags ?? [],
      content: args.content,
      usage_count: 0,
      last_used_at: new Date().toISOString(),
    })
    const mockResponse = { template_id, version: 1 }
    return validateResponse(CreateTemplateResponseSchema, mockResponse, 'POST /v1/templates')
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates`
  const data = await fetchWithTimeout(url, {
    method: 'POST',
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      type: args.type,
      title: args.title,
      tags: args.tags ?? [],
      content: args.content,
    }),
  })
  return validateResponse(CreateTemplateResponseSchema, data, 'POST /v1/templates')
}

// Re-export types for convenience
export type { OutputTarget, ReuseMode, DraftResponse, MatchResponse, ConfirmResponse, TemplatesResponse }
export type { ApiError } from './errors'
