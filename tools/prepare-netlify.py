"""Stage only the verified public web bundle for a Netlify manual deploy."""
from pathlib import Path
from hashlib import sha256
import json
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
archive = Path(sys.argv[1]).resolve()
target = ROOT / 'netlify-demo' / 'dist'
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    prefix = archive.stem + '/web/'
    names = [n for n in z.namelist() if n.startswith(prefix) and not n.endswith('/')]
    manifest = json.loads(z.read(prefix + 'release.json'))
    assert manifest['model'] == 'fx-880BTG PLUS'
    expected = set(manifest['assets']) | {'release.json', manifest['scope']}
    assert {n[len(prefix):] for n in names} == expected
    for rel, digest in manifest['assets'].items():
        assert sha256(z.read(prefix + rel)).hexdigest() == digest, rel
    assert sha256(z.read(prefix + manifest['scope'])).hexdigest() == manifest['scopeSha256']
    if target.exists():
        for p in target.rglob('*'):
            if p.is_file() and p.relative_to(target).as_posix() not in expected:
                raise ValueError('Unexpected file in deploy output: ' + str(p))
    target.mkdir(parents=True, exist_ok=True)
    for name in names:
        rel = name[len(prefix):]
        assert not rel.startswith('/') and '..' not in Path(rel).parts
        p = target / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(z.read(name))
    deploy = ROOT / 'releases' / ('fx-880btg-plus-' + manifest['version'] + '-netlify.zip')
    with zipfile.ZipFile(deploy, 'w', zipfile.ZIP_DEFLATED) as out:
        for p in sorted(target.rglob('*')):
            if p.is_file(): out.write(p, p.relative_to(target).as_posix())
result = {'version': manifest['version'], 'archive': str(archive), 'sourceSha256': manifest['source']['sha256'],
          'deployZip': str(deploy), 'deploySha256': sha256(deploy.read_bytes()).hexdigest(),
          'files': len(expected), 'tests': manifest['verification']['passed']}
(ROOT / 'netlify-demo' / 'build.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
