import { RUNTIME } from "@/config/runtime"
import type { OutputTarget, ReuseMode } from "@/components/lead-builder/types"

const TIMEOUT_MS = 20_000

type ApiErrorShape = { error?: string; message?: string }

// ===== Mock mode =====
const isMockMode = !RUNTIME.apiBaseUrl || RUNTIME.apiBaseUrl.trim() === ""

type MockTemplate = {
  template_id: string
  type: OutputTarget
  title: string
  tags: string[]
  content: any
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
  ],
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
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

    // safe parse (empty body safe)
    const text = await response.text()
    const data = text.trim() ? JSON.parse(text) : null

    if (!response.ok) {
      const err = (data ?? {}) as ApiErrorShape
      throw new Error(err.message || err.error || `HTTP ${response.status}`)
    }

    return data
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Request timed out")
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

// ===== Public API =====
export async function postDraft(args: { input_text: string; output_target: OutputTarget; reuse_mode: ReuseMode }) {
  if (isMockMode) {
    await sleep(200)
    return {
      draft_id: `dr_${Math.floor(Math.random() * 10000)}`,
      understanding: {
        summary_bullets: [
          `Input erkannt: ${args.input_text.slice(0, 60)}${args.input_text.length > 60 ? "…" : ""}`,
          "Ziel: Kampagne / Suchauftrag erstellen",
        ],
        assumptions: ["Start sofort", "Kein Stopdatum (sofern nicht angegeben)"],
        questions: ["Soll Jobboards-Suche erlaubt sein?"],
      },
      proposed_intent_spec: { raw: args.input_text },
    }
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/builder/draft`
  return fetchWithTimeout(url, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      user_id: RUNTIME.userId,
      input_text: args.input_text,
      output_target: args.output_target,
      reuse_mode: args.reuse_mode,
    }),
  })
}

export async function postMatch(args: { input_text: string; types: OutputTarget[]; top_k: number }) {
  if (isMockMode) {
    await sleep(150)
    const lower = args.input_text.toLowerCase()
    if (lower.includes("exact") || lower.includes("gleich wie vorher")) {
      return {
        normalized_text: "normalized:<EXACT>",
        hash_hit: { template_id: "tpl_hash", type: "lead_campaign_json", title: "Exact template" },
        candidates: [],
      }
    }
    return {
      normalized_text: "normalized:<SIMILAR>",
      hash_hit: null,
      candidates: [
        { template_id: "tpl_10", type: "lead_campaign_json", score: 0.93, title: "SHK Westbalkan DE" },
        { template_id: "tpl_11", type: "call_prompt", score: 0.86, title: "Call Script – Erstkontakt Firma" },
      ],
    }
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates/match`
  return fetchWithTimeout(url, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      input_text: args.input_text,
      types: args.types,
      top_k: args.top_k,
    }),
  })
}

export async function postRender(args: { template_id: string; parameters?: any; output_target: OutputTarget }) {
  if (isMockMode) {
    await sleep(150)
    const tpl = mockDb.templates.find((t) => t.template_id === args.template_id)
    if (tpl) {
      tpl.usage_count += 1
      tpl.last_used_at = new Date().toISOString()
      return { content: tpl.content }
    }
    return { content: { type: args.output_target, name: "Unknown template", template_id: args.template_id } }
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates/render`
  return fetchWithTimeout(url, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      template_id: args.template_id,
      parameters: args.parameters ?? {},
      output_target: args.output_target,
    }),
  })
}

export async function postConfirm(args: { draft_id: string; output_target: OutputTarget; edits_text?: string }) {
  if (isMockMode) {
    await sleep(220)
    return {
      artifact: {
        artifact_id: `art_${Math.floor(Math.random() * 10000)}`,
        type: args.output_target,
        content:
          args.output_target === "call_prompt" || args.output_target === "enrichment_prompt"
            ? `PROMPT (${args.output_target})\nDraft: ${args.draft_id}\nEdits: ${args.edits_text || "(none)"}`
            : {
                type: args.output_target,
                draft_id: args.draft_id,
                edits: args.edits_text ?? "",
                search_spec: { limit: 200 },
                created_at: new Date().toISOString(),
              },
      },
      save_suggestion: { should_save_as_template: true, title: "New Template" },
    }
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/builder/confirm`
  return fetchWithTimeout(url, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      draft_id: args.draft_id,
      confirmation: true,
      edits_text: args.edits_text ?? "",
    }),
  })
}

export async function getTemplates(args: { type?: OutputTarget; query?: string }) {
  if (isMockMode) {
    await sleep(120)
    const q = (args.query ?? "").toLowerCase().trim()
    const items = mockDb.templates
      .filter((t) => (args.type ? t.type === args.type : true))
      .filter((t) => (q ? t.title.toLowerCase().includes(q) || t.tags.join(",").toLowerCase().includes(q) : true))
      .map((t) => ({
        template_id: t.template_id,
        type: t.type,
        title: t.title,
        tags: t.tags,
        usage_count: t.usage_count,
        last_used_at: t.last_used_at,
      }))
    return { items }
  }

  const params = new URLSearchParams()
  params.set("workspace_id", RUNTIME.workspaceId)
  if (args.type) params.set("type", args.type)
  if (args.query) params.set("query", args.query)

  const url = `${RUNTIME.apiBaseUrl}/v1/templates?${params.toString()}`
  return fetchWithTimeout(url, { method: "GET" })
}

export async function postTemplate(args: { type: OutputTarget; title: string; tags: string[]; content: any }) {
  if (isMockMode) {
    await sleep(150)
    const exists = mockDb.templates.some((t) => t.title.trim().toLowerCase() === args.title.trim().toLowerCase())
    if (exists) throw new Error("Template title already exists")
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
    return { template_id, version: 1 }
  }

  const url = `${RUNTIME.apiBaseUrl}/v1/templates`
  return fetchWithTimeout(url, {
    method: "POST",
    body: JSON.stringify({
      workspace_id: RUNTIME.workspaceId,
      type: args.type,
      title: args.title,
      tags: args.tags ?? [],
      content: args.content,
    }),
  })
}
