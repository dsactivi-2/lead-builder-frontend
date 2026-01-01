import { test, expect } from '@playwright/test';
import { mockLeadBuilderResponse } from './fixtures/mockResponses';

test.describe('Lead Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses
    await page.route('**/api/lead-builder/process', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLeadBuilderResponse),
      });
    });

    await page.route('**/api/lead-builder/templates', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ templates: [] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-template-id' }),
        });
      }
    });

    await page.goto('/lead-builder');
  });

  test('should display the lead builder page', async ({ page }) => {
    await expect(page.getByTestId('lead-builder-page')).toBeVisible();
    await expect(page.getByTestId('lead-builder-title')).toHaveText('Lead Builder');
  });

  test('should display chat panel', async ({ page }) => {
    await expect(page.getByTestId('chat-panel')).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeVisible();
    await expect(page.getByTestId('chat-send-button')).toBeVisible();
  });

  test('should display output panel with tabs', async ({ page }) => {
    await expect(page.getByTestId('output-panel')).toBeVisible();
    await expect(page.getByTestId('output-tabs')).toBeVisible();
    await expect(page.getByTestId('tab-results')).toBeVisible();
    await expect(page.getByTestId('tab-templates')).toBeVisible();
    await expect(page.getByTestId('tab-debug')).toBeVisible();
  });

  test('should send a message and receive response', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('chat-send-button');

    await input.fill('Tech-Unternehmen in Berlin mit 50-200 Mitarbeitern');
    await sendButton.click();

    // Wait for user message to appear
    await expect(page.getByTestId('chat-message-user')).toBeVisible();

    // Wait for assistant response
    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 10000 });
  });

  test('should display understanding card with results', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('chat-send-button');

    await input.fill('Tech-Unternehmen in Berlin');
    await sendButton.click();

    // Wait for understanding to load
    await expect(page.getByTestId('understanding-content')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('understanding-intent')).toBeVisible();
    await expect(page.getByTestId('understanding-entities')).toBeVisible();
    await expect(page.getByTestId('understanding-confidence-value')).toContainText('%');
  });

  test('should display match banner with results', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('chat-send-button');

    await input.fill('Tech-Unternehmen in Berlin');
    await sendButton.click();

    // Wait for matches to load
    await expect(page.getByTestId('match-content')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('match-count')).toContainText('147');
    await expect(page.getByTestId('match-preview')).toBeVisible();
  });

  test('should display artifact viewer with query', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('chat-send-button');

    await input.fill('Tech-Unternehmen in Berlin');
    await sendButton.click();

    // Wait for artifacts to load
    await expect(page.getByTestId('artifact-query')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('artifact-save-button')).toBeVisible();
  });

  test('should open save template dialog', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('chat-send-button');

    await input.fill('Tech-Unternehmen in Berlin');
    await sendButton.click();

    // Wait for artifacts and click save
    await expect(page.getByTestId('artifact-save-button')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('artifact-save-button').click();

    // Check dialog
    await expect(page.getByTestId('save-template-dialog')).toBeVisible();
    await expect(page.getByTestId('save-template-input')).toBeVisible();
  });

  test('should switch to templates tab', async ({ page }) => {
    await page.getByTestId('tab-templates').click();
    await expect(page.getByTestId('templates-tab')).toBeVisible();
    await expect(page.getByTestId('templates-empty')).toBeVisible();
  });

  test('should switch to debug tab', async ({ page }) => {
    await page.getByTestId('tab-debug').click();
    await expect(page.getByTestId('debug-panel')).toBeVisible();
    await expect(page.getByTestId('debug-state')).toBeVisible();
  });

  test('should show debug data after request', async ({ page }) => {
    const input = page.getByTestId('chat-input');
    const sendButton = page.getByTestId('chat-send-button');

    await input.fill('Tech-Unternehmen');
    await sendButton.click();

    // Wait for completion
    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 10000 });

    // Switch to debug tab
    await page.getByTestId('tab-debug').click();
    await expect(page.getByTestId('debug-state')).toContainText('complete');
    await expect(page.getByTestId('debug-raw-data')).not.toContainText('Keine Daten');
  });
});
