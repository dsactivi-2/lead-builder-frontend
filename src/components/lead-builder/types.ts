export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Understanding {
  intent: string;
  entities: string[];
  confidence: number;
}

export interface Match {
  id: string;
  name: string;
  score: number;
}

export interface Artifacts {
  query: string;
  filters: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  query: string;
  createdAt: Date;
}

export type LeadBuilderState =
  | 'idle'
  | 'processing'
  | 'understanding'
  | 'matching'
  | 'complete'
  | 'error';

// Neue Typen für erweiterte API
export type OutputTarget = 'lead_campaign_json' | 'lead_job_json' | 'call_prompt' | 'enrichment_prompt';

export type ReuseMode = 'auto' | 'alwaysNew' | 'alwaysReuse';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text?: string;
  understanding?: {
    summary_bullets: string[];
    assumptions: string[];
    questions: string[];
  };
  draftId?: string;
}

export interface Artifact {
  type: OutputTarget;
  content: any;
}

export interface MatchCandidate {
  template_id: string;
  type: OutputTarget;
  score: number;
  title: string;
}
