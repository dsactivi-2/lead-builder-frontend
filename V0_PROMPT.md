# Lead Builder Frontend - Vollständige v0.dev Spezifikation

## PROJEKT-KONTEXT

Baue ein **Lead Builder Frontend** - eine KI-gestützte App für Recruiting-Lead-Generierung.

**Tech Stack (PFLICHT):**
- Next.js 14+ (App Router)
- React 19
- TypeScript (strict mode)
- Tailwind CSS 4
- shadcn/ui Komponenten
- Lucide Icons

---

## VOLLSTÄNDIGER USER WORKFLOW

### Schritt 1: User öffnet /lead-builder
```
1. Zeige Header mit: "Lead Builder" Titel, Export Button (disabled), Clear Button, Theme Toggle
2. Zeige 2-Spalten Layout:
   - Links: ChatPanel (leer, nur Input sichtbar)
   - Rechts: OutputPanel mit Select, RadioGroup, leerer Artifact Viewer
3. Lade gespeicherte Messages aus localStorage (Key: "lead-builder-messages")
4. Footer zeigt Keyboard Shortcuts
```

### Schritt 2: User tippt Nachricht und klickt Send
```
1. Validiere: Input darf nicht leer sein
2. Disable Input + Send Button
3. Füge User-Message zur Liste hinzu (role: "user", text: "...")
4. Zeige Loading-Indicator im Chat
5. Rufe API: POST /v1/builder/draft
6. Bei Erfolg:
   - Füge Assistant-Message hinzu mit understanding Objekt
   - Zeige "Understanding Card" mit:
     - summary_bullets als Liste
     - assumptions als graue Liste
     - questions als rote Liste (falls vorhanden)
7. Parallel: Rufe API: POST /v1/templates/match
8. Bei Match-Erfolg:
   - Wenn hash_hit vorhanden UND reuseMode !== "alwaysNew":
     → Automatisch: Rufe POST /v1/templates/render
     → Zeige Artifact im Viewer
   - Wenn candidates vorhanden:
     → Zeige Match Banner mit Kandidaten
9. Enable Input wieder
10. Speichere Messages in localStorage
```

### Schritt 3: User sieht Understanding Card
```
Die Understanding Card zeigt:
┌─────────────────────────────────────────┐
│ [Badge: Verständnis]                    │
│ • Punkt 1 aus summary_bullets           │
│ • Punkt 2 aus summary_bullets           │
│                                         │
│ [Badge: Annahmen] (nur wenn vorhanden)  │
│ • Punkt 1 aus assumptions (grau)        │
│                                         │
│ [Badge: Rückfragen] (nur wenn vorhanden)│
│ • Punkt 1 aus questions (rot)           │
└─────────────────────────────────────────┘

Darunter (nur wenn draftId vorhanden):
┌─────────────────────────────────────────┐
│ [Textarea: Edits Input]                 │
│ Placeholder: "Optional: Korrekturen..." │
├─────────────────────────────────────────┤
│ [Button: Bestätigen] [Button: Ablehnen] │
└─────────────────────────────────────────┘
```

### Schritt 4a: User klickt "Bestätigen"
```
1. Disable Buttons
2. Zeige Loading im Artifact Viewer
3. Rufe API: POST /v1/builder/confirm mit:
   - draft_id aus letzter Assistant-Message
   - edits_text aus Edits Input (optional)
4. Bei Erfolg:
   - Setze artifact State
   - Zeige Artifact im Viewer
   - Zeige Toast: "Artifact created"
   - Enable Export Button in Header
5. Bei Fehler:
   - Zeige Error im Artifact Viewer
   - Zeige Toast (destructive): Fehlermeldung
```

### Schritt 4b: User klickt "Ablehnen"
```
1. Setze artifact auf null
2. Setze matchCandidates auf []
3. Zeige Toast: "Draft rejected"
```

### Schritt 5: Match Banner Interaktion
```
Wenn candidates vorhanden, zeige:
┌─────────────────────────────────────────────────────┐
│ [Badge: 2 Similar Templates] found                  │
│                          [Button: Create New Instead]│
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ SHK Westbalkan DE  [lead campaign] [93% match]  │ │
│ │                               [Button: Use This] │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Call Script        [call prompt] [86% match]    │ │
│ │                               [Button: Use This] │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

Bei Klick "Use This":
1. Rufe POST /v1/templates/render mit template_id
2. Setze artifact
3. Zeige Toast: "Template applied"

Bei Klick "Create New Instead":
1. Setze artifact auf null
2. Setze matchCandidates auf []
3. Zeige Toast: "Create new"
```

### Schritt 6: Artifact Viewer
```
Zeigt das generierte Artifact:
┌─────────────────────────────────────────┐
│ Generated Artifact    [Button: Save as  │
│                        Template]        │
├─────────────────────────────────────────┤
│ [Badge: lead_campaign_json]             │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ {                                   │ │
│ │   "type": "lead_campaign",          │ │
│ │   "name": "Test",                   │ │
│ │   "search_spec": { "limit": 200 }   │ │
│ │ }                                   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Für call_prompt / enrichment_prompt:
→ Zeige als plain text, nicht JSON

Loading State:
→ Skeleton Animation (animate-pulse)

Error State:
→ Rote Fehlermeldung

Empty State:
→ "No artifact generated yet"
```

### Schritt 7: Template speichern
```
Bei Klick "Save as Template":
1. Wenn kein artifact → Toast (destructive): "No artifact"
2. Öffne SaveTemplateDialog

Dialog:
┌─────────────────────────────────────────┐
│ Save as Template                    [X] │
├─────────────────────────────────────────┤
│ Title                                   │
│ [Input: "e.g. SHK Westbalkan DE"]       │
│                                         │
│ Tags (comma-separated)                  │
│ [Input: "e.g. SHK, DE, Westbalkan"]     │
│ Parsed: SHK · DE · Westbalkan           │
│                                         │
│ [Error Message wenn vorhanden]          │
├─────────────────────────────────────────┤
│              [Cancel] [Save]            │
└─────────────────────────────────────────┘

Bei Klick Save:
1. Validiere: Title darf nicht leer sein
2. Rufe POST /v1/templates
3. Bei Erfolg: Schließe Dialog, Toast: "Template saved"
4. Bei Fehler: Zeige Error im Dialog
```

### Schritt 8: Templates Tab
```
Rechte Spalte hat Tabs: [Artifact] [Templates]

Templates Tab:
1. Rufe GET /v1/templates beim Mount
2. Zeige Liste:
┌─────────────────────────────────────────┐
│ SHK Westbalkan DE               [Use]   │
│ [lead campaign] [SHK] [DE] Used 12x     │
├─────────────────────────────────────────┤
│ Call Script                     [Use]   │
│ [call prompt] [Sales]       Used 5x     │
└─────────────────────────────────────────┘

Bei Klick auf Template oder "Use":
→ Rufe POST /v1/templates/render
→ Setze artifact

Empty State:
→ "No saved templates yet."
```

### Schritt 9: Export
```
Bei Klick Export Button (Header):
1. Prüfe artifact vorhanden
2. Für JSON types (lead_campaign_json, lead_job_json):
   → Download als .json
3. Für text types (call_prompt, enrichment_prompt):
   → Download als .txt
4. Toast: "Artifact exported"
```

### Schritt 10: Clear Chat
```
Bei Klick Clear Button oder Cmd+K:
1. Setze messages auf []
2. Setze artifact auf null
3. Setze matchCandidates auf []
4. Lösche localStorage Key
5. Toast: "Chat cleared"
```

### Schritt 11: Dark Mode
```
Theme Toggle Button cycles: Light → Dark → System

Light Mode:
→ Sun Icon

Dark Mode:
→ Moon Icon

System Mode:
→ Monitor Icon

Speichere in localStorage("theme")
```

---

## API ENDPUNKTE - EXAKTE SPEZIFIKATION

### POST /v1/builder/draft

**URL:** `${NEXT_PUBLIC_API_BASE_URL}/v1/builder/draft`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```typescript
{
  workspace_id: string;      // aus NEXT_PUBLIC_WORKSPACE_ID
  user_id: string;           // aus NEXT_PUBLIC_USER_ID
  input_text: string;        // User-Eingabe
  output_target: OutputTarget;
  reuse_mode: ReuseMode;
}
```

**Success Response (200):**
```typescript
{
  draft_id: string;          // z.B. "dr_1234"
  understanding: {
    summary_bullets: string[];  // z.B. ["Ziel: 200 Leads", "Region: München"]
    assumptions: string[];      // z.B. ["Start sofort"]
    questions: string[];        // z.B. ["Jobboards erlaubt?"]
  };
  proposed_intent_spec: object;
}
```

**Error Response (4xx/5xx):**
```typescript
{
  error?: string;
  message?: string;
}
```

---

### POST /v1/templates/match

**URL:** `${NEXT_PUBLIC_API_BASE_URL}/v1/templates/match`

**Request Body:**
```typescript
{
  workspace_id: string;
  input_text: string;
  types: OutputTarget[];     // z.B. ["lead_campaign_json", "call_prompt"]
  top_k: number;             // z.B. 5
}
```

**Success Response (200):**
```typescript
{
  normalized_text: string;
  hash_hit: null | {
    template_id: string;
    type: OutputTarget;
    title: string;
  };
  candidates: Array<{
    template_id: string;
    type: OutputTarget;
    score: number;           // 0.0 - 1.0
    title: string;
  }>;
}
```

---

### POST /v1/templates/render

**URL:** `${NEXT_PUBLIC_API_BASE_URL}/v1/templates/render`

**Request Body:**
```typescript
{
  workspace_id: string;
  template_id: string;
  parameters: object;        // optional, default {}
  output_target: OutputTarget;
}
```

**Success Response (200):**
```typescript
{
  content: any;              // JSON object oder string
}
```

---

### POST /v1/builder/confirm

**URL:** `${NEXT_PUBLIC_API_BASE_URL}/v1/builder/confirm`

**Request Body:**
```typescript
{
  workspace_id: string;
  draft_id: string;
  confirmation: true;
  edits_text: string;        // optional, default ""
}
```

**Success Response (200):**
```typescript
{
  artifact: {
    artifact_id: string;
    type: OutputTarget;
    content: any;            // JSON object oder string
  };
  save_suggestion: {
    should_save_as_template: boolean;
    title: string;
  };
}
```

---

### GET /v1/templates

**URL:** `${NEXT_PUBLIC_API_BASE_URL}/v1/templates?workspace_id=xxx&type=xxx&query=xxx`

**Query Parameters:**
- `workspace_id` (required)
- `type` (optional): Filter by OutputTarget
- `query` (optional): Search in title/tags

**Success Response (200):**
```typescript
{
  items: Array<{
    template_id: string;
    type: OutputTarget;
    title: string;
    tags: string[];
    usage_count: number;
    last_used_at?: string;   // ISO date
  }>;
}
```

---

### POST /v1/templates

**URL:** `${NEXT_PUBLIC_API_BASE_URL}/v1/templates`

**Request Body:**
```typescript
{
  workspace_id: string;
  type: OutputTarget;
  title: string;
  tags: string[];
  content: any;
}
```

**Success Response (200):**
```typescript
{
  template_id: string;
  version: number;
}
```

**Error Response (400):**
```typescript
{
  message: "Template title already exists"
}
```

---

## TYPESCRIPT TYPES (EXAKT SO VERWENDEN)

```typescript
// Output Types
export type OutputTarget =
  | 'lead_campaign_json'
  | 'lead_job_json'
  | 'call_prompt'
  | 'enrichment_prompt';

// Reuse Modes
export type ReuseMode =
  | 'auto'           // Auto-detect (hash hit = reuse, sonst create)
  | 'alwaysNew'      // Immer neu erstellen
  | 'alwaysReuse';   // Immer aus Library

// Chat Message
export interface ChatMessage {
  role: 'user' | 'assistant';
  text?: string;                    // Für User-Messages und Error-Messages
  understanding?: {                 // Für Assistant-Messages nach Draft
    summary_bullets: string[];
    assumptions: string[];
    questions: string[];
  };
  draftId?: string;                 // Für Confirm/Reject
}

// Artifact
export interface Artifact {
  type: OutputTarget;
  content: any;                     // JSON object oder string
}

// Match Candidate
export interface MatchCandidate {
  template_id: string;
  type: OutputTarget;
  score: number;
  title: string;
}

// Template Item
export interface TemplateItem {
  template_id: string;
  type: OutputTarget;
  title: string;
  tags: string[];
  usage_count: number;
  last_used_at?: string;
}

// Runtime Config
export interface RuntimeConfig {
  apiBaseUrl: string;
  workspaceId: string;
  userId: string;
}
```

---

## TEST-IDS (PFLICHT - EXAKT SO BENENNEN)

```typescript
// ChatPanel
"ui.chat.panel"                    // Container
"ui.chat.input"                    // Textarea
"ui.chat.send"                     // Send Button
"chat-message-user"                // User Message
"chat-message-assistant"           // Assistant Message
"ui.builder.understandingCard"     // Understanding Card
"ui.builder.editsInput"            // Edits Textarea
"ui.builder.confirm"               // Confirm Button
"ui.builder.reject"                // Reject Button

// OutputPanel
"ui.output.panel"                  // Container
"ui.output.typeSelect"             // Output Type Select
"ui.output.reuseMode"              // RadioGroup Container
"ui.output.reuseMode.auto"         // Radio: Auto
"ui.output.reuseMode.libraryOnly"  // Radio: Library only
"ui.output.reuseMode.alwaysNew"    // Radio: Always new

// MatchBanner
"ui.templates.matchBanner"         // Container
"ui.templates.candidateItem.{id}"  // Candidate Item (template_id)
"match-use-{id}"                   // Use Button (template_id)
"match-create-new"                 // Create New Button

// ArtifactViewer
"ui.artifact.viewer"               // Container
"artifact-content"                 // Content Pre
"artifact-save-button"             // Save Template Button
"artifact-loading"                 // Loading State
"artifact-error"                   // Error State
"artifact-empty"                   // Empty State

// TemplatesTab
"templates-tab"                    // Container
"templates-list"                   // List Container
"template-item-{id}"               // Item (template_id)
"template-load-{id}"               // Load Button (template_id)
"templates-empty"                  // Empty State

// SaveTemplateDialog
"ui.templateSave.title"            // Title Input
"ui.templateSave.tags"             // Tags Input
"ui.templateSave.cancel"           // Cancel Button
"ui.templateSave.save"             // Save Button

// Header
"export-button"                    // Export Button
"clear-chat"                       // Clear Button
"theme-toggle"                     // Theme Toggle

// DebugPanel
"debug-panel"                      // Container
"debug-state"                      // State Badge
"debug-raw-data"                   // Raw Data Pre

// Toast
"ui.toast"                         // Toast Notification
```

---

## KOMPONENTEN-PROPS (EXAKT SO DEFINIEREN)

### ChatPanel
```typescript
interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onConfirm: (draftId: string, edits?: string) => void;
  onReject: (draftId: string) => void;
}
```

### OutputPanel
```typescript
interface OutputPanelProps {
  outputTarget: OutputTarget;
  reuseMode: ReuseMode;
  onOutputTargetChange: (target: OutputTarget) => void;
  onReuseModeChange: (mode: ReuseMode) => void;
  artifact: Artifact | null;
  isLoadingArtifact: boolean;
  artifactError: string | null;
  matchCandidates: MatchCandidate[];
  onUseTemplate: (templateId: string, type?: OutputTarget) => void;
  onCreateNew: () => void;
  onSaveTemplate: () => void;
}
```

### ArtifactViewer
```typescript
interface ArtifactViewerProps {
  artifact: Artifact | null;
  isLoading: boolean;
  error: string | null;
  onSaveTemplate: () => void;
}
```

### MatchBanner
```typescript
interface MatchBannerProps {
  candidates: MatchCandidate[];
  onUseTemplate: (templateId: string, type?: OutputTarget) => void;
  onCreateNew: () => void;
}
```

### TemplatesTab
```typescript
interface TemplatesTabProps {
  onUseTemplate: (templateId: string, type?: OutputTarget) => void;
}
```

### SaveTemplateDialog
```typescript
interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: { title: string; tags: string[] }) => Promise<void> | void;
  loading?: boolean;
  error?: string;
}
```

### DebugPanel
```typescript
interface DebugPanelProps {
  messages: ChatMessage[];
  outputTarget: OutputTarget;
  reuseMode: ReuseMode;
  artifact: Artifact | null;
  matchCandidates: MatchCandidate[];
  isLoadingChat: boolean;
  isLoadingArtifact: boolean;
  artifactError: string | null;
}
```

---

## STATE MANAGEMENT (Page-Level useState)

```typescript
// In page.tsx
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [outputTarget, setOutputTarget] = useState<OutputTarget>('lead_campaign_json');
const [reuseMode, setReuseMode] = useState<ReuseMode>('auto');
const [artifact, setArtifact] = useState<Artifact | null>(null);
const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
const [isLoadingChat, setIsLoadingChat] = useState(false);
const [isLoadingArtifact, setIsLoadingArtifact] = useState(false);
const [artifactError, setArtifactError] = useState<string | null>(null);
const [saveDialogOpen, setSaveDialogOpen] = useState(false);
const [saveDialogLoading, setSaveDialogLoading] = useState(false);
const [saveDialogError, setSaveDialogError] = useState<string | undefined>();
```

---

## MOCK MODE (WENN KEIN BACKEND)

Wenn `NEXT_PUBLIC_API_BASE_URL` leer oder undefined:

```typescript
const isMockMode = !RUNTIME.apiBaseUrl || RUNTIME.apiBaseUrl.trim() === "";

if (isMockMode) {
  // Simuliere API mit setTimeout
  await new Promise(r => setTimeout(r, 200));
  return mockResponse;
}
```

Mock Responses sind bereits im Code definiert.

---

## ENVIRONMENT VARIABLES

```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WORKSPACE_ID=ws_default
NEXT_PUBLIC_USER_ID=u_default
```

```typescript
// src/config/runtime.ts
export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  workspaceId: process.env.NEXT_PUBLIC_WORKSPACE_ID || 'ws_default',
  userId: process.env.NEXT_PUBLIC_USER_ID || 'u_default',
} as const;

export const RUNTIME = config;
```

---

## SHADCN/UI KOMPONENTEN (BENÖTIGT)

```bash
npx shadcn@latest add button card input textarea select tabs dialog badge scroll-area separator
```

Zusätzlich manuell erstellen:
- `radio-group.tsx` (mit @radix-ui/react-radio-group)
- `label.tsx` (mit @radix-ui/react-label)
- `toaster.tsx` (custom Toast System)
- `use-toast.tsx` (Toast Hook)
- `theme-toggle.tsx` (Dark Mode Toggle)

---

## FEHLERBEHANDLUNG

```typescript
// API Timeout
const TIMEOUT_MS = 20_000; // 20 Sekunden

// Fetch mit Timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    const data = text.trim() ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Request timed out");
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## ACCESSIBILITY

- Alle Inputs haben Labels
- Buttons haben aria-labels wenn nur Icon
- Keyboard Navigation: Tab, Enter, Escape
- Focus Management bei Dialogs
- Screen Reader friendly

---

## RESPONSIVE DESIGN

```css
/* Mobile: 1 Spalte */
/* Desktop (md:): 2 Spalten */

<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
```

---

## DIESE ANWEISUNG IST VOLLSTÄNDIG

Baue das Frontend EXAKT nach dieser Spezifikation. Keine Abweichungen. Alle Test-IDs, alle Props, alle Types müssen exakt so sein wie beschrieben.
