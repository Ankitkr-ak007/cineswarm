# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: flow.spec.ts >> CineSwarm Full Flow >> submits a request and views the debate
- Location: tests\e2e\flow.spec.ts:4:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('h1')
Expected substring: "CineSwarm"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('h1')

```

```yaml
- text: CineSwarm AI Agents Debate What You Should Watch How are you feeling?
- textbox "How are you feeling?":
  - /placeholder: e.g. I want something mind-bending but not too dark...
- text: Preferred Genres
- button "Action"
- button "Comedy"
- button "Drama"
- button "Sci-Fi"
- button "Horror"
- button "Romance"
- button "Animation"
- button "Family"
- text: Kids Mode
- paragraph: Filter out inappropriate content and adult themes.
- switch [checked]
- button "Find Me a Movie" [disabled]
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('CineSwarm Full Flow', () => {
  4  |   test('submits a request and views the debate', async ({ page }) => {
  5  |     // Navigate to home page
  6  |     await page.goto('/');
  7  |     
  8  |     // Check page title
> 9  |     await expect(page.locator('h1')).toContainText('CineSwarm');
     |                                      ^ Error: expect(locator).toContainText(expected) failed
  10 | 
  11 |     // Fill out the mood input
  12 |     await page.fill('input#mood', 'I want something visually stunning like a sci-fi epic.');
  13 | 
  14 |     // Click a genre
  15 |     await page.click('button:has-text("Sci-Fi")');
  16 |     
  17 |     // Toggle kids mode off (expect PIN modal)
  18 |     await page.click('button[role="switch"]');
  19 |     
  20 |     // PIN modal should appear
  21 |     await expect(page.locator('div[role="dialog"]')).toBeVisible();
  22 |     await page.click('button:has-text("Verify")'); // Simulate without typing for simplicity, or we skip since we don't have real auth seeded in test.
  23 |     // Actually, let's just close the modal and submit with Kids Mode ON to avoid auth dependency in simple E2E.
  24 |     // Press escape to close modal
  25 |     await page.keyboard.press('Escape');
  26 | 
  27 |     // Submit form
  28 |     await page.click('button:has-text("Find Me a Movie")');
  29 |     
  30 |     // Should navigate to debate page
  31 |     await expect(page).toHaveURL(/\/debate\/.*/, { timeout: 10000 });
  32 |     
  33 |     // Should see live debate title
  34 |     await expect(page.locator('h1')).toContainText('Live Swarm Debate');
  35 |     
  36 |     // Should see Dual Rating Display
  37 |     await expect(page.getByText('TMDB Rating')).toBeVisible();
  38 |     await expect(page.getByText('Swarm Consensus')).toBeVisible();
  39 |   });
  40 | });
  41 | 
```