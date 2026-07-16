import { test, expect } from '@playwright/test';

test.describe('CineSwarm Full Flow', () => {
  test('submits a request and views the debate', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
    
    // Check page title
    await expect(page.getByText('CineSwarm', { exact: true }).first()).toBeVisible();

    // Fill out the mood input
    await page.fill('input#mood', 'I want something visually stunning like a sci-fi epic.');

    // Click a genre
    await page.click('button:has-text("Sci-Fi")');
    
    // Toggle kids mode off (expect PIN modal)
    await page.click('[data-slot="switch"]');
    
    // PIN modal should appear
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await page.click('button:has-text("Verify")'); // Simulate without typing for simplicity, or we skip since we don't have real auth seeded in test.
    // Actually, let's just close the modal and submit with Kids Mode ON to avoid auth dependency in simple E2E.
    // Press escape to close modal
    await page.keyboard.press('Escape');

    // Mock the backend API call since the backend isn't running in Frontend CI
    await page.route('**/api/v1/recommend', async route => {
      await route.fulfill({ json: { session_id: 'test-session-123' } });
    });

    // Mock WebSocket in the browser
    await page.addInitScript(() => {
      class MockWebSocket {
        url: string;
        readyState: number = 1; // OPEN
        onmessage: any;
        onerror: any;
        constructor(url: string) {
          this.url = url;
          setTimeout(() => {
            if (this.onmessage) {
              this.onmessage({ data: JSON.stringify({ type: 'final_result', result: { actual_rating: 8, consensus_score: 9, recommendations: ['Test Movie'], explanation: 'Test explanation' } }) });
            }
          }, 500);
        }
        close() {}
        send() {}
      }
      (window as any).WebSocket = MockWebSocket;
    });

    // Submit form
    await page.click('button:has-text("Find Me a Movie")');
    
    // Should navigate to debate page
    await expect(page).toHaveURL(/\/debate\/.*/, { timeout: 30000 });
    
    // Should see live debate title
    await expect(page.locator('h1')).toContainText('Live Swarm Debate');
    
    // Should see Dual Rating Display
    await expect(page.getByText('TMDB Rating')).toBeVisible();
    await expect(page.getByText('Swarm Consensus')).toBeVisible();

    // INTENTIONAL FAILURE FOR CI TESTING
    if (process.env.CI_FAILURE_TEST === '1') {
      await expect(page.getByText('This text does not exist')).toBeVisible({ timeout: 100 });
    }
  });
});
