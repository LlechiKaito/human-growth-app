import { expect, test } from '@playwright/test';

import { uniqueEmail } from './fixtures';

test.describe('Auth Flow', () => {
  test('signup → dashboard → logout → login', async ({ page }) => {
    const email = uniqueEmail('auth-flow');

    // signup
    await page.goto('/signup');
    await page.getByLabel('表示名').fill('Brave Hero');
    await page.getByLabel('部署 (任意)').fill('Engineering');
    await page.getByLabel('メールアドレス').fill(email);
    await page.getByLabel('パスワード (8文字以上)').fill('password123');
    await page.getByTestId('signup-submit').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('me-name')).toHaveText('Brave Hero');

    // logout
    await page.getByRole('button', { name: 'ログアウト' }).click();
    await expect(page).toHaveURL(/\/login/);

    // login
    await page.getByLabel('メールアドレス').fill(email);
    await page.getByLabel('パスワード').fill('password123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('me-name')).toHaveText('Brave Hero');
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('nobody@example.com');
    await page.getByLabel('パスワード').fill('wrongpassword');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('accessing /dashboard while unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
