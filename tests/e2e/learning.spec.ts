import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const lesson = '/belajar/orientasi/peta-belajar-dan-cara-kerja-program/';
const noteLabel = 'Apa yang Anda pahami? Apa yang masih perlu dicoba?';

async function openLesson(page: Page) {
  await page.goto(lesson);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Peta Belajar dan Cara Kerja Program');
}

test('alur belajar, notes, bookmark, quiz, dan persistensi', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Belajar Go + Vue + PostgreSQL');
  await page.getByRole('link', { name: 'Mulai Bab 1', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(lesson));

  await page.getByRole('heading', { name: 'Catatan pribadi', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('combobox', { name: 'Status belajar', exact: true }).selectOption('completed');
  await page.getByLabel(noteLabel).fill('Path relatif mengikuti working directory.');
  await page.getByRole('button', { name: 'Simpan catatan', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Tersimpan di perangkat' })).toBeVisible();
  await page.getByRole('button', { name: 'Bookmark materi', exact: true }).click();

  await page.reload();
  await page.getByRole('heading', { name: 'Catatan pribadi', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('combobox', { name: 'Status belajar', exact: true })).toHaveValue('completed');
  await expect(page.getByLabel(noteLabel)).toHaveValue('Path relatif mengikuti working directory.');

  await page.goto('/bookmark/');
  await expect(page.locator('main').getByRole('link', { name: 'Peta Belajar dan Cara Kerja Program' })).toBeVisible();

  await page.goto('/quiz/orientasi/');
  await page.getByLabel('Input → Process → Output', { exact: true }).check();
  await page.getByLabel('Tulis input, output, langkah, edge case, lalu trace table', { exact: true }).check();
  await page.getByLabel('O(n)', { exact: true }).check();
  await page.getByRole('button', { name: 'Periksa jawaban' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Hasil: 100%' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('penjelasan mudah tampil sebelum sumber PDF', async ({ page }) => {
  await openLesson(page);
  const guide = page.locator('#penjelasan-mudah');
  await expect(guide.getByRole('heading', { name: 'Penjelasan mudah dipahami' })).toBeVisible();
  await expect(guide.getByRole('heading', { name: 'Inti dalam 60 detik' })).toBeVisible();
  await expect(guide.getByRole('heading', { name: 'Mental model' })).toBeVisible();
  await expect(guide.getByRole('heading', { name: 'Kesalahan yang sering terjadi' })).toBeVisible();
  await expect(guide.getByRole('heading', { name: 'Cek pemahaman tanpa melihat catatan' })).toBeVisible();
  await expect(page.locator('#materi-pdf-lengkap')).toBeVisible();
});

test('pencarian keyboard, theme, dan accessibility', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await page.getByLabel('Kata kunci pencarian').fill('slice');
  await expect(page.locator('.search-results li').first()).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByLabel('Tema', { exact: true }).selectOption('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('preferensi baca dipulihkan setelah reload', async ({ page }) => {
  await openLesson(page);
  await page.getByRole('button', { name: 'Perbesar teks', exact: true }).click();
  await page.getByRole('combobox', { name: 'Lebar baca', exact: true }).selectOption('comfortable');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Lebar baca', exact: true })).toHaveValue('comfortable');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--reading-scale').trim())).toBe('1.15');
  await expect(page.locator('html')).toHaveAttribute('data-width', 'comfortable');
});

test('download offline, search, quiz, dan notes tetap bekerja', async ({ page, context }) => {
  await page.goto('/offline/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.getByLabel('Materi yang akan disimpan').selectOption('orientasi');
  await page.getByRole('button', { name: 'Download materi', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Unduhan lengkap', { timeout: 60_000 });

  await context.setOffline(true);
  await openLesson(page);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Peta Belajar dan Cara Kerja Program');

  await page.keyboard.press('Control+k');
  await page.getByLabel('Kata kunci pencarian').fill('Go');
  await expect(page.locator('.search-results li').first()).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByRole('heading', { name: 'Catatan pribadi', exact: true }).scrollIntoViewIfNeeded();
  await page.getByLabel(noteLabel).fill('Catatan saat offline');
  await page.getByRole('button', { name: 'Simpan catatan' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Tersimpan' })).toBeVisible();

  await page.goto('/roadmap/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Peta perjalanan');
  await page.goto('/quiz/orientasi/');
  await expect(page.getByRole('button', { name: 'Periksa jawaban' })).toBeVisible();
});

test('import invalid tidak merusak data dan export valid', async ({ page }) => {
  await page.goto('/progress/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.getByRole('alert')).toContainText('tidak valid');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export data JSON' }).click();
  expect((await download).suggestedFilename()).toBe('fullstack-backup.json');
});

test('import valid menunggu konfirmasi dan cadangan tetap tersedia setelah reload', async ({ page }) => {
  const stamp = '2026-09-27T00:00:00.000Z';
  const backup = {
    version: 1,
    exportedAt: stamp,
    progress: { 'bab-02': { status: 'completed', updatedAt: stamp } },
    checkpoints: {},
    exercises: {},
    milestones: {},
    quizzes: {},
    bookmarks: [],
    notes: [{ lessonId: 'bab-02', text: 'Catatan dari backup valid', updatedAt: stamp }],
    lastLesson: 'bab-02',
  };

  await page.goto('/progress/');
  await page.locator('input[type=file]').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(page.getByRole('heading', { name: 'Periksa sebelum mengganti data' })).toBeVisible();
  await expect(page.locator('.progress-heading strong')).toHaveText('0%');
  await page.getByRole('button', { name: 'Export cadangan & ganti data' }).click();
  await expect(page.getByRole('status')).toContainText('Backup diimpor');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Unduh ulang cadangan sebelum import' })).toBeVisible();
  await expect(page.locator('.progress-heading strong')).toHaveText('4%');
  await page.goto('/notes/');
  await expect(page.getByText('Catatan dari backup valid', { exact: true })).toBeVisible();
});

test('syntax highlighting tetap terbaca di light dan dark mode', async ({ page }) => {
  await page.goto('/contoh/go-api/');
  const code = page.locator('.astro-code').first();
  const token = code.locator('span').first();
  await expect(code).toBeVisible();
  await expect(token).toBeVisible();

  for (const theme of ['light', 'dark'] as const) {
    await page.getByLabel('Tema', { exact: true }).selectOption(theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const colors = await token.evaluate((element) => {
      const tokenStyle = getComputedStyle(element);
      const codeStyle = getComputedStyle(element.closest('.astro-code')!);
      return { token: tokenStyle.color, background: codeStyle.backgroundColor };
    });
    expect(colors.token).not.toBe(colors.background);
  }
});

for (const width of [320, 360, 375, 390, 430, 768]) {
  test(`lesson responsive ${width}px tanpa overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openLesson(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#penjelasan-mudah')).toBeVisible();

    await page.getByRole('button', { name: 'Buka kurikulum' }).click();
    await expect(page.getByRole('button', { name: 'Tutup kurikulum' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Buka kurikulum' })).toBeFocused();
  });
}

test('unduhan gagal tidak ditandai selesai', async ({ page }) => {
  await page.goto('/offline/');
  await page.route('**/belajar/orientasi/algoritma-pseudocode-dan-problem-solving/', (route) => route.abort());
  await page.getByLabel('Materi yang akan disimpan').selectOption('orientasi');
  await page.getByRole('button', { name: 'Download materi' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  const records = await page.evaluate(async () => {
    const cache = await caches.open('fs-installed');
    return (await cache.keys()).length;
  });
  expect(records).toBe(0);
});

test('kegagalan penyimpanan mengembalikan kontrol ke status tersimpan', async ({ page }) => {
  await openLesson(page);
  const status = page.getByRole('combobox', { name: 'Status belajar', exact: true });
  await expect(status).toBeEnabled();

  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function putFailure() {
      throw new DOMException('Storage penuh', 'QuotaExceededError');
    };
  });

  await status.selectOption('completed');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(status).toHaveValue('read');
  await expect(status).toBeEnabled();

  const checkpoint = page.locator('.learning-tools input[type=checkbox]').first();
  await checkpoint.click();
  await expect(checkpoint).not.toBeChecked();
  await expect(checkpoint).toBeEnabled();

  await page.reload();
  await expect(status).toHaveValue('read');
  await expect(checkpoint).not.toBeChecked();
});

test('draft tidak hilang ketika tab lain menyimpan progress', async ({ page, context }) => {
  await openLesson(page);
  const note = page.getByLabel(noteLabel);
  await expect(note).toBeEnabled();

  const other = await context.newPage();
  await other.goto(lesson);
  await expect(other.getByRole('combobox', { name: 'Status belajar' })).toBeEnabled();

  await note.fill('Draft lintas tab tetap utuh');
  await other.getByRole('combobox', { name: 'Status belajar' }).selectOption('practiced');
  await expect(note).toHaveValue('Draft lintas tab tetap utuh');
  await expect(page.getByRole('status').filter({ hasText: 'Tersimpan di perangkat' })).toBeVisible();

  await page.reload();
  await expect(note).toHaveValue('Draft lintas tab tetap utuh');
  await other.close();
});

test('homepage responsif dan dock mobile membuka pencarian', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await expect(page.locator('.home-hero')).toBeVisible();
  await expect(page.locator('.roadmap-grid--colorful .roadmap-item')).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  const dock = page.getByRole('navigation', { name: 'Navigasi cepat' });
  await expect(dock).toBeVisible();
  await dock.getByRole('button', { name: 'Buka pencarian' }).click();
  await expect(page.getByRole('dialog', { name: 'Cari di kurikulum' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(dock).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
