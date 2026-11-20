"""Embed the checked web calculator in one file for offline demo recipients."""
import base64
import json
import mimetypes
import re
from pathlib import Path


def build_portable(web: Path, destination: Path):
    assets = {}
    for path in sorted((web / 'assets').rglob('*')):
        if path.is_file() and path.suffix in {'.webp', '.png', '.svg', '.ttf', '.woff', '.woff2'}:
            mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
            assets[path.relative_to(web).as_posix()] = 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()

    html = (web / 'index.html').read_text()
    scripts = re.findall(r'<script defer src="([^"]+)"></script>', html)
    if not scripts or scripts[-1] != 'app.js':
        raise ValueError('Portable demo requires the normal ordered calculator scripts')
    html = re.sub(r'\s*<script defer src="[^"]+"></script>', '', html)
    css = (web / 'device.css').read_text()
    css = re.sub(r'url\((assets/[^)]+)\)', lambda m: 'url("' + assets[m[1]] + '")', css)
    html = html.replace('<link rel="stylesheet" href="device.css">', '<style>\n' + css + '\n</style>')
    html = re.sub(r'(?:src|href)="(assets/[^"]+)"', lambda m: m[0].replace(m[1], assets[m[1]]), html)

    source_blocks = ['const BUNDLED_ASSETS880 = ' + json.dumps(assets, separators=(',', ':')) + ';']
    source_blocks.extend((web / script).read_text() for script in scripts)
    blocks = '\n'.join('<script>\n' + block.replace('</script', '<\\/script') + '\n</script>' for block in source_blocks)
    html = html.replace('</body>', blocks + '\n</body>')
    if re.search(r'<(?:script|link)[^>]+(?:src|href)="(?!data:)', html):
        raise ValueError('Portable demo still requires an external script or stylesheet')
    if html.index('id="keypad"') > html.index('const BUNDLED_ASSETS880'):
        raise ValueError('Portable calculator must initialize after its controls exist')
    destination.write_text(html)
    return {'assetCount': len(assets), 'scriptCount': len(scripts), 'bytes': destination.stat().st_size}
