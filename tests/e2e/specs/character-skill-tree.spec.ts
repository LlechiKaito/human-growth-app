import { expect, test } from '@playwright/test';

import { createUserViaApi } from './fixtures';

test.describe('Character Skill Tree', () => {
  test('displays character status and skill tree on /characters/me', async ({ page }) => {
    const user = await createUserViaApi();

    await page.addInitScript((token) => {
      window.sessionStorage.setItem('idToken', token);
    }, user.idToken);

    await page.goto('/characters/me');

    await expect(page.getByTestId('character-name')).toHaveText('E2E User');
    await expect(page.getByTestId('character-level')).toHaveText('1');
    await expect(page.getByTestId('xp-to-next')).toContainText('100');
  });
});
