/**
 * Zod Contract Validation Schemas
 * Runtime validation for all API responses
 */

import { z } from 'zod'

// === Base Types ===

export const OutputTargetSchema = z.enum([
  'lead_campaign_json',
  'lead_job_json',
  'call_prompt',
  'enrichment_prompt',
])

export const ReuseModeSchema = z.enum(['auto', 'libraryOnly', 'alwaysNew'])

// === Entity Schema ===

export const EntitySchema = z.object({
  type: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1).optional(),
})

// === Understanding Schema ===

export const UnderstandingSchema = z.object({
  summary_bullets: z.array(z.string()),
  assumptions: z.array(z.string()),
  questions: z.array(z.string()),
  entities: z.array(EntitySchema).optional(),
  intent: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

// === POST /v1/builder/draft Response ===

export const DraftResponseSchema = z.object({
  draft_id: z.string().min(1),
  understanding: UnderstandingSchema,
  proposed_intent_spec: z.record(z.unknown()).optional(),
})

// === POST /v1/templates/match Response ===

export const MatchCandidateSchema = z.object({
  template_id: z.string(),
  type: OutputTargetSchema,
  score: z.number().min(0).max(1),
  title: z.string(),
})

export const HashHitSchema = z.object({
  template_id: z.string(),
  type: OutputTargetSchema,
  title: z.string(),
})

export const MatchResponseSchema = z.object({
  normalized_text: z.string(),
  hash_hit: HashHitSchema.nullable(),
  candidates: z.array(MatchCandidateSchema),
})

// === POST /v1/templates/render Response ===

export const RenderResponseSchema = z.object({
  content: z.union([z.string(), z.record(z.unknown())]),
})

// === POST /v1/builder/confirm Response ===

export const ArtifactSchema = z.object({
  artifact_id: z.string().optional(),
  type: OutputTargetSchema,
  content: z.union([z.string(), z.record(z.unknown())]),
})

export const SaveSuggestionSchema = z.object({
  should_save_as_template: z.boolean(),
  title: z.string().optional(),
})

export const ConfirmResponseSchema = z.object({
  artifact: ArtifactSchema,
  save_suggestion: SaveSuggestionSchema.optional(),
})

// === GET /v1/templates Response ===

export const TemplateItemSchema = z.object({
  template_id: z.string(),
  type: OutputTargetSchema,
  title: z.string(),
  tags: z.array(z.string()),
  usage_count: z.number(),
  last_used_at: z.string().optional(),
})

export const TemplatesResponseSchema = z.object({
  items: z.array(TemplateItemSchema),
})

// === POST /v1/templates Response ===

export const CreateTemplateResponseSchema = z.object({
  template_id: z.string(),
  version: z.number(),
})

// === Type Exports ===

export type OutputTarget = z.infer<typeof OutputTargetSchema>
export type ReuseMode = z.infer<typeof ReuseModeSchema>
export type Entity = z.infer<typeof EntitySchema>
export type Understanding = z.infer<typeof UnderstandingSchema>
export type DraftResponse = z.infer<typeof DraftResponseSchema>
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>
export type HashHit = z.infer<typeof HashHitSchema>
export type MatchResponse = z.infer<typeof MatchResponseSchema>
export type RenderResponse = z.infer<typeof RenderResponseSchema>
export type Artifact = z.infer<typeof ArtifactSchema>
export type SaveSuggestion = z.infer<typeof SaveSuggestionSchema>
export type ConfirmResponse = z.infer<typeof ConfirmResponseSchema>
export type TemplateItem = z.infer<typeof TemplateItemSchema>
export type TemplatesResponse = z.infer<typeof TemplatesResponseSchema>
export type CreateTemplateResponse = z.infer<typeof CreateTemplateResponseSchema>

// === Validation Helper ===

export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown, endpoint: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error(`Contract violation for ${endpoint}:`, result.error.issues)
    throw new Error(`Invalid response format from ${endpoint}`)
  }
  return result.data
}
