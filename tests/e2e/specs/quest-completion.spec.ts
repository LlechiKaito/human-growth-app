import { expect, test } from '@playwright/test';

import { createUserViaApi, seedQuestViaApi } from './fixtures';

test.describe('Quest Completion Flow', () => {
  test('complete a quest → XP increases → level up', async ({ page }) => {
    const user = await createUserViaApi();
    const quest = await seedQuestViaApi({
      title: 'Slay the Legacy Code',
      rewardXp: 150,
      assignedCharacterId: user.characterId,
    });

    // ブラウザに ID トークンを注入してログイン状態にする
    await page.addInitScript((token) => {
      window.sessionStorage.setItem('idToken', token);
    }, user.idToken);

    await page.goto('/quests');
    await expect(page.getByTestId(`quest-${quest.id}`)).toBeVisible();
    await expect(page.getByTestId(`quest-${quest.id}`)).toContainText('Slay the Legacy Code');
    await expect(page.getByTestId(`quest-${quest.id}`)).toContainText('+150 XP');

    await page.getByTestId(`complete-${quest.id}`).click();

    // 報酬 toast 表示
    await expect(page.getByTestId('reward-toast')).toBeVisible();
    await expect(page.getByTestId('gained-xp')).toHaveText('+150 XP');
    await expect(page.getByTestId('level-up')).toBeVisible();
    await expect(page.getByTestId('level-up')).toContainText('Lv.1 → Lv.2');

    // ダッシュボードで反映確認
    await page.goto('/dashboard');
    await expect(page.getByTestId('character-level')).toHaveText('2');
    await expect(page.getByTestId('completed-count')).toHaveText('1');
  });

  test('completing a quest does not show level up toast when no level change', async ({ page }) => {
    const user = await createUserViaApi();
    const quest = await seedQuestViaApi({
      title: 'Tiny Task',
      rewardXp: 30,
      assignedCharacterId: user.characterId,
    });

    await page.addInitScript((token) => {
      window.sessionStorage.setItem('idToken', token);
    }, user.idToken);

    await page.goto('/quests');
    await page.getByTestId(`complete-${quest.id}`).click();

    await expect(page.getByTestId('reward-toast')).toBeVisible();
    await expect(page.getByTestId('gained-xp')).toHaveText('+30 XP');
    await expect(page.getByTestId('level-up')).toHaveCount(0);
  });
});
