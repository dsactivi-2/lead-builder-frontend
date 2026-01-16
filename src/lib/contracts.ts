// Zod Runtime Contract Validation

import { z } from "zod"

// === Base Types ===

export const OutputTargetSchema = z.enum(["lead_campaign_json", "lead_job_json", "call_prompt", "enrichment_prompt"])

export const ReuseModeSchema = z.enum(["auto", "libraryOnly", "alwaysNew"])

// === POST /v1/builder/draft Response ===

export const UnderstandingSchema = z.object({
  summary_bullets: z.array(z.string()),
  assumptions: z.array(z.string()),
  questions: z.array(z.string()),
  entities: z
    .array(
      z.object({
        type: z.string(),
        value: z.string(),
        confidence: z.number().optional(),
      }),
    )
    .optional(),
  intent: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const DraftResponseSchema = z.object({
  draft_id: z.string().regex(/^dr_/, "Draft ID must start with 'dr_'"),
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

export const ConfirmResponseSchema = z.object({
  artifact: ArtifactSchema,
  save_suggestion: z
    .object({
      should_save_as_template: z.boolean(),
      title: z.string().optional(),
    })
    .optional(),
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

// ============================================================================
// CAMPAIGNS (Housefinder-inspired)
// ============================================================================

export const CampaignStatusSchema = z.enum(["active", "paused", "completed", "archived"])
export const CampaignPrioritySchema = z.enum(["urgent", "high", "normal", "low"])
export const CampaignTargetTypeSchema = z.enum(["lead_campaign", "job_posting", "call_list"])

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  target_type: CampaignTargetTypeSchema,
  status: CampaignStatusSchema,
  priority: CampaignPrioritySchema,
  search_criteria: z.record(z.unknown()).optional(),
  target_count: z.number(),
  current_count: z.number(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  last_run_at: z.string().nullable().optional(),
  next_run_at: z.string().nullable().optional(),
  run_interval_hours: z.number(),
  total_leads_found: z.number(),
  total_contacted: z.number(),
  total_responses: z.number(),
  total_conversions: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const CampaignsResponseSchema = z.object({
  items: z.array(CampaignSchema),
})

export const CampaignStatsSchema = z.object({
  campaign_id: z.string(),
  leads: z.object({
    total: z.number(),
    new_count: z.number(),
    contacted_count: z.number(),
    responded_count: z.number(),
    qualified_count: z.number(),
    converted_count: z.number(),
    avg_score: z.number().nullable(),
  }),
  communications: z.object({
    total: z.number(),
    sent_count: z.number(),
    delivered_count: z.number(),
    read_count: z.number(),
    email_count: z.number(),
    whatsapp_count: z.number(),
  }),
  conversion_rate: z.union([z.string(), z.number()]),
  response_rate: z.union([z.string(), z.number()]),
})

// ============================================================================
// LEADS (Housefinder Listing-inspired)
// ============================================================================

export const LeadStatusSchema = z.enum(["new", "contacted", "responded", "qualified", "converted", "rejected"])
export const LeadQualitySchema = z.enum(["hot", "warm", "cold", "unknown"])
export const LeadSourceSchema = z.enum(["manual", "scraper", "import", "api"])

export const LeadWarningSchema = z.object({
  type: z.string(),
  message: z.string(),
})

export const LeadSchema = z.object({
  id: z.string(),
  campaign_id: z.string().nullable().optional(),
  source: LeadSourceSchema,
  source_platform: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  score: z.number(),
  status: LeadStatusSchema,
  quality: LeadQualitySchema,
  tags: z.array(z.string()),
  raw_data: z.record(z.unknown()).nullable().optional(),
  enriched_data: z.record(z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
  signature: z.string().nullable().optional(),
  is_duplicate: z.union([z.number(), z.boolean()]).optional(),
  duplicate_of: z.string().nullable().optional(),
  contacted_at: z.string().nullable().optional(),
  responded_at: z.string().nullable().optional(),
  converted_at: z.string().nullable().optional(),
  last_activity_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  warnings: z.array(LeadWarningSchema).optional(),
})

export const LeadsResponseSchema = z.object({
  items: z.array(LeadSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export const BatchLeadsResponseSchema = z.object({
  created: z.number(),
  duplicates: z.number(),
  errors: z.number(),
  items: z.array(z.string()),
})

export const LeadScoreResponseSchema = z.object({
  lead_id: z.string(),
  previous_score: z.number(),
  new_score: z.number(),
})

// ============================================================================
// COMMUNICATIONS (Housefinder Email/WhatsApp-inspired)
// ============================================================================

export const CommunicationChannelSchema = z.enum(["email", "whatsapp", "phone", "linkedin"])
export const CommunicationDirectionSchema = z.enum(["outbound", "inbound"])
export const CommunicationTypeSchema = z.enum(["initial", "followup", "response", "thank_you"])
export const CommunicationStatusSchema = z.enum(["pending", "sent", "delivered", "read", "failed"])

export const CommunicationSchema = z.object({
  id: z.string(),
  lead_id: z.string().nullable().optional(),
  campaign_id: z.string().nullable().optional(),
  channel: CommunicationChannelSchema,
  direction: CommunicationDirectionSchema,
  type: CommunicationTypeSchema,
  subject: z.string().nullable().optional(),
  message: z.string(),
  template_id: z.string().nullable().optional(),
  status: CommunicationStatusSchema,
  error_message: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  delivered_at: z.string().nullable().optional(),
  read_at: z.string().nullable().optional(),
  responded_at: z.string().nullable().optional(),
  external_id: z.string().nullable().optional(),
  created_at: z.string(),
})

export const CommunicationsResponseSchema = z.object({
  items: z.array(CommunicationSchema),
  limit: z.number(),
  offset: z.number(),
})

export const BatchCommunicationsResponseSchema = z.object({
  sent: z.number(),
  failed: z.number(),
  items: z.array(z.string()),
})

export const CommunicationResponseSchema = z.object({
  response_id: z.string(),
  original_id: z.string(),
})

// ============================================================================
// SOURCES (Housefinder Scraper-inspired)
// ============================================================================

export const SourceTypeSchema = z.enum(["scraper", "api", "import", "manual"])

export const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: SourceTypeSchema,
  platform: z.string().nullable().optional(),
  config: z.record(z.unknown()),
  is_active: z.union([z.number(), z.boolean()]),
  total_leads: z.number(),
  success_rate: z.number(),
  last_run_at: z.string().nullable().optional(),
  last_error: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const SourcesResponseSchema = z.object({
  items: z.array(SourceSchema),
})

// ============================================================================
// ANALYSES (Housefinder AI-inspired)
// ============================================================================

export const AnalysisTypeSchema = z.enum(["response", "sentiment", "intent", "qualification"])
export const SentimentSchema = z.enum(["positive", "neutral", "negative"])

export const AnalysisSchema = z.object({
  id: z.string(),
  communication_id: z.string().nullable().optional(),
  lead_id: z.string().nullable().optional(),
  analysis_type: AnalysisTypeSchema,
  result: z.record(z.unknown()),
  confidence: z.number(),
  extracted_intent: z.string().nullable().optional(),
  extracted_entities: z.string().nullable().optional(),
  sentiment: SentimentSchema.nullable().optional(),
  recommended_action: z.string().nullable().optional(),
  warnings: z.string().nullable().optional(),
  model_used: z.string(),
  tokens_used: z.number(),
  created_at: z.string(),
})

export const AnalysesResponseSchema = z.object({
  items: z.array(AnalysisSchema),
})

// ============================================================================
// REPORTS
// ============================================================================

export const ReportTypeSchema = z.enum(["daily", "weekly", "campaign_summary", "lead_quality"])

export const ReportSchema = z.object({
  id: z.string(),
  campaign_id: z.string().nullable().optional(),
  report_type: ReportTypeSchema,
  title: z.string(),
  content: z.record(z.unknown()),
  format: z.string(),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  metrics: z.record(z.unknown()),
  created_at: z.string(),
})

export const ReportsResponseSchema = z.object({
  items: z.array(ReportSchema),
})

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

export const TaskTypeSchema = z.enum(["campaign_run", "followup", "report", "cleanup"])
export const TaskStatusSchema = z.enum(["pending", "running", "completed", "failed", "cancelled"])

export const ScheduledTaskSchema = z.object({
  id: z.string(),
  task_type: TaskTypeSchema,
  reference_id: z.string().nullable().optional(),
  reference_type: z.string().nullable().optional(),
  scheduled_at: z.string(),
  executed_at: z.string().nullable().optional(),
  status: TaskStatusSchema,
  payload: z.record(z.unknown()).nullable().optional(),
  result: z.record(z.unknown()).nullable().optional(),
  error_message: z.string().nullable().optional(),
  retry_count: z.number(),
  max_retries: z.number(),
  created_at: z.string(),
})

export const ScheduledTasksResponseSchema = z.object({
  items: z.array(ScheduledTaskSchema),
})

// ============================================================================
// DASHBOARD
// ============================================================================

export const DashboardStatsSchema = z.object({
  campaigns: z.object({
    total: z.number(),
    active: z.number(),
    urgent: z.number(),
  }),
  leads: z.object({
    total: z.number(),
    new_count: z.number(),
    contacted: z.number(),
    converted: z.number(),
    hot: z.number(),
    avg_score: z.number().nullable(),
  }),
  communications: z.object({
    total: z.number(),
    sent: z.number(),
    responses: z.number(),
  }),
  recent_leads: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    company: z.string().nullable(),
    score: z.number(),
    status: z.string(),
    quality: z.string(),
    created_at: z.string(),
  })),
  conversion_rate: z.union([z.string(), z.number()]),
  response_rate: z.union([z.string(), z.number()]),
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

// Housefinder-inspired types
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>
export type CampaignPriority = z.infer<typeof CampaignPrioritySchema>
export type CampaignTargetType = z.infer<typeof CampaignTargetTypeSchema>
export type Campaign = z.infer<typeof CampaignSchema>
export type CampaignsResponse = z.infer<typeof CampaignsResponseSchema>
export type CampaignStats = z.infer<typeof CampaignStatsSchema>

export type LeadStatus = z.infer<typeof LeadStatusSchema>
export type LeadQuality = z.infer<typeof LeadQualitySchema>
export type LeadSource = z.infer<typeof LeadSourceSchema>
export type LeadWarning = z.infer<typeof LeadWarningSchema>
export type Lead = z.infer<typeof LeadSchema>
export type LeadsResponse = z.infer<typeof LeadsResponseSchema>
export type BatchLeadsResponse = z.infer<typeof BatchLeadsResponseSchema>
export type LeadScoreResponse = z.infer<typeof LeadScoreResponseSchema>

export type CommunicationChannel = z.infer<typeof CommunicationChannelSchema>
export type CommunicationDirection = z.infer<typeof CommunicationDirectionSchema>
export type CommunicationType = z.infer<typeof CommunicationTypeSchema>
export type CommunicationStatus = z.infer<typeof CommunicationStatusSchema>
export type Communication = z.infer<typeof CommunicationSchema>
export type CommunicationsResponse = z.infer<typeof CommunicationsResponseSchema>
export type BatchCommunicationsResponse = z.infer<typeof BatchCommunicationsResponseSchema>
export type CommunicationResponseResult = z.infer<typeof CommunicationResponseSchema>

export type SourceType = z.infer<typeof SourceTypeSchema>
export type Source = z.infer<typeof SourceSchema>
export type SourcesResponse = z.infer<typeof SourcesResponseSchema>

export type AnalysisType = z.infer<typeof AnalysisTypeSchema>
export type Sentiment = z.infer<typeof SentimentSchema>
export type Analysis = z.infer<typeof AnalysisSchema>
export type AnalysesResponse = z.infer<typeof AnalysesResponseSchema>

export type ReportType = z.infer<typeof ReportTypeSchema>
export type Report = z.infer<typeof ReportSchema>
export type ReportsResponse = z.infer<typeof ReportsResponseSchema>

export type TaskType = z.infer<typeof TaskTypeSchema>
export type TaskStatus = z.infer<typeof TaskStatusSchema>
export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>
export type ScheduledTasksResponse = z.infer<typeof ScheduledTasksResponseSchema>

export type DashboardStats = z.infer<typeof DashboardStatsSchema>

// ============================================================================
// VERMIETER (Landlords) - ATU Relocation
// ============================================================================

export const VermieterStatusSchema = z.enum(["active", "inactive", "blacklisted"])

export const VermieterSchema = z.object({
  id: z.string(),
  name: z.string(),
  company: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  status: VermieterStatusSchema,
  languages: z.array(z.string()).or(z.string()).optional(),
  notes: z.string().nullable().optional(),
  total_deals: z.number().optional(),
  response_rate: z.number().optional(),
  last_contacted_at: z.string().nullable().optional(),
  last_deal_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
})

export const VermieterResponseSchema = z.object({
  items: z.array(VermieterSchema),
})

// ============================================================================
// HOUSING (Monteurzimmer/Apartments) - ATU Relocation
// ============================================================================

export const HousingTypeSchema = z.enum(["monteurzimmer", "apartment", "wg", "house"])
export const HousingStatusSchema = z.enum(["active", "reserved", "rented", "inactive"])

export const HousingSchema = z.object({
  id: z.string(),
  vermieter_id: z.string(),
  title: z.string(),
  type: HousingTypeSchema,
  address: z.string().nullable().optional(),
  city: z.string(),
  postal_code: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  size_sqm: z.number().nullable().optional(),
  rooms: z.number().nullable().optional(),
  max_persons: z.number().nullable().optional(),
  price_monthly: z.number(),
  deposit: z.number().nullable().optional(),
  utilities_included: z.union([z.number(), z.boolean()]).optional(),
  available_from: z.string().nullable().optional(),
  min_stay_days: z.number().nullable().optional(),
  amenities: z.array(z.string()).or(z.string()).optional(),
  mietvertrag_possible: z.union([z.number(), z.boolean()]).optional(),
  anmeldung_possible: z.union([z.number(), z.boolean()]).optional(),
  status: HousingStatusSchema,
  is_available: z.union([z.number(), z.boolean()]).optional(),
  images: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  // Joined fields
  vermieter_name: z.string().optional(),
  vermieter_phone: z.string().optional(),
  score: z.number().optional(),
})

export const HousingResponseSchema = z.object({
  items: z.array(HousingSchema),
})

// ============================================================================
// CANDIDATES (Relocation Candidates) - ATU Relocation
// ============================================================================

export const CandidateStatusSchema = z.enum(["new", "searching", "found", "moved_in", "cancelled"])

export const CandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  employer: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  work_start_date: z.string().nullable().optional(),
  preferred_city: z.string().nullable().optional(),
  budget_max: z.number().nullable().optional(),
  family_size: z.number().nullable().optional(),
  needs_mietvertrag: z.union([z.number(), z.boolean()]).optional(),
  needs_anmeldung: z.union([z.number(), z.boolean()]).optional(),
  status: CandidateStatusSchema,
  assigned_housing_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
})

export const CandidateResponseSchema = z.object({
  items: z.array(CandidateSchema),
})

// ============================================================================
// RELOCATION REQUESTS - ATU Relocation
// ============================================================================

export const RelocationStatusSchema = z.enum(["pending", "searching", "negotiating", "found", "completed", "cancelled"])

export const RelocationRequestSchema = z.object({
  id: z.string(),
  candidate_id: z.string(),
  requirements: z.record(z.unknown()).optional(),
  matched_housing: z.array(z.string()).or(z.string()).optional(),
  status: RelocationStatusSchema,
  assigned_agent: z.string().nullable().optional(),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
})

export const RelocationResponseSchema = z.object({
  items: z.array(RelocationRequestSchema),
})

// ============================================================================
// NEGOTIATIONS - ATU Relocation
// ============================================================================

export const NegotiationStatusSchema = z.enum(["pending", "in_progress", "accepted", "rejected", "cancelled"])

export const NegotiationSchema = z.object({
  id: z.string(),
  relocation_request_id: z.string().nullable().optional(),
  candidate_id: z.string(),
  vermieter_id: z.string(),
  housing_id: z.string(),
  offered_price: z.number().nullable().optional(),
  final_price: z.number().nullable().optional(),
  move_in_date: z.string().nullable().optional(),
  status: NegotiationStatusSchema,
  call_attempts: z.number().optional(),
  call_transcript: z.array(z.record(z.unknown())).or(z.string()).optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  // Joined fields
  candidate_name: z.string().optional(),
  vermieter_name: z.string().optional(),
  vermieter_phone: z.string().optional(),
  housing_title: z.string().optional(),
  housing_address: z.string().optional(),
})

export const NegotiationResponseSchema = z.object({
  items: z.array(NegotiationSchema),
})

// ============================================================================
// DEALS - ATU Relocation
// ============================================================================

export const DealStatusSchema = z.enum(["pending", "active", "completed", "cancelled"])

export const DealSchema = z.object({
  id: z.string(),
  negotiation_id: z.string(),
  candidate_id: z.string(),
  vermieter_id: z.string(),
  housing_id: z.string(),
  monthly_rent: z.number(),
  deposit_amount: z.number().nullable().optional(),
  move_in_date: z.string().nullable().optional(),
  contract_start: z.string().nullable().optional(),
  contract_end: z.string().nullable().optional(),
  status: DealStatusSchema,
  contract_signed: z.union([z.number(), z.boolean()]).optional(),
  deposit_paid: z.union([z.number(), z.boolean()]).optional(),
  keys_handed_over: z.union([z.number(), z.boolean()]).optional(),
  anmeldung_done: z.union([z.number(), z.boolean()]).optional(),
  signed_at: z.string().nullable().optional(),
  moved_in_at: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  // Joined fields
  candidate_name: z.string().optional(),
  vermieter_name: z.string().optional(),
  housing_title: z.string().optional(),
  address: z.string().optional(),
})

export const DealResponseSchema = z.object({
  items: z.array(DealSchema),
})

// ============================================================================
// AGENT RESPONSES
// ============================================================================

export const HousingSearchResultSchema = z.object({
  success: z.boolean(),
  relocation_request_id: z.string().optional(),
  matched_count: z.number(),
  matched_housing: z.array(HousingSchema),
  negotiations: z.array(z.object({
    id: z.string(),
    housing: HousingSchema,
  })).optional(),
  next_step: z.string().optional(),
})

export const TriggerCallResultSchema = z.object({
  success: z.boolean(),
  negotiation_id: z.string(),
  message: z.string(),
  agent_response: z.record(z.unknown()).optional(),
  call_details: z.object({
    vermieter: z.string(),
    phone: z.string(),
    candidate: z.string(),
    housing: z.string().optional(),
  }).optional(),
})

// Type exports for ATU Relocation
export type VermieterStatus = z.infer<typeof VermieterStatusSchema>
export type Vermieter = z.infer<typeof VermieterSchema>
export type VermieterResponse = z.infer<typeof VermieterResponseSchema>

export type HousingType = z.infer<typeof HousingTypeSchema>
export type HousingStatus = z.infer<typeof HousingStatusSchema>
export type Housing = z.infer<typeof HousingSchema>
export type HousingResponse = z.infer<typeof HousingResponseSchema>

export type CandidateStatus = z.infer<typeof CandidateStatusSchema>
export type Candidate = z.infer<typeof CandidateSchema>
export type CandidateResponse = z.infer<typeof CandidateResponseSchema>

export type RelocationStatus = z.infer<typeof RelocationStatusSchema>
export type RelocationRequest = z.infer<typeof RelocationRequestSchema>
export type RelocationResponse = z.infer<typeof RelocationResponseSchema>

export type NegotiationStatus = z.infer<typeof NegotiationStatusSchema>
export type Negotiation = z.infer<typeof NegotiationSchema>
export type NegotiationResponse = z.infer<typeof NegotiationResponseSchema>

export type DealStatus = z.infer<typeof DealStatusSchema>
export type Deal = z.infer<typeof DealSchema>
export type DealResponse = z.infer<typeof DealResponseSchema>

export type HousingSearchResult = z.infer<typeof HousingSearchResultSchema>
export type TriggerCallResult = z.infer<typeof TriggerCallResultSchema>
