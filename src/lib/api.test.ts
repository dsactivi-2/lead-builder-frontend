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

    it('throws on duplicate title', async () => {
      // Mock already has 'SHK Westbalkan DE' - creating again should throw
      await expect(
        postTemplate({
          type: 'lead_campaign_json',
          title: 'SHK Westbalkan DE',
          tags: [],
          content: {},
        })
      ).rejects.toThrow('Template title already exists')
    })
  })
})
