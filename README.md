# Full-Stack Developer Learning Lab 2026

Static learning workspace berbasis Astro + Vue + TypeScript yang menggabungkan seluruh fitur roadmap lama dengan materi dari tiga PDF sumber yang disertakan di project.

## Materi yang tersedia

Tiga dokumen sumber disimpan di `public/sources/` dan ditranskripsikan per halaman untuk keterlacakan:

- **Belajar Full-Stack Go + Vue + PostgreSQL dari Fundamental** — 59 halaman.
- **Buku Lengkap Full-Stack Developer 2026** — 101 halaman.
- **Roadmap Belajar Full-Stack Developer 2026** — 26 halaman.

Total **186 halaman sumber** dapat dibaca dari halaman Referensi. Track lama tetap tersedia: 26 unit Go/Vue/PostgreSQL, 10 bagian, 8 minggu, 10 quiz, Task Tracker, Portal Gampong, contoh project, progress, notes, bookmark, offline/PWA, search, glossary, cheatsheet, debugging guide, dan backup/import data belajar.

Track 2026 menambahkan **51 bab** dalam 9 bagian: fondasi developer, web fundamental, data/PHP/Laravel, frontend modern, quality engineering, production, Go specialization, project/roadmap/portfolio, serta materi era digital 2026. Roadmap praktik **26 minggu** juga tersedia sebagai halaman tersendiri.

## UI/UX

UI menggunakan design token light/dark yang konsisten, kartu beraksen warna, layout responsif 320px sampai desktop lebar, keyboard focus, reduced motion, custom scrollbar/select/checkbox/radio, mobile dock, reading controls, dan syntax highlighting yang memiliki palette terpisah untuk light/dark.

Browser `alert()`, `confirm()`, dan `prompt()` tidak dipakai pada source UI. Konfirmasi/pemberitahuan kritis menggunakan modal aplikasi `DialogHost.vue` agar tampil konsisten dengan tema dan tetap dapat dioperasikan lewat keyboard.

## Stack

| Komponen | Versi |
|---|---:|
| Node.js | >=24.16 <25 |
| Astro | 7.3.5 |
| @astrojs/vue | 7.0.3 |
| Vue | 3.5.43 |
| TypeScript | 6.0.3 |
| idb | 8.0.3 |
| Zod | 4.6.5 |
| Vitest | 5.0.2 |
| Playwright | 1.63.0 |

## Menjalankan project

```sh
npm ci
npm run dev
```

Buka `http://127.0.0.1:4321`.

Build production:

```sh
npm run build
npm run preview
```

Untuk canonical/sitemap production:

```text
SITE_URL=https://domain-anda.example
```

## Quality gate

Audit yang tidak membutuhkan dependency browser:

```sh
npm run audit:static
npm run validate:content
```

Gate lengkap pada Node 24.16+:

```sh
npm ci
npm run check
```

`npm run check` menjalankan audit statis, validasi konten, ESLint, typecheck Astro/Vue, Vitest, production build, dan Playwright E2E.

## Data materi

```text
src/data/lessons.json              26 unit track Go lama
src/data/explanations.json         lapisan penjelasan mudah
src/data/source-pages.json         transkripsi PDF Go 59 halaman
src/data/source-library.json       3 PDF / 186 halaman
src/data/fullstack-chapters.json   metadata 51 bab Buku Lengkap 2026
src/data/fullstack-weeks.json      roadmap 26 minggu
src/data/parts.json                10 bagian track lama
src/data/weeks.json                track Go 8 minggu
src/data/quizzes.json              10 quiz
src/data/levels.json               Task Tracker
src/data/portal-levels.json        Portal Gampong
```

Jika PDF di `public/sources/` diperbarui, jalankan:

```sh
python scripts/import-source-pdfs.py
npm run validate:content
```

Script tersebut membangun ulang transkripsi 186 halaman, metadata 51 bab, dan roadmap 26 minggu dari PDF lokal yang sudah ada di project.

## Penyimpanan dan offline

Progress, quiz, bookmark, notes, milestone, dan preferensi baca disimpan lokal di browser. Backup dapat diekspor/import sebagai JSON. Offline manager memakai manifest dengan hash SHA-256 dan cache modular. Request API, request ber-Authorization, dan mutasi non-GET tidak dicache oleh service worker.

## Security dan production

Build menghasilkan CSP, COOP/CORP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, sitemap, robots, search index, dan offline manifest. Source tidak memuat runtime CDN JS/CSS. Secret dan `.env` lokal tidak boleh masuk repository.

## Struktur utama

```text
src/components/       UI Astro/Vue, termasuk modal DialogHost
src/data/             seluruh materi terstruktur
src/lib/              storage, navigation, dialog, offline, model
src/pages/            halaman static Astro
src/styles/           design system dan layout responsive
examples/             Go API, Go algorithms, Task Tracker
public/sources/       tiga PDF sumber
scripts/              audit, validasi, build, import PDF, packaging
```

Release source tidak menyertakan `node_modules`, `dist`, `.astro`, `.vercel`, log, report test, cache, atau credential.

## Audit release ini

Perubahan utama release ini:

- mempertahankan seluruh fitur track lama;
- mengintegrasikan 3 PDF menjadi 186 halaman sumber;
- menambahkan 51 bab Full-Stack Developer 2026 dan roadmap 26 minggu;
- menambahkan halaman sumber generik dengan pencarian teks per halaman;
- mengganti browser alert/confirm menjadi modal aplikasi;
- memperluas UI berwarna tanpa mengorbankan kontras light/dark;
- menambah pemeriksaan statis dan validasi konten untuk sumber baru;
- menambah E2E untuk modal, 51 bab, 26 minggu, dan 3 sumber PDF.

Pada environment penyusunan release, `node scripts/audit-static.mjs` dan `node scripts/validate-content.mjs` berhasil. Full lint/typecheck/build/E2E memerlukan dependency lengkap pada Node 24.16+ sesuai `package.json`.
