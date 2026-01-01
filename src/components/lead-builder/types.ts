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
