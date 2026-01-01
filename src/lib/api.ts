import { config } from '@/config/runtime';

export interface ApiError {
  message: string;
  status: number;
}

export interface LeadBuilderRequest {
  userInput: string;
  workspaceId: string;
  userId: string;
}

export interface LeadBuilderResponse {
  understanding: {
    intent: string;
    entities: string[];
    confidence: number;
  };
  matches: {
    count: number;
    preview: Array<{
      id: string;
      name: string;
      score: number;
    }>;
  };
  artifacts: {
    query: string;
    filters: Record<string, unknown>;
  };
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${config.apiBaseUrl}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error: ApiError = {
      message: `API Error: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

export const api = {
  leadBuilder: {
    process: (request: LeadBuilderRequest) =>
      fetchApi<LeadBuilderResponse>('/api/lead-builder/process', {
        method: 'POST',
        body: JSON.stringify(request),
      }),

    getTemplates: () =>
      fetchApi<{ templates: Array<{ id: string; name: string; query: string }> }>(
        '/api/lead-builder/templates'
      ),

    saveTemplate: (template: { name: string; query: string }) =>
      fetchApi<{ id: string }>('/api/lead-builder/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      }),
  },
};
