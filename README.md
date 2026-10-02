# Full-Stack Learning Lab 2026

Workspace belajar yang mengemas seluruh materi PDF/PPT yang disertakan menjadi **36 sesi utama** dengan format belajar seperti deck kelas, tanpa gradient.

## Basis materi

- 3 PDF roadmap/buku: 59 + 101 + 26 halaman.
- 5 PPTX: Go-Lang Dasar, Laravel Dasar, dan Sesi 1–3.
- Total sumber: 8 berkas dan 895 halaman/slide.
- Materi buku 2026: 51 bab.
- Roadmap praktik: 26 minggu.

File asli sumber tetap berada di `public/sources/` agar materi dapat ditelusuri dan dibuka kembali.

## Struktur belajar

1. Fondasi & problem solving — Sesi 01–05
2. Web fundamental — Sesi 06–14
3. PHP, data & Laravel — Sesi 15–23
4. Frontend modern — Sesi 24–26
5. Quality engineering — Sesi 27–29
6. Production, Docker & CI/CD — Sesi 30–32
7. Go backend specialization — Sesi 33–34
8. Project, AI & karier — Sesi 35–36

Setiap sesi memiliki 180 menit, agenda, tujuan, alur belajar, materi sumber lengkap, latihan, tugas, checkpoint, bookmark, progress, dan catatan. Sesi 01–03 memakai timeline yang mengikuti PPT yang dikirim; sesi berikutnya memakai pola sesi yang sama untuk materi roadmap/buku.

## Fitur yang dipertahankan

Search, quiz, progress lokal, notes, bookmark, offline mode, export/import backup, modal confirmation/notification, responsive layout, Lucide icons, Task Tracker, Portal Gampong, roadmap 26 minggu, 51 bab 2026, dan halaman referensi sumber.

## UI

- Tidak menggunakan CSS gradient.
- Flat surfaces dengan kontras yang lebih tenang.
- Responsive untuk mobile, tablet, dan desktop.
- Reduced-motion support.
- Source text memakai wrapping agar tidak memaksa horizontal scrolling.

## Commands

```bash
npm install
npm run dev
npm run validate:content
npm run audit:static
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

## Regenerate materi

Semua berkas sumber sudah dibundle di `public/sources/`. Untuk membuat ulang data sumber dan kurikulum:

```bash
python scripts/import-all-materials.py
```

`src/data/lessons.json` dan `src/data/catalog.json` adalah jalur sesi utama. Data project lama tetap dipertahankan di `src/data/levels.json` dan `src/data/portal-levels.json` karena itu fitur workspace, bukan kurikulum utama.

## Runtime

Project mengunci Node `>=24.16 <25`. Gunakan versi Node tersebut agar hasil build sesuai dengan lockfile proyek.
