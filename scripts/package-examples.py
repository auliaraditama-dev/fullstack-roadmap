from pathlib import Path
import os
import zipfile

root = Path(__file__).resolve().parents[1]
for example in (root / 'examples').iterdir():
    if not example.is_dir():
        continue
    destination = root / 'public' / 'downloads' / (example.name + '.zip')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for directory, directories, files in os.walk(example):
            directories[:] = [d for d in directories if d not in {'vendor', 'node_modules', '.git', 'data'}]
            for name in files:
                path = Path(directory) / name
                relative = path.relative_to(example)
                if name.startswith('.env') and name != '.env.example':
                    continue
                if name.endswith(('.sqlite', '.log', '.key')):
                    continue
                if (relative.parts[0] == 'storage' or relative.as_posix().startswith('bootstrap/cache/')) and name != '.gitignore':
                    continue
                archive.write(path, Path(example.name) / relative)
    with zipfile.ZipFile(destination) as archive:
        assert archive.testzip() is None
        assert not any('/vendor/' in n or n.endswith('/.env') for n in archive.namelist())
    print(example.name, destination.stat().st_size, 'bytes')
