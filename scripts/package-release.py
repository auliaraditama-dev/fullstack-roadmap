"""Create a clean source release without build caches, secrets, reports, or stale artifacts."""
from pathlib import Path
import os
import zipfile

root = Path(__file__).resolve().parents[1]
destination = root.parent / 'fullstack-roadmap-production-release.zip'
ignored_dirs = {
    'node_modules', 'vendor', '.astro', '.vercel', 'playwright-report',
    'test-results', '.git', '__pycache__', '.reports', 'dist'
}
ignored_suffixes = ('.log', '.sqlite', '.key', '.pem')

with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for directory, directories, files in os.walk(root):
        directories[:] = sorted(name for name in directories if name not in ignored_dirs)
        for name in sorted(files):
            if (name.startswith('.env') and name != '.env.example') or name.endswith(ignored_suffixes):
                continue
            path = Path(directory) / name
            relative = path.relative_to(root)
            archive.write(path, Path(root.name) / relative)

with zipfile.ZipFile(destination) as archive:
    names = set(archive.namelist())
    prefix = root.name + '/'
    required = [
        'README.md', 'package.json', 'package-lock.json',
        'src/data/lessons.json', 'src/data/source-pages.json', 'src/data/parts.json',
        'src/data/weeks.json', 'src/data/levels.json', 'src/data/portal-levels.json',
        'src/data/explanations.json', 'src/components/LearningGuide.astro', 'src/styles/learning.css',
        'public/sources/Belajar_FullStack_Go_Vue_PostgreSQL_Dari_Fundamental_Color_Syntax.pdf',
        'examples/go-algorithms/main.go', 'examples/go-api/main.go',
        'examples/task-tracker/backend/cmd/api/main.go', 'examples/task-tracker/backend/cmd/api/http.go',
        'examples/task-tracker/backend/cmd/api/tasks.go', 'examples/task-tracker/frontend/src/App.vue',
    ]
    for required_path in required:
        assert prefix + required_path in names, required_path
    markdown = [name for name in names if name.lower().endswith('.md')]
    assert markdown == [prefix + 'README.md'], markdown
    assert not any('/node_modules/' in name or '/dist/' in name or '/.git/' in name for name in names)
    assert archive.testzip() is None

print(f'{destination}: {destination.stat().st_size} bytes; clean source release verified.')
