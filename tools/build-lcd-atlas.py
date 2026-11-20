"""Build reusable LCD sprites from visible fx-880BTG PLUS ClassPad pixels."""
from base64 import b64decode, b64encode
from itertools import groupby
from pathlib import Path
from xml.etree import ElementTree
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'test/fixtures/classpad-880-lcd.json'
WIDTH = 192
HEIGHT = 63
SOURCE_FRAMES = json.loads(SOURCE.read_text())
SPECIAL = json.loads((SOURCE.parent / 'classpad-880-special-lcd.json').read_text())
SOURCE_FRAMES.update(SPECIAL['frames'])
ARRAYS = json.loads((SOURCE.parent / 'classpad-880-matrix-vector-lcd.json').read_text())
SOURCE_FRAMES.update(ARRAYS['frames'])
BASE_DISTRIBUTION = json.loads((SOURCE.parent / 'classpad-880-base-distribution-lcd.json').read_text())
SOURCE_FRAMES.update(BASE_DISTRIBUTION['frames'])
EQUATIONS = json.loads((SOURCE.parent / 'classpad-880-equations-lcd.json').read_text())
SOURCE_FRAMES.update(EQUATIONS['frames'])
EQUATION_FOLLOWUP = json.loads((SOURCE.parent / 'classpad-880-equations-followup-lcd.json').read_text())
SOURCE_FRAMES.update(EQUATION_FOLLOWUP['frames'])
SOLVE_CUBIC_MEMORY = json.loads((SOURCE.parent / 'classpad-880-solve-cubic-memory-lcd.json').read_text())
SOURCE_FRAMES.update(SOLVE_CUBIC_MEMORY['frames'])
SHEET = json.loads((SOURCE.parent / 'classpad-880-spreadsheet-lcd.json').read_text())
SOURCE_FRAMES.update(SHEET['frames'])
RATIO = json.loads((SOURCE.parent / 'classpad-880-ratio-night-lcd.json').read_text())
SOURCE_FRAMES.update(RATIO['frames'])
COMPLEX = json.loads((SOURCE.parent / 'classpad-880-complex-night-lcd.json').read_text())
SOURCE_FRAMES.update(COMPLEX['frames'])
VERIFY = json.loads((SOURCE.parent / 'classpad-880-verify-night-lcd.json').read_text())
SOURCE_FRAMES.update(VERIFY['frames'])
CALCULATE = json.loads((SOURCE.parent / 'classpad-880-calculate-night-lcd.json').read_text())
SOURCE_FRAMES.update(CALCULATE['frames'])
STATISTICS = json.loads((SOURCE.parent / 'classpad-880-statistics-night-lcd.json').read_text())
SOURCE_FRAMES.update(STATISTICS['frames'])
TABLE = json.loads((SOURCE.parent / 'classpad-880-table-night-lcd.json').read_text())
SOURCE_FRAMES.update(TABLE['frames'])
MATH_BOX = json.loads((SOURCE.parent / 'classpad-880-math-box-night-lcd.json').read_text())
SOURCE_FRAMES.update(MATH_BOX['frames'])
SHEET_NIGHT = json.loads((SOURCE.parent / 'classpad-880-spreadsheet-night-lcd.json').read_text())
SOURCE_FRAMES.update(SHEET_NIGHT['frames'])
EXPLORER = json.loads((SOURCE.parent / 'classpad-880-math-explorer-night-lcd.json').read_text())
SOURCE_FRAMES.update(EXPLORER['frames'])
MEMORY = json.loads((SOURCE.parent / 'classpad-880-memory-night-lcd.json').read_text())
SOURCE_FRAMES.update(MEMORY['frames'])
ENGLISH = json.loads((SOURCE.parent / 'classpad-880-english-night-lcd.json').read_text())
SOURCE_FRAMES.update(ENGLISH['frames'])
CONSTANTS = json.loads((SOURCE.parent / 'classpad-880-constants-night-lcd.json').read_text())
SOURCE_FRAMES.update(CONSTANTS['frames'])
CONVERSIONS = json.loads((SOURCE.parent / 'classpad-880-conversions-night-lcd.json').read_text())
SOURCE_FRAMES.update(CONVERSIONS['frames'])
ENGLISH_SPECIAL = json.loads((SOURCE.parent / 'classpad-880-english-special-night-lcd.json').read_text())
SOURCE_FRAMES.update(ENGLISH_SPECIAL['frames'])
SHEET_BOUNDS = json.loads((SOURCE.parent / 'classpad-880-sheet-bounds-night-lcd.json').read_text())
SOURCE_FRAMES.update(SHEET_BOUNDS['frames'])
SHEET_EDGES = json.loads((SOURCE.parent / 'classpad-880-sheet-edges-lcd.json').read_text())
SOURCE_FRAMES.update(SHEET_EDGES['frames'])
LINE_EDGES = json.loads((SOURCE.parent / 'classpad-880-line-edges-lcd.json').read_text())
SOURCE_FRAMES.update(LINE_EDGES['frames'])
LINE_SETTINGS = json.loads((SOURCE.parent / 'classpad-880-line-settings-lcd.json').read_text())
SOURCE_FRAMES.update(LINE_SETTINGS['frames'])
RESET_MEMORY = json.loads((SOURCE.parent / 'classpad-880-reset-memory-lcd.json').read_text())
SOURCE_FRAMES.update(RESET_MEMORY['frames'])
CIRCLE_GRAPHICS = json.loads((SOURCE.parent / 'classpad-880-circle-graphics-lcd.json').read_text())
SOURCE_FRAMES.update(CIRCLE_GRAPHICS['frames'])
CALCULUS = json.loads((SOURCE.parent / 'classpad-880-calculus-lcd.json').read_text())
SOURCE_FRAMES.update(CALCULUS['frames'])
FLOW_SETTINGS = json.loads((SOURCE.parent / 'classpad-880-flow-settings-lcd.json').read_text())
SOURCE_FRAMES.update(FLOW_SETTINGS['frames'])
FLOW_APPS = json.loads((SOURCE.parent / 'classpad-880-flow-apps-lcd.json').read_text())
SOURCE_FRAMES.update(FLOW_APPS['frames'])
ARRAY_EDGES = json.loads((SOURCE.parent / 'classpad-880-array-operation-edges-lcd.json').read_text())
SOURCE_FRAMES.update(ARRAY_EDGES['frames'])
FUNCTION_CALCULUS = json.loads((SOURCE.parent / 'classpad-880-function-calculus-lcd.json').read_text())
SOURCE_FRAMES.update(FUNCTION_CALCULUS['frames'])
STATISTICS_BOUNDARIES = json.loads((SOURCE.parent / 'classpad-880-statistics-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(STATISTICS_BOUNDARIES['frames'])
SHEET_TRANSFER_ERRORS = json.loads((SOURCE.parent / 'classpad-880-sheet-transfer-errors-lcd.json').read_text())
SOURCE_FRAMES.update(SHEET_TRANSFER_ERRORS['frames'])
CIRCLE_FLOW = json.loads((SOURCE.parent / 'classpad-880-circle-flow-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(CIRCLE_FLOW['frames'])
EQUATION_SCALE = json.loads((SOURCE.parent / 'classpad-880-equation-scale-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(EQUATION_SCALE['frames'])
RATIO_SCALE = json.loads((SOURCE.parent / 'classpad-880-ratio-scale-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(RATIO_SCALE['frames'])
EXPRESSION_LIMITS = json.loads((SOURCE.parent / 'classpad-880-expression-limits-lcd.json').read_text())
SOURCE_FRAMES.update(EXPRESSION_LIMITS['frames'])
CALCULUS_TOLERANCE = json.loads((SOURCE.parent / 'classpad-880-calculus-tolerance-lcd.json').read_text())
SOURCE_FRAMES.update(CALCULUS_TOLERANCE['frames'])
DISCRETE_CALCULUS = json.loads((SOURCE.parent / 'classpad-880-discrete-calculus-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(DISCRETE_CALCULUS['frames'])
HYPERBOLIC_TRIG = json.loads((SOURCE.parent / 'classpad-880-hyperbolic-trig-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(HYPERBOLIC_TRIG['frames'])
DMS_PERCENT = json.loads((SOURCE.parent/'classpad-880-dms-percent-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(DMS_PERCENT['frames'])
PRECEDENCE = json.loads((SOURCE.parent/'classpad-880-precedence-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(PRECEDENCE['frames'])
VARIABLE_CALC = json.loads((SOURCE.parent/'classpad-880-variable-calc-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(VARIABLE_CALC['frames'])
SPECIALIZED_POWER = json.loads((SOURCE.parent/'classpad-880-specialized-power-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(SPECIALIZED_POWER['frames'])
SHARED_EVALUATION = json.loads((SOURCE.parent/'classpad-880-shared-evaluation-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(SHARED_EVALUATION['frames'])
STATISTICS_POWER = json.loads((SOURCE.parent/'classpad-880-statistics-power-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(STATISTICS_POWER['frames'])
EXPLORER_BOX_POWER = json.loads((SOURCE.parent/'classpad-880-explorer-box-power-boundaries-lcd.json').read_text())
SOURCE_FRAMES.update(EXPLORER_BOX_POWER['frames'])
EXTERNAL_MATH = json.loads((SOURCE.parent/'classpad-880-external-math-input-lcd.json').read_text())
SOURCE_FRAMES.update(EXTERNAL_MATH['frames'])
GROUPED_FRACTION = json.loads((SOURCE.parent/'classpad-880-grouped-fraction-input-lcd.json').read_text())
SOURCE_FRAMES.update(GROUPED_FRACTION['frames'])
GROUPED_SCIENCE = json.loads((SOURCE.parent/'classpad-880-grouped-science-input-lcd.json').read_text())
SOURCE_FRAMES.update(GROUPED_SCIENCE['frames'])
STAT_SCIENCE = json.loads((SOURCE.parent/'classpad-880-stat-science-format-lcd.json').read_text())
SOURCE_FRAMES.update(STAT_SCIENCE['frames'])
COMPLEX_FORMAT = json.loads((SOURCE.parent/'classpad-880-complex-format-combinations-lcd.json').read_text())
SOURCE_FRAMES.update(COMPLEX_FORMAT['frames'])
MATH_SCRIPT = json.loads((SOURCE.parent/'classpad-880-math-script-glyphs-lcd.json').read_text())
SOURCE_FRAMES.update(MATH_SCRIPT['frames'])
MATH_TALL = json.loads((SOURCE.parent/'classpad-880-math-tall-functions-lcd.json').read_text())
SOURCE_FRAMES.update(MATH_TALL['frames'])


def frame(name):
    decoded = [run >> 6 for run in b64decode(SOURCE_FRAMES[name]) for _ in range(run & 63)]
    assert len(decoded) == WIDTH * HEIGHT, name
    return decoded


def encode(pixels, width, height):
    runs = []
    for tone, group in groupby(pixels):
        count = sum(1 for _ in group)
        while count:
            length = min(63, count)
            runs.append(tone * 64 + length)
            count -= length
    return [width, height, b64encode(bytes(runs)).decode('ascii')]


def crop(name, x, y, w, h, transform=lambda pixel: pixel):
    pixels = frame(name)
    return encode((transform(pixels[WIDTH * row + col])
                   for row in range(y, y + h) for col in range(x, x + w)), w, h)


def build_math():
    normal = {}
    groups = [
        ('digits', '0123456789', 0),
        ('ops', '(1+2)×3÷4−5.6', 0),
        ('functions', 'Ans+cos()+tan()', 0),
        ('symbols', 'sin(x)+π+e', 0),
        ('dms', '1°2′3″', 0),
        ('misc-punctuation', '5!2%1,212', 0),
        ('logResult', 'log', 0),
        ('vars', 'ABCDEFxyz', 33),
    ]
    for name, phrase, left in groups:
        for i, char in enumerate(phrase):
            normal.setdefault(char, crop(name, left + 11 * i, 0, 11, 12))
    normal['^'] = crop('line-edge-maximum-bound',66,17,11,12)
    normal['b'] = crop('calculus-tolerance-derivative-cusp-input',66,0,11,12)
    normal['h'] = crop('hyperbolic-trig-sinh-thirty-input',33,0,11,12)
    normal['?'] = crop('sheet-edge-copy-boundary-formula',148,49,11,12)
    normal['g'] = crop('logResult', 22, 0, 11, 13)
    # The e in the PreAns token uses the upright variable glyph.
    normal['preAnsE'] = crop('reset-vi-all-cleared-preans',22,0,11,12)
    normal['c'] = crop('stat-two-calc-coefficient', 0, 0, 11, 12)
    normal['ŷ'] = crop('stat-two-quadratic-prediction', 11, 0, 11, 13)
    normal[','] = crop('misc-punctuation', 55, 0, 11, 13)
    normal['𝑖'] = crop('imaginary', 0, 0, 11, 12)
    normal['U'] = crop('array-unitv-34-input', 0, 0, 11, 12)
    normal['='] = crop('rare-verify-equal', 11, 0, 11, 12)
    normal['∠'] = crop('rare-polar', 11, 0, 11, 12)
    for char, encoded in SPECIAL['mathGlyphs'].items():
        assert sum(byte & 63 for byte in b64decode(encoded)) == 11 * 12, char
        normal[char] = [11, 12, encoded]
    for name, label, left in [('matrix-operand', 'MatA', 0), ('vector-operand', 'VctA', 0),
                              ('matrix-determinant-input', 'Det', 0),
                              ('matrix-transpose-input', 'Trn', 0)]:
        for i, char in enumerate(label):
            normal.setdefault(char, crop(name, left + i * 11, 0, 11, 12))
    normal['•'] = crop('vector-dot-input', 44, 0, 11, 12)
    normal['-'] = normal['−']
    normal['–'] = normal['−']
    normal['~'] = crop('minus', 0, 0, 11, 12)
    normal['┘'] = crop('lineResult', 11, 0, 11, 12)
    normal['√'] = crop('lineResult', 44, 0, 11, 12)
    normal['$'] = crop('sheet-absolute', 126, 49, 11, 12)
    for i, char in [(1, 'S'), (2, 'u'), (3, 'm'), (7, ':')]:
        normal[char] = crop('sheet-range-formula', 71 + i * 11, 49, 11, 12)
    normal['j'] = crop('complex-conjugate', 33, 0, 11, 14)
    normal['R'] = crop('complex-real-part', 0, 0, 11, 12)
    normal['P'] = crop('complex-real-part', 22, 0, 11, 12)
    normal['I'] = crop('complex-imag-part', 0, 0, 11, 12)
    normal['f'] = crop('calc-call-f', 0, 0, 11, 12)
    for sample, text in [('catalog-gcd','GCD'),('catalog-lcm','LCM'),('catalog-round','Rnd'),
                         ('catalog-rect-polar','Pol'),('catalog-polar-rect','Rec')]:
        for index, char in enumerate(text):
            normal.setdefault(char,crop(sample,index*11,0,11,12))
    normal['ʳ'] = crop('catalog-radians',99,0,11,12)
    normal['ᵍ'] = crop('catalog-gradians',77,0,11,12)
    normal['θ'] = crop('catalog-rect-polar',49,49,11,12)
    normal['y'] = crop('vars',110,0,11,13)
    normal['Q'] = crop('en-statistics-norm-q-result',0,0,11,13)
    normal['►'] = crop('en-statistics-norm-t-input',11,0,11,12)
    normal[' '] = encode([0] * 132, 11, 12)
    normal['d'] = crop('calculus-line-derivative-body',0,0,11,12)
    normal['/'] = crop('calculus-line-derivative-body',11,0,11,12)
    normal['²'] = crop('calculus-line-derivative-body',66,0,11,12)
    for char, source in [('∫','integral'),('Σ','sum'),('Π','product')]:
        normal[char] = crop('calculus-line-'+source+'-empty',0,0,11,13)
    # ClassPad dims the subscript while the argument is being edited.
    script = {str(i): crop('subDigits', 33 + 6 * i, 7, 6, 9, lambda p: 1 if p else 0)
              for i in range(10)}
    script['π'] = crop('calculus-derivative-sine-point',132,19,6,9)
    script['÷'] = crop('calculus-derivative-sine-point',138,19,6,9)
    script['x'] = crop('function-calculus-integral-definition',66,2,6,9,lambda p:int(p != 0))
    script['.'] = crop('discrete-calculus-math-sum-fraction-lower-input',18,24,6,9,lambda p:int(p != 0))
    return normal, script


def build_catalog_grid(source, prefix):
    labels = {}
    inputs = {}
    hints = {}
    plus = frame('ops')
    zero = frame('digits')
    suffix = [plus[y*WIDTH+22:y*WIDTH+33]+zero[y*WIDTH:y*WIDTH+11] for y in range(12)]
    start = 11 if prefix == 'conversion' else 0
    for group in source['groups']:
        ids = group['ids']
        for index, id in enumerate(ids):
            suffix_name = str(index+1) if start else id.lower()
            sample = prefix+'-value-'+group['name']+'-'+suffix_name
            pixels = frame(sample)
            widths = [x for x in range(start+11,170) if all(
                pixels[y*WIDTH+x:y*WIDTH+x+22] == suffix[y] for y in range(12))]
            assert len(widths) == 1, sample
            width = widths[0]
            height = 13 if any(pixels[12*WIDTH+start:12*WIDTH+width]) else 12
            inputs[id] = crop(sample,start,0,width-start,height)
        for ending in ('menu','last'):
            offset = max(0,((len(ids)+1)//2)*2-10) if ending == 'last' else 0
            selected = offset if offset else len(ids)-1 if ending == 'last' else 0
            sample = prefix+'-'+group['name']+'-'+ending
            for index in range(offset,min(offset+10,len(ids))):
                slot = index-offset
                x,y = slot%2*96,slot//2*12+2
                active = index == selected
                mask = (lambda p:int(p == 0)) if active else (lambda p:int(p != 0))
                labels.setdefault(ids[index],crop(sample,x+11,y,80,11,mask))
                variants = hints.setdefault(str(index),[None,None])
                variants[int(active)] = crop(sample,x,y,11,11)
    return {'labels':labels,'input':inputs,'hints':hints}


def build_home(language):
    home = []
    prefix = 'home-focus-' if language == 'vi' else 'home-en-focus-'
    normal_refs = {0: 1, 6: 7, 9: 12}
    first_refs = {0: 0, 6: 6, 9: 12}
    for i in range(14):
        offset = 0 if i < 6 else 6 if i < 12 else 9
        index = i - offset
        x, y = index % 3 * 64, index // 3 * 32
        home.append([
            crop(prefix + str(i), x, y, 60, 31),
            crop(prefix + str(normal_refs[offset]) if i not in (1, 7, 12) else
                 ('home-vi-' + str(offset) if offset == 9 and language == 'vi'
                  else prefix + str(13 if offset == 9 else first_refs[offset])), x, y, 60, 31),
        ])
    return home


def build_menu():
    aliases = {}
    hints = {}
    # name, first visible option number (0 means 10), highlighted local row,
    # per-row label and whether the option has a radio icon.
    menus = [
        ('settings', 1, 0, ['Cài đặt phép tính', 'Cài đặt Hệ thống', 'Cài đặt lại', 'Bắt đầu']),
        ('calcsettings-0', 1, 0, ['Nhập/Xuất', 'Đơn vị góc', 'Định dạng số', 'Ký hiệu kthuật']),
        ('calcsettings-4', 5, 0, ['Kết quả phân số', 'BẬT kquả số phức', 'Dấu thập phân', 'Dấu cách 3 chsố']),
        ('calcsettings-6', 7, 0, ['Dấu thập phân', 'Dấu cách 3 chsố', 'Phím ×10ˣ', 'Phím FORMAT']),
        ('systemsettings-0', 1, 0, ['Sáng/tối Mhình', 'Tự động tắt', 'Ngôn ngữ', 'H.thị số t.chọn']),
        ('systemsettings-1', 2, 0, ['Tự động tắt', 'Ngôn ngữ', 'H.thị số t.chọn', 'QR Code']),
        ('catalog-0', 1, 0, ['Phân tích Hàm', 'Xác suất', 'Phép tính Số', 'Góc/Tđộ/Hệ lục thập']),
        ('catalog-4', 5, 0, ['Hyperbol/Lgiác', 'Ký hiệu Kỹ thuật', 'Hằng số Khoa học', 'Chuyển đổi Đơn vị']),
        ('catalog-last', 6, 0, ['Ký hiệu Kỹ thuật', 'Hằng số Khoa học', 'Chuyển đổi Đơn vị', 'Khác']),
        ('tools', 1, 0, ['CALC', 'Hoàn tác', 'Kiểm chứng Bật']),
        ('settings-io', 1, 0, [('Stn vào/ra', True), ('Stn vào/Stp ra', True), ('Dòng vào/ra', True), ('Dòng vào/Stp ra', True)]),
        ('settings-angle', 1, 0, [('Độ', True), ('Radian', True), ('Grad', True)]),
        ('format-0', 1, 0, ['ₐᵦπ√ (Chuẩn)', 'Thập phân', 'Hthi số kthuật', 'Hệ lục thập phân']),
        ('format-frac', 1, 0, ['ₐᵦπ√ (Chuẩn)', 'Thập phân', 'Phân số Kothựcsự', 'Hỗn số']),
        ('dms-percent-format-choices', 1, 0, ['ₐᵦπ√ (Chuẩn)', 'Thập phân', 'Số thập tuần hoàn', 'Phân số Kothựcsự']),
        ('format-frac-last', 3, 0, ['Phân số Kothựcsự', 'Hỗn số', 'Hthi số kthuật', 'Hệ lục thập phân']),
        ('eq-poly2-complex-format', 1, 0, ['ₐᵦπ√ (Chuẩn)', 'Thập phân', 'Tọa độ Đề–cac', 'Tọa độ Cực']),
        ('format-int-last', 2, 0, ['Thập phân', 'Thừa số Nguyên tố', 'Hthi số kthuật', 'Hệ lục thập phân']),
    ]
    branch_frames = {n for n, *_ in menus[:9]}
    menus += [
        ('special-stats-menu', 1, 0, ['Tính tkê 1-biến', 'Tính tkê 2-biến']),
        ('special-stats-tools', 1, 0, ['Chỉnh sửa', 'Tần số bật', 'Sắp xếp']),
        ('special-stats-results-menu', 1, 0, ['Kết quả 1-biến', 'Tính toán tkê']),
        ('special-distribution-menu', 1, 0, ['Xsuất nhị thức', 'Pp tlũy nhịthức', 'Mđộ xsuất chuẩn', 'Pp tlũy chuẩn']),
        ('special-distribution-menu-last', 4, 0, ['Pp tlũy chuẩn', 'Ngược pptlchuẩn', 'Xsuất Poisson', 'Pp tlũy Poisson']),
        ('special-distribution-normal', 1, 0, ['Danh sách', 'Biến']),
        ('special-equation-menu', 1, 0, ['Hệ phương trình', 'Phương trình', 'Bộ giải pt']),
        ('special-equation-linear-menu', 1, 0, ['2 Ẩn số', '3 Ẩn số', '4 Ẩn số']),
        ('special-equation-polynomial-menu', 1, 0, ['ax²+bx+c=0', 'ax³+bx²+cx+d=0', 'ax⁴+bx³+cx²…+e=0']),
        ('special-inequality-menu', 1, 0, ['ax²+bx+c', 'ax³+bx²+cx+d', 'ax⁴+bx³+cx²+dx+e']),
        ('special-inequality-relation', 1, 0, ['ax²+bx+c>0', 'ax²+bx+c<0', 'ax²+bx+c≥0', 'ax²+bx+c≤0']),
        ('special-ratio-menu', 1, 0, ['A:B=X:D', 'A:B=C:X']),
        ('special-matrix-tools', 1, 0, ['MatA:Không có', 'MatB:Không có', 'MatC:Không có', 'MatD:Không có']),
        ('vector-tools', 1, 0, ['VctA:Không có', 'VctB:Không có', 'VctC:Không có', 'VctD:Không có']),
        ('matrix-defined-action', 1, 0, ['Chỉnh sửa', 'Tạo mới Ma trận']),
        ('matrix-row-menu', 1, 0, [f'{n} Dòng' for n in range(1, 5)]),
        ('matrix-column-menu', 1, 0, [f'{n} Cột' for n in range(1, 5)]),
        ('vector-dimension-menu', 1, 0, ['2 chiều', '3 chiều']),
        ('matrix-catalog', 1, 0, ['Tính toán Matr…', 'MatA', 'MatB', 'MatC']),
        ('vector-catalog', 1, 0, ['Phép tính Vectơ', 'VctA', 'VctB', 'VctC']),
        ('matrix-operations', 1, 0, ['Bìnhphương Matr…', 'Lập phương Matr…', 'Matrận Nghịch đ…', 'Định thức']),
        ('matrix-transpose-menu', 3, 0, ['Matrận Nghịch đ…','Định thức','Mtrận chuyển vị','Ma trận đơn vị']),
        ('vector-operations', 1, 0, ['Tích vô hướng','Tích có hướng','Góc giữa 2vectơ','Vectơ đơn vị']),
        ('matrix-result-tools', 1, 0, ['Lưu trữ', 'Xác định Matrận']),
        ('vector-result-tools', 1, 0, ['Lưu trữ', 'Xác định Vectơ']),
        ('base-catalog', 1, 0, ['Phép toán Logic','Tiền tố Hđếm c…','Gtrị Thậplụcph…']),
        ('base-prefix-menu', 1, 0, ['Thập phân(d)','Thập lục phân(h)','Nhị phân(b)','Bát phân(o)']),
        ('dist-list-tools-edit', 1, 0, ['Chèn dòng','Xóa tất cả']),
        ('sheet-tools-first', 1, 0, ['Điền công thức', 'Điền giá trị', 'Sửa ô', 'Bộ nhớ Khả dụng']),
        ('sheet-tools-middle', 5, 0, ['Cắt & dán', 'Sao chép và dán', 'Xóa tất cả', 'Tính lại']),
        ('sheet-tools-last', 7, 0, ['Xóa tất cả', 'Tính lại', 'Tự động tính', 'Hiện ô']),
        ('sheet-show-menu', 1, 0, [('Công thức', True), ('Giá trị', True)]),
        ('sheet-catalog', 1, 0, ['Lấy', '=', '$', ':']),
        ('sheet-catalog-last', 5, 0, ['Nhỏ nhất', 'Lớn nhất', 'Trung bình', 'Tổng cộng']),
        ('stat-two-output-menu', 1, 0, ['Kết quả 2-biến', 'Kết quả Hồi quy', 'Tính toán tkê']),
        ('stat-two-regression-menu', 1, 0, ['y=a+bx', 'y=a+bx+cx²', 'y=a+b·ln(x)', 'y=a·e^(bx)']),
        ('stat-two-regression-menu-last', 4, 0, ['y=a·e^(bx)', 'y=a·b^x', 'y=a·x^b', 'y=a+b/x']),
        ('stat-two-edit', 1, 0, ['Chèn dòng', 'Xóa tất cả']),
        ('stat-two-sort', 1, 0, ['x Tăng dần', 'x Giảm dần', 'y Tăng dần', 'y Giảm dần']),
        ('stat-two-calc-catalog', 1, 0, ['Thống kê']),
        ('stat-two-calc-catalog-statistics', 1, 0, ['Phép tính tổng', 'Tbình/Psai/Đlệc…', 'Nhỏnhất/Lớnnhất', 'Hồi quy']),
        ('stat-two-calc-tools', 1, 0, ['Kết quả 2-biến', 'Kết quả Hồi quy', 'Chọn Loại Hồiq…']),
        ('table-tools-first', 1, 0, ['Phạm vi bảng', 'Xđịnh f(x)/g(x)', 'Loại Bảng', 'Chỉnh sửa']),
        ('table-tools-last', 3, 0, ['Loại Bảng','Chỉnh sửa','Tính lại','Kiểm chứng Bật']),
        ('table-verify-tools-last', 2, 0, ['Xđịnh f(x)/g(x)','Loại Bảng','Chỉnh sửa','Kiểm chứng Tắt']),
        ('table-type-choices', 1, 0, [('f(x)/g(x)', True), ('f(x)', True), ('g(x)', True)]),
        ('box-app-menu', 1, 0, ['Tung Xúc xắc', 'Tung Đồng xu', 'Đường thẳng Số', 'Đường tròn']),
        ('box-line-relation', 1, 0, ['x<a', 'x≤a', 'x=a', 'x>a']),
        ('box-line-relation-next', 5, 0, ['x≥a', 'a<x<b', 'a≤x<b', 'a<x≤b']),
        ('box-line-relation-last', 6, 0, ['a<x<b', 'a≤x<b', 'a<x≤b', 'a≤x≤b']),
        ('box-line-tools', 1, 0, ['Xem-Cửa sổ','Xem-Đặt lại']),
        ('box-circle-types', 1, 0, [('Đtròn Đơnvị', True), ('Nửa Đtròn', True), ('Đồng hồ', True)]),
        ('explorer-app-menu', 1, 0, ['Xác suất', 'DL ghép nhóm', 'Hình học']),
        ('explorer-geometry-menu', 1, 0, ['Tam giác', 'Công thức Heron', 'Khoảng cách', 'P.trình m.phẳng']),
        ('explorer-geometry-last', 3, 0, ['Khoảng cách', 'P.trình m.phẳng', 'Tam giác đều', 'Hình quạt']),
        ('explorer-triangle-types', 1, 0, ['Cạnh BC', 'Ch.cao AH', 'Góc B(AB,AH)', 'Góc (AB,BC,AC)']),
        ('explorer-triangle-types-last', 3, 0, ['Góc B(AB,AH)', 'Góc (AB,BC,AC)', 'Dtích(AB,AC,∠A)', 'Dtích(AB,∠A,∠B)']),
        ('explorer-equilateral-form', 1, 0, ['Ch.cao AH', 'Chu vi', 'Dtích']),
        ('explorer-sector-menu', 1, 0, ['Dây cung', 'Cung', 'Dtích']),
        ('explorer-distance-menu', 1, 0, ['Từ điểm đến điểm', 'Điểm đến đ.thẳng']),
        ('explorer-distance-first-point', 1, 0, ['Điểm A', 'Điểm B', 'Điểm C']),
        ('explorer-distance-line-select', 1, 0, ['Đường thẳng A', 'Đường thẳng B']),
        ('explorer-probability-menu', 1, 0, ['Nhân b.cố đ. lập','X.suất toàn phần','Công thức Bayes']),
        ('explorer-grouped-stats', 1, 0, ['Trung bình','Phương sai','Độ lệch chuẩn','Q₁']),
        ('explorer-grouped-stats-last', 5, 0, ['Trung vị','Q₃','Khoảng tứ p.vị','Mốt']),
        ('box-dice-count-menu', 1, 0, ['1 Xúc xắc','2 Xúc xắc','3 Xúc xắc']),
        ('box-coin-count-menu', 1, 0, ['1 Đồng xu','2 Đồng xu','3 Đồng xu']),
        ('box-dice-repeat-menu', 1, 0, ['Tắt','#1','#2','#3']),
        ('box-dice-view-menu', 1, 0, ['Danh sách','Tần số Tương đối']),
        ('memory-variable-actions', 1, 0, ['Lưu trữ','Nhớ lại','Chỉnh sửa']),
        ('function-exact-menu', 1, 0, ['f(x)','g(x)','Define f(x)','Define g(x)']),
        ('en-explorer-app-menu', 1, 0, ['Probability','Grouped Data','Geometry']),
        ('en-explorer-probability-menu', 1, 0, ['Mult. Indep Evts','Total Prob.','Bayes Formula']),
        ('en-grouped-stats', 1, 0, ['Mean','Variance','Std. Deviation','Q₁']),
        ('en-grouped-stats-last', 5, 0, ['Median','Q₃','IQR','Mode']),
        ('en-geometry-menu', 1, 0, ['Triangle','Heron’s Formula','Distance','Plane Equation']),
        ('en-geometry-last', 3, 0, ['Distance','Plane Equation','Equi. Triangle','Sector']),
        ('en-triangle-types', 1, 0, ['Side BC','Height AH','Angle B(AB,AH)','Angles(AB,BC,AC)']),
        ('en-triangle-types-last', 3, 0, ['Angle B(AB,AH)','Angles(AB,BC,AC)','Area(AB,AC,∠A)','Area(AB,∠A,∠B)']),
        ('en-equilateral-menu', 1, 0, ['Height AH','Perimeter','Area']),
        ('en-sector-menu', 1, 0, ['Chord','Arc','Area']),
        ('en-distance-menu', 1, 0, ['Point to Point','Point to Line']),
        ('en-point-memory-menu', 1, 0, ['Point A','Point B','Point C']),
        ('en-line-memory-menu', 1, 0, ['Line A','Line B']),
        ('en-variable-actions', 1, 0, ['Store','Recall','Edit']),
        ('en-box-menu', 1, 0, ['Dice Roll','Coin Toss','Number Line','Circle']),
        ('en-dice-count-menu', 1, 0, ['1 Die','2 Dice','3 Dice']),
        ('en-coin-count-menu', 1, 0, ['1 Coin','2 Coins','3 Coins']),
        ('en-dice-repeat-menu', 1, 0, ['Off','#1','#2','#3']),
        ('en-dice-view-menu', 1, 0, ['List','Relative Freq']),
        ('en-line-tools', 1, 0, ['View-Window','View-Reset']),
        ('en-circle-types', 1, 0, [('Unit Circle',True),('Half Circle',True),('Clock',True)]),
        ('en-sheet-tools-first', 1, 0, ['Fill Formula','Fill Value','Edit Cell','Available Memory']),
        ('en-sheet-tools-middle', 5, 0, ['Cut & Paste','Copy & Paste','Delete All','Recalculate']),
        ('en-sheet-tools-last', 7, 3, ['Delete All','Recalculate','Auto Calc','Show Cell']),
        ('en-sheet-auto-menu', 1, 0, [('On',True),('Off',True)]),
        ('en-sheet-show-menu', 1, 0, [('Formula',True),('Value',True)]),
        ('en-variable-edit-catalog', 1, 0, ['Func Analysis','Probability','Numeric Calc','Angle/Coord/Sexa']),
        ('en-variable-edit-catalog-last', 5, 0, ['Hyperbolic/Trig','Engineer Symbol','Sci Constants','Unit Conversions']),
        ('en-variable-edit-catalog-end', 6, 0, ['Engineer Symbol','Sci Constants','Unit Conversions','Other']),
        ('en-matrix-tools', 1, 0, [f'Mat{letter}:None' for letter in 'ABCD']),
        ('en-vector-tools', 1, 0, [f'Vct{letter}:None' for letter in 'ABCD']),
        ('en-matrix-rows', 1, 0, ['1 Row','2 Rows','3 Rows','4 Rows']),
        ('en-matrix-columns', 1, 0, ['1 Column','2 Columns','3 Columns','4 Columns']),
        ('en-vector-dimensions', 1, 0, ['2 Dimensions','3 Dimensions']),
        ('en-matrix-defined', 1, 0, ['Edit','Define New']),
        ('en-matrix-catalog', 1, 0, ['Matrix Calc','MatA','MatB','MatC']),
        ('en-vector-catalog', 1, 0, ['Vector Calc','VctA','VctB','VctC']),
        ('en-matrix-operations', 1, 0, ['Matrix Squared','Matrix Cubed','Inverse Matrix','Determinant']),
        ('en-matrix-operations-last', 3, 0, ['Inverse Matrix','Determinant','Transposition','Identity']),
        ('en-vector-operations', 1, 0, ['Dot Product','Cross Product','Angle','Unit Vector']),
        ('en-matrix-result-tools', 1, 0, ['Store','Define Matrix']),
        ('en-vector-result-tools', 1, 0, ['Store','Define Vector']),
        ('en-base-catalog', 1, 0, ['Logic Operation','Base Prefix','Hex Value']),
        ('en-base-prefix', 1, 0, ['Decimal(d)','Hexadecimal(h)','Binary(b)','Octal(o)']),
        ('en-statistics-menu', 1, 0, ['1-Variable','2-Variable']),
        ('en-statistics-tools', 1, 0, ['Edit','Frequency','Sort']),
        ('en-statistics-edit', 1, 0, ['Insert Row','Delete All']),
        ('en-statistics-sort', 1, 0, ['x Ascending','x Descending']),
        ('en-statistics-results-menu', 1, 0, ['1-Var Results','Statistics Calc']),
        ('en-distribution-menu', 1, 0, ['Binomial PD','Binomial CD','Normal PD','Normal CD']),
        ('en-distribution-menu-last', 4, 0, ['Normal CD','Inverse Normal','Poisson PD','Poisson CD']),
        ('en-distribution-method', 1, 0, ['List','Variable']),
        ('en-table-tools', 1, 0, ['Table Range','Define f(x)/g(x)','Table Type','Edit']),
        ('en-statistics-catalog', 1, 0, ['Statistics','Func Analysis','Probability','Numeric Calc']),
        ('en-statistics-catalog-groups', 1, 0, ['Summation','Mean/Var/Dev','Min/Max/Quartile','Norm Dist']),
        ('en-statistics-two-catalog-groups', 1, 0, ['Summation','Mean/Var/Dev','Min/Max','Regression']),
        ('en-statistics-calculation-tools', 1, 0, ['1-Var Results']),
        ('en-statistics-two-calculation-tools', 1, 0, ['2-Var Results','Reg Results','Select Reg Type']),
        ('en-statistics-two-results-menu', 1, 0, ['2-Var Results','Reg Results','Statistics Calc']),
        ('en-statistics-two-sort', 1, 0, ['x Ascending','x Descending','y Ascending','y Descending']),
        ('vi-statistics-norm-groups', 1, 0, ['Phép tính tổng','Tbình/Psai/Đlệc…','Tthiểu/Tđa/TứPhânvị','Phân phối chuẩn']),
        ('en-calculate-verify-tools', 1, 0, ['CALC','Undo','Verify ON']),
        ('en-verify-tools', 1, 0, ['Undo','Verify OFF']),
        ('en-complex-catalog', 1, 0, ['Complex','Func Analysis','Probability','Numeric Calc']),
        ('en-complex-functions', 1, 0, ['i','∠','Argument','Conjugate']),
        ('en-complex-functions-last', 3, 0, ['Argument','Conjugate','Real Part','Imaginary Part']),
        ('en-complex-tools', 1, 0, ['Undo','Verify ON']),
        ('en-table-verify-tools-before', 3, 0, ['Table Type','Edit','Recalculate','Verify ON']),
        ('en-table-verify-tools-on', 2, 0, ['Define f(x)/g(x)','Table Type','Edit','Verify OFF']),
        ('en-sheet-catalog', 1, 0, ['Grab','=','$',':']),
        ('en-sheet-catalog-last', 5, 0, ['Min','Max','Mean','Sum']),
        ('en-settings-root', 1, 0, ['Calc Settings','System Settings','Reset','Get Started']),
        ('en-settings-calculation', 1, 0, ['Input/Output','Angle Unit','Number Format','Engineer Symbol']),
        ('en-settings-calculation-middle', 5, 0, ['Fraction Result','Complex Result','Decimal Mark','Digit Separator']),
        ('en-settings-calculation-last', 7, 0, ['Decimal Mark','Digit Separator','×10ˣ Key','FORMAT Key']),
        ('en-settings-io-menu', 1, 0, [('MathI/MathO',True),('MathI/DecimalO',True),('LineI/LineO',True),('LineI/DecimalO',True)]),
        ('en-settings-decimal-menu', 1, 0, [('Dot',True),('Comma',True)]),
        ('en-settings-fraction-menu', 1, 0, [('Mixed Number',True),('Improp Fraction',True)]),
        ('en-settings-engineer-menu', 1, 0, [('On',True),('Off',True)]),
    ]
    branch_frames.update(('en-base-catalog','en-statistics-tools','en-table-tools',
                          'en-distribution-menu','en-distribution-menu-last'))
    branch_frames.update(('en-statistics-catalog','en-statistics-catalog-groups','en-statistics-two-catalog-groups',
                          'en-statistics-two-calculation-tools','vi-statistics-norm-groups'))
    branch_frames.update(('en-complex-catalog','en-table-verify-tools-before','en-table-verify-tools-on'))
    branch_frames.update(('en-settings-root','en-settings-calculation','en-settings-calculation-middle','en-settings-calculation-last'))
    branch_frames.update(('special-stats-tools', 'special-distribution-menu', 'special-distribution-menu-last', 'base-catalog', 'sheet-tools-last'))
    branch_frames.update(('stat-two-output-menu', 'stat-two-calc-tools', 'stat-two-calc-catalog', 'stat-two-calc-catalog-statistics'))
    branch_frames.update(('table-tools-first', 'table-tools-last', 'table-verify-tools-last'))
    branch_frames.add('en-sheet-tools-last')
    branch_frames.update(('en-variable-edit-catalog','en-variable-edit-catalog-last','en-variable-edit-catalog-end'))
    catalog_labels = {
        'analysis': (
            ['Đạo hàm(d/dx)','Tích phân(∫)','Tổng(Σ)','Tích(Π)',
             'Số dư','Logarit(logab)','Logarit(log)','Logarit Tự nhiên'],
            ['Derivative(d/dx)','Integration(∫)','Summation(Σ)','Product(Π)',
             'Remainder','Logarithm(logab)','Logarithm(log)','Natural Logarithm']),
        'probability': (
            ['%','Giai thừa(!)','Chỉnh hợp(P)','Tổ hợp(C)','Số Ngẫu nhiên','SốNguyên Ngẫunhiên'],
            ['%','Factorial(!)','Permutation(P)','Combination(C)','Random Number','Random Integer']),
        'numeric': (
            ['Ước chung lớn nhất','Bội chung nhỏ nhất','Giá trị tuyệt đối','Số tp tuần hoàn',
             'Phần Nguyên','Làm Tròn','Số Nguyên Lớnnhất'],
            ['GCD','LCM','Absolute Value','Recurring Decimal','Integer Part','Round Off','Largest Integer']),
        'angle': (
            ['Độ','Radian','Gradian','Tđộ Đềcac → Cực','Tđộ Cực → Đềcac','Độ Phút Giây'],
            ['Degrees','Radians','Gradians','Rect to Polar','Polar to Rect','Degs Mins Secs']),
        'hyperbolic': (['sinh','cosh','tanh','sinh⁻¹','cosh⁻¹','tanh⁻¹','sin','cos','tan','sin⁻¹','cos⁻¹','tan⁻¹'],) * 2,
        'engineering': (['Milli','Micro','Nano','Pico','Femto','Kilo','Mega','Giga','Tera','Peta','Exa'],) * 2,
        'constants': (
            ['Hằng số chung','Hằng số điện từ','Hsố ntử & hnhân','Hsố vlý-hhọc','Gtrị thông qua','Khác'],
            ['Universal','Electromagnetic','Atomic&Nuclear','Physico-Chem','Adopted Values','Other']),
        'conversions': (
            ['Độ dài','Diện tích','Thể tích','Khối lượng','Vận tốc','Áp suất','Năng lượng','Công suất','Nhiệt độ'],
            ['Length','Area','Volume','Mass','Velocity','Pressure','Energy','Power','Temperature']),
    }
    for group, languages in catalog_labels.items():
        for language, titles in zip(('vi','en'), languages):
            prefix = language + '-catalog-' + group
            samples = [(prefix,0)]
            if len(titles) > 4:
                samples.append((prefix+'-last',min(4,len(titles)-4)))
            if len(titles) > 8:
                suffix = '-last' if group == 'conversions' and language == 'en' else '-end'
                samples.append((prefix+suffix,min(8,len(titles)-4)))
            if group == 'conversions' and language == 'en':
                samples[1] = (prefix+'-middle',4)
            for sample, offset in samples:
                menus.append((sample,offset+1,0,titles[offset:offset+4]))
                if group in ('constants','conversions'):
                    branch_frames.add(sample)
    for name, number, selected, labels in menus:
        for row, label in enumerate(labels):
            title, radio = label if isinstance(label, tuple) else (label, False)
            top = (row + int(name in ('box-dice-view-menu','en-dice-view-menu','en-sheet-auto-menu','en-settings-engineer-menu'))) * 16
            array_branch = (row == 0 and name.removeprefix('en-') in ('matrix-catalog', 'vector-catalog', 'matrix-result-tools', 'vector-result-tools')) or (name == 'en-statistics-two-results-menu' and row > 0)
            has_branch = name in branch_frames or array_branch
            if name == 'en-statistics-two-calculation-tools': has_branch = row == 2
            if name == 'en-statistics-catalog': has_branch = True
            width = 176 if has_branch else 188
            x = 22 if radio else 11
            pixel_mask = (lambda p: int(p == 0)) if row == selected else (lambda p: int(bool(p)))
            if name.startswith('sheet-') and title in aliases:
                continue
            aliases.setdefault(title, crop(name, x, top, width - x, 15, pixel_mask))
            option = number + row
            key = str(option % 10) if option <= 10 else '+−×÷.'[option - 11]
            hint = hints.setdefault(key, [None, None])
            tone = int(row == selected)
            if not name.startswith(('sheet-','en-catalog-','vi-catalog-')) or hint[tone] is None:
                hint[tone] = crop(name, 0, top, 11, 15)
    for i, label in enumerate(('a', 'b', 'c', 'x̂₁', 'x̂₂', 'ŷ')):
        x = i % 2 * 99 + 11
        aliases[label] = crop('stat-two-calc-catalog-regression', x, i // 2 * 16, 78, 15,
                              lambda p: int(p == 0) if i == 0 else int(p != 0))
    other_labels = ('Ans','π','e','√(','ˣ√(','⁻¹','²','^(','−',',','(',')')
    for sample,first,last in (('en-catalog-other',0,8),('en-catalog-other-last',4,12)):
        for index in range(first,last):
            slot = index-first
            x = slot%2*99
            y = slot//2*16
            selected = slot == 0
            aliases[other_labels[index]] = crop(sample,x+11,y,78,15,
                                                (lambda p:int(p == 0)) if selected else (lambda p:p))
            if index >= 10:
                hints['+−'[index-10]] = [crop(sample,x,y,11,15),None]
    aliases['Mở'] = crop('sheet-auto-menu', 22, 16, 166, 15, lambda p: int(p == 0))
    aliases['Tạo mới Ma trận'] = crop('box-line-point-edit', 11, 16, 177, 15)
    aliases.setdefault('Tắt', crop('sheet-auto-menu', 22, 32, 166, 15))
    for sample, rows in [('complex-catalog-first', ('i', '∠', 'Argument', 'Sốphức liên hợp')),
                         ('complex-catalog-last', ('Argument', 'Sốphức liên hợp', 'Phần thực', 'Phần ảo')),
                         ('complex-verify-tools', ('Hoàn tác', 'Kiểm chứng Tắt'))]:
        for index, label in enumerate(rows):
            mask = (lambda p: int(p == 0)) if index == 0 else (lambda p: int(p != 0))
            aliases.setdefault(label, crop(sample, 11, index * 16, 177, 15, mask))
    aliases['Tọa độ Đề–cac'] = crop('complex-format', 11, 32, 177, 15)
    aliases['Tọa độ Cực'] = crop('complex-format', 11, 48, 177, 15)
    for index, title in enumerate(('f(x)', 'g(x)', 'Xác định f(x)', 'Xác định g(x)')):
        mask = (lambda p: int(p == 0)) if index == 0 else (lambda p: int(p != 0))
        aliases.setdefault(title, crop('calc-function-menu', 11, index * 16, 177, 15, mask))
    for sample, titles in [('base-logic-menu', ('Neg','Not','and','or','xor','xnor')),
                           ('base-hex-menu', tuple('ABCDEF')),
                           ('en-statistics-norm-menu',('P(','Q(','R(','►t')),
                           ('en-statistics-sum-menu',('Σx','Σx²')),
                           ('en-statistics-variance-menu',('x̄','σ²x','σx','s²x','sx','n')),
                           ('en-statistics-extrema-menu',('min(x)','Q₁','Med','Q₃','max(x)'))]:
        for i, label in enumerate(titles):
            x = i % 2 * 99 + 11
            aliases[label] = crop(sample, x, i // 2 * 16, 78, 15, lambda p: int(p == 0) if i == 0 else int(p != 0))
    for sample,offset,titles in [
        ('en-statistics-two-sum-menu',0,('Σx','Σx²','Σy','Σy²','Σxy','Σx³','Σx²y','Σx⁴')),
        ('en-statistics-two-variance-menu',0,('x̄','σ²x','σx','s²x','sx','n','ȳ','σ²y')),
        ('en-statistics-two-variance-menu-last',4,('sx','n','ȳ','σ²y','σy','s²y','sy')),
        ('en-statistics-two-extrema-menu',0,('min(x)','max(x)','min(y)','max(y)')),
        ('en-statistics-linear-coefficients',0,('a','b','r','x̂','ŷ'))]:
        for index,title in enumerate(titles):
            x,y = index%2*99,index//2*16
            aliases[title] = crop(sample,x+11,y,78,15,(lambda p:int(p == 0)) if index == 0 else (lambda p:int(p != 0)))
            if index+offset >= 10:
                hints['+−'[index+offset-10]] = [crop(sample,x,y,11,15),None]
    # Convert measured glyph cells into a fixed-width font for unrecorded labels.
    glyphs = {}
    phrases = [
        ('Cài đặt lại', 'Cài đặt lại'), ('Bắt đầu', 'Bắt đầu'), ('Nhập/Xuất', 'Nhập/Xuất'),
        ('Đơn vị góc', 'Đơn vị góc'), ('Định dạng số', 'Định dạng số'),
        ('Ký hiệu kthuật', 'Ký hiệu kthuật'), ('Kết quả phân số', 'Kết quả phân số'),
        ('Dấu thập phân', 'Dấu thập phân'), ('Dấu cách 3 chsố', 'Dấu cách 3 chsố'),
        ('Phím FORMAT', 'Phím FORMAT'), ('Ngôn ngữ', 'Ngôn ngữ'), ('Tự động tắt', 'Tự động tắt'),
        ('H.thị số t.chọn', 'H.thị số t.chọn'), ('QR Code', 'QR Code'),
        ('Phân tích Hàm', 'Phân tích Hàm'), ('Xác suất', 'Xác suất'), ('Phép tính Số', 'Phép tính Số'),
        ('CALC','CALC'), ('Hoàn tác','Hoàn tác'), ('Kiểm chứng Bật','Kiểm chứng Bật'),
        ('Sáng/tối Mhình', 'Sáng/tối Mhình'), ('Khác', 'Khác'), ('Dòng vào/ra','Dòng vào/ra'),
        ('Stn vào/Stp ra','Stn vào/Stp ra'), ('Radian','Radian'), ('Grad','Grad'),
        ('Thập phân','Thập phân'), ('Hthi số kthuật','Hthi số kthuật'), ('Hệ lục thập phân','Hệ lục thập phân'),
    ]
    for key, text in phrases:
        sw, sh, data = aliases[key]
        pixels = [byte >> 6 for byte in b64decode(data) for _ in range(byte & 63)]
        for i, char in enumerate(text):
            if (i + 1) * 11 > sw:
                break
            sample = [pixels[y * sw + x] for y in range(sh) for x in range(i * 11, (i + 1) * 11)]
            if char == ' ' or any(sample):
                glyphs.setdefault(char, encode(sample, 11, sh))
    for i in range(10):
        glyphs[str(i)] = crop('digits', i * 11, 0, 11, 15)
    glyphs['…'] = crop('settings', 165, 0, 11, 15, lambda p: int(p == 0))
    for i, char in enumerate('MatA:2×2'):
        if char != '2':
            glyphs.setdefault(char, crop('matrix-tools-defined', 11 + i * 11, 0, 11, 15, lambda p: int(p == 0)))
    for i, char in enumerate('VctA'):
        glyphs.setdefault(char, crop('vector-tools', 11 + i * 11, 0, 11, 15, lambda p: int(p == 0)))
    for i, char in enumerate('BCD'):
        glyphs.setdefault(char, crop('special-matrix-tools', 44, (i + 1) * 16, 11, 15))
    chrome = {
        'arrow': [crop('settings', 176, 16, 12, 15), crop('settings', 176, 0, 12, 15)],
        'radio': [crop('settings-io', 11, 16, 11, 15), crop('settings-angle', 11, 16, 11, 15),
                  crop('settings-angle', 11, 0, 11, 15), crop('settings-angle-degree', 11, 0, 11, 15)],
    }
    return aliases, hints, glyphs, chrome


def build_status():
    positions = {flag: [x, y, w, h] for flags in SPECIAL['statuses'].values()
                 for flag, x, y, w, h in flags}
    sprites = {}
    namespace = '{http://www.w3.org/2000/svg}'
    for flag, source in SPECIAL['statusIcons'].items():
        svg = ElementTree.fromstring(source)
        clean = ElementTree.Element('svg', {'xmlns': namespace[1:-1], 'viewBox': svg.attrib['viewBox']})
        for shape, attribute in [('path', 'd'), ('polygon', 'points')]:
            for node in svg.iter(namespace + shape):
                ElementTree.SubElement(clean, shape, {attribute: node.attrib[attribute]})
        encoded = b64encode(ElementTree.tostring(clean)).decode('ascii')
        sprites[flag] = [*positions[flag], 'data:image/svg+xml;base64,' + encoded]
    return sprites


def build_special():
    grid = {}
    for row, right, chars in [(10, 58, '123456'), (20, 58, '7890'), (30, 58, '-0.23')]:
        for i, char in enumerate(chars):
            grid.setdefault(char, crop('special-stats-font', right - 6 * (len(chars) - i) + 1, row, 6, 7))
    grid[','] = crop('stat-science-comma-mantissa',29,10,6,7,lambda p:int(p == 0))
    grid['−'] = grid['-']
    grid[' '] = encode([0] * 42, 6, 7)
    headings = {
        'x': crop('special-stats-empty', 20, 0, 41, 9),
        'tableX': crop('special-table-empty', 20, 0, 41, 9),
        'y': crop('special-stats-two', 62, 0, 41, 9),
        'f(x)': crop('special-table-empty', 62, 0, 41, 9),
        'g(x)': crop('special-table-empty', 104, 0, 41, 9),
        'tableOnlyG': crop('table-type-only-g', 62, 0, 41, 9),
        'Freq': crop('special-stats-freq-grid', 62, 0, 41, 9),
        'n': crop('stat-two-freq-grid', 104, 0, 41, 9),
    }
    for i, char in enumerate('ABCD'):
        headings[char] = crop('special-spreadsheet-empty', 20 + i * 42, 0, 41, 9, lambda p: int(p == 0))
    headings['E'] = crop('sheet-last-column', 146, 0, 41, 9, lambda p: int(p == 0))
    notes = {
        'bothUndefined': crop('special-table-empty', 0, 48, 192, 15),
        'gUndefined': crop('special-table-defined', 0, 48, 192, 15),
        'true': crop('rare-verify-true', 148, 48, 44, 15),
        'false': crop('rare-verify-false', 159, 48, 33, 15),
        'probability': crop('special-distribution-normal-result', 0, 0, 22, 15),
    }
    forms = {}
    name = 'special-table-range'
    forms['range'] = [crop(name, 0, 0, 188, 15)]
    for i in range(3):
        forms['range'].append(crop(name, 0, 16 * (i + 1), 77, 15,
                                   (lambda p: int(p == 0)) if i == 0 else (lambda p: int(bool(p)))))
    forms['execute'] = crop('special-distribution-normal-execute', 0, 48, 188, 15, lambda p: int(p == 0))
    english_headings = {**headings,'Freq':crop('en-statistics-frequency-grid',62,0,41,9)}
    english_notes = {**notes,
        'bothUndefined':crop('en-table-empty',0,48,192,15),
        'gUndefined':crop('en-table-g-undefined',0,48,192,15),
        'true':crop('en-verify-true',148,48,44,15),
        'false':crop('en-verify-false',137,48,55,15)}
    english_forms = {
        'range':[crop('en-table-range',0,0,188,15)] + [
            crop('en-table-range',0,(i+1)*16,77,15,
                 (lambda p:int(p == 0)) if i == 0 else (lambda p:int(p != 0))) for i in range(3)],
        'execute':crop('en-distribution-normal-execute',0,48,188,15,lambda p:int(p == 0))}
    result_pages = [
        ('special-stats-results', ('x̄', 'Σx', 'Σx²', 'σ²x', 'σx', 's²x')),
        ('special-stats-results-second', ('sx', 'n', 'min(x)', 'Q₁', 'Med', 'Q₃')),
        ('special-stats-results-third', ('max(x)',)),
        ('stat-two-results-page-1', ('sx', 'n', 'ȳ', 'Σy', 'Σy²', 'σ²y')),
        ('stat-two-results-page-2', ('σy', 's²y', 'sy', 'Σxy', 'Σx³', 'Σx²y')),
        ('stat-two-results-page-3', ('Σx⁴', 'min(x)', 'max(x)', 'min(y)', 'max(y)')),
    ]
    results = {label: crop(name, 36, i * 10, 42, 10)
               for name, labels in result_pages for i, label in enumerate(labels)}
    result_font = {char: crop('special-stats-result-font', 84 + i * 6, 0, 6, 9)
                   for i, char in enumerate('1234567890')}
    result_font['.'] = crop('special-stats-results', 90, 30, 6, 9)
    result_font[','] = crop('stat-science-comma-mean',90,0,6,9)
    result_font['='] = crop('special-stats-results', 78, 0, 6, 10)
    result_font['−'] = crop('special-equation-polynomial-input', 64, 14, 6, 9)
    result_font['-'] = result_font['−']
    regression = {
        'titles': {model: crop(name, 36, 0, 90, 10) for model, name in (
            ('y=a+bx', 'stat-two-linear-regression'), ('y=a+bx+cx²', 'stat-two-quadratic-regression'),
            ('y=a+b·ln(x)', 'stat-two-log-result'), ('y=a·e^(bx)', 'stat-two-exp-e-result'),
            ('y=a·b^x', 'stat-two-exp-ab-result'), ('y=a·x^b', 'stat-two-power-result'),
            ('y=a+b/x', 'stat-two-inverse-result'))},
        'terms': {label: crop(name, 66, y, 12, 10) for label, name, y in (
            ('a', 'stat-two-linear-regression', 10), ('b', 'stat-two-linear-regression', 20),
            ('r', 'stat-two-linear-regression', 30), ('c', 'stat-two-quadratic-regression', 30))},
        'minus': crop('stat-two-linear-regression', 78, 20, 6, 9),
        'frequencyTitle': crop('stat-two-freq-menu', 0, 0, 188, 15),
        'calculationLabel': crop('stat-two-calc', 100, 34, 92, 15),
        'calculationModel': crop('stat-two-calc', 84, 48, 108, 15),
        'oneVariableLabel': crop('stats-power-frequency-calc-screen', 0, 48, 192, 15),
        'clear':{language:{
            'title':crop(sample,0,0,188,15),
            'yes':crop(sample,0,32,188,15,lambda p:int(p == 0)),
            'cancel':crop(sample,0,48,188,15)} for language,sample in
            [('vi','vi-statistics-type-clear-confirm'),('en','en-statistics-type-clear-confirm')]},
        'en':{'frequencyTitle':crop('en-statistics-frequency-menu-data',0,0,188,15),
              'calculationLabel':crop('en-statistics-calculation',82,34,110,15),
              'calculationModel':crop('en-statistics-two-calculation',84,48,108,15),
              'oneVariableLabel':crop('en-statistics-calculation',82,48,110,15)},
    }
    coefficients = {}
    quadratic = [(9, 51, 14), (64, 113, 14, 65), (126, 175, 14, 127)]
    cubic = [(9, 51, 14), (64, 113, 14, 65), (126, 175, 14, 127), (9, 51, 26, 10)]
    quartic = [*cubic, (64, 113, 26, 65)]
    layouts = [
        ('linear2', 'special-equation-coefficients',
         [(9, 51, 2), (64, 113, 2, 65), (126, 175, 2),
          (9, 51, 14), (64, 113, 14, 65), (126, 175, 14)]),
        ('poly2', 'special-equation-polynomial', quadratic),
        ('poly2-gt', 'special-inequality-coefficients', quadratic),
        ('poly2-lt', 'ineq-inside-input', quadratic),
        ('poly2-ge', 'ineq-surd-input', quadratic),
        ('poly2-le', 'ineq-surd-inside-input', quadratic),
        ('plane', 'explorer-plane-result', cubic),
        ('poly3', 'eq-poly3-empty', cubic),
        ('poly4', 'eq-poly4-empty', quartic),
        ('poly3-gt', 'ineq-cubic-input', cubic),
        ('poly4-le', 'ineq-quartic-input', quartic),
        ('A:B=X:D', 'special-ratio-coefficients', [(9, 45, 20), (51, 87, 20), (147, 183, 20)]),
        ('A:B=C:X', 'special-ratio-second', [(9, 45, 20), (51, 87, 20), (105, 141, 20)]),
    ]
    for option, relation in enumerate(('gt', 'lt', 'ge', 'le'), 1):
        if relation != 'gt': layouts.append((f'poly3-{relation}', f'ineq-editor-2-{option}', cubic))
        if relation != 'le': layouts.append((f'poly4-{relation}', f'ineq-editor-3-{option}', quartic))
    for degree, samples in [(3, ('empty', 'ready')), (4, ('empty', 'right', 'far'))]:
        for offset, sample in enumerate(samples):
            # Three coefficients per viewport, with the final column holding the constant.
            cells = [(left, right, y, *([left + 1] if 0 < offset + col < degree else []))
                     for y in range(2, 2 + degree * 12, 12)
                     for col, (left, right) in enumerate(((9, 51), (64, 113), (126, 175)))]
            layouts.append((f'simul{degree}-{offset}', f'eq-sim{degree}-{sample}', cells))
    for key, name, cells in layouts:
        pixels = frame(name)[:192 * 48]
        for left, right, y, *_ in cells:
            for row in range(y, y + 10):
                pixels[row * 192 + left:row * 192 + right] = [0] * (right - left)
        coefficients[key] = [encode(pixels, 192, 48), cells]
    notes['ratioResult'] = crop('special-ratio-result', 0, 0, 22, 15)
    table = {
        'defineValue': crop('table-verify-select-f', 0, 48, 192, 15),
        'correct': crop('table-verify-right', 0, 0, 188, 15),
        'incorrect': crop('table-verify-wrong', 0, 0, 188, 15),
        'accept': crop('table-verify-right', 0, 48, 188, 15),
        'en':{'defineValue':crop('en-table-verify-select',0,48,192,15),
              'correct':crop('en-table-verify-correct',0,0,188,15),
              'incorrect':crop('en-table-verify-incorrect',0,0,188,15),
              'accept':crop('en-table-verify-correct',0,48,188,15)},
    }
    stat_inputs = {'►t':crop('en-statistics-norm-t-result',11,0,22,12)}
    plus,zero = frame('ops'),frame('digits')
    suffix = [plus[y*WIDTH+22:y*WIDTH+33]+zero[y*WIDTH:y*WIDTH+11] for y in range(12)]
    for token,sample in ENGLISH_SPECIAL['statTokens'].items():
        name = sample if isinstance(sample,str) else sample['frame']
        start = 0 if isinstance(sample,str) else sample['start']
        pixels = frame(name)
        widths = [x for x in range(start+11,170) if all(
            pixels[y*WIDTH+x:y*WIDTH+x+22] == suffix[y] for y in range(12))]
        assert len(widths) == 1, name
        width = widths[0]
        height = max([12]+[y+1 for y in (12,13) if any(pixels[y*WIDTH+start:y*WIDTH+width])])
        stat_inputs[token] = crop(name,start,0,width-start,height)
    return {'grid': grid, 'headings': headings, 'notes': notes, 'forms': forms, 'table': table,
            'statInput':stat_inputs,
            'en':{'notes':english_notes,'forms':english_forms,'headings':english_headings},
            'statistics': results, 'statisticsFont': result_font,
            'statisticsScience': {'×10':crop('stats-science-exp-10',90,0,12,9),
                                  'mantissaMinus':crop('stats-science-negative-value',84,0,6,9),
                                  'negativeTimesTen':crop('stats-science-negative-five',138,0,12,9),
                                  '−':crop('stats-science-negative-five',144,0,6,4),
                                  **{str(d):crop('stats-science-exp-'+str(10+d),108,0,6,9) for d in range(10)}},
            'regression': regression, 'coefficients': coefficients}


def build_number_menus():
    previews = {kind:{} for kind in ('fix','sci','norm')}
    for kind,values in [('fix',list(range(10))),('sci',list(range(1,10))+[0]),('norm',[1,2])]:
        samples = [(0,'')] if kind == 'norm' else [(0,''),(4,'-middle'),(6,'-last')]
        for offset,ending in samples:
            source = 'en-settings-'+kind+ending
            for slot,value in enumerate(values[offset:offset+4]):
                previews[kind][value] = crop(source,11,slot*16,177,15,
                                            (lambda p:int(p == 0)) if slot == 0 else (lambda p:int(p != 0)))
    return {'previews':previews,
            'vi':{'labels':{kind:crop('flow-settings-fix-two-selected',22,row*16,132 if kind == 'norm' else 121,15,
                                      (lambda p:int(p == 0)) if row == 0 else (lambda p:int(p != 0)))
                            for row,kind in enumerate(('fix','sci','norm'))}},
            'labels':{kind:crop('en-settings-number',22,row*16,121,15,
                                (lambda p:int(p == 0)) if row == 0 else (lambda p:int(p != 0)))
                      for row,kind in enumerate(('fix','sci','norm'))},
            'colon':crop('en-settings-number',143,32,11,15),
            'titles':{title:crop(source,0,0,188,15) for title,source in
                      [('Engineer Symbol?','en-settings-engineer-menu'),('Digit Separator?','en-settings-separator-menu'),
                       ('BẬT ký hiệu kth?','vi-settings-engineer-menu'),('BẬT dcách 3 chsố?','vi-settings-separator-menu')]}}


def build_number_line():
    caption_font = {char: crop(sample, index * 11, 48, 11, 15)
                    for sample, text in [('box-line-point-plot', 'A:x=2'),
                                         ('box-line-focused-b', 'B:−1≤x<3'),
                                         ('box-line-focused-c', 'C:x>0')]
                    for index, char in enumerate(text)}
    for ch,index in [('s',4),('i',5),('n',6),('\u03c0',8),('\u00f7',9),(')',11)]:
        caption_font[ch] = crop('line-settings-radian-sine',index*11,48,11,15)
    caption_font['\u2518'] = crop('line-settings-fix0-fraction-plot',55,48,11,15)
    caption_font['5'] = crop('en-line-plot',66,48,11,15)
    caption_font.update({digit:crop('en-line-point-'+digit,44,48,11,15) for digit in '46789'})
    for ch,index in [('×',5),('^',8),('(',9)]:
        caption_font[ch] = crop('line-edge-maximum-plot',index*11,48,11,15)
    caption_font['.'] = crop('en-line-point-decimal',55,48,11,15)
    caption_font['²'] = crop('explorer-box-power-number-line-point-registered',99,16,11,15)
    return {
        'axisScience':{'base':crop('line-edge-maximum-plot',19,37,12,7),
                       'negativeBase':crop('line-edge-small-window-plot',25,37,12,7),
                       '0':crop('line-edge-maximum-plot',103,37,6,5),
                       '1':crop('line-edge-maximum-plot',97,37,6,5),
                       **{str(d):crop('line-edge-axis-exp-'+('minus-' if d in (3,4) else '')+str(d),37,37,6,5) for d in range(3,9)},
                       '9':crop('line-edge-maximum-plot',31,37,6,5)},
        'axis': crop('box-line-point-plot', 0, 28, 192, 7),
        'rayArrow': crop('box-line-all-a', 176, 19, 5, 7),
        'axisMinus': crop('box-line-all-a', 13, 37, 6, 7),
        'formLetters': [crop('box-line-form', 0, y, 22, 15,
                             (lambda p: int(p == 0)) if y == 0 else (lambda p: int(p == 1))) for y in (0,16,32)],
        'runOff': crop('box-line-form', 0, 48, 188, 15),
        'run': crop('box-line-point-stored', 0, 48, 188, 15),
        'boundsFields': [crop('box-line-interval-form', 0, 16, 22, 15, lambda p: int(p == 0)),
                         crop('box-line-interval-form', 0, 32, 22, 15)],
        'confirmOff': crop('box-line-value', 0, 32, 188, 15),
        'confirm': crop('box-line-interval-edit', 0, 48, 188, 15),
        'windowFields': [crop('box-line-window', 0, 0, 77, 15, lambda p: int(p == 0)),
                         crop('box-line-window', 0, 16, 77, 15)],
        'captionFont': caption_font,
        'sampleTitles': {'x=a': crop('box-line-value', 0, 0, 44, 15),
                         'a≤x<b': crop('box-line-interval-form', 0, 0, 66, 15)},
    }


def build_circle():
    # PLUS selects one of 24 measured ray stencils after reducing the angle.
    # These are drawing assets; numerical results still use the input angle.
    graph_width = 78
    rays = [frame(f'circle-graphics-ray-{angle:03d}-first') for angle in range(0,360,15)]
    halves = [frame(f'circle-graphics-semi-ray-{angle:03d}') for angle in range(0,181,15)]
    clocks = [frame(f'circle-graphics-clock-{hour:02d}') for hour in range(1,13)]
    def common(samples):
        return [min(p[y*WIDTH+x] for p in samples) for y in range(HEIGHT) for x in range(graph_width)]
    unit, semi, clock = common(rays), common(halves), common(clocks)
    def theta_pixel(x,y):
        return (x < 11 or 56 <= x < 67) and (7 <= y < 17 or 51 <= y < 61)
    def ray_mask(pixels, base, angle):
        gray = frame(f'circle-graphics-ray-{angle:03d}-second')
        mask = [int(pixels[y*WIDTH+x] == 1 and not theta_pixel(x,y) and
                    (base[y*graph_width+x] != 1 or gray[y*WIDTH+x] == 2 or
                     33 <= x <= 35 and 33 <= y <= 35))
                for y in range(HEIGHT) for x in range(graph_width)]
        # The axes hide pieces of the solid stroke in an isolated frame.
        # Reconstruct those occluded pixels inside the measured stroke hull.
        points = sorted((x,y) for y in range(HEIGHT) for x in range(graph_width) if mask[y*graph_width+x])
        def cross(a,b,c):
            return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
        lower, upper = [], []
        for part, sequence in [(lower,points),(upper,reversed(points))]:
            for point in sequence:
                while len(part) >= 2 and cross(part[-2],part[-1],point) <= 0:
                    part.pop()
                part.append(point)
        hull = lower[:-1]+upper[:-1]
        for y in range(HEIGHT):
            for x in range(graph_width):
                if base[y*graph_width+x] != 1 or pixels[y*WIDTH+x] != 1 or theta_pixel(x,y):
                    continue
                if len(hull) >= 3 and all(cross(hull[i-1],hull[i],(x,y)) >= 0 for i in range(len(hull))):
                    mask[y*graph_width+x] = 1
        return encode(mask,graph_width,HEIGHT)
    bold = [ray_mask(p,unit,index*15) for index,p in enumerate(rays)]
    half_bold = [ray_mask(p,semi,index*15) for index,p in enumerate(halves)]
    faint = [crop(f'circle-graphics-ray-{angle:03d}-second',0,0,graph_width,HEIGHT,
                  lambda p:2 if p == 2 else 0) for angle in range(0,360,15)]
    hands = [encode((int(p[y*WIDTH+x] == 1 and clock[y*graph_width+x] != 1)
                     for y in range(HEIGHT) for x in range(graph_width)),graph_width,HEIGHT) for p in clocks]
    small = {char: crop(sample, x + index * 6, y, 6, 9)
             for sample, text, x, y in [('box-circle-degree-first', '√(2)┘2', 114, 5),
                                         ('box-circle-unit', '0.85090352', 114, 5),
                                         ('box-circle-unit-down', '−', 114, 5),
                                         ('box-circle-ninety', 'ERROR', 114, 31)]
             for index, char in enumerate(text)}
    small['+'] = crop('circle-graphics-ray-075-first',120,31,6,9)
    small['binaryMinus'] = crop('circle-graphics-ray-015-first',120,31,6,9)
    large = {char: crop(sample, x + index * 11, y, 11, 15)
             for sample, text, x, y in [('box-circle-unit', '45', 110, 48),
                                         ('box-circle-clock-run', '12:00', 88, 0),
                                         ('box-circle-clock-up', '11π┘6', 121, 32),
                                         ('box-circle-ninety', '90', 110, 48),
                                         ('box-circle-clock-quarter', '3π┘2', 121, 32)]
             for index, char in enumerate(text)}
    large.update({str(digit):crop(f'circle-graphics-clock-{digit:02d}',99,0,11,15) for digit in range(1,10)})
    large['0'] = crop('circle-graphics-clock-01',121,0,11,15)
    large['−'] = crop('circle-graphics-unit-negative-037',110,48,11,15)
    large['÷'] = crop('circle-graphics-radian-pi-over-eight',121,48,11,15)
    large['+'] = crop('circle-flow-invalid-expression-committed',66,16,11,15)
    for char, x in [('^',66),('(',77),(')',99)]:
        large[char] = crop('explorer-box-power-circle-alpha64',x,16,11,15)
    large['²'] = crop('external-math-circle-value',99,16,11,15)
    large['√'] = crop('external-math-circle-root-value',55,16,11,15)
    return {
        'unit': encode(unit, graph_width, HEIGHT),
        'semi': encode(semi, graph_width, HEIGHT),
        'clock': encode(clock, graph_width, HEIGHT),
        'rays': {'bold':bold,'faint':faint,'halfBold':half_bold},
        'clockHands':hands,
        'small': small, 'large': large,
        'typeIcons': [crop('box-circle-types', 11, i * 16, 11, 15,
                          (lambda p: int(p == 0)) if i == 0 else (lambda p: int(p == 1))) for i in range(3)],
        'formLabels': {kind: crop(sample, 0, 0, 188, 15,
                       (lambda p: int(p == 0)) if kind == 'unit' else (lambda p: int(p == 1)))
                       for kind, sample in [('unit','box-circle-form'), ('semi','box-circle-semi-form'),
                                            ('clock','box-circle-clock-form')]},
        'thetaFields': [crop('box-circle-form', 0, 16 + i * 16, 55, 15) for i in range(2)],
        'thetaLabels': [crop(sample, 78, 48, 32, 15) for sample in ('box-circle-degree-first','box-circle-degree-second')],
        'thetaGraph': [crop(sample,56,7,22,10) for sample in ('circle-graphics-ray-000-first','circle-graphics-ray-180-second')],
        'trigLabels': [[crop(sample, 78, 1 + i * 13, 36, 13) for i in range(3)]
                       for sample in ('box-circle-unit', 'box-circle-unit-down')],
        'clockFields': [crop('box-circle-clock-run', 88, y, width, 15) for y, width in [(16,33),(32,33),(48,66)]],
        'clockSpinner': crop('box-circle-clock-run', 72, 0, 15, 15),
        'rangeError': crop('box-circle-semi', 0, 0, 188, 15),
    }


def build_geometry():
    scalar_forms = [
        ('explorer-triangle-form', ('Cạnh AB', 'Cạnh AC', 'Góc A')),
        ('explorer-triangle-height-form', ('Cạnh AB', 'Góc B')),
        ('explorer-triangle-angle-height-form', ('Cạnh AB', 'Ch.cao AH')),
        ('explorer-sector-form', ('Bán kính r', 'θ')),
        ('explorer-heron-form', ('Cạnh AB', 'Cạnh BC', 'Cạnh AC')),
    ]
    fields = {}
    for sample, labels in scalar_forms:
        for index, label in enumerate(labels):
            mask = (lambda p: int(p == 0)) if index == 0 else (lambda p: int(p == 1))
            fields.setdefault(label, crop(sample, 0, (index + 1) * 16, 110, 15, mask))
    fields['Điểm'] = crop('explorer-distance-points-form', 0, 16, 143, 15, lambda p: int(p == 0))
    fields['Đường thẳng'] = crop('explorer-distance-line-form', 0, 32, 143, 15)
    line_slots = [(left,right,12 + row * 12, *([83] if column else []))
                  for row in range(3) for column,(left,right) in enumerate(((34,76),(82,131)))]
    pixels = frame('explorer-distance-line-input')[:192 * 48]
    for left, right, y, *_ in line_slots:
        for row in range(y,y+10): pixels[row * 192 + left:row * 192 + right] = [0] * (right-left)
    result = {
        'titles': {title:crop(sample, 0, 0, 188, 15) for title,sample in (
            ('Tam giác ABC','explorer-triangle-form'), ('Hình quạt','explorer-sector-form'),
            ('Khoảng cách','explorer-distance-points-form'), ('P:ax+by+cz+d=0','explorer-plane-form'))},
        'fields': fields,
        'coordinates': {label:crop('explorer-point-input-default',0,16*(index+1),33,15,
                                  (lambda p:int(p == 0)) if index == 0 else (lambda p:p))
                        for index,label in enumerate(('x','y','z'))},
        'results': {label:crop(sample, 0, 0, 192, 15) for label,sample in (
            ('Cạnh BC','explorer-triangle-bitex'), ('Ch.cao AH','explorer-triangle-height'),
            ('Góc A','explorer-triangle-angle-sides'), ('Góc B','explorer-triangle-angle-height'),
            ('Góc C','explorer-triangle-angle-sides-c'), ('Dtích','explorer-heron-result'),
            ('Chu vi','explorer-equilateral-perimeter'), ('Dây cung','explorer-sector-chord'),
            ('Cung','explorer-sector-arc'), ('Khoảng cách','explorer-distance-points-result'))},
        'line': [encode(pixels,192,48),line_slots],
        'lineBTitle':crop('en-line-b-input',0,0,192,11),
    }
    english_forms = [
        ('en-triangle-form', ('Cạnh AB','Cạnh AC','Góc A')),
        ('en-triangle-form-2', ('Cạnh AB','Góc B')),
        ('en-triangle-form-3', ('Cạnh AB','Ch.cao AH')),
        ('en-triangle-form-4', ('Cạnh AB','Cạnh BC','Cạnh AC')),
        ('en-sector-form', ('Bán kính r','θ')),
    ]
    english_fields = {}
    for sample,labels in english_forms:
        for index,label in enumerate(labels):
            english_fields.setdefault(label,crop(sample,0,(index+1)*16,110,15,
                                      (lambda p:int(p == 0)) if index == 0 else (lambda p:p)))
    english_fields['Điểm'] = crop('en-distance-points-form',0,16,143,15,lambda p:int(p == 0))
    english_fields['Đường thẳng'] = crop('en-distance-line-form',0,32,143,15)
    result['en'] = {
        'titles':{title:crop(sample,0,0,188,15) for title,sample in (
            ('Tam giác ABC','en-triangle-form'),('Hình quạt','en-sector-form'),
            ('Khoảng cách','en-distance-points-form'),('P:ax+by+cz+d=0','en-plane-form'))},
        'fields':english_fields,
        'results':{label:crop(sample,0,0,192,15) for label,sample in (
            ('Cạnh BC','en-triangle-side'),('Ch.cao AH','en-triangle-height'),
            ('Góc A','en-triangle-angle-sides'),('Góc B','en-triangle-angle-b'),
            ('Góc C','en-triangle-angle-c'),('Dtích','en-heron-result'),
            ('Chu vi','en-equilateral-perimeter'),('Dây cung','en-sector-chord'),
            ('Cung','en-sector-arc'),('Khoảng cách','en-distance-result'))},
    }
    return result


def build_explorer():
    forms = [
        ('explorer-probability-independent-form', 'P(A∩B)', ('P(A)','P(B)')),
        ('explorer-probability-total-form', 'P(B)', ('P(A)','P(B|A)','P(B|Ā)')),
        ('explorer-probability-bayes-form', 'P(A|B)', ('P(A)','P(B|A)','P(B|Ā)')),
        ('explorer-grouped-form', 'Phạm vi dữ liệu', ('Bđầu','Kthúc','Bước')),
    ]
    fields = {}
    for sample,_,labels in forms:
        for index,label in enumerate(labels):
            fields.setdefault(label,crop(sample,0,(index+1)*16,77,15,
                                        (lambda p:int(p == 0)) if index == 0 else (lambda p:p)))
    results = {title:crop(sample,0,0,192,15) for title,sample in (
        ('P(A∩B)','explorer-probability-independent-result'), ('P(B)','explorer-probability-total-result'),
        ('P(A|B)','explorer-probability-bayes-result'))}
    names = ['mean','variance','sd','q1','median','q3','iqr','mode']
    results.update({f'grouped-{index}-0':crop('explorer-grouped-'+name,0,0,192,15)
                    for index,name in enumerate(names)})
    results['grouped-7-1'] = crop('explorer-grouped-mode-second',0,0,192,15)
    results['grouped-7-single'] = crop('grouped-math-fraction-mode',0,0,192,15)
    result = {'titles':{title:crop(sample,0,0,188,15) for sample,title,_ in forms},
            'fields':fields, 'results':results, 'valueLeft':77,
            'countsHeader':crop('explorer-grouped-counts-empty',0,0,146,9),
            'countsScience':{'negativeTimesTen':crop('grouped-science-mantissa-small-count',125,10,12,7)},
            'manyModes':crop('explorer-grouped-three-modes',0,0,192,63),
            'rangeError':crop('explorer-grouped-range-error',0,0,188,15)}
    english_fields = {}
    english_titles = {}
    for sample,title,labels in forms:
        sample = sample.replace('explorer-probability-','en-probability-').replace('explorer-grouped-','en-grouped-')
        english_titles[title] = crop(sample,0,0,188,15)
        for index,label in enumerate(labels):
            english_fields.setdefault(label,crop(sample,0,(index+1)*16,77,15,
                                      (lambda p:int(p == 0)) if index == 0 else (lambda p:p)))
    english_results = dict(results)
    english_titles['Data Range'] = english_titles['Phạm vi dữ liệu']
    for label,english in (('Bđầu','Start'),('Kthúc','End'),('Bước','Step')):
        english_fields[english] = english_fields[label]
    english_results.update({f'grouped-{index}-0':crop('en-grouped-'+name,0,0,192,15)
                            for index,name in enumerate(names)})
    english_results['grouped-7-1'] = crop('en-grouped-mode-second',0,0,192,15)
    english_results['grouped-7-single'] = crop('grouped-english-single-mode',0,0,192,15)
    result['en'] = {'titles':english_titles,'fields':english_fields,'results':english_results,
                    'manyModes':crop('en-grouped-three-modes',0,0,192,63),
                    'rangeError':crop('en-grouped-range-error',0,0,188,15)}
    return result


def build_trials():
    return {'fields':[crop('box-dice-form',0,row*16,143,15,
                           (lambda p:int(p == 0)) if row == 0 else (lambda p:p)) for row in range(3)],
            'off':crop('box-dice-form',143,32,33,15),
            'coinCount':crop('box-coin-form',0,0,143,15,lambda p:int(p == 0)),
            'repeatMark':crop('box-coin-stream3-chosen',143,49-16,11,12),
            'listHeadings':{label:crop('box-dice-three-five-stream1',20+index*42,0,41,9)
                            for index,label in enumerate(('A','B','C','Sum'))},
            'headsHeading':crop('box-coin-fixed-list',104,0,41,9),
            'coinFaces':[crop('box-coin-fixed-list',80 if value == 0 else 38,10,6,7) for value in range(2)],
            'frequencyHeader':crop('box-coin-fixed-frequency',0,0,100,9),
            'sidePrefix':crop('box-coin-fixed-frequency',0,10,19,8),
            'attemptsLabel':crop('box-coin-fixed-frequency',100,0,92,15),
            'attemptsTitle':crop('box-dice-attempts-edit',0,0,188,15),
            'attemptsRange':crop('box-dice-attempts-edit',0,32,188,15),
            'confirm':crop('box-dice-attempts-edit',0,48,188,15),
            'viewTitle':crop('box-dice-view-menu',0,0,188,15)}


def build_memory():
    return {'font':{char:crop('variable-calc-memory-grid',x,y,6,9,
                              (lambda p:int(p == 0)) if y == 1 else (lambda p:p))
                     for char,x,y in [('√',12,1),('(',18,1),(')',30,1),('┘',18,14)]},
            'names':{name:crop('memory-values-result',96*(index%2),13*(index//2),6,11,
                               (lambda p:int(p == 0)) if index == 0 else (lambda p:p))
                     for index,name in enumerate('ABCDEFxyz')},
            'lock':crop('memory-locked-statistics',85,1,6,9,lambda p:int(p == 0)),
            'scientific':{'×10':crop('memory-scientific-large',144,1,12,9,lambda p:int(p == 0)),
                          'negativeTimesTen':crop('memory-scientific-small',114,14,12,9,lambda p:int(p == 0)),
                          '1':crop('memory-scientific-large',156,1,6,9,lambda p:int(p == 0)),
                          '3':crop('memory-scientific-small',126,14,6,9,lambda p:int(p == 0)),
                          '−':crop('memory-scientific-small',120,14,6,4,lambda p:int(p == 0))}}


def build_equations():
    headers = {key: crop(sample, 0, 0, 192, height) for key, (sample, height) in {
        'poly2': ('eq-poly2-x1', 14), 'poly3': ('eq-poly3-x1', 14), 'poly4': ('eq-poly4-x1', 14),
    }.items()}
    extrema = {language: {key: crop(sample, 0, 0, 192, 14 if key.endswith('2') else 28)
                          for key, sample in samples.items()}
               for language, samples in {
                   'vi': {'min2':'eq-poly2-min-x', 'max2':'eq-poly2-max-x',
                          'min3':'eq-poly3-min-x', 'max3':'eq-poly3-max-x'},
                   'en': {'min2':'eq-en-poly-min', 'max2':'eq-en-poly-max',
                          'min3':'eq-en-poly-local-min', 'max3':'eq-en-poly-local-max'},
               }.items()}
    labels = {key: crop(sample, 0, y, 33, 14) for key, (sample, y) in {
        'x': ('eq-sim2-x', 0), 'y': ('eq-sim2-y', 0), 'z': ('eq-sim3-z', 0), 't': ('eq-sim4-t', 0),
        'x₁': ('eq-poly2-x1', 14), 'x₂': ('eq-poly2-x2', 14),
        'x₃': ('eq-poly3-x3', 14), 'x₄': ('eq-poly4-x4', 14),
    }.items()}
    messages = {language: {key: crop(sample, 0, 48, 192, 15) for key, sample in samples.items()}
                for language, samples in {
                    'vi': {'none':'eq-sim2-none', 'infinite':'eq-sim2-infinite', 'all':'ineq-all'},
                    'en': {'none':'eq-en-sim-none', 'infinite':'eq-en-sim-infinite', 'all':'ineq-en-all'},
                }.items()}
    font = {key: crop(sample, x, 0, 11, height) for key, (sample, x, height) in {
        'x': ('ineq-outside', 0, 12),
        'a': ('ineq-outside', 22, 12), 'b': ('ineq-outside', 44, 12),
        'c': ('ineq-quartic', 66, 12), 'd': ('ineq-quartic', 110, 12),
        ',': ('ineq-outside', 33, 13),
    }.items()}
    solver = {}
    for language, samples in {
        'vi': ('eq-solver-empty', 'eq-solver-many', 'eq-solver-confirm', 'eq-solver-select',
               'eq-vi-solver-continue-down', 'eq-vi-solver-continue-first'),
        'en': ('eq-en-solver-prompt', 'eq-en-solver-choose', 'eq-en-solver-run', 'eq-en-solver-form',
               'eq-en-solver-continue-exit-selected', 'eq-en-solver-continue-first'),
    }.items():
        prompt, choose, initial, run, continue_sample, exit_sample = samples
        solver[language] = {
            'prompt': crop(prompt, 0, 48, 192, 15),
            'choose': crop(choose, 0, 0, 188, 16),
            'initial': crop(initial, 0, 0, 188, 32),
            'run': crop(run, 0, 48, 188, 15),
            'continue': crop(continue_sample, 0, 32, 188, 15),
            'exit': crop(exit_sample, 0, 48, 188, 15),
        }
    english_menu = {}
    polynomial = ('ax²+bx+c', 'ax³+bx²+cx+d', 'ax⁴+bx³+cx²+dx+e')
    menus = [
        ('eq-en-menu', ['Simul Equation','Polynomial','Solver']),
        ('eq-en-simul-menu', ['2 Unknowns','3 Unknowns','4 Unknowns']),
        ('eq-en-poly-menu', [polynomial[0] + '=0', polynomial[1] + '=0', 'ax⁴+bx³+cx²…+e=0']),
        ('ineq-en-degree', polynomial),
        ('eq-en-format-poly', ['Standard','Decimal','Rectangular Coord','Polar Coord']),
        ('eq-en-format-simul', ['Standard','Decimal','Improper Fraction','Mixed Number']),
        ('eq-en-format-poly-end', ['Decimal','Rectangular Coord','Polar Coord','Sexagesimal']),
    ]
    for expr, sample in zip(polynomial, ('ineq-en-sign', 'ineq-en-sign-3', 'ineq-en-sign-4')):
        menus.append((sample, [expr + relation + '0' for relation in '> < ≥ ≤'.split()]))
    for sample, titles in menus:
        for row, title in enumerate(titles):
            if title in english_menu: continue
            ink = (lambda p: int(p == 0)) if row == 0 else (lambda p: int(bool(p)))
            english_menu[title] = crop(sample, 11, row * 16, 177, 15, ink)
    arrows = {'left': crop('eq-poly3-long-end', 0, 49, 11, 12),
              'right': crop('eq-poly3-long', 181, 49, 11, 12)}
    compact = {ch: crop('ineq-en-limits-decimal', index * 6, 0, 6, 9)
               for index, ch in enumerate('a≤x≤b,c≤x≤d')}
    compact['='] = crop('ineq-en-format-decimal', 6, 12, 6, 9)
    compact['−'] = compact['-'] = crop('ineq-en-format-decimal', 120, 12, 6, 9)
    compact['.'] = crop('ineq-en-format-decimal', 132, 12, 6, 9)
    compact['<'] = crop('ineq-en-compact-strict', 6, 0, 6, 9)
    compact['≠'] = crop('ineq-en-repeated-decimal', 6, 0, 6, 9)
    coefficient_scientific = {'×10': crop('ineq-en-long-exe', 95, 26, 12, 9),
                              '9': crop('ineq-en-long-exe', 107, 26, 6, 9)}
    coefficient_scientific.update({
        'negativeTimesTen': crop('eq-scale-quadratic-small-input',27,14,12,9),
        '−': crop('eq-scale-quadratic-small-input',33,14,6,4),
        '6': crop('eq-scale-quadratic-small-input',39,14,6,9),
        '0': crop('eq-scale-quadratic-small-input',45,14,6,9),
        '5': crop('eq-scale-cubic-small-input',163,14,6,9),
        '2': crop('eq-scale-quadratic-tiny-repeat-input',101,14,6,9),
        '4': crop('eq-scale-quadratic-tiny-repeat-input',163,14,6,9,lambda p: int(p == 0)),
        '8': crop('eq-scale-quadratic-fraction-limit-input',107,14,6,9),
        '7': crop('eq-scale-quadratic-fraction-inside-input',107,14,6,9),
        '1': crop('eq-scale-quadratic-fraction-inside-input',163,14,6,9,lambda p: int(p == 0)),
    })
    english_errors = {'Memory ERROR':crop('sheet-fill-over-memory-error',0,0,188,15),
                      'Stack ERROR':crop('expression-limits-en-stack-fresh-result',0,0,188,15),
                      'Time Out':crop('expression-limits-en-timeout-fresh-result',0,0,188,15),
                      'Dimension ERROR':crop('array-nonsquare-determinant-error',0,0,188,15),
                      'Math ERROR': crop('eq-en-error-math', 0, 0, 188, 15),
                      'Not Defined':crop('en-calculate-undefined-function',0,0,188,15),
                      'Argument ERROR':crop('en-distribution-normal-invalid',0,0,188,15),
                      'Syntax ERROR': crop('eq-en-solver-syntax', 0, 0, 188, 15),
                      'Variable ERROR': crop('eq-en-solver-variable', 0, 0, 188, 15),
                      'Cannot Solve': crop('eq-en-solver-fail', 0, 0, 188, 15)}
    return {'headers': headers, 'extrema': extrema, 'labels': labels, 'messages': messages, 'font': font,
            'solver': solver, 'residual': crop('eq-solver-answer', 0, 49, 44, 12), 'arrows': arrows,
            'englishMenu': english_menu, 'englishErrors': english_errors, 'compactInequality': compact,
            'coefficientScientific': coefficient_scientific,
            'englishBack': crop('eq-en-solver-fail', 0, 48, 188, 15)}


def build_arrays():
    names = {}
    for kind, prefix, sample, result in [('matrix', 'Mat', 'matrix-2x2-empty', 'matrix-2x2-result-right'),
                                         ('vector', 'Vct', 'vector-2-empty', 'vector-2-result')]:
        names[prefix] = crop(sample, 0, 0, 18, 9)
        names[prefix + 'Ans'] = crop(result, 0, 0, 42, 9)
    for letter, source in zip('ABCD', ['matrix-2x2-empty', 'matrix-4x4-empty', 'matrix-1x4-empty', 'matrix-4x1-empty']):
        names[letter] = crop(source, 18, 0, 12, 9)
    forms = {}
    for kind, source in [('matrix', 'matrix-size-confirm'), ('vector', 'vector-size-confirm')]:
        fields = 2 if kind == 'matrix' else 1
        forms[kind] = {
            'title':crop(source, 0, 0, 188, 15),
            'labels':[crop(source, 0, 16 * (i + 1), 143, 15) for i in range(fields)],
            'confirm':crop(source, 0, 16 * (fields + 1), 188, 15, lambda p: int(p == 0)),
        }
    english_forms = {}
    for kind in ('matrix','vector'):
        fields = 2 if kind == 'matrix' else 1
        source = 'en-'+kind+'-size-confirm'
        english_forms[kind] = {
            'title':crop(source,0,0,188,15),
            'labels':[crop(source,0,16*(i+1),143,15) for i in range(fields)],
            'confirm':crop(source,0,16*(fields+1),188,15,lambda p:int(p == 0))}
    postfix = {char:crop(name, 44, 0, 11, 12)
               for char, name in [('²','matrix-square'), ('³','matrix-power-three'), ('¹','matrix-power-inverse')]}
    compact = {str(digit):crop('matrix-compact-exponents', 53 + digit % 4 * 42, 10 + digit // 4 * 10, 6, 7)
               for digit in range(10)}
    compact['×10'] = crop('matrix-wide-cells', 41, 10, 12, 7)
    compact['−'] = crop('matrix-wide-cells', 131, 10, 6, 4)
    return {'names':names, 'forms':forms, 'postfix':postfix, 'compact':compact,
            'en':{'forms':english_forms,'prompt':{kind:crop('en-'+kind+'-idle',0,34,192,29) for kind in ('matrix','vector')}},
            'detE':crop('matrix-determinant-input', 11, 0, 11, 12),
            'exponentZero':crop('matrix-compact-exponents', 181, 49, 9, 7),
            'prompt':{source:crop(source + '-idle', 0, 34, 192, 29) for source in ('matrix','vector')}}


def build_base_distribution():
    base_titles = {base:crop(sample, 0, 0, 192, 14) for base, sample in
                   [('dec','base-entry'),('hex','base-hex-empty'),('bin','base-bin-empty'),('oct','base-oct-empty')]}
    base_font = {}
    for sample, indices in [
        ('base-prefix-letters', [('d',0),('h',2),('o',4)]),
        ('base-prefix-input', [('b',0)]),
        ('base-logic-input', [('a',2),('n',3),('d',4)]),
        ('base-neg-input', [('N',0),('e',1),('g',2)]),
        ('base-not-input', [('t',2)]),
        ('base-xor-input', [('x',2),('o',3),('r',4)]),
        ('base-hex-digits', [(char,i) for i, char in enumerate('ABCDEF')]),
    ]:
        for char, i in indices:
            base_font[char] = crop(sample, i * 11, 14, 11, 13 if char == 'g' else 12)
    dist_titles = {kind:crop(sample, 0, 0, 188, 15) for kind, sample in
                   [('normal-pd','special-distribution-normal-form'), ('inverse-normal','dist-inverse-default'),
                    *((kind,'dist-' + kind + '-default') for kind in ('normal-cd','binomial-pd','binomial-cd','poisson-pd','poisson-cd'))]}
    fields = {}
    for key, sample, row, selected in [
        ('x','dist-poisson-pd-default',1,True), ('N','dist-binomial-pd-default',2,False),
        ('p','dist-binomial-pd-default',3,False), ('λ','dist-poisson-pd-default',2,False),
        ('Lower','dist-normal-cd-default',1,True), ('Upper','dist-normal-cd-default',2,False),
        ('Area','dist-inverse-default',1,True), ('μ','dist-inverse-default',2,False), ('σ','dist-inverse-default',3,False),
    ]:
        fields[key] = crop(sample, 0, row * 16, 77, 15, lambda p: int(p == 0) if selected else int(p != 0))
    captions = {kind:crop('dist-' + kind + '-list-empty', 104, 0, 88, 30)
                for kind in ('binomial-pd','binomial-cd','poisson-pd','poisson-cd')}
    english_fields = dict(fields)
    for key,sample,row,selected in [
        ('Lower','en-distribution-normal-cd-fields',1,True),
        ('Upper','en-distribution-normal-cd-fields',2,False),
        ('Area','en-distribution-inverse-fields',1,True)]:
        english_fields[key] = crop(sample,0,row*16,77,15,
                                  (lambda p:int(p == 0)) if selected else (lambda p:int(p != 0)))
    english_titles = {kind:crop('en-distribution-'+sample+'-fields',0,0,188,15) for kind,sample in
                      [('binomial-pd','binomial'),('binomial-cd','binomial-cd'),('normal-pd','normal'),
                       ('normal-cd','normal-cd'),('inverse-normal','inverse'),('poisson-pd','poisson'),('poisson-cd','poisson-cd')]}
    return {
        'base': {'titles':base_titles,'font':base_font,'ansA':crop('flow-apps-base-same-ans',0,14,11,12),
                 'prompt':crop('base-entry',0,34,192,29),
                 'en':{'titles':{base:crop(sample,0,0,192,14) for base,sample in
                                [('dec','en-base-decimal'),('hex','en-base-binary'),('bin','en-base-octal'),('oct','en-base-hexadecimal')]},
                       'prompt':crop('en-base-decimal',0,34,192,29)}},
        'distribution': {'titles':dist_titles,'fields':fields,'captions':captions,
                         'en':{'titles':english_titles,'fields':english_fields,
                               'captions':{kind:crop('en-distribution-'+sample+'-list',104,0,88,30) for kind,sample in
                                           [('binomial-pd','binomial'),('binomial-cd','binomial-cd'),('poisson-pd','poisson'),('poisson-cd','poisson-cd')]},
                               'inverseResult':crop('en-distribution-inverse-result',0,0,188,15)},
                         'headingP':crop('dist-binomial-pd-list-empty',62,0,41,9),
                         'probabilityResult':crop('dist-binomial-pd-result',0,0,22,15),
                         'inverseResult':crop('dist-inverse-result',0,0,188,15)}
    }


def build():
    normal, script = build_math()
    labels, hints, glyphs, chrome = build_menu()
    long = frame('long')
    symbols = {
        'combinatoric':{char:crop(sample,11,0,11,12) for char,sample in
                       [('P','catalog-permutation'),('C','catalog-combination')]},
        'engineer':{char:crop('catalog-engineer-'+name,11,0,11,13 if char in ('μ','p') else 12) for char,name in
                    [('m','milli'),('μ','micro'),('n','nano'),('p','pico'),('f','femto'),
                     ('k','kilo'),('M','mega'),('G','giga'),('T','tera'),('P','peta'),('E','exa')]},
        'recE':crop('catalog-polar-rect',11,0,11,12),
        'angleDegree':crop('catalog-degrees',66,0,11,12),
        'recurringLeft':crop('catalog-recurring-result',22,0,11,13),
        'recurringRight':crop('catalog-recurring-result',44,0,11,13),
        'radical': crop('rootResult', 0, 0, 9, 16),
        'placeholder': crop('fracEmpty', 3, 17, 10, 13, lambda p: int(bool(p))),
        'scriptPlaceholder': crop('integralEmpty', 11, 2, 6, 9, lambda p: int(bool(p))),
        'activeScriptPlaceholder': crop('powEmpty', 11, 0, 6, 9, lambda p: int(bool(p))),
        'errorAlert': crop('mathError', 85, 21, 22, 21),
        'errorBack': crop('mathError', 0, 48, 188, 15),
        'errorMath': crop('mathError', 0, 0, 188, 15),
        'errorStack': crop('expression-limits-bitex-nested-result', 0, 0, 188, 15),
        'errorTimeout': crop('expression-limits-timeout-derivative-result', 0, 0, 188, 15),
        'errorSolve': crop('eq-solver-no-root', 0, 0, 188, 15),
        'errorArgument': crop('dist-normal-cd-invalid', 0, 0, 188, 15),
        'errorSyntax': crop('syntaxError', 0, 0, 188, 15),
        'errorMemory':crop('sheet-edge-vi-memory-error',0,0,188,15),
        'errorDimension':crop('array-dimension-add-error-vi',0,0,188,15),
        'errorCircular': crop('sheet-circular-error', 0, 0, 188, 15),
        'errorNotDefined': crop('calc-function-undefined', 0, 0, 188, 15),
        'scrollLeft': crop('long', 0, 0, 11, 13),
        'scrollRight': encode((long[y * WIDTH + x]
                              for y in range(13) for x in reversed(range(11))), 11, 13),
        'resultScrollRight': crop('calc-memory-zero', 181, 7, 11, 7),
        'radicalTall': crop('nested', 35, 0, 9, 20, lambda p: int(bool(p))),
        'openTall': crop('nested', 2, 0, 11, 20, lambda p: int(bool(p))),
        'closeTall': crop('nested', 66, 0, 13, 20, lambda p: int(bool(p))),
        'scientificBase': crop('scientific', 150, 49, 22, 12),
        'smallNegative': crop('exp-negative', 44, 0, 6, 9),
        'scientificNegativeBase': crop('exp-negative', 150, 49, 22, 12),
        'openFraction': crop('tallParen', 0, 0, 11, 29),
        'closeFraction': crop('tallParen', 26, 0, 11, 29),
        'scriptOpenTall': crop('math-tall-exp-paren-fraction-result',11,0,6,22),
        'scriptCloseTall': crop('math-tall-exp-paren-fraction-result',27,0,6,22),
        'integral': crop('integralEmpty', 0, 0, 11, 31, lambda p: int(bool(p))),
        'integralDx': crop('integralEmpty', 31, 11, 22, 12, lambda p: int(bool(p))),
        'sum': crop('sumEmpty', 2, 10, 15, 13, lambda p: int(bool(p))),
        'product': crop('rare-product', 2, 10, 15, 13, lambda p: int(bool(p))),
        'supMinus': crop('rare-reciprocal', 11, 0, 6, 9),
        'supOne': crop('rare-reciprocal', 17, 0, 8, 9),
        'functionInverse': crop('hyperbolic-trig-asinh-one-input',44,0,11,12),
        'functionInverseSmall': crop('math-script-inverse-trig',29,0,6,9),
        'indexEquals': crop('sumEmpty', 1, 24, 12, 9, lambda p: int(bool(p))),
        'derivative': crop('derivativeFilled', 0, 0, 26, 29, lambda p: int(bool(p))),
        'evalBar': crop('derivativeFilled', 68, 8, 2, 22, lambda p: int(bool(p))),
        'evalEquals': crop('derivativeFilled', 72, 19, 13, 9, lambda p: int(bool(p))),
        'derivativeOpen': crop('derivativeFilled', 26, 4, 11, 16, lambda p: int(bool(p))),
        'derivativeClose': crop('derivativeFilled', 56, 4, 11, 16, lambda p: int(bool(p))),
        'radicalOpen': crop('precedence-implicit-sqrt-result', 22, 0, 11, 16),
        'radicalClose': crop('precedence-implicit-sqrt-result', 69, 0, 11, 16),
        'reciprocalLinear': crop('special-power-complex-reciprocal-after-power',55,0,11,12),
    }
    scientific = {str(i): crop('exp-' + str(i), 181, 49, 9, 7) for i in range(10)}
    scientific['0'] = crop('flow-settings-integer-sci-older',181,49,9,7)
    script['−'] = symbols['smallNegative']
    script['-'] = crop('complex-format-small-sci3',110,0,6,9)
    script['+'] = crop('math-script-binary-plus',17,0,6,9)
    script['×'] = crop('math-script-binary-multiply',17,0,6,9)
    script['('] = crop('math-script-parentheses',11,0,6,9)
    script[')'] = crop('math-script-parentheses',35,0,6,9)
    for char in 'ABCDEFyze':
        script[char] = crop('math-script-variable-palette',11+6*'ABCDEFxyzeπ'.index(char),0,6,9)
    for char,x in {'s':11,'i':17,'n':23,'c':53,'o':59,'t':95,'a':101}.items():
        script[char] = crop('math-script-trig-palette',x,0,6,9)
    for char,x in {'l':11,'g':23}.items():
        script[char] = crop('math-script-log-palette',x,0,6,9)
    script['h'] = crop('math-script-hyperbolic',29,0,6,9)
    script['𝑖'] = crop('math-script-imaginary-input',11,0,6,9)
    quick_captures = ['catalog-quick-0','catalog-quick-last','catalog-quick-third','catalog-quick-4','catalog-quick-5']
    quick = [crop(name, col * 63, row * 12, 63, 12)
             for name in quick_captures for row in range(1 if name == quick_captures[-1] else 5)
             for col in range(3)]
    verify_quick = ['verify-quick'] + [f'verify-quick-page-{i}' for i in range(1, 5)]
    result = {'normal': normal, 'script': script, 'scientific': scientific, 'quick': quick,
              'home': {language: build_home(language) for language in ('vi', 'en')},
              'labels': labels, 'hints': hints, 'glyphs': glyphs, 'menu': chrome, 'symbols': symbols,
              'status': build_status(), 'special': build_special(), 'arrays': build_arrays(),
              'numberLine': build_number_line(), 'circle': build_circle(), 'geometry': build_geometry(),
              'explorer': build_explorer(),
              'trials': build_trials(),
              'memory': build_memory(),
              'verifyLinear': {
                  language:{outcome:crop(sample,192-width,14,width,14)
                            for outcome,sample,width in samples}
                  for language,samples in {
                      'vi':[('true','shared-eval-verify-line-chain',44),('false','shared-eval-verify-line-false',33)],
                      'en':[('true','shared-eval-verify-line-english-true',44),('false','shared-eval-verify-line-english-false',55)]
                  }.items()},
              'numberMenus':build_number_menus(),
              'constants': build_catalog_grid(CONSTANTS,'constant'),
              'conversions': build_catalog_grid(CONVERSIONS,'conversion'),
              'englishControls':{'run':crop('en-probability-independent-form',0,48,188,15),
                                 'runOff':crop('en-distance-points-form',0,48,188,15),
                                 'confirm':crop('en-point-input-confirm',0,48,188,15,lambda p:int(p == 0))},
              'equations': build_equations(),
              'sheet': {'autoTitle':crop('sheet-auto-menu', 0, 0, 188, 15),
                        'fillFormula':crop('sheet-fill-formula-form', 0, 0, 188, 15),
                        'fillValue':crop('sheet-fill-value-form', 0, 0, 188, 15),
                        'formulaField':crop('sheet-fill-range-selected', 0, 16, 66, 15),
                        'valueField':crop('sheet-fill-value-form', 0, 16, 77, 15, lambda p: int(p == 0)),
                        'rangeField':crop('sheet-fill-formula-form', 0, 32, 77, 15),
                        'fillConfirm':crop('sheet-fill-range-selected', 0, 48, 188, 15),
                        'fillConfirmOff':crop('sheet-fill-formula-form', 0, 48, 188, 15),
                        'paste':crop('sheet-copy-pick', 0, 48, 192, 15),
                        'cutIcon':crop('sheet-cut-pick', 0, 48, 11, 15),
                        'memory':crop('sheet-memory-empty', 44, 0, 148, 15),
                        'grab':crop('sheet-grab-select', 0, 48, 192, 15),
                        'cellError':crop('sheet-circular-return', 29, 10, 30, 7),
                        'errorValue':crop('sheet-fill-value-math-second-cell',137,49,55,12)},
              'ratio': {'coefficientMinus':crop('ratio-scale-negative-input',9,20,6,9),
                        'engineeringArrows':crop('ratio-a-int-eng', 181, 48, 11, 15),
                        'engineeringZero':crop('ratio-a-int-eng', 171, 49, 9, 7),
                        'dms':{char:crop('ratio-a-int-dms', x, 49, 11, 12)
                               for char, x in [('°', 137), ('′', 159), ('″', 181)]}},
              'complex': {
                  'quick': [crop('complex-quick', col * 63, row * 12, 63, 12)
                            for row in range(5) for col in range(3)],
                  'quickScrollbar': crop('complex-quick', 190, 0, 2, HEIGHT),
                  'realPartE': crop('complex-real-part', 11, 0, 11, 12),
                  'verifySigns': {op:crop('complex-verify-catalog', (i % 2) * 99 + 11, (i // 2) * 16, 78, 15,
                                          (lambda p: int(p == 0)) if i == 0 else (lambda p: int(p != 0)))
                                  for i, op in enumerate('=≠><≥≤')},
                  'noOperator': crop('complex-verify-no-operator', 0, 0, 188, 15),
                  'chooseOperator': crop('complex-verify-no-operator', 0, 32, 188, 15, lambda p: int(p == 0)),
                  'verifyBack': crop('complex-verify-no-operator', 0, 48, 188, 15)
              },
              'verify': {
                  'quick': [[crop(name, i % 3 * 63, i // 3 * 12, 63, 12)
                             for i in range(4 if page == 4 else 15)] for page, name in enumerate(verify_quick)],
                  'scrollbars': [crop(name, 190, 0, 2, HEIGHT) for name in verify_quick]
              },
              **build_base_distribution()}
    result['reset'] = {language:{
        'titles':{kind:crop('reset-'+language+'-'+kind+'-prompt',0,0,188,31)
                  for kind in ('setup','memory','all')},
        'yes':crop('reset-'+language+'-setup-prompt',0,32,188,15,lambda p:int(p == 0)),
        'cancel':crop('reset-'+language+'-setup-prompt',0,48,188,15),
    } for language in ('en','vi')}
    for language,names in [('en',['Settings & Data','Variable Memory','Initialize All']),
                           ('vi',['Cđặt & Dữ liệu','Biến nhớ','Khởi tạo tất cả'])]:
        for index,name in enumerate(names):
            labels[name] = crop('reset-'+language+'-menu',11,index*16,165,15,
                                (lambda p:int(p == 0)) if index == 0 else (lambda p:p))
    result['englishControls']['confirmOff'] = crop('en-line-bounds',0,48,188,15)
    result['complex']['en'] = {
        'noOperator':crop('en-verify-no-operator',0,0,188,15),
        'chooseOperator':crop('en-verify-no-operator',0,32,188,15,lambda p:int(p == 0)),
        'verifyBack':crop('en-verify-no-operator',0,48,188,15)}
    result['trials']['en'] = {
        'fields':[crop('en-dice-form',0,row*16,143,15,
                       (lambda p:int(p == 0)) if row == 0 else (lambda p:p)) for row in range(3)],
        'off':crop('en-dice-form',143,32,33,15),
        'coinCount':crop('en-coin-form',0,0,143,15,lambda p:int(p == 0)),
        'attemptsTitle':crop('en-dice-attempts-edit',0,0,188,15),
        'confirm':crop('en-dice-attempts-edit',0,48,188,15),
        'viewTitle':crop('en-dice-view-menu',0,0,188,15),
        'attemptsLabel':crop('en-coin-frequency-reference',100,0,92,15),
        'frequencyHeader':crop('en-coin-frequency-reference',0,0,100,9),
    }
    result['numberLine']['en'] = {
        'windowFields':[crop('en-line-window',0,row*16,77,15,
                            (lambda p:int(p == 0)) if row == 0 else (lambda p:p)) for row in range(2)],
        **result['englishControls'],
    }
    result['circle']['en'] = {
        'formLabels':{kind:crop(sample,0,0,188,15,
                               (lambda p:int(p == 0)) if kind == 'unit' else (lambda p:p))
                      for kind,sample in (('unit','en-circle-form'),('semi','en-circle-half-form'),('clock','en-circle-clock-form'))},
    }
    result['sheet']['en'] = {
        'autoTitle':crop('en-sheet-auto-menu',0,0,188,15),
        'fillFormula':crop('en-sheet-fill-formula',0,0,188,15),
        'fillValue':crop('en-sheet-fill-value',0,0,188,15),
        'formulaField':crop('en-sheet-fill-formula',0,16,66,15,lambda p:int(p == 0)),
        'valueField':crop('en-sheet-fill-value',0,16,77,15,lambda p:int(p == 0)),
        'rangeField':crop('en-sheet-fill-range',0,32,77,15,lambda p:int(p == 0)),
        'fillConfirm':crop('en-sheet-confirm-ready',0,48,188,15,lambda p:int(p == 0)),
        'fillConfirmOff':crop('en-sheet-fill-formula',0,48,188,15),
        'memory':crop('en-sheet-memory-empty',44,0,148,15),
        'paste':crop('en-sheet-copy-paste',0,48,192,15),
        'grab':crop('en-sheet-grab',0,48,192,15),
    }
    path = ROOT / 'web/assets/lcd-classpad-880.js'
    path.write_text("'use strict';\n// Generated by tools/build-lcd-atlas.py from observed ClassPad pixels.\n"
                    + 'const CLASS_PAD_LCD = ' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    build()
