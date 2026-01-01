# Blueprint V2: Production Hardening Verification

## Status: 🟡 V2 SPECS DEFINIERT - IMPLEMENTATION PENDING

---

## 1. WORKFLOW STATE MACHINE

### Spezifikation (V0_PROMPT_V2.md)

| Phase | Beschreibung | Status |
|-------|--------------|--------|
| idle | Startseite, kein Draft | ❌ Nicht impl. |
| drafting | POST /draft läuft | ❌ Nicht impl. |
| matching | POST /match läuft | ❌ Nicht impl. |
| hash_hit | Exakter Match gefunden | ❌ Nicht impl. |
| candidates | Ähnliche Templates | ❌ Nicht impl. |
| editing | User bearbeitet Edits | ❌ Nicht impl. |
| confirming | POST /confirm läuft | ❌ Nicht impl. |
| artifact_ready | Artifact erstellt | ❌ Nicht impl. |
| saving | POST /template läuft | ❌ Nicht impl. |
| error | Fehler aufgetreten | ❌ Nicht impl. |

### Benötigte Dateien
```
src/lib/workflow.ts          ❌ Fehlt
src/hooks/useBuilderWorkflow.ts  ❌ Fehlt
```

### Test-IDs (NEU)
```
workflow.phase.idle           ❌
workflow.phase.drafting       ❌
workflow.phase.matching       ❌
workflow.phase.hash_hit       ❌
workflow.phase.candidates     ❌
workflow.phase.editing        ❌
workflow.phase.confirming     ❌
workflow.phase.artifact_ready ❌
workflow.phase.saving         ❌
workflow.phase.error          ❌
```

---

## 2. ERROR CLASSIFICATION

### Spezifikation (V0_PROMPT_V2.md)

| ErrorKind | HTTP Code | Retryable | Status |
|-----------|-----------|-----------|--------|
| network | - | ✅ | ❌ Nicht impl. |
| timeout | - | ✅ | ❌ Nicht impl. |
| validation | 400 | ❌ | ❌ Nicht impl. |
| permission | 401/403 | ❌ | ❌ Nicht impl. |
| not_found | 404 | ❌ | ❌ Nicht impl. |
| conflict | 409 | ❌ | ❌ Nicht impl. |
| rate_limit | 429 | ✅ | ❌ Nicht impl. |
| server | 500+ | ✅ | ❌ Nicht impl. |

### Benötigte Dateien
```
src/lib/errors.ts             ❌ Fehlt
src/components/lead-builder/ErrorPanel.tsx  ❌ Fehlt
```

### Test-IDs (NEU)
```
error.panel                   ❌
error.kind.network            ❌
error.kind.timeout            ❌
error.kind.validation         ❌
error.kind.permission         ❌
error.kind.conflict           ❌
error.kind.rate_limit         ❌
error.kind.server             ❌
error.retry-button            ❌
error.reset-button            ❌
```

---

## 3. ZOD CONTRACT VALIDATION

### Spezifikation (V0_PROMPT_V2.md)

| Schema | Endpoint | Status |
|--------|----------|--------|
| DraftResponseSchema | POST /v1/builder/draft | ❌ Nicht impl. |
| MatchResponseSchema | POST /v1/templates/match | ❌ Nicht impl. |
| RenderResponseSchema | POST /v1/templates/render | ❌ Nicht impl. |
| ConfirmResponseSchema | POST /v1/builder/confirm | ❌ Nicht impl. |
| TemplatesResponseSchema | GET /v1/templates | ❌ Nicht impl. |
| CreateTemplateResponseSchema | POST /v1/templates | ❌ Nicht impl. |

### Benötigte Dateien
```
src/lib/contracts.ts          ❌ Fehlt
```

### Dependencies
```
zod                           ❌ Nicht installiert
```

---

## 4. EDGE-CASE TESTS

### Spezifikation (V0_PROMPT_V2.md)

| Test | Beschreibung | Status |
|------|--------------|--------|
| Error Flow | Draft schlägt fehl, UI zeigt Error | ❌ Nicht impl. |
| Always-New Mode | Hash-Hit ignorieren bei alwaysNew | ❌ Nicht impl. |
| Save Conflict | Duplicate Title zeigt Fehler | ❌ Nicht impl. |
| Contract Validation | Zod validiert Responses | ❌ Nicht impl. |

### Aktuelle Tests
```
src/lib/api.test.ts           ✅ 6 Tests (V1)
```

### Benötigte Tests (V2)
```
Error classification tests    ❌ Fehlt
Contract validation tests     ❌ Fehlt
Edge-case tests               ❌ Fehlt
```

---

## 5. BESTEHENDE V1 FEATURES (100% Complete)

### API Endpoints ✅
| Endpoint | Funktion | Status |
|----------|----------|--------|
| POST /v1/builder/draft | postDraft() | ✅ |
| POST /v1/templates/match | postMatch() | ✅ |
| POST /v1/templates/render | postRender() | ✅ |
| POST /v1/builder/confirm | postConfirm() | ✅ |
| GET /v1/templates | getTemplates() | ✅ |
| POST /v1/templates | postTemplate() | ✅ |

### Test-IDs V1 ✅
| Kategorie | Anzahl | Status |
|-----------|--------|--------|
| ui.chat.* | 3 | ✅ |
| ui.builder.* | 4 | ✅ |
| ui.output.* | 7 | ✅ |
| ui.templates.* | 2 | ✅ |
| ui.artifact.* | 1 | ✅ |
| ui.templateSave.* | 4 | ✅ |
| Zusätzliche | 31 | ✅ |
| Dynamische | 5 | ✅ |
| **GESAMT** | **57** | ✅ |

### Features V1 ✅
| Feature | Status |
|---------|--------|
| Mock Mode | ✅ |
| Timeout Handling (20s) | ✅ |
| localStorage Persistence | ✅ |
| Dark Mode Toggle | ✅ |
| Keyboard Shortcuts | ✅ |
| Export Artifact | ✅ |
| Toast Notifications | ✅ |
| Error Boundaries | ✅ |
| Loading States | ✅ |

---

## 6. IMPLEMENTATION CHECKLIST V2

### Phase 1: Core Infrastructure
- [ ] `npm install zod`
- [ ] Create `src/lib/errors.ts`
- [ ] Create `src/lib/contracts.ts`
- [ ] Create `src/lib/workflow.ts`

### Phase 2: API Hardening
- [ ] Update `src/lib/api.ts` mit Zod validation
- [ ] Add error classification
- [ ] Validate mock responses

### Phase 3: State Management
- [ ] Create `src/hooks/useBuilderWorkflow.ts`
- [ ] Update `page.tsx` mit workflow state
- [ ] Add phase-based rendering

### Phase 4: UI Components
- [ ] Create `src/components/lead-builder/ErrorPanel.tsx`
- [ ] Create `src/components/lead-builder/WorkflowIndicator.tsx`
- [ ] Add neue test-ids

### Phase 5: Tests
- [ ] Add error classification tests
- [ ] Add contract validation tests
- [ ] Add edge-case tests
- [ ] Verify: `npm test` (target: 12+ tests)

### Phase 6: Verification
- [ ] Build passes: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] Update BLUEPRINT_CHECK_V2.md

---

## 7. ZUSAMMENFASSUNG

| Bereich | V1 Status | V2 Status | V2 Target |
|---------|-----------|-----------|-----------|
| API Endpoints | ✅ 6/6 | ✅ 6/6 | + Zod |
| Test-IDs | ✅ 57 | ✅ 57 | + 20 neue |
| Workflow State | ❌ | ❌ | 10 Phases |
| Error Types | ❌ | ❌ | 8 Kinds |
| Zod Schemas | ❌ | ❌ | 6 Schemas |
| Tests | ✅ 6 | ✅ 6 | 12+ |

**V1: 100% Complete** ✅
**V2: 0% Complete** - Specs definiert, Implementation pending

---

## 8. NÄCHSTE SCHRITTE

Wenn User "implementiere V2" sagt:

1. `npm install zod`
2. Erstelle 4 neue Dateien (errors.ts, contracts.ts, workflow.ts, useBuilderWorkflow.ts)
3. Update api.ts mit validation
4. Erstelle ErrorPanel.tsx
5. Add 6+ neue Tests
6. Verify build & tests

**Geschätzte Zeit: ~90 Minuten**

---

*Generiert: 2026-01-01*
*Version: 2.0 Blueprint Check*
