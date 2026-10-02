import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/belajar/fondasi/logika-pemrograman-algoritma/';
const noteLabel = 'Apa yang Anda pahami? Apa yang masih perlu dicoba?';

async function openLesson(page: Page) {
  await page.goto(lesson);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Logika Pemrograman & Algoritma');
}

test('homepage menampilkan kurikulum baru 36 sesi', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tersusun per sesi');
  await expect(page.getByRole('link', { name: 'Mulai Sesi 01', exact: true })).toBeVisible();
  await expect(page.locator('.roadmap-grid--colorful .roadmap-item')).toHaveCount(8);
  await expect(page.locator('.curriculum-stats')).toContainText('36');
});

test('halaman sesi mengikuti format PPT dan seluruh fungsi belajar tetap ada', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openLesson(page);
  await expect(page.getByRole('heading', { name: 'Agenda sesi' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tujuan belajar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Alur belajar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Materi sumber lengkap' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Latihan praktik' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Checkpoint' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bookmark materi', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Status belajar', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('progress, notes, bookmark dan quiz persist', async ({ page }) => {
  await openLesson(page);
  await page.getByRole('combobox', { name: 'Status belajar', exact: true }).selectOption('completed');
  await page.getByLabel(noteLabel).fill('Pahami input, process, output sebelum syntax.');
  await page.getByRole('button', { name: 'Simpan catatan', exact: true }).click();
  await page.getByRole('button', { name: 'Bookmark materi', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Status belajar', exact: true })).toHaveValue('completed');
  await expect(page.getByLabel(noteLabel)).toHaveValue('Pahami input, process, output sebelum syntax.');
  await page.goto('/bookmark/');
  await expect(page.getByRole('link', { name: 'Logika Pemrograman & Algoritma' })).toBeVisible();
});

test('theme, reading controls, accessibility', async ({ page }) => {
  await openLesson(page);
  await page.getByRole('button', { name: 'Perbesar teks', exact: true }).click();
  await page.getByRole('combobox', { name: 'Lebar baca', exact: true }).selectOption('comfortable');
  await page.getByLabel('Tema', { exact: true }).selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('combobox', { name: 'Lebar baca', exact: true })).toHaveValue('comfortable');
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(audit.violations).toEqual([]);
});

test('tidak ada horizontal overflow pada viewport utama', async ({ page }) => {
  for (const width of [320,360,390,430,768,1440]) {
    await page.setViewportSize({ width, height: 844 });
    await openLesson(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('offline, search, roadmap, materi 2026 dan semua sumber', async ({ page }) => {
  await page.goto('/offline/');
  await page.getByLabel('Materi yang akan disimpan').selectOption('fondasi');
  await page.getByRole('button', { name: 'Download materi', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Unduhan lengkap', { timeout: 60_000 });

  await page.goto('/');
  await page.keyboard.press('Control+k');
  await page.getByLabel('Kata kunci pencarian').fill('Laravel');
  await expect(page.locator('.search-results li').first()).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/roadmap/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('36 sesi');
  await page.goto('/materi-2026/');
  await expect(page.locator('.chapter-card')).toHaveCount(51);
  await page.goto('/roadmap-26-minggu/');
  await expect(page.locator('.week-card')).toHaveCount(26);
  await page.goto('/referensi/');
  await expect(page.locator('.source-library-card')).toHaveCount(8);
});

test('import invalid tidak merusak data dan modal konfirmasi tetap digunakan', async ({ page }) => {
  await page.goto('/progress/');
  await page.locator('input[type=file]').setInputFiles({ name:'invalid.json', mimeType:'application/json', buffer:Buffer.from('{"version":999}') });
  await expect(page.getByRole('alert')).toContainText('tidak valid');
  await page.goto('/offline/');
  await page.getByRole('button', { name: 'Hapus materi offline', exact: true }).click();
  const modal = page.getByRole('dialog');
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Batal' }).click();
  await expect(modal).toBeHidden();
});
