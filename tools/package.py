import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'manifest.json').read_text())['version']
target = root / 'dist' / f'layrly-{version}.zip'
target.parent.mkdir(exist_ok=True)
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for folder in ('assets', 'core', 'platforms', 'popup', 'options', 'shared'):
        for file in sorted((root / folder).rglob('*')):
            if file.is_file(): archive.write(file, file.relative_to(root))
    for name in ('manifest.json', 'README.md', 'LICENSE', 'PRIVACY.html', 'CONTRIBUTING.md'):
        archive.write(root / name, name)
print(target)
