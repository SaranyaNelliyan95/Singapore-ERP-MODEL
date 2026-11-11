/**
 * Playwright browser scenarios for /hr/master/onboarding (run against localhost:4200).
 *
 * Prerequisites: `npx playwright install` and app + API running with onboardingSgFlowV2 ON.
 * Execute: `npx playwright test e2e/onboarding-sg-flow.pw.ts`
 *
 * Logic coverage for all 9 scenarios also lives in:
 *   src/app/core/onboarding/onboarding-sg-flow.rules.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('HR onboarding SG flow (browser)', () => {
  test.skip(!process.env.E2E_ONBOARDING, 'Set E2E_ONBOARDING=1 with live stack to run');

  test('onboarding page loads and shows checklist shell', async ({ page }) => {
    await page.goto('http://localhost:4200/hr/master/onboarding');
    await expect(page.getByRole('heading', { name: /Onboarding pipeline/i })).toBeVisible();
  });

  test('account activation controls remain visible', async ({ page }) => {
    await page.goto('http://localhost:4200/hr/master/onboarding');
    await expect(page.getByText(/Send \/ create ESS login on activate/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
