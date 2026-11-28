"""Build a local PLUS preview from the checked workspace; no deployment."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import json
import re
import shutil
import subprocess
import tempfile
import zipfile
from portable_preview import build_portable

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
SCOPE = ROOT / 'docs' / 'PREVIEW_SCOPE.md'


def main():
    version = re.search(r"const VERSION = '([^']+)'", (WEB / 'model.js').read_text()).group(1)
    if not re.fullmatch(r'[0-9A-Za-z.-]+', version):
        raise SystemExit('Invalid preview version')
    scope_file = ROOT / 'docs' / ('DEMO_SCOPE.md' if '-demo.' in version else 'PREVIEW_SCOPE.md')
    tests = sorted(str(p.relative_to(ROOT)) for p in (ROOT / 'test').glob('*.test.js'))
    check = subprocess.run(['node', '--test', '--test-reporter=tap', *tests],
                           cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    reports = ROOT / 'releases' / 'qa'
    reports.mkdir(parents=True, exist_ok=True)
    (reports / f'{version}-tests.tap').write_text(check.stdout)
    total = re.search(r'^# tests (\d+)$', check.stdout, re.M)
    passed = re.search(r'^# pass (\d+)$', check.stdout, re.M)
    failed = re.search(r'^# fail (\d+)$', check.stdout, re.M)
    skipped = re.search(r'^# skipped (\d+)$', check.stdout, re.M)
    if check.returncode or not all([total, passed, failed, skipped]) or int(failed[1]) or int(skipped[1]) or total[1] != passed[1]:
        raise SystemExit(f'Preview blocked by tests; see {reports / (version + "-tests.tap")}')
    files = sorted(p for p in WEB.rglob('*') if p.is_file())
    content = {p.relative_to(WEB).as_posix(): p.read_bytes() for p in files}
    content['offline-shell.json'] = (json.dumps({'html': (WEB / 'index.html').read_text()}, ensure_ascii=False) + '\n').encode()
    assets = {name: sha256(data).hexdigest() for name, data in content.items()}
    scope_digest = sha256(scope_file.read_bytes()).hexdigest()
    snapshot = sha256(json.dumps({'assets':assets,'scope':scope_digest}, sort_keys=True).encode()).hexdigest()
    commit = None
    if (ROOT / '.git').exists():
        git = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True, capture_output=True)
        if git.returncode == 0:
            commit = git.stdout.strip()
    manifest = {
        'schemaVersion': 1, 'model': 'fx-880BTG PLUS', 'version': version,
        'channel': 'internal-demo' if '-demo.' in version else 'internal-preview', 'builtAt': datetime.now(timezone.utc).isoformat(),
        'source': {'kind': 'workspace-snapshot', 'sha256': snapshot, 'commit': commit},
        'verification': {'command': 'node --test --test-reporter=tap test/*.test.js',
                         'tests': int(total[1]), 'passed': int(passed[1]), 'failed': 0, 'skipped': 0},
        'assets': assets,
        'offlineShell': 'offline-shell.json',
        'scope': 'PHAM-VI-BAN-THU.md',
        'scopeSha256': scope_digest,
    }
    name = f'fx-880btg-plus-{version}-{snapshot[:8]}'
    archive = ROOT / 'releases' / (name + '.zip')
    if archive.exists():
        raise SystemExit(f'Identical web snapshot already packaged: {archive}')
    with tempfile.TemporaryDirectory(prefix='880-preview-') as work:
        package = Path(work) / name
        shutil.copytree(WEB, package / 'web')
        (package / 'web' / 'offline-shell.json').write_bytes(content['offline-shell.json'])
        shutil.copy2(ROOT / 'serve.js', package / 'serve.js')
        shutil.copy2(scope_file, package / 'PHAM-VI-BAN-THU.md')
        shutil.copy2(scope_file, package / 'web' / 'PHAM-VI-BAN-THU.md')
        portable = build_portable(WEB, package / 'MO-DEMO.html')
        shutil.copy2(ROOT / 'docs' / 'DEMO_GUIDE.txt', package / 'HUONG-DAN-DEMO.txt')
        manifest['deliverables'] = {
            filename: sha256((package / filename).read_bytes()).hexdigest()
            for filename in ['MO-DEMO.html', 'HUONG-DAN-DEMO.txt']
        }
        (package / 'web' / 'release.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        (package / 'README.txt').write_text(
            f'fx-880BTG PLUS — {version}\n\n'
            'DEMO NHANH: Giải nén toàn bộ gói rồi mở MO-DEMO.html bằng Chrome hoặc Edge.\n'
            'Tệp này có sẵn hình ảnh, font và bộ tính; không cần cài đặt hoặc kết nối mạng.\n'
            'Bài mẫu và phím tắt: HUONG-DAN-DEMO.txt\n\n'
            'CHẠY QUA MÁY CHỦ CỤC BỘ (tùy chọn): Cần Node.js 18 trở lên.\n'
            'Mở Terminal trong thư mục rồi chạy: node serve.js\n'
            'Mở http://127.0.0.1:8870/ trong trình duyệt. Ctrl+C để tắt máy chủ.\n'
            'Nếu cổng đang dùng: BITEX_880_PORT=8871 node serve.js (macOS/Linux).\n'
            'Tệp web để đưa lên hosting tĩnh nằm trong web/.\n'
            'Phạm vi và ca còn chờ: PHAM-VI-BAN-THU.md\n'
            'Phiên bản và SHA-256 từng tài nguyên: web/release.json\n'
        )
        with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for p in sorted(package.rglob('*')):
                if p.is_file():
                    z.write(p, p.relative_to(package.parent))
        with zipfile.ZipFile(archive) as z:
            if z.testzip():
                raise SystemExit('ZIP integrity check failed')
            packed = json.loads(z.read(name + '/web/release.json'))
            if sha256(z.read(name + '/web/' + packed['scope'])).hexdigest() != packed['scopeSha256']:
                raise SystemExit('Packaged scope document mismatch')
            for relative, expected in packed['assets'].items():
                if sha256(z.read(name + '/web/' + relative)).hexdigest() != expected:
                    raise SystemExit('Packaged asset mismatch: ' + relative)
            for relative, expected in packed['deliverables'].items():
                if sha256(z.read(name + '/' + relative)).hexdigest() != expected:
                    raise SystemExit('Packaged demo mismatch: ' + relative)
    digest = sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix('.zip.sha256').write_text(digest + '  ' + archive.name + '\n')
    print(json.dumps({'archive': str(archive), 'sha256': digest, 'version': version,
                      'tests': int(total[1]), 'webFiles': len(assets)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
