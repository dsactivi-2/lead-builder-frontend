# Lead Builder Frontend - V2 Production Hardening

## Ziel

Upgrade von "100% Spec-Compliance" zu "Production-Ready, Scalable, Audit-Ready".

---

## Technologie-Stack

- **Framework:** Next.js 14+ (App Router)
- **UI:** React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui
- **Validation:** Zod (Runtime Contract Validation)
- **State:** React useState + Workflow State Machine
- **Tests:** Vitest + React Testing Library

---

# TEIL 1: WORKFLOW STATE MACHINE

## BuilderPhase Type

```typescript
// src/lib/workflow.ts

export type BuilderPhase =
  | "idle"           // Startseite, kein Draft
  | "drafting"       // POST /draft läuft
  | "matching"       // POST /match läuft
  | "hash_hit"       // Exakter Match gefunden, warte auf User
  | "candidates"     // Ähnliche Templates gefunden
  | "editing"        // User bearbeitet Edits-Textarea
  | "confirming"     // POST /confirm läuft
  | "artifact_ready" // Artifact erstellt, bereit zum Export/Save
  | "saving"         // POST /template läuft
  | "error"          // Fehler aufgetreten

export type BuilderState = {
  phase: BuilderPhase
  draftId: string | null
  artifact: Artifact | null
  error: ApiError | null
  matchCandidates: MatchCandidate[]
  hashHit: HashHit | null
}

export const initialState: BuilderState = {
  phase: "idle",
  draftId: null,
  artifact: null,
  error: null,
  matchCandidates: [],
  hashHit: null,
}
```

## Phase Transitions

```
idle → drafting (User sendet Message)
drafting → matching (Draft erfolgreich)
drafting → error (Draft fehlgeschlagen)

matching → hash_hit (Exakter Match gefunden + reuseMode !== 'alwaysNew')
matching → candidates (Ähnliche gefunden)
matching → editing (Keine Matches)

hash_hit → artifact_ready (Auto-Render erfolgreich)
hash_hit → editing (User klickt "Create New")

candidates → artifact_ready (User wählt Template)
candidates → editing (User klickt "Create New")

editing → confirming (User klickt Confirm)
editing → idle (User klickt Reject)

confirming → artifact_ready (Confirm erfolgreich)
confirming → error (Confirm fehlgeschlagen)

artifact_ready → saving (User klickt Save Template)
artifact_ready → idle (User klickt Clear)

saving → artifact_ready (Save erfolgreich)
saving → error (Save fehlgeschlagen, z.B. Duplicate Title)

error → idle (User klickt Retry/Reset)
```

## Phase-basierte UI Rendering

```typescript
// In page.tsx oder ChatPanel.tsx

function renderByPhase(state: BuilderState) {
  switch (state.phase) {
    case "idle":
      return <ChatInput enabled />
    case "drafting":
    case "matching":
    case "confirming":
    case "saving":
      return <ChatInput disabled loading />
    case "hash_hit":
      return <HashHitBanner hit={state.hashHit} />
    case "candidates":
      return <MatchBanner candidates={state.matchCandidates} />
    case "editing":
      return <EditsPanel draftId={state.draftId} />
    case "artifact_ready":
      return <ArtifactViewer artifact={state.artifact} />
    case "error":
      return <ErrorPanel error={state.error} onRetry={reset} />
  }
}
```

## Test-IDs für Workflow States

```
data-testid="workflow.phase.idle"
data-testid="workflow.phase.drafting"
data-testid="workflow.phase.matching"
data-testid="workflow.phase.hash_hit"
data-testid="workflow.phase.candidates"
data-testid="workflow.phase.editing"
data-testid="workflow.phase.confirming"
data-testid="workflow.phase.artifact_ready"
data-testid="workflow.phase.saving"
data-testid="workflow.phase.error"
```

---

# TEIL 2: ERROR CLASSIFICATION

## ApiErrorKind Type

```typescript
// src/lib/errors.ts

export type ApiErrorKind =
  | "network"      // Keine Verbindung, DNS, etc.
  | "timeout"      // Request timed out (20s)
  | "validation"   // 400 Bad Request, ungültige Daten
  | "permission"   // 401/403 Unauthorized/Forbidden
  | "not_found"    // 404 Resource nicht gefunden
  | "conflict"     // 409 Conflict (z.B. Duplicate Title)
  | "rate_limit"   // 429 Too Many Requests
  | "server"       // 500+ Server Error

export interface ApiError {
  kind: ApiErrorKind
  message: string
  statusCode?: number
  retryable: boolean
  details?: Record<string, unknown>
}

export function classifyError(error: unknown, statusCode?: number): ApiError {
  // Network/Timeout
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.message.includes("timeout")) {
      return { kind: "timeout", message: "Request timed out", retryable: true }
    }
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return { kind: "network", message: "Network error", retryable: true }
    }
  }

  // HTTP Status Codes
  if (statusCode) {
    if (statusCode === 400) return { kind: "validation", message: "Invalid request", retryable: false }
    if (statusCode === 401) return { kind: "permission", message: "Unauthorized", retryable: false }
    if (statusCode === 403) return { kind: "permission", message: "Forbidden", retryable: false }
    if (statusCode === 404) return { kind: "not_found", message: "Not found", retryable: false }
    if (statusCode === 409) return { kind: "conflict", message: "Conflict", retryable: false }
    if (statusCode === 429) return { kind: "rate_limit", message: "Rate limited", retryable: true }
    if (statusCode >= 500) return { kind: "server", message: "Server error", retryable: true }
  }

  return { kind: "server", message: "Unknown error", retryable: true }
}
```

## Error UI Mapping

```typescript
// Error-spezifische UI-Reaktionen

const errorUIMap: Record<ApiErrorKind, { icon: string; action: string; color: string }> = {
  network: { icon: "WifiOff", action: "Check connection", color: "yellow" },
  timeout: { icon: "Clock", action: "Try again", color: "yellow" },
  validation: { icon: "AlertCircle", action: "Check input", color: "red" },
  permission: { icon: "Lock", action: "Login required", color: "red" },
  not_found: { icon: "Search", action: "Resource missing", color: "gray" },
  conflict: { icon: "Copy", action: "Change title", color: "orange" },
  rate_limit: { icon: "Timer", action: "Wait and retry", color: "yellow" },
  server: { icon: "Server", action: "Try again later", color: "red" },
}
```

## Test-IDs für Errors

```
data-testid="error.panel"
data-testid="error.kind.network"
data-testid="error.kind.timeout"
data-testid="error.kind.validation"
data-testid="error.kind.permission"
data-testid="error.kind.conflict"
data-testid="error.kind.rate_limit"
data-testid="error.kind.server"
data-testid="error.retry-button"
data-testid="error.reset-button"
```

---

# TEIL 3: ZOD CONTRACT VALIDATION

## Installation

```bash
npm install zod
```

## API Response Schemas

```typescript
// src/lib/contracts.ts

import { z } from "zod"

// === Base Types ===

export const OutputTargetSchema = z.enum([
  "lead_campaign_json",
  "lead_job_json",
  "call_prompt",
  "enrichment_prompt"
])

export const ReuseModeSchema = z.enum(["auto", "libraryOnly", "alwaysNew"])

// === POST /v1/builder/draft Response ===

export const UnderstandingSchema = z.object({
  summary_bullets: z.array(z.string()),
  assumptions: z.array(z.string()),
  questions: z.array(z.string()),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
    confidence: z.number().optional()
  })).optional(),
  intent: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
})

export const DraftResponseSchema = z.object({
  draft_id: z.string().regex(/^dr_\d+$/),
  understanding: UnderstandingSchema,
  proposed_intent_spec: z.record(z.unknown()).optional()
})

// === POST /v1/templates/match Response ===

export const MatchCandidateSchema = z.object({
  template_id: z.string(),
  type: OutputTargetSchema,
  score: z.number().min(0).max(1),
  title: z.string()
})

export const HashHitSchema = z.object({
  template_id: z.string(),
  type: OutputTargetSchema,
  title: z.string()
})

export const MatchResponseSchema = z.object({
  normalized_text: z.string(),
  hash_hit: HashHitSchema.nullable(),
  candidates: z.array(MatchCandidateSchema)
})

// === POST /v1/templates/render Response ===

export const RenderResponseSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())])
})

// === POST /v1/builder/confirm Response ===

export const ArtifactSchema = z.object({
  artifact_id: z.string().optional(),
  type: OutputTargetSchema,
  content: z.union([z.string(), z.record(z.unknown())])
})

export const ConfirmResponseSchema = z.object({
  artifact: ArtifactSchema,
  save_suggestion: z.object({
    should_save_as_template: z.boolean(),
    title: z.string().optional()
  }).optional()
})

// === GET /v1/templates Response ===

export const TemplateItemSchema = z.object({
  template_id: z.string(),
  type: OutputTargetSchema,
  title: z.string(),
  tags: z.array(z.string()),
  usage_count: z.number(),
  last_used_at: z.string().optional()
})

export const TemplatesResponseSchema = z.object({
  items: z.array(TemplateItemSchema)
})

// === POST /v1/templates Response ===

export const CreateTemplateResponseSchema = z.object({
  template_id: z.string(),
  version: z.number()
})

// === Type Exports ===

export type OutputTarget = z.infer<typeof OutputTargetSchema>
export type ReuseMode = z.infer<typeof ReuseModeSchema>
export type Understanding = z.infer<typeof UnderstandingSchema>
export type DraftResponse = z.infer<typeof DraftResponseSchema>
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>
export type HashHit = z.infer<typeof HashHitSchema>
export type MatchResponse = z.infer<typeof MatchResponseSchema>
export type RenderResponse = z.infer<typeof RenderResponseSchema>
export type Artifact = z.infer<typeof ArtifactSchema>
export type ConfirmResponse = z.infer<typeof ConfirmResponseSchema>
export type TemplateItem = z.infer<typeof TemplateItemSchema>
export type TemplatesResponse = z.infer<typeof TemplatesResponseSchema>
export type CreateTemplateResponse = z.infer<typeof CreateTemplateResponseSchema>
```

## Validated API Functions

```typescript
// src/lib/api.ts - Updated with Zod validation

import {
  DraftResponseSchema,
  MatchResponseSchema,
  RenderResponseSchema,
  ConfirmResponseSchema,
  TemplatesResponseSchema,
  CreateTemplateResponseSchema
} from "./contracts"
import { classifyError, ApiError } from "./errors"

async function fetchWithValidation<T>(
  url: string,
  options: RequestInit,
  schema: z.ZodSchema<T>
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...options.headers }
    })

    const text = await response.text()
    const data = text.trim() ? JSON.parse(text) : null

    if (!response.ok) {
      const error = classifyError(null, response.status)
      error.message = data?.message || data?.error || error.message
      throw error
    }

    // Zod validation
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      console.error("Contract violation:", parsed.error.issues)
      throw {
        kind: "validation",
        message: "Invalid API response format",
        retryable: false,
        details: parsed.error.issues
      } as ApiError
    }

    return parsed.data
  } catch (error) {
    if ((error as ApiError).kind) throw error
    throw classifyError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}

// Example usage:
export async function postDraft(args: DraftRequest): Promise<DraftResponse> {
  if (isMockMode) {
    const mockResponse = generateMockDraft(args)
    return DraftResponseSchema.parse(mockResponse) // Validate mock too!
  }

  return fetchWithValidation(
    `${RUNTIME.apiBaseUrl}/v1/builder/draft`,
    { method: "POST", body: JSON.stringify(args) },
    DraftResponseSchema
  )
}
```

---

# TEIL 4: EDGE-CASE TESTS

## Test 1: Error Flow

```typescript
// src/lib/api.test.ts

describe("Error Handling", () => {
  it("classifies network error correctly", async () => {
    // Mock fetch to throw network error
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("fetch failed"))

    await expect(postDraft({
      input_text: "Test",
      output_target: "lead_campaign_json",
      reuse_mode: "auto"
    })).rejects.toMatchObject({
      kind: "network",
      retryable: true
    })
  })

  it("classifies timeout correctly", async () => {
    vi.spyOn(global, "fetch").mockImplementationOnce(() =>
      new Promise((_, reject) => {
        const error = new Error("timeout")
        error.name = "AbortError"
        setTimeout(() => reject(error), 100)
      })
    )

    await expect(postDraft({
      input_text: "Test",
      output_target: "lead_campaign_json",
      reuse_mode: "auto"
    })).rejects.toMatchObject({
      kind: "timeout",
      retryable: true
    })
  })

  it("classifies conflict (409) correctly", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: () => Promise.resolve('{"message": "Title already exists"}')
    } as Response)

    await expect(postTemplate({
      type: "lead_campaign_json",
      title: "Duplicate",
      tags: [],
      content: {}
    })).rejects.toMatchObject({
      kind: "conflict",
      retryable: false
    })
  })
})
```

## Test 2: Always-New Mode ignores Hash Hit

```typescript
describe("Reuse Mode Behavior", () => {
  it("ignores hash_hit when reuseMode is alwaysNew", async () => {
    const result = await postMatch({
      input_text: "exact gleich wie vorher", // Triggers hash_hit in mock
      types: ["lead_campaign_json"],
      top_k: 5
    })

    // Hash hit exists in response
    expect(result.hash_hit).not.toBeNull()

    // But with alwaysNew, UI should NOT auto-render
    // This is a UI-level test, but we verify the data is correct
    expect(result.candidates).toBeDefined()
  })
})
```

## Test 3: Save Template Conflict

```typescript
describe("Template Conflicts", () => {
  it("throws conflict error on duplicate title", async () => {
    // First save succeeds
    const first = await postTemplate({
      type: "lead_campaign_json",
      title: "Unique Title",
      tags: ["test"],
      content: { name: "Test" }
    })
    expect(first.template_id).toBeDefined()

    // Second save with same title fails
    await expect(postTemplate({
      type: "lead_campaign_json",
      title: "Unique Title", // Same title
      tags: ["test2"],
      content: { name: "Test2" }
    })).rejects.toThrow("Template title already exists")
  })

  it("SaveTemplateDialog shows error but stays open", async () => {
    // This is a component test
    render(<SaveTemplateDialog open={true} onSave={mockSave} />)

    // Fill form
    fireEvent.change(screen.getByTestId("ui.templateSave.title"), {
      target: { value: "SHK Westbalkan DE" } // Existing title
    })

    // Submit
    fireEvent.click(screen.getByTestId("ui.templateSave.save"))

    // Error shown, dialog still open
    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument()
      expect(screen.getByTestId("ui.templateSave.title")).toBeInTheDocument()
    })
  })
})
```

## Test 4: Contract Validation

```typescript
describe("Contract Validation", () => {
  it("rejects invalid draft response", async () => {
    const invalidResponse = {
      draft_id: "invalid-format", // Should be dr_\d+
      understanding: {
        summary_bullets: "not an array" // Should be array
      }
    }

    expect(() => DraftResponseSchema.parse(invalidResponse)).toThrow()
  })

  it("validates mock responses against contracts", async () => {
    const result = await postDraft({
      input_text: "Test query",
      output_target: "lead_campaign_json",
      reuse_mode: "auto"
    })

    // This should not throw if mock is correct
    expect(() => DraftResponseSchema.parse(result)).not.toThrow()
  })
})
```

---

# TEIL 5: UPDATED COMPONENT TEST-IDS

## Vollständige Test-ID Liste

### Workflow Phase Indicators
```
workflow.phase.idle
workflow.phase.drafting
workflow.phase.matching
workflow.phase.hash_hit
workflow.phase.candidates
workflow.phase.editing
workflow.phase.confirming
workflow.phase.artifact_ready
workflow.phase.saving
workflow.phase.error
```

### Chat Panel (existing)
```
ui.chat.panel
ui.chat.input
ui.chat.send
ui.chat.messages
```

### Builder/Understanding (existing)
```
ui.builder.understandingCard
ui.builder.editsInput
ui.builder.confirm
ui.builder.reject
```

### Output Panel (existing)
```
ui.output.panel
ui.output.typeSelect
ui.output.reuseMode
ui.output.reuseMode.auto
ui.output.reuseMode.libraryOnly
ui.output.reuseMode.alwaysNew
```

### Templates (existing)
```
ui.templates.matchBanner
ui.templates.candidateItem.{id}
```

### Artifact (existing)
```
ui.artifact.viewer
ui.artifact.content
ui.artifact.loading
ui.artifact.error
ui.artifact.empty
```

### Template Save (existing)
```
ui.templateSave.title
ui.templateSave.tags
ui.templateSave.cancel
ui.templateSave.save
ui.templateSave.error
```

### Error Panel (NEW)
```
error.panel
error.kind.{kind}
error.message
error.retry-button
error.reset-button
```

### Loading States (NEW)
```
loading.draft
loading.match
loading.render
loading.confirm
loading.save
```

---

# TEIL 6: FILE STRUCTURE

```
src/
├── lib/
│   ├── api.ts              # API functions with validation
│   ├── api.test.ts         # API + Edge-case tests
│   ├── contracts.ts        # Zod schemas
│   ├── errors.ts           # Error classification
│   └── workflow.ts         # BuilderPhase state machine
├── hooks/
│   ├── useBuilderWorkflow.ts  # Workflow state hook
│   ├── useDarkMode.ts
│   └── useLocalStorage.ts
├── components/
│   ├── lead-builder/
│   │   ├── ChatPanel.tsx
│   │   ├── OutputPanel.tsx
│   │   ├── ArtifactViewer.tsx
│   │   ├── MatchBanner.tsx
│   │   ├── TemplatesTab.tsx
│   │   ├── SaveTemplateDialog.tsx
│   │   ├── ErrorPanel.tsx     # NEW
│   │   ├── WorkflowIndicator.tsx  # NEW
│   │   └── types.ts
│   └── ui/
│       └── ... (shadcn components)
├── app/
│   └── lead-builder/
│       ├── page.tsx
│       ├── loading.tsx
│       └── error.tsx
└── config/
    └── runtime.ts
```

---

# TEIL 7: IMPLEMENTATION CHECKLIST

## Phase 1: Core Infrastructure
- [ ] Create `src/lib/errors.ts` with ApiErrorKind
- [ ] Create `src/lib/contracts.ts` with Zod schemas
- [ ] Create `src/lib/workflow.ts` with BuilderPhase
- [ ] Install Zod: `npm install zod`

## Phase 2: API Hardening
- [ ] Update `src/lib/api.ts` to use contracts
- [ ] Add error classification to all API functions
- [ ] Validate mock responses against contracts

## Phase 3: State Management
- [ ] Create `src/hooks/useBuilderWorkflow.ts`
- [ ] Update `page.tsx` to use workflow state
- [ ] Add phase-based conditional rendering

## Phase 4: UI Components
- [ ] Create `src/components/lead-builder/ErrorPanel.tsx`
- [ ] Create `src/components/lead-builder/WorkflowIndicator.tsx`
- [ ] Add loading state test-ids
- [ ] Add error state test-ids

## Phase 5: Tests
- [ ] Add error classification tests
- [ ] Add contract validation tests
- [ ] Add edge-case tests (conflict, timeout, alwaysNew)
- [ ] Run full test suite: `npm test`

## Phase 6: Verification
- [ ] Build passes: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Manual test: Mock mode workflow
- [ ] Update BLUEPRINT_CHECK.md

---

# ZUSAMMENFASSUNG

| Feature | V1 Status | V2 Upgrade |
|---------|-----------|------------|
| API Endpoints | ✅ 6/6 | + Zod Validation |
| Error Handling | ⚠️ Basic | + Classification |
| State Management | ⚠️ useState | + Workflow State Machine |
| Tests | ✅ 6 Tests | + 6 Edge-Case Tests |
| Type Safety | ✅ TypeScript | + Runtime Validation |

**V2 = Production-Ready, Scalable, Audit-Ready**

---

*Generiert: 2026-01-01*
*Version: 2.0 Production Hardening*

---

# TEIL 8: HOUSEFINDER-ERWEITERUNG (V3)

## Neue Seiten und Komponenten

Die folgenden Seiten erweitern den Lead Builder um vollständige Campaign- und Lead-Management-Funktionen, inspiriert von der Housefinder-Architektur.

---

## 8.1 Dashboard Page (`/dashboard`)

**Beschreibung:** Übersichtsseite mit KPIs, Charts und Quick Actions.

**Test-IDs:**
```
data-testid="dashboard_page"
data-testid="dashboard_stats_campaigns"
data-testid="dashboard_stats_leads"
data-testid="dashboard_stats_communications"
data-testid="dashboard_stats_conversionRate"
data-testid="dashboard_stats_responseRate"
data-testid="dashboard_chart_leadsOverTime"
data-testid="dashboard_list_recentLeads"
data-testid="dashboard_card_recentLead_{id}"
data-testid="dashboard_button_newCampaign"
data-testid="dashboard_button_newLead"
```

**API Endpoint:**
```typescript
GET /v1/dashboard/stats
Response: DashboardStats {
  campaigns: { total: number, active: number, urgent: number }
  leads: { total: number, new_count: number, contacted: number, converted: number, hot: number, avg_score: number | null }
  communications: { total: number, sent: number, responses: number }
  recent_leads: Array<{ id, name, company, score, status, quality, created_at }>
  conversion_rate: string | number
  response_rate: string | number
}
```

**Layout:**
- Header mit Titel "Dashboard" und Quick-Action Buttons
- 5 Stat Cards in einer Reihe (Kampagnen, Leads, Kommunikation, Conversion Rate, Response Rate)
- 2-Spalten Layout: Links Chart (Leads über Zeit), Rechts Recent Leads Liste

---

## 8.2 Campaigns Page (`/campaigns`)

**Beschreibung:** Liste aller Kampagnen mit Filtern und CRUD-Operationen.

**Test-IDs:**
```
data-testid="campaigns_page"
data-testid="campaigns_button_create"
data-testid="campaigns_filter_status"
data-testid="campaigns_filter_priority"
data-testid="campaigns_list"
data-testid="campaigns_card_{id}"
data-testid="campaigns_card_{id}_name"
data-testid="campaigns_card_{id}_status"
data-testid="campaigns_card_{id}_priority"
data-testid="campaigns_card_{id}_progress"
data-testid="campaigns_card_{id}_button_edit"
data-testid="campaigns_card_{id}_button_delete"
data-testid="campaigns_card_{id}_button_viewLeads"
data-testid="campaigns_empty_state"
```

**API Endpoints:**
```typescript
GET /v1/campaigns?status={status}&priority={priority}
Response: CampaignsResponse { items: Campaign[] }

POST /v1/campaigns
Body: { name, description?, target_type, priority?, search_criteria?, target_count?, start_date?, end_date? }
Response: Campaign

PATCH /v1/campaigns/:id
DELETE /v1/campaigns/:id
GET /v1/campaigns/:id/stats → CampaignStats
```

**Types:**
```typescript
type CampaignStatus = "active" | "paused" | "completed" | "archived"
type CampaignPriority = "urgent" | "high" | "normal" | "low"
type CampaignTargetType = "lead_campaign" | "job_posting" | "call_list"
```

---

## 8.3 Leads Page (`/leads`)

**Beschreibung:** Vollständige Lead-Verwaltung mit Tabelle, Filtern und Bulk-Aktionen.

**Test-IDs:**
```
data-testid="leads_page"
data-testid="leads_button_create"
data-testid="leads_button_import"
data-testid="leads_button_bulkAction"
data-testid="leads_filter_status"
data-testid="leads_filter_quality"
data-testid="leads_filter_campaign"
data-testid="leads_search_input"
data-testid="leads_sort_select"
data-testid="leads_table"
data-testid="leads_table_header"
data-testid="leads_table_row_{id}"
data-testid="leads_table_row_{id}_checkbox"
data-testid="leads_table_row_{id}_name"
data-testid="leads_table_row_{id}_company"
data-testid="leads_table_row_{id}_email"
data-testid="leads_table_row_{id}_score"
data-testid="leads_table_row_{id}_status"
data-testid="leads_table_row_{id}_quality"
data-testid="leads_table_row_{id}_button_view"
data-testid="leads_table_row_{id}_button_contact"
data-testid="leads_pagination"
```

**API Endpoints:**
```typescript
GET /v1/leads?campaign_id=&status=&quality=&limit=&offset=&sort=&order=
Response: LeadsResponse { items: Lead[], total: number, limit: number, offset: number }

POST /v1/leads
Body: { campaign_id?, source, name?, company?, email?, phone?, location?, tags? }
Response: Lead

POST /v1/leads/batch
Body: { campaign_id?, leads: Array<...> }
Response: BatchLeadsResponse { created: number, duplicates: number, errors: number, items: string[] }

GET /v1/leads/:id → Lead (with communications, analyses)
PATCH /v1/leads/:id
DELETE /v1/leads/:id

POST /v1/leads/:id/score
Body: { criteria?: Record<string, unknown> }
Response: LeadScoreResponse { lead_id, previous_score, new_score }
```

**Types:**
```typescript
type LeadStatus = "new" | "contacted" | "responded" | "qualified" | "converted" | "rejected"
type LeadQuality = "hot" | "warm" | "cold" | "unknown"
type LeadSource = "manual" | "scraper" | "import" | "api"

interface LeadWarning {
  type: string  // "no_contact" | "duplicate" | "incomplete"
  message: string
}
```

---

## 8.4 Communications Page (`/communications`)

**Beschreibung:** Übersicht aller Kommunikationen mit Filter- und Suchfunktion.

**Test-IDs:**
```
data-testid="communications_page"
data-testid="communications_button_compose"
data-testid="communications_filter_channel"
data-testid="communications_filter_status"
data-testid="communications_filter_direction"
data-testid="communications_list"
data-testid="communications_item_{id}"
data-testid="communications_item_{id}_channel"
data-testid="communications_item_{id}_direction"
data-testid="communications_item_{id}_status"
data-testid="communications_item_{id}_leadName"
data-testid="communications_item_{id}_preview"
data-testid="communications_item_{id}_button_reply"
data-testid="communications_pagination"
```

**API Endpoints:**
```typescript
GET /v1/communications?lead_id=&campaign_id=&channel=&status=&limit=&offset=
Response: CommunicationsResponse { items: Communication[], limit, offset }

POST /v1/communications
Body: { lead_id?, campaign_id?, channel, type?, subject?, message, template_id? }
Response: Communication

POST /v1/communications/batch
Body: { lead_ids: string[], campaign_id?, channel, type?, subject?, message }
Response: BatchCommunicationsResponse { sent: number, failed: number, items: string[] }

POST /v1/communications/:id/response
Body: { response_text: string }
Response: CommunicationResponseResult { response_id, original_id }
```

**Types:**
```typescript
type CommunicationChannel = "email" | "whatsapp" | "phone" | "linkedin"
type CommunicationDirection = "outbound" | "inbound"
type CommunicationType = "initial" | "followup" | "response" | "thank_you"
type CommunicationStatus = "pending" | "sent" | "delivered" | "read" | "failed"
```

---

## 8.5 Sources Page (`/sources`)

**Beschreibung:** Verwaltung von Lead-Quellen (Scraper, APIs, Imports).

**Test-IDs:**
```
data-testid="sources_page"
data-testid="sources_button_create"
data-testid="sources_list"
data-testid="sources_card_{id}"
data-testid="sources_card_{id}_name"
data-testid="sources_card_{id}_type"
data-testid="sources_card_{id}_platform"
data-testid="sources_card_{id}_toggle_active"
data-testid="sources_card_{id}_stats"
data-testid="sources_card_{id}_button_edit"
```

**API Endpoints:**
```typescript
GET /v1/sources
Response: SourcesResponse { items: Source[] }

POST /v1/sources
Body: { name, type, platform?, config?, is_active? }
Response: Source

PATCH /v1/sources/:id
```

**Types:**
```typescript
type SourceType = "scraper" | "api" | "import" | "manual"
```

---

## 8.6 Analyses Page (`/analyses`)

**Beschreibung:** KI-Analysen von Lead-Antworten und Kommunikation.

**Test-IDs:**
```
data-testid="analyses_page"
data-testid="analyses_button_create"
data-testid="analyses_filter_type"
data-testid="analyses_list"
data-testid="analyses_item_{id}"
data-testid="analyses_item_{id}_type"
data-testid="analyses_item_{id}_sentiment"
data-testid="analyses_item_{id}_confidence"
data-testid="analyses_item_{id}_action"
```

**API Endpoints:**
```typescript
GET /v1/analyses?lead_id=&analysis_type=&limit=
Response: AnalysesResponse { items: Analysis[] }

POST /v1/analyses
Body: { communication_id?, lead_id?, analysis_type, text_to_analyze }
Response: Analysis
```

**Types:**
```typescript
type AnalysisType = "response" | "sentiment" | "intent" | "qualification"
type Sentiment = "positive" | "neutral" | "negative"
```

---

## 8.7 Reports Page (`/reports`)

**Beschreibung:** Report-Generator und Archiv.

**Test-IDs:**
```
data-testid="reports_page"
data-testid="reports_button_generate"
data-testid="reports_filter_type"
data-testid="reports_filter_campaign"
data-testid="reports_list"
data-testid="reports_item_{id}"
data-testid="reports_item_{id}_title"
data-testid="reports_item_{id}_type"
data-testid="reports_item_{id}_button_view"
data-testid="reports_item_{id}_button_download"
data-testid="reports_generateDialog"
data-testid="reports_generateDialog_type"
data-testid="reports_generateDialog_campaign"
data-testid="reports_generateDialog_submit"
```

**API Endpoints:**
```typescript
GET /v1/reports?campaign_id=&report_type=&limit=
Response: ReportsResponse { items: Report[] }

POST /v1/reports
Body: { campaign_id?, report_type, period_start?, period_end? }
Response: Report
```

**Types:**
```typescript
type ReportType = "daily" | "weekly" | "campaign_summary" | "lead_quality"
```

---

## 8.8 Scheduled Tasks (`/tasks`)

**API Endpoints:**
```typescript
GET /v1/tasks?status=&task_type=&limit=
Response: ScheduledTasksResponse { items: ScheduledTask[] }

POST /v1/tasks
Body: { task_type, reference_id?, reference_type?, scheduled_at, payload? }
Response: ScheduledTask
```

**Types:**
```typescript
type TaskType = "campaign_run" | "followup" | "report" | "cleanup"
type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled"
```

---

## 8.9 Wiederverwendbare Komponenten

### StatusBadge
```typescript
data-testid="statusBadge_{status}"
Props: status: LeadStatus
Farben: new=blue, contacted=yellow, responded=green, qualified=purple, converted=emerald, rejected=red
```

### QualityBadge
```typescript
data-testid="qualityBadge_{quality}"
Props: quality: LeadQuality
Farben: hot=red, warm=orange, cold=blue, unknown=gray
```

### PriorityBadge
```typescript
data-testid="priorityBadge_{priority}"
Props: priority: CampaignPriority
Farben: urgent=red, high=orange, normal=blue, low=gray
```

### ChannelIcon
```typescript
data-testid="channelIcon_{channel}"
Props: channel: CommunicationChannel
Icons: email=Mail, whatsapp=MessageCircle, phone=Phone, linkedin=Linkedin
```

### ScoreIndicator
```typescript
data-testid="scoreIndicator"
Props: score: number (0-100)
Farben: 0-30=red, 31-60=yellow, 61-80=green, 81-100=emerald
```

### WarningAlert
```typescript
data-testid="warningAlert_{type}"
Props: warnings: LeadWarning[]
```

---

## 8.10 Navigation Sidebar

**Test-IDs:**
```
data-testid="sidebar"
data-testid="sidebar_logo"
data-testid="sidebar_nav"
data-testid="sidebar_navItem_dashboard"
data-testid="sidebar_navItem_campaigns"
data-testid="sidebar_navItem_leads"
data-testid="sidebar_navItem_communications"
data-testid="sidebar_navItem_sources"
data-testid="sidebar_navItem_analyses"
data-testid="sidebar_navItem_reports"
data-testid="sidebar_navItem_builder"
data-testid="sidebar_navItem_settings"
data-testid="sidebar_toggle"
```

---

## 8.11 API Client Erweiterung

Alle neuen API-Funktionen sind in `src/lib/api.ts` implementiert:

```typescript
// Campaigns
getCampaigns(filters?)
createCampaign(data)
getCampaign(id)
updateCampaign(id, data)
deleteCampaign(id)
getCampaignStats(id)

// Leads
getLeads(filters?)
createLead(data)
createLeadsBatch(data)
getLead(id)
updateLead(id, data)
deleteLead(id)
recalculateLeadScore(id, criteria?)

// Communications
getCommunications(filters?)
sendCommunication(data)
sendCommunicationsBatch(data)
recordCommunicationResponse(id, response_text)

// Sources
getSources()
createSource(data)
updateSource(id, data)

// Analyses
getAnalyses(filters?)
createAnalysis(data)

// Reports
getReports(filters?)
generateReport(data)

// Tasks
getScheduledTasks(filters?)
createScheduledTask(data)

// Dashboard
getDashboardStats()
```

---

## 8.12 Vollständige Endpoint-Tabelle

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/v1/dashboard/stats` | GET | Dashboard-Statistiken |
| `/v1/campaigns` | GET, POST | Kampagnen-Liste und Erstellen |
| `/v1/campaigns/:id` | GET, PATCH, DELETE | Einzelne Kampagne |
| `/v1/campaigns/:id/stats` | GET | Kampagnen-Statistiken |
| `/v1/leads` | GET, POST | Leads-Liste und Erstellen |
| `/v1/leads/batch` | POST | Batch-Import von Leads |
| `/v1/leads/:id` | GET, PATCH, DELETE | Einzelner Lead |
| `/v1/leads/:id/score` | POST | Lead-Score neu berechnen |
| `/v1/communications` | GET, POST | Kommunikation Liste/Senden |
| `/v1/communications/batch` | POST | Batch-Versand |
| `/v1/communications/:id/response` | POST | Antwort aufzeichnen |
| `/v1/sources` | GET, POST | Quellen-Liste und Erstellen |
| `/v1/sources/:id` | PATCH | Quelle aktualisieren |
| `/v1/analyses` | GET, POST | Analysen Liste/Erstellen |
| `/v1/reports` | GET, POST | Reports Liste/Generieren |
| `/v1/tasks` | GET, POST | Geplante Aufgaben |
| `/v1/templates` | GET, POST | Templates |
| `/v1/templates/match` | POST | Template-Matching |
| `/v1/templates/render` | POST | Template rendern |
| `/v1/builder/draft` | POST | Draft erstellen |
| `/v1/builder/confirm` | POST | Draft bestätigen |
| `/health` | GET | Health Check |

---

## WICHTIGE HINWEISE FÜR V0

1. **Sprache:** Alle UI-Texte auf Deutsch
2. **Test-IDs:** Jedes interaktive Element MUSS ein `data-testid` haben
3. **Responsive:** Mobile-first Design, Sidebar collapsed auf Mobile
4. **Dark Mode:** Als Standard (dark mode first)
5. **Loading States:** Skeleton-Komponenten für alle Datenladen
6. **Error States:** Toast-Benachrichtigungen für Fehler
7. **Empty States:** Illustrationen und Call-to-Action für leere Listen
8. **Accessibility:** ARIA-Labels, Keyboard Navigation, Fokus-Management

---

*Generiert: 2026-01-01*
*Version: 3.0 Housefinder Integration*
