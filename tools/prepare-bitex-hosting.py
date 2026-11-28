"""Derive a separate Apache/BITEX deployment from a frozen PLUS release.

Never writes web/, netlify-demo/, or the input ZIP. Only BITEX staging is changed.
"""
from pathlib import Path
from hashlib import sha256
from datetime import datetime, timezone
import argparse
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def prepare(archive, output):
    origin = 'https://app2026.bitexedu.com'
    app_path = 'fx880btgplus'
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        prefix = archive.stem + '/web/'
        parent = json.loads(z.read(prefix + 'release.json'))
        assert parent['model'] == 'fx-880BTG PLUS'
        expected = set(parent['assets']) | {'release.json', parent['scope']}
        assert {n[len(prefix):] for n in z.namelist() if n.startswith(prefix) and not n.endswith('/')} == expected
        content = {}
        for name in expected:
            assert not name.startswith('/') and '..' not in Path(name).parts
            content[name] = z.read(prefix + name)
        for name, digest in parent['assets'].items():
            assert sha256(content[name]).hexdigest() == digest, name
        assert sha256(content[parent['scope']]).hexdigest() == parent['scopeSha256']
    version = parent['version'] + '-bitex.2'
    model = content['model.js'].decode()
    old_version = "const VERSION = '" + parent['version'] + "';"
    assert model.count(old_version) == 1
    content['model.js'] = model.replace(old_version, "const VERSION = '" + version + "';").encode()
    html = content['index.html'].decode()
    assert html.count('<script defer src="core/engine.js"></script>') == 1
    # Queue initialization is deliberately synchronous and precedes async GTM.
    # An external local file preserves CSP without allowing inline scripts.
    html = html.replace('<script defer src="core/engine.js"></script>',
                        '<script src="bitex-tracking.js"></script>\n  '
                        '<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-N9WXT5SR"></script>\n  '
                        '<script defer src="core/engine.js"></script>')
    assert html.count('<script defer src="app.js"></script>') == 1
    html = html.replace('<script defer src="app.js"></script>',
                        '<script defer src="bitex-hosting.js"></script>\n  <script defer src="app.js"></script>')
    html = html.replace(' data-netlify="true"', '').replace(' netlify-honeypot="bot-field"', '')
    html = html.replace('action="/feedback-success.html"', 'action="./"')
    html, n = re.subn(r'<p class="feedback-privacy">.*?</p>',
        '<p class="feedback-privacy">Gửi góp ý trực tuyến chưa bật trên hosting BITEX. '
        'Bạn có thể tải PNG hoặc JSON trong Nhật ký phím để gửi cho đội kiểm tra.</p>', html)
    assert n == 1
    html = html.replace('<button class="feedback-submit" type="submit">Gửi góp ý cho BITEX</button>',
                        '<button class="feedback-submit" type="submit" disabled>Gửi trực tuyến chưa bật</button>')
    terms_button = ('<button class="utility-button" type="button" data-panel="terms-panel">'
                    '<span aria-hidden="true">ⓘ</span>Điều khoản sử dụng</button>')
    assert html.count('</nav>') == 1 and html.count('</dialog>') == 1
    html = html.replace('</nav>', terms_button + '</nav>')
    html = html.replace('</dialog>', (ROOT / 'hosting/bitex/terms-panel.html').read_text() + '</dialog>')
    guide_end = '<button class="utility-button install-primary" data-panel="install-dialog" type="button">Cài để dùng khi mất mạng</button>'
    assert html.count(guide_end) == 1
    html = html.replace(guide_end,
        '<p>Sản phẩm không kinh doanh, cung cấp miễn phí cho giáo viên và học sinh.</p>'
        '<button class="utility-button" data-panel="terms-panel" type="button">Điều khoản sử dụng và theo dõi truy cập</button>'
        + guide_end)
    html = html.replace('Gửi góp ý và ảnh cần có mạng. Nếu thiết bị đã xóa dữ liệu ứng dụng,',
                        'Gửi góp ý trực tuyến chưa bật trên hosting BITEX. Nếu thiết bị đã xóa dữ liệu ứng dụng,')
    content['index.html'] = html.encode()
    content['offline-shell.json'] = (json.dumps({'html': html}, ensure_ascii=False) + '\n').encode()
    content['bitex-hosting.js'] = (ROOT / 'hosting/bitex/bitex-hosting.js').read_bytes()
    content['bitex-tracking.js'] = (ROOT / 'hosting/bitex/bitex-tracking.js').read_bytes()
    content.pop('_headers', None)
    content.pop('feedback-success.html', None)
    content.pop('release.json', None)
    scope = ('# Bản triển khai song song trên hosting BITEX\n\n'
             f'Phiên bản {version}, kế thừa bộ tính và LCD của {parent["version"]}.\n\n'
             f'Địa chỉ dự kiến: {origin}/{app_path}/. Netlify tiếp tục hoạt động độc lập.\n\n'
             'Gửi góp ý trực tuyến tạm tắt vì chưa có API nhận dữ liệu trên hosting BITEX. '
             'PNG/JSON và Sao chép Word hoạt động trên thiết bị. Các tệp ứng dụng được cache '
             'theo địa chỉ và SHA-256 riêng, không thay bộ nhớ của bản Netlify.\n\n'
             'Sản phẩm phi thương mại, không kinh doanh, cung cấp miễn phí cho giáo viên và học sinh. '
             'Điều khoản có trong Tiện ích → Điều khoản sử dụng, dùng được ngoại tuyến.\n\n'
             'Tích hợp GTM-N9WXT5SR theo yêu cầu chủ dự án. Hàng đợi được khởi tạo trước mã GTM bất đồng bộ; '
             'không đưa phép tính, nhật ký hoặc ảnh vào dataLayer. Các thẻ do IT quản lý; '
             'mã Google không nằm trong bộ cache bắt buộc của giả lập.\n\n'
             'Phạm vi bộ giả lập gốc được giữ dưới đây.\n\n' + content[parent['scope']].decode()).encode()
    content[parent['scope']] = scope
    policy = (ROOT / 'hosting/bitex/apache.htaccess').read_text().replace('@@BITEX_PUBLIC_ORIGIN@@', origin).encode()
    content['.htaccess'] = policy
    assets = {name: sha256(data).hexdigest() for name, data in sorted(content.items())
              if name not in {'.htaccess', parent['scope']}}
    identity = {'assets': assets, 'scope': sha256(scope).hexdigest(), 'apache': sha256(policy).hexdigest()}
    build_hash = sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    manifest = {**parent, 'version': version, 'builtAt': datetime.now(timezone.utc).isoformat(),
                'source': {'kind': 'bitex-hosting-adapter', 'sha256': build_hash, 'commit': None},
                'assets': assets, 'scopeSha256': sha256(scope).hexdigest(),
                'hosting': {'target': 'BITEX Apache', 'url': origin + '/' + app_path + '/',
                            'feedback': 'disabled-pending-bitex-api', 'tracking': {'provider': 'Google Tag Manager', 'containerId': 'GTM-N9WXT5SR'},
                            'terms': 'non-commercial-free-for-teachers-and-students', 'serverPolicySha256': sha256(policy).hexdigest()},
                'parentRelease': {'version': parent['version'], 'sourceSha256': parent['source']['sha256'],
                                  'archiveSha256': sha256(archive.read_bytes()).hexdigest()}}
    manifest.pop('deliverables', None)
    content['release.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    target = output / 'dist'
    if target.exists():
        for file in target.rglob('*'):
            if file.is_file() and file.relative_to(target).as_posix() not in content:
                raise ValueError('Unexpected BITEX output: ' + str(file))
    for name, data in content.items():
        file = target / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)
    output.mkdir(parents=True, exist_ok=True)
    deploy = ROOT / 'releases' / ('fx-880btg-plus-' + version + '-' + build_hash[:8] + '-hosting.zip')
    with zipfile.ZipFile(deploy, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(content.items()):
            info = zipfile.ZipInfo(app_path + '/' + name,
                                   datetime.fromisoformat(manifest['builtAt']).timetuple()[:6])
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, data)
    result = {'version': version, 'parentVersion': parent['version'], 'url': origin + '/' + app_path + '/',
              'archive': str(deploy), 'sha256': sha256(deploy.read_bytes()).hexdigest(),
              'sourceSha256': build_hash, 'files': len(content), 'unpackedBytes': sum(map(len, content.values())),
              'zipBytes': deploy.stat().st_size, 'assets': len(assets), 'parentTests': parent['verification'],
              'feedback': 'disabled-pending-bitex-api', 'trackingContainer': 'GTM-N9WXT5SR',
              'terms': 'non-commercial-free-for-teachers-and-students'}
    (output / 'build.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.archive.resolve(), ROOT / 'bitex-hosting'), ensure_ascii=False))
