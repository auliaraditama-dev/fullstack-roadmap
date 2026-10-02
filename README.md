# Full-Stack Workspace Template

Empty Astro + Vue + TypeScript workspace with the reusable UI, local-data, backup, search, theme, responsive, and offline foundations from the original application. The bundled learning/content payload has been removed.

## Included
- Responsive layout and mobile navigation
- Light / dark / system theme
- Local SVG/Lucide-style icon system
- Search UI and generated search index
- Local progress, bookmark, notes, and personal workspace storage
- JSON backup import/export with validation
- Offline shell and service worker
- Roadmap, project, progress, bookmark, notes, offline, reference, and about routes
- Vue-powered interactive components
- Astro static output for Vercel
- Static audits, unit tests, E2E tests, accessibility checks, and performance checks

## Intentionally removed
- Learning materials and curriculum payloads
- Lesson/source data
- PDF / PPT / source-library files
- Downloadable example projects
- Bundled quizzes, glossary, cheatsheets, and sample content

## Local development

```bash
npm ci
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

Astro generates the production website in `dist/`. Vercel is configured to run `npm run build` and deploy `dist/`.

## Vercel deployment

The repository includes a minimal `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "astro",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

Do not override the Vercel Project Settings Build Command with the old `npm run build && node scripts/vercel-output.mjs` command. The custom Build Output API wrapper is kept only as a backwards-compatible manual/CI utility; it is no longer part of the Vercel deployment command.
