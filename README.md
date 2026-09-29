# Full-Stack Go + Vue + PostgreSQL Roadmap 2026

Platform belajar mandiri berbahasa Indonesia yang diselaraskan dengan PDF **Belajar Full-Stack Go + Vue + PostgreSQL - Dari Fundamental**. Aplikasi dibangun sebagai static web app berbasis Astro + Vue, dapat dipasang sebagai PWA, dan menyimpan progress belajar di browser tanpa membutuhkan akun atau backend runtime.

## Kurikulum

Materi utama mengikuti sumber PDF secara berurutan dan lengkap:

- 24 bab utama dari peta belajar, algoritma, Go fundamental, Git, HTTP/REST, backend Go, JavaScript, Vue 3, PostgreSQL, tools, Docker, integrasi, mini project, jadwal belajar, sampai bank latihan.
- Cheat Sheet A untuk Go serta Cheat Sheet B untuk Git, SQL, HTTP, dan Docker.
- 59 halaman sumber ditranskripsikan ke data terstruktur agar seluruh materi PDF tetap dapat dibaca di aplikasi.
- Jadwal belajar 8 minggu dan checkpoint mengikuti sumber.
- Mini project utama adalah **Task Tracker** dengan Vue + Go + PostgreSQL.
- Portal Gampong 15 level tetap dipertahankan sebagai track project legacy/lanjutan agar fitur lama tidak hilang.

PDF asli disertakan pada `public/sources/Belajar_FullStack_Go_Vue_PostgreSQL_Dari_Fundamental_Color_Syntax.pdf` dan dapat dibuka dari halaman sumber di aplikasi.

## Fitur

- 26 unit materi (24 bab + 2 cheat sheet) dengan halaman belajar dinamis.
- Setiap unit memiliki lapisan **Penjelasan Mudah**: ringkasan 60 detik, mental model, alasan penting, urutan berpikir, kesalahan umum, cek pemahaman, dan jembatan ke materi berikutnya. Penjelasan ini merupakan penyederhanaan tambahan; transkripsi/PDF asli tetap dipisahkan sebagai sumber utama.
- Teks sumber PDF per halaman, objective, latihan, checkpoint, dan navigasi bab.
- Roadmap dan jadwal belajar 8 minggu.
- Quiz per bagian, progress, streak/checkpoint lokal, notes, bookmarks, backup/import data belajar.
- Search lokal, glossary, cheatsheet, debugging guide, track lanjutan, dan panduan penggunaan AI untuk belajar.
- Task Tracker project track dan Portal Gampong legacy project track.
- Contoh runnable: algoritma Go, API Go, dan Task Tracker full-stack. Backend Task Tracker memiliki graceful shutdown, strict JSON decoding, validasi Content-Type/title, CORS origin terkonfigurasi, parameterized SQL, timeout server, dan security headers; frontend memakai API URL dari environment serta mencegah aksi ganda saat request berjalan.
- PWA/offline modular dengan manifest integritas SHA-256 dan cleanup cache generasi lama.
- Light/dark theme, reading controls, focus mode, responsive layout 320px sampai desktop lebar, reduced-motion support, keyboard accessibility, dan mobile bottom dock.
- Lucide-style icons disimpan lokal; tidak ada request ikon/CDN runtime.
- Static security headers, CSP, COOP/CORP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, sitemap, robots, search index, dan canonical berbasis `SITE_URL`.

## Stack produksi

Versi aplikasi dikunci melalui `package-lock.json`:

| Komponen | Versi |
|---|---:|
| Node.js | 24.16+ LTS |
| Astro | 7.3.5 |
| @astrojs/vue | 7.0.3 |
| Vue | 3.5.43 |
| TypeScript | 6.0.3 |
| idb | 8.0.3 |
| Zod | 4.6.5 |

Project memakai pendekatan **latest compatible stable**. Node 24.16+ adalah runtime target project; gunakan versi tersebut untuk instalasi, build, dan CI.

## Menjalankan aplikasi

```sh
npm ci
npm run dev
```

Buka `http://127.0.0.1:4321`.

Build dan preview produksi:

```sh
npm run build
npm run preview
```

Untuk canonical dan sitemap produksi, isi environment variable:

```text
SITE_URL=https://domain-anda.example
```

Jangan simpan secret, token, password, atau `.env` lokal ke repository.

## Quality gate

Audit cepat yang tidak membutuhkan browser:

```sh
npm run audit:static
npm run validate:content
```

Gate lengkap pada Node 24.16+:

```sh
npm ci
npm run audit:static
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run audit:performance
```

Contoh Go dapat diuji terpisah:

```sh
cd examples/go-algorithms && go test ./...
cd ../go-api && go test ./...
```

Task Tracker dapat dijalankan sebagai tiga proses sederhana:

```sh
cd examples/task-tracker
docker compose up -d

cd backend
go run ./cmd/api

cd ../frontend
npm install
npm run dev
```

Backend contoh Task Tracker menggunakan PostgreSQL driver pgx dan membutuhkan dependency Go yang diunduh dari module proxy pada environment yang memiliki akses internet.

Untuk mode production contoh Task Tracker, isi `APP_ENV=production`, `DATABASE_URL`, `CORS_ORIGIN`, dan bila perlu `HTTP_ADDR`. Backend sengaja gagal start jika `APP_ENV=production` tetapi `DATABASE_URL` kosong. Frontend dapat diarahkan ke API melalui `VITE_API_URL`.

## Struktur penting

```text
src/data/lessons.json       metadata 26 unit belajar
src/data/source-pages.json  transkripsi 59 halaman PDF
src/data/explanations.json   penjelasan mudah untuk 26 unit
src/data/parts.json         10 bagian kurikulum aplikasi
src/data/weeks.json         jadwal belajar 8 minggu
src/data/levels.json        milestone Task Tracker
src/data/portal-levels.json track Portal Gampong legacy
src/pages/                  halaman Astro
src/components/             komponen Astro/Vue interaktif dan LearningGuide
examples/                   contoh Go dan Task Tracker
public/sources/             PDF sumber
scripts/                    audit, validasi, build, packaging
src/styles/learning.css      UI khusus materi/penjelasan belajar
```

Konten pembelajaran utama tidak lagi disimpan sebagai Markdown. `README.md` ini sengaja menjadi satu-satunya file Markdown dalam paket source.

## Data lokal dan offline

Progress, note, bookmark, preferensi membaca, dan metadata belajar disimpan pada IndexedDB/local browser storage. Backup JSON dapat diekspor dan diimpor kembali. Import memvalidasi struktur serta URL internal untuk mengurangi risiko data/path yang tidak valid.

Offline manager menyimpan modul secara eksplisit. Setiap asset pada manifest offline memiliki ukuran dan SHA-256; generasi baru baru diaktifkan setelah seluruh asset lolos validasi. Service worker tidak menyimpan request non-GET, request dengan `Authorization`, atau route API.

## Deployment

Target utama adalah static deployment. `vercel.json` dan workflow CI tersedia untuk deployment Vercel. Jalankan deployment hanya dari build yang melewati audit, lint, typecheck, unit test, build, dan E2E di Node 24.16+.

File build lama, `node_modules`, `.astro`, `.vercel`, report lokal, database sementara, credential, dan file log tidak disertakan dalam release source.

## Lisensi dan atribusi ikon

Geometri ikon UI berasal dari proyek Lucide dan digunakan secara lokal. Lucide didistribusikan di bawah lisensi ISC. Copyright Lucide Contributors. Lihat repository resmi Lucide untuk teks lisensi lengkap apabila project ini akan didistribusikan ulang dengan persyaratan legal tambahan.

## Audit dan refactor 29 September 2026

Perbaikan pada release ini:
- Data rute dan contoh project dipindahkan ke modul TypeScript yang diimpor oleh getStaticPaths. Error staticRoutes/examples is not defined diperbaiki.
- Rentang halaman sumber divalidasi sebelum digunakan; typecheck bersih.
- Ikon tema mobile kembali terlihat, dengan kontrol select native yang tetap dapat diakses keyboard dan screen reader. Ikon menu/dock berukuran tetap dan target tombol minimal 44 px.
- Breakpoint sidebar diselaraskan ke 980 px; menutup menu dengan Escape mengembalikan fokus dan beralih ke desktop membersihkan backdrop.
- Indeks pencarian tersedia ketika npm run dev; build produksi tetap menghasilkan indeks lengkap 78 halaman.
- ID modul tambahan offline dibedakan dari bagian referensi kurikulum. Build menolak ID modul duplikat.
- Pengelola offline menampilkan estimasi transfer dan ukuran berkas unik secara terpisah.
- npm run test:smoke memeriksa seluruh halaman hasil build, halaman tidak ditemukan, indeks pencarian, dan keunikan modul offline. Set TEST_BASE_URL jika port preview berbeda.

Fitur yang dipertahankan: 26 unit, 59 halaman sumber PDF, 10 quiz, 8 minggu, Task Tracker, Portal Gampong, contoh kode, catatan, bookmark, progress, backup/import, pencarian, tema, kontrol baca, dan PWA. Format data belajar tidak diubah.

Validasi yang sudah dilakukan: lint, typecheck (0 error/warning), 25 unit test, audit statis, validasi konten, build WASM (80 halaman, 0 tautan rusak), HTTP smoke, pencarian produksi, menu/Escape/fokus, serta responsivitas halaman Roadmap pada 320/375/768/940/1024/1440 px. Seluruh 11 modul berhasil diunduh; halaman Roadmap dan menu dapat dibuka ketika server preview dihentikan. Ikon diperiksa melalui computed style dan screenshot.

Batas verifikasi: build native mengalami spawn EPERM pada sandbox Windows ini; gunakan npm run build:wasm sebagai alternatif yang sudah lulus. Build default tetap tersedia untuk lingkungan biasa/CI. Suite Playwright lengkap, Lighthouse, pengujian perangkat iOS/Android fisik, deployment Vercel, dan backend contoh Go/PostgreSQL belum dijalankan pada audit ini. Ini bukan klaim bebas dari semua bug atau audit penetrasi keamanan. SITE_URL harus diisi dengan domain produksi agar canonical/sitemap memakai domain yang benar.

## Universal UI redesign 29 September 2026

Release ini menambahkan satu presentation layer universal tanpa mengubah data belajar, route, IndexedDB, PWA, quiz, progress, bookmark, note, offline manager, atau contoh project yang sudah tersedia.

- `src/styles/system.css` menjadi lapisan design token dan UI global untuk Clean Light/Dark Mode, spacing, surface, border, focus ring, tombol, field, checkbox, radio, table, modal/search, sidebar, mobile dock, scrollbar, dan responsive states.
- `src/scripts/ui-system.ts` meningkatkan seluruh single-select menjadi dropdown/listbox yang tetap menyinkronkan elemen `select` asli. Dropdown mendukung keyboard, Escape, outside click, opsi terpilih, pencarian untuk daftar panjang, scroll internal, disabled state, dan posisi drop-up/drop-down berdasarkan ruang viewport.
- Scrollbar page, sidebar, dropdown, modal, area kode, dan panel panjang menggunakan thumb netral, hover/active state, Firefox `scrollbar-color`, serta WebKit scrollbar fallback.
- Checkbox/radio memiliki visual state konsisten tanpa menghapus semantics input asli. Semua kontrol mempertahankan focus-visible dan target sentuh minimum.
- Gaya visual lama yang terlalu dekoratif dinetralkan agar hierarchy, readability, dan konsistensi lebih kuat pada mobile sampai desktop lebar.
- Audit statis diperluas untuk memeriksa keberadaan universal UI layer, custom scrollbar, custom dropdown, checkbox/radio, semantic listbox/option, keyboard navigation, dan viewport-aware dropdown positioning.

Validasi yang dapat dijalankan tanpa dependency eksternal pada lingkungan audit ini: `node scripts/audit-static.mjs` lulus 162 pemeriksaan dan `node scripts/validate-content.mjs` lulus. Full lint/typecheck/build tetap memerlukan Node 24.16+ dan dependency `npm ci` yang lengkap sesuai `package.json`.
