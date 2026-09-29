from __future__ import annotations
import json
import re
import shutil
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'src' / 'data'
PUBLIC = ROOT / 'public' / 'sources'
PUBLIC.mkdir(parents=True, exist_ok=True)

sources = [
    {
        'id': 'go-vue-postgresql',
        'title': 'Belajar Full-Stack Go + Vue + PostgreSQL dari Fundamental',
        'shortTitle': 'Go + Vue + PostgreSQL',
        'description': 'Roadmap berurutan Go, Vue 3, PostgreSQL, Git, Docker, latihan algoritma, API, dan Task Tracker.',
        'input': PUBLIC / 'Belajar_FullStack_Go_Vue_PostgreSQL_Dari_Fundamental_Color_Syntax.pdf',
        'output': 'Belajar_FullStack_Go_Vue_PostgreSQL_Dari_Fundamental_Color_Syntax.pdf',
        'accent': 'cyan',
    },
    {
        'id': 'fullstack-developer-2026',
        'title': 'Buku Lengkap Full-Stack Developer 2026',
        'shortTitle': 'Buku Lengkap 2026',
        'description': 'Materi terpadu dari fondasi, PHP, Laravel, Vue 3, TypeScript, testing, security, deployment, Docker, CI/CD, Go, hingga AI-assisted development.',
        'input': PUBLIC / 'Buku_Lengkap_FullStack_Developer_2026_Full_Materi.pdf',
        'output': 'Buku_Lengkap_FullStack_Developer_2026_Full_Materi.pdf',
        'accent': 'violet',
    },
    {
        'id': 'roadmap-fullstack-2026',
        'title': 'Roadmap Belajar Full-Stack Developer 2026',
        'shortTitle': 'Roadmap Full-Stack 2026',
        'description': 'Peta belajar terpadu dari dasar komputer sampai Laravel, Vue, TypeScript, quality engineering, production, dan Go.',
        'input': PUBLIC / 'Roadmap_Belajar_FullStack_2026_Lengkap.pdf',
        'output': 'Roadmap_Belajar_FullStack_2026_Lengkap.pdf',
        'accent': 'amber',
    },
]

library = []
for source in sources:
    doc = fitz.open(source['input'])
    pages = []
    for index, page in enumerate(doc):
        text = page.get_text('text').replace('\u0000', '').strip()
        pages.append({'page': index + 1, 'text': text})
    destination = PUBLIC / source['output']
    if source['input'].resolve() != destination.resolve():
        shutil.copy2(source['input'], destination)
    library.append({
        'id': source['id'],
        'title': source['title'],
        'shortTitle': source['shortTitle'],
        'description': source['description'],
        'file': f"/sources/{source['output']}",
        'accent': source['accent'],
        'pageCount': len(pages),
        'pages': pages,
    })

(DATA / 'source-library.json').write_text(json.dumps(library, ensure_ascii=False, indent=2), encoding='utf-8')

book = fitz.open(sources[1]['input'])
chapters = []
for page_index, page in enumerate(book):
    blocks = page.get_text('dict').get('blocks', [])
    for block in blocks:
        for line in block.get('lines', []):
            spans = line.get('spans', [])
            if not spans:
                continue
            text = ''.join(span.get('text', '') for span in spans).strip()
            match = re.match(r'^(\d+)\.\s+(.+)$', text)
            if not match or max(float(span.get('size', 0)) for span in spans) < 20:
                continue
            number = int(match.group(1))
            if not 1 <= number <= 51:
                continue
            chapters.append({'number': number, 'title': match.group(2).strip(), 'startPage': page_index + 1})

# Handle two visually wrapped chapter titles.
for chapter in chapters:
    if chapter['number'] == 49:
        chapter['title'] = 'API economy, integrations, webhooks, dan interoperabilitas'
    if chapter['number'] == 50:
        chapter['title'] = 'Dokumentasi, kolaborasi remote, dan engineering workflow'

chapters = sorted({c['number']: c for c in chapters}.values(), key=lambda c: c['number'])
for i, chapter in enumerate(chapters):
    chapter['endPage'] = (chapters[i + 1]['startPage'] - 1) if i + 1 < len(chapters) else len(book)
    page_text = book[chapter['startPage'] - 1].get_text('text')
    lines = [line.strip() for line in page_text.splitlines() if line.strip()]
    title_marker = f"{chapter['number']}."
    try:
        start = next(i for i, line in enumerate(lines) if line.startswith(title_marker)) + 1
    except StopIteration:
        start = 0
    skip = {'Tujuan belajar', 'Mental model', 'Inti konsep', 'Materi inti', 'Contoh kode lengkap'}
    summary_lines = []
    for line in lines[start:]:
        if line in skip or line.startswith('☐') or re.match(r'^\d+\.', line):
            if summary_lines:
                break
            continue
        if line.startswith('Buku Belajar Terpadu') or line.startswith('BUKU LENGKAP'):
            continue
        summary_lines.append(line)
        if len(' '.join(summary_lines)) > 260:
            break
    chapter['summary'] = ' '.join(summary_lines)[:360].strip()

parts = [
    (1, 5, 'Fondasi developer dan cara berpikir', 'blue'),
    (6, 11, 'Web fundamental', 'cyan'),
    (12, 16, 'Data, PHP web, dan Laravel', 'emerald'),
    (17, 21, 'Frontend modern', 'amber'),
    (22, 25, 'Quality engineering', 'rose'),
    (26, 31, 'Production engineering', 'violet'),
    (32, 35, 'Go untuk backend specialization', 'indigo'),
    (36, 44, 'Proyek terpadu, roadmap, debugging, portfolio', 'orange'),
    (45, 51, 'Materi era digital 2026', 'pink'),
]
for chapter in chapters:
    for start, end, label, accent in parts:
        if start <= chapter['number'] <= end:
            chapter['part'] = label
            chapter['accent'] = accent
            break
(DATA / 'fullstack-chapters.json').write_text(json.dumps(chapters, ensure_ascii=False, indent=2), encoding='utf-8')

weeks = [
    (1, 'Environment, terminal, Git', 'Repo belajar + CLI drills'),
    (2, 'PHP variables, condition, loop', '20 latihan logika'),
    (3, 'Function, array, error', 'CLI mini apps'),
    (4, 'OOP + algoritma dasar', 'Mini inventory CLI'),
    (5, 'HTML semantic', 'Landing page'),
    (6, 'CSS responsive', 'Responsive redesign'),
    (7, 'JavaScript fundamental', 'Interactive UI'),
    (8, 'DOM, fetch, DevTools', 'Frontend mini project'),
    (9, 'HTTP + JSON', 'Request lab'),
    (10, 'SQL CRUD', 'Database exercises'),
    (11, 'JOIN + schema design', 'Mini schema gampong'),
    (12, 'PHP web + PDO', 'Mini blog'),
    (13, 'Laravel routing/controller/Blade', 'News app'),
    (14, 'Migration/Eloquent/relationship', 'Data model app'),
    (15, 'Validation/auth/policy', 'Protected CRUD'),
    (16, 'Upload/mail/logging', 'Admin module'),
    (17, 'Queue/cache/API/testing', 'Backend checkpoint'),
    (18, 'Node/Vite + TypeScript', 'TS exercises'),
    (19, 'Vue component/reactivity', 'Vue mini app'),
    (20, 'Vue form/composable', 'Dashboard UI'),
    (21, 'Laravel + Vue/Inertia', 'Full-stack module'),
    (22, 'API integration/testing', 'Full-stack checkpoint'),
    (23, 'Security audit', 'Fix security checklist'),
    (24, 'Linux + deployment', 'Staging deployment'),
    (25, 'Docker + CI/CD + backup', 'Automated pipeline'),
    (26, 'Go fundamental + reflection', 'Go API mini project + portfolio'),
]
(DATA / 'fullstack-weeks.json').write_text(json.dumps([
    {'number': n, 'focus': focus, 'output': output} for n, focus, output in weeks
], ensure_ascii=False, indent=2), encoding='utf-8')

print(f"Imported {sum(item['pageCount'] for item in library)} source pages, {len(chapters)} full-stack chapters, {len(weeks)} weeks")
