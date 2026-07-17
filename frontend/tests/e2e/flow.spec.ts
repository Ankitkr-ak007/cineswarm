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
    


    // Submit form
    await page.click('button:has-text("Find Me a Movie")');
    
    // Should navigate to debate page
    await expect(page).toHaveURL(/\/debate\/.*/, { timeout: 30000 });
    
    // Should see live debate title
    await expect(page.locator('h1')).toContainText('Live Swarm Debate');
    
    // Should see Dual Rating Display
    await expect(page.getByText('TMDB Rating')).toBeVisible();
    await expect(page.getByText('Swarm Consensus')).toBeVisible();
  });
});
