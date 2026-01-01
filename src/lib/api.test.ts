import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the runtime config
vi.mock('@/config/runtime', () => ({
  RUNTIME: {
    apiBaseUrl: '',
    workspaceId: 'ws_test',
    userId: 'u_test',
  },
}))

// Import after mocking
import { postDraft, postMatch, getTemplates, postTemplate } from './api'
import { classifyError, isApiError, type ApiError } from './errors'
import {
  DraftResponseSchema,
  MatchResponseSchema,
  ConfirmResponseSchema,
  TemplatesResponseSchema,
} from './contracts'

describe('API - Mock Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('postDraft', () => {
    it('returns mock draft response', async () => {
      const result = await postDraft({
        input_text: 'Suche 200 Elektriker in München',
        output_target: 'lead_campaign_json',
        reuse_mode: 'auto',
      })

      expect(result).toHaveProperty('draft_id')
      expect(result.draft_id).toMatch(/^dr_\d+$/)
      expect(result).toHaveProperty('understanding')
      expect(result.understanding).toHaveProperty('summary_bullets')
      expect(result.understanding).toHaveProperty('assumptions')
      expect(result.understanding).toHaveProperty('questions')
    })
  })

  describe('postMatch', () => {
    it('returns candidates for similar query', async () => {
      const result = await postMatch({
        input_text: 'Suche Handwerker',
        types: ['lead_campaign_json'],
        top_k: 5,
      })

      expect(result).toHaveProperty('normalized_text')
      expect(result).toHaveProperty('candidates')
      expect(Array.isArray(result.candidates)).toBe(true)
    })

    it('returns hash_hit for exact match', async () => {
      const result = await postMatch({
        input_text: 'exact gleich wie vorher',
        types: ['lead_campaign_json'],
        top_k: 5,
      })

      expect(result.hash_hit).not.toBeNull()
      expect(result.hash_hit).toHaveProperty('template_id')
    })
  })

  describe('getTemplates', () => {
    it('returns template list', async () => {
      const result = await getTemplates({})

      expect(result).toHaveProperty('items')
      expect(Array.isArray(result.items)).toBe(true)
    })
  })

  describe('postTemplate', () => {
    it('creates new template', async () => {
      const result = await postTemplate({
        type: 'lead_campaign_json',
        title: 'Test Template',
        tags: ['test', 'unit'],
        content: { type: 'lead_campaign', name: 'Test' },
      })

      expect(result).toHaveProperty('template_id')
      expect(result.template_id).toMatch(/^tpl_\d+$/)
    })

    it('throws conflict error on duplicate title', async () => {
      // Mock already has 'SHK Westbalkan DE' - creating again should throw
      try {
        await postTemplate({
          type: 'lead_campaign_json',
          title: 'SHK Westbalkan DE',
          tags: [],
          content: {},
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(isApiError(error)).toBe(true)
        expect((error as ApiError).kind).toBe('conflict')
        expect((error as ApiError).message).toBe('Template title already exists')
      }
    })
  })
})

describe('Error Classification', () => {
  it('classifies network error correctly', () => {
    const error = new Error('Failed to fetch')
    const classified = classifyError(error)

    expect(classified.kind).toBe('network')
    expect(classified.retryable).toBe(true)
  })

  it('classifies timeout error correctly', () => {
    const error = new Error('Request timeout')
    error.name = 'AbortError'
    const classified = classifyError(error)

    expect(classified.kind).toBe('timeout')
    expect(classified.retryable).toBe(true)
  })

  it('classifies 400 as validation error', () => {
    const classified = classifyError(null, 400)

    expect(classified.kind).toBe('validation')
    expect(classified.retryable).toBe(false)
  })

  it('classifies 401 as permission error', () => {
    const classified = classifyError(null, 401)

    expect(classified.kind).toBe('permission')
    expect(classified.retryable).toBe(false)
  })

  it('classifies 403 as permission error', () => {
    const classified = classifyError(null, 403)

    expect(classified.kind).toBe('permission')
    expect(classified.retryable).toBe(false)
  })

  it('classifies 404 as not_found error', () => {
    const classified = classifyError(null, 404)

    expect(classified.kind).toBe('not_found')
    expect(classified.retryable).toBe(false)
  })

  it('classifies 409 as conflict error', () => {
    const classified = classifyError(null, 409)

    expect(classified.kind).toBe('conflict')
    expect(classified.retryable).toBe(false)
  })

  it('classifies 429 as rate_limit error', () => {
    const classified = classifyError(null, 429)

    expect(classified.kind).toBe('rate_limit')
    expect(classified.retryable).toBe(true)
  })

  it('classifies 500 as server error', () => {
    const classified = classifyError(null, 500)

    expect(classified.kind).toBe('server')
    expect(classified.retryable).toBe(true)
  })

  it('classifies 503 as server error', () => {
    const classified = classifyError(null, 503)

    expect(classified.kind).toBe('server')
    expect(classified.retryable).toBe(true)
  })
})

describe('Contract Validation', () => {
  it('validates draft response schema', () => {
    const validResponse = {
      draft_id: 'dr_123',
      understanding: {
        summary_bullets: ['Test bullet'],
        assumptions: ['Test assumption'],
        questions: ['Test question?'],
      },
    }

    const result = DraftResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('rejects invalid draft response', () => {
    const invalidResponse = {
      draft_id: '', // Empty string should fail min(1)
      understanding: {
        summary_bullets: 'not an array', // Should be array
      },
    }

    const result = DraftResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('validates match response schema', () => {
    const validResponse = {
      normalized_text: 'test',
      hash_hit: null,
      candidates: [
        { template_id: 'tpl_1', type: 'lead_campaign_json', score: 0.9, title: 'Test' },
      ],
    }

    const result = MatchResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('validates match response with hash_hit', () => {
    const validResponse = {
      normalized_text: 'test',
      hash_hit: { template_id: 'tpl_1', type: 'lead_campaign_json', title: 'Test' },
      candidates: [],
    }

    const result = MatchResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('rejects invalid score in match candidate', () => {
    const invalidResponse = {
      normalized_text: 'test',
      hash_hit: null,
      candidates: [
        { template_id: 'tpl_1', type: 'lead_campaign_json', score: 1.5, title: 'Test' }, // Score > 1
      ],
    }

    const result = MatchResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })

  it('validates templates response schema', () => {
    const validResponse = {
      items: [
        {
          template_id: 'tpl_1',
          type: 'lead_campaign_json',
          title: 'Test',
          tags: ['tag1'],
          usage_count: 5,
        },
      ],
    }

    const result = TemplatesResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
  })

  it('rejects invalid output_target type', () => {
    const invalidResponse = {
      items: [
        {
          template_id: 'tpl_1',
          type: 'invalid_type', // Not in enum
          title: 'Test',
          tags: [],
          usage_count: 0,
        },
      ],
    }

    const result = TemplatesResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })
})

describe('Edge Cases', () => {
  it('hash_hit is available even when reuseMode is alwaysNew', async () => {
    const result = await postMatch({
      input_text: 'exact gleich wie vorher',
      types: ['lead_campaign_json'],
      top_k: 5,
    })

    // Hash hit exists in response - but UI should NOT auto-render when alwaysNew
    expect(result.hash_hit).not.toBeNull()
    expect(result.hash_hit?.template_id).toBeDefined()
  })

  it('mock responses pass contract validation', async () => {
    const draftResult = await postDraft({
      input_text: 'Test query',
      output_target: 'lead_campaign_json',
      reuse_mode: 'auto',
    })

    // If we get here without throwing, contract validation passed
    expect(draftResult.draft_id).toBeDefined()
    expect(draftResult.understanding).toBeDefined()
  })

  it('isApiError correctly identifies ApiError objects', () => {
    const apiError: ApiError = {
      kind: 'conflict',
      message: 'Test error',
      retryable: false,
    }

    expect(isApiError(apiError)).toBe(true)
    expect(isApiError(new Error('regular error'))).toBe(false)
    expect(isApiError(null)).toBe(false)
    expect(isApiError(undefined)).toBe(false)
    expect(isApiError('string')).toBe(false)
  })
})
