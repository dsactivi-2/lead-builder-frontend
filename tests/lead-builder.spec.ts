import { test, expect } from '@playwright/test'

test('draft -> match candidates -> confirm -> artifact shown', async ({ page }) => {
  await page.route('**/v1/builder/draft', async (route) => {
    const body = await route.request().postDataJSON()
    expect(body).toMatchObject({ output_target: 'lead_campaign_json' })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        draft_id: 'dr_001',
        understanding: {
          summary_bullets: ['Ziel: 200 Leads Heizungsbau/SHK', 'Region: PLZ 7*/8*'],
          assumptions: ['Start sofort', 'Kein Stopdatum'],
          questions: ['Jobboards erlaubt?'],
        },
        proposed_intent_spec: {},
      }),
    })
  })

  await page.route('**/v1/templates/match', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        normalized_text: 'x',
        hash_hit: null,
        candidates: [{ template_id: 'tpl_10', type: 'lead_campaign_json', score: 0.93, title: 'SHK Westbalkan DE' }],
      }),
    })
  })

  await page.route('**/v1/builder/confirm', async (route) => {
    const body = await route.request().postDataJSON()
    expect(body).toMatchObject({ draft_id: 'dr_001', confirmation: true })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        artifact: {
          artifact_id: 'art_1',
          type: 'lead_campaign_json',
          content: { type: 'lead_campaign', name: 'Test', search_spec: { limit: 200 } },
        },
        save_suggestion: { should_save_as_template: true, title: 'Test' },
      }),
    })
  })

  await page.goto('/lead-builder')

  await expect(page.getByTestId('ui.chat.panel')).toBeVisible()
  await expect(page.getByTestId('ui.output.panel')).toBeVisible()

  await page.getByTestId('ui.chat.input').fill('Ich brauche 200 Heizungsbauer ...')
  await page.getByTestId('ui.chat.send').click()

  await expect(page.getByTestId('ui.builder.understandingCard')).toBeVisible()
  await expect(page.getByTestId('ui.templates.matchBanner')).toBeVisible()
  await expect(page.getByTestId('ui.templates.candidateItem.tpl_10')).toBeVisible()

  await page.getByTestId('ui.builder.editsInput').fill('Jobboards ja.')
  await page.getByTestId('ui.builder.confirm').click()

  await expect(page.getByTestId('ui.artifact.viewer')).toBeVisible()
  await expect(page.getByTestId('ui.artifact.viewer')).toContainText('lead_campaign')
})

test('hash hit -> auto render -> artifact shown', async ({ page }) => {
  await page.route('**/v1/builder/draft', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        draft_id: 'dr_002',
        understanding: { summary_bullets: ['...'], assumptions: ['...'], questions: [] },
        proposed_intent_spec: {},
      }),
    })
  })

  await page.route('**/v1/templates/match', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        normalized_text: 'x',
        hash_hit: { template_id: 'tpl_hash', type: 'lead_campaign_json', title: 'Exact' },
        candidates: [],
      }),
    })
  })

  await page.route('**/v1/templates/render', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: { type: 'lead_campaign', name: 'Exact template' } }),
    })
  })

  await page.goto('/lead-builder')
  await page.getByTestId('ui.chat.input').fill('Gleicher Auftrag wie vorher (exact)')
  await page.getByTestId('ui.chat.send').click()

  await expect(page.getByTestId('ui.builder.understandingCard')).toBeVisible()
  await expect(page.getByTestId('ui.artifact.viewer')).toContainText('Exact template')
})
