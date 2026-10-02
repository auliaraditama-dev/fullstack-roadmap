import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage menampilkan empty workspace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Workspace kosong');
  await expect(page.locator('.roadmap-grid--colorful .roadmap-item')).toHaveCount(6);
});

test('workspace routes dan personal storage tersedia', async ({ page }) => {
  await page.goto('/progress/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Progress');
  await page.goto('/notes/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Catatan pribadi');
  await page.goto('/bookmark/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bookmark');
  await page.goto('/offline/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mode offline');
});

test('theme, responsive UI dan accessibility', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Tema', { exact: true }).selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  for (const width of [320,360,390,430,768,1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }

  const audit = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(audit.violations).toEqual([]);
});

test('search tersedia dan index kosong', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.getByLabel('Kata kunci pencarian')).toBeVisible();
  await page.getByLabel('Kata kunci pencarian').fill('Laravel');
  await expect(page.getByRole('status')).toContainText('Belum ada konten');
});

test('referensi benar-benar kosong dan halaman tidak membawa materi lama', async ({ page }) => {
  await page.goto('/referensi/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Referensi');
  await expect(page.getByText('Referensi kosong')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Laravel');
  await expect(page.locator('body')).not.toContainText('Go Algorithms');
});
