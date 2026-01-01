import { RUNTIME } from "@/config/runtime"
import type { z } from "zod"
import {
  DraftResponseSchema,
  MatchResponseSchema,
  RenderResponseSchema,
  ConfirmResponseSchema,
  TemplatesResponseSchema,
  CreateTemplateResponseSchema,
  CampaignsResponseSchema,
  CampaignSchema,
  CampaignStatsSchema,
  LeadsResponseSchema,
  LeadSchema,
  BatchLeadsResponseSchema,
  LeadScoreResponseSchema,
  CommunicationsResponseSchema,
  CommunicationSchema,
  BatchCommunicationsResponseSchema,
  CommunicationResponseSchema,
  SourcesResponseSchema,
  SourceSchema,
  AnalysesResponseSchema,
  AnalysisSchema,
  ReportsResponseSchema,
  ReportSchema,
  ScheduledTasksResponseSchema,
  ScheduledTaskSchema,
  DashboardStatsSchema,
  type OutputTarget,
  type ReuseMode,
  type DraftResponse,
  type MatchResponse,
  type RenderResponse,
  type ConfirmResponse,
  type TemplatesResponse,
  type CreateTemplateResponse,
  type CampaignsResponse,
  type Campaign,
  type CampaignStats,
  type CampaignStatus,
  type CampaignPriority,
  type CampaignTargetType,
  type LeadsResponse,
  type Lead,
  type BatchLeadsResponse,
  type LeadScoreResponse,
  type LeadStatus,
  type LeadQuality,
  type LeadSource,
  type CommunicationsResponse,
  type Communication,
  type BatchCommunicationsResponse,
  type CommunicationResponseResult,
  type CommunicationChannel,
  type CommunicationType,
  type SourcesResponse,
  type Source,
  type SourceType,
  type AnalysesResponse,
  type Analysis,
  type AnalysisType,
  type ReportsResponse,
  type Report,
  type ReportType,
  type ScheduledTasksResponse,
  type ScheduledTask,
  type TaskType,
  type DashboardStats,
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

// ============================================================================
// CAMPAIGNS API (Housefinder-inspired)
// ============================================================================

// GET /v1/campaigns
export async function getCampaigns(filters?: {
  status?: CampaignStatus
  priority?: CampaignPriority
}): Promise<CampaignsResponse> {
  const params = new URLSearchParams()
  if (filters?.status) params.append("status", filters.status)
  if (filters?.priority) params.append("priority", filters.priority)

  const url = `${RUNTIME.apiBaseUrl}/v1/campaigns${params.toString() ? `?${params}` : ""}`
  return fetchWithValidation(url, { method: "GET" }, CampaignsResponseSchema)
}

// POST /v1/campaigns
export async function createCampaign(data: {
  name: string
  description?: string
  target_type: CampaignTargetType
  priority?: CampaignPriority
  search_criteria?: Record<string, unknown>
  target_count?: number
  start_date?: string
  end_date?: string
  run_interval_hours?: number
}): Promise<Campaign> {
  const url = `${RUNTIME.apiBaseUrl}/v1/campaigns`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    CampaignSchema,
  )
}

// GET /v1/campaigns/:id
export async function getCampaign(id: string): Promise<Campaign> {
  const url = `${RUNTIME.apiBaseUrl}/v1/campaigns/${id}`
  return fetchWithValidation(url, { method: "GET" }, CampaignSchema)
}

// PATCH /v1/campaigns/:id
export async function updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
  const url = `${RUNTIME.apiBaseUrl}/v1/campaigns/${id}`
  return fetchWithValidation(
    url,
    { method: "PATCH", body: JSON.stringify(data) },
    CampaignSchema,
  )
}

// DELETE /v1/campaigns/:id
export async function deleteCampaign(id: string): Promise<void> {
  const url = `${RUNTIME.apiBaseUrl}/v1/campaigns/${id}`
  await fetch(url, { method: "DELETE" })
}

// GET /v1/campaigns/:id/stats
export async function getCampaignStats(id: string): Promise<CampaignStats> {
  const url = `${RUNTIME.apiBaseUrl}/v1/campaigns/${id}/stats`
  return fetchWithValidation(url, { method: "GET" }, CampaignStatsSchema)
}

// ============================================================================
// LEADS API (Housefinder Listing-inspired)
// ============================================================================

// GET /v1/leads
export async function getLeads(filters?: {
  campaign_id?: string
  status?: LeadStatus
  quality?: LeadQuality
  limit?: number
  offset?: number
  sort?: "created_at" | "score" | "name" | "company"
  order?: "asc" | "desc"
}): Promise<LeadsResponse> {
  const params = new URLSearchParams()
  if (filters?.campaign_id) params.append("campaign_id", filters.campaign_id)
  if (filters?.status) params.append("status", filters.status)
  if (filters?.quality) params.append("quality", filters.quality)
  if (filters?.limit) params.append("limit", filters.limit.toString())
  if (filters?.offset) params.append("offset", filters.offset.toString())
  if (filters?.sort) params.append("sort", filters.sort)
  if (filters?.order) params.append("order", filters.order)

  const url = `${RUNTIME.apiBaseUrl}/v1/leads${params.toString() ? `?${params}` : ""}`
  return fetchWithValidation(url, { method: "GET" }, LeadsResponseSchema)
}

// POST /v1/leads
export async function createLead(data: {
  campaign_id?: string
  source: LeadSource
  source_platform?: string
  source_url?: string
  name?: string
  company?: string
  position?: string
  email?: string
  phone?: string
  location?: string
  raw_data?: Record<string, unknown>
  tags?: string[]
  notes?: string
}): Promise<Lead> {
  const url = `${RUNTIME.apiBaseUrl}/v1/leads`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    LeadSchema,
  )
}

// POST /v1/leads/batch
export async function createLeadsBatch(data: {
  campaign_id?: string
  leads: Array<{
    source?: LeadSource
    source_platform?: string
    name?: string
    company?: string
    position?: string
    email?: string
    phone?: string
    location?: string
    raw_data?: Record<string, unknown>
    tags?: string[]
  }>
}): Promise<BatchLeadsResponse> {
  const url = `${RUNTIME.apiBaseUrl}/v1/leads/batch`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    BatchLeadsResponseSchema,
  )
}

// GET /v1/leads/:id
export async function getLead(id: string): Promise<Lead> {
  const url = `${RUNTIME.apiBaseUrl}/v1/leads/${id}`
  return fetchWithValidation(url, { method: "GET" }, LeadSchema)
}

// PATCH /v1/leads/:id
export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
  const url = `${RUNTIME.apiBaseUrl}/v1/leads/${id}`
  return fetchWithValidation(
    url,
    { method: "PATCH", body: JSON.stringify(data) },
    LeadSchema,
  )
}

// DELETE /v1/leads/:id
export async function deleteLead(id: string): Promise<void> {
  const url = `${RUNTIME.apiBaseUrl}/v1/leads/${id}`
  await fetch(url, { method: "DELETE" })
}

// POST /v1/leads/:id/score
export async function recalculateLeadScore(id: string, criteria?: Record<string, unknown>): Promise<LeadScoreResponse> {
  const url = `${RUNTIME.apiBaseUrl}/v1/leads/${id}/score`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify({ criteria }) },
    LeadScoreResponseSchema,
  )
}

// ============================================================================
// COMMUNICATIONS API (Housefinder Email/WhatsApp-inspired)
// ============================================================================

// GET /v1/communications
export async function getCommunications(filters?: {
  lead_id?: string
  campaign_id?: string
  channel?: CommunicationChannel
  status?: string
  limit?: number
  offset?: number
}): Promise<CommunicationsResponse> {
  const params = new URLSearchParams()
  if (filters?.lead_id) params.append("lead_id", filters.lead_id)
  if (filters?.campaign_id) params.append("campaign_id", filters.campaign_id)
  if (filters?.channel) params.append("channel", filters.channel)
  if (filters?.status) params.append("status", filters.status)
  if (filters?.limit) params.append("limit", filters.limit.toString())
  if (filters?.offset) params.append("offset", filters.offset.toString())

  const url = `${RUNTIME.apiBaseUrl}/v1/communications${params.toString() ? `?${params}` : ""}`
  return fetchWithValidation(url, { method: "GET" }, CommunicationsResponseSchema)
}

// POST /v1/communications
export async function sendCommunication(data: {
  lead_id?: string
  campaign_id?: string
  channel: CommunicationChannel
  type?: CommunicationType
  subject?: string
  message: string
  template_id?: string
}): Promise<Communication> {
  const url = `${RUNTIME.apiBaseUrl}/v1/communications`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    CommunicationSchema,
  )
}

// POST /v1/communications/batch
export async function sendCommunicationsBatch(data: {
  lead_ids: string[]
  campaign_id?: string
  channel: CommunicationChannel
  type?: CommunicationType
  subject?: string
  message: string
  template_id?: string
}): Promise<BatchCommunicationsResponse> {
  const url = `${RUNTIME.apiBaseUrl}/v1/communications/batch`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    BatchCommunicationsResponseSchema,
  )
}

// POST /v1/communications/:id/response
export async function recordCommunicationResponse(id: string, response_text: string): Promise<CommunicationResponseResult> {
  const url = `${RUNTIME.apiBaseUrl}/v1/communications/${id}/response`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify({ response_text }) },
    CommunicationResponseSchema,
  )
}

// ============================================================================
// SOURCES API (Housefinder Scraper-inspired)
// ============================================================================

// GET /v1/sources
export async function getSources(): Promise<SourcesResponse> {
  const url = `${RUNTIME.apiBaseUrl}/v1/sources`
  return fetchWithValidation(url, { method: "GET" }, SourcesResponseSchema)
}

// POST /v1/sources
export async function createSource(data: {
  name: string
  type: SourceType
  platform?: string
  config?: Record<string, unknown>
  is_active?: boolean
}): Promise<Source> {
  const url = `${RUNTIME.apiBaseUrl}/v1/sources`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    SourceSchema,
  )
}

// PATCH /v1/sources/:id
export async function updateSource(id: string, data: Partial<Source>): Promise<Source> {
  const url = `${RUNTIME.apiBaseUrl}/v1/sources/${id}`
  return fetchWithValidation(
    url,
    { method: "PATCH", body: JSON.stringify(data) },
    SourceSchema,
  )
}

// ============================================================================
// ANALYSES API (Housefinder AI-inspired)
// ============================================================================

// GET /v1/analyses
export async function getAnalyses(filters?: {
  lead_id?: string
  analysis_type?: AnalysisType
  limit?: number
}): Promise<AnalysesResponse> {
  const params = new URLSearchParams()
  if (filters?.lead_id) params.append("lead_id", filters.lead_id)
  if (filters?.analysis_type) params.append("analysis_type", filters.analysis_type)
  if (filters?.limit) params.append("limit", filters.limit.toString())

  const url = `${RUNTIME.apiBaseUrl}/v1/analyses${params.toString() ? `?${params}` : ""}`
  return fetchWithValidation(url, { method: "GET" }, AnalysesResponseSchema)
}

// POST /v1/analyses
export async function createAnalysis(data: {
  communication_id?: string
  lead_id?: string
  analysis_type: AnalysisType
  text_to_analyze: string
}): Promise<Analysis> {
  const url = `${RUNTIME.apiBaseUrl}/v1/analyses`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    AnalysisSchema,
  )
}

// ============================================================================
// REPORTS API
// ============================================================================

// GET /v1/reports
export async function getReports(filters?: {
  campaign_id?: string
  report_type?: ReportType
  limit?: number
}): Promise<ReportsResponse> {
  const params = new URLSearchParams()
  if (filters?.campaign_id) params.append("campaign_id", filters.campaign_id)
  if (filters?.report_type) params.append("report_type", filters.report_type)
  if (filters?.limit) params.append("limit", filters.limit.toString())

  const url = `${RUNTIME.apiBaseUrl}/v1/reports${params.toString() ? `?${params}` : ""}`
  return fetchWithValidation(url, { method: "GET" }, ReportsResponseSchema)
}

// POST /v1/reports
export async function generateReport(data: {
  campaign_id?: string
  report_type: ReportType
  period_start?: string
  period_end?: string
}): Promise<Report> {
  const url = `${RUNTIME.apiBaseUrl}/v1/reports`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    ReportSchema,
  )
}

// ============================================================================
// SCHEDULED TASKS API
// ============================================================================

// GET /v1/tasks
export async function getScheduledTasks(filters?: {
  status?: string
  task_type?: TaskType
  limit?: number
}): Promise<ScheduledTasksResponse> {
  const params = new URLSearchParams()
  if (filters?.status) params.append("status", filters.status)
  if (filters?.task_type) params.append("task_type", filters.task_type)
  if (filters?.limit) params.append("limit", filters.limit.toString())

  const url = `${RUNTIME.apiBaseUrl}/v1/tasks${params.toString() ? `?${params}` : ""}`
  return fetchWithValidation(url, { method: "GET" }, ScheduledTasksResponseSchema)
}

// POST /v1/tasks
export async function createScheduledTask(data: {
  task_type: TaskType
  reference_id?: string
  reference_type?: string
  scheduled_at: string
  payload?: Record<string, unknown>
}): Promise<ScheduledTask> {
  const url = `${RUNTIME.apiBaseUrl}/v1/tasks`
  return fetchWithValidation(
    url,
    { method: "POST", body: JSON.stringify(data) },
    ScheduledTaskSchema,
  )
}

// ============================================================================
// DASHBOARD API
// ============================================================================

// GET /v1/dashboard/stats
export async function getDashboardStats(): Promise<DashboardStats> {
  const url = `${RUNTIME.apiBaseUrl}/v1/dashboard/stats`
  return fetchWithValidation(url, { method: "GET" }, DashboardStatsSchema)
}
