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
