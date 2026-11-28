# Cổng trao đổi dữ liệu (bridge.js) — fx-880BTG PLUS

Cho phép trang web chứa bản giả lập trong khung (`<iframe>`) đọc dữ liệu đang có trên máy và tô sáng các phím cần bấm. Người dùng vẫn tự bấm phím. Cổng chỉ hoạt động khi máy nằm trong khung của một trang đã được khai báo.

Theo tài liệu đi kèm bản patch, giao thức và định dạng dữ liệu dựa trên cổng emulator580 (`docs/CONG-XUAT-DU-LIEU.md` trong repo `bitexedu/emulator580`, commit `4060792`) để một trang chứa dùng chung cho cả hai model. Nguồn kỳ vọng của lượt tích hợp này là patch và tài liệu được cung cấp; đã kiểm hành vi xuất dữ liệu và thông điệp trên 880, chưa kiểm độc lập commit 580 nói trên hoặc ứng dụng tích hợp của bên nhận.

## Thành phần

| Tệp | Nội dung |
|---|---|
| `web/core/engine.js` | `serializeForExchange(nodes)`, `exportExpressionTree`, `expressionNodePath`; `engine.exportData()`; `exportData()` của handler Bảng giá trị, Thống kê, Phương trình, Bất phương trình; `exportErrorInfo()` khi máy báo lỗi |
| `web/calculator.js` | `calculator.exportData()`: dữ liệu của bộ máy tính toán kèm `model`, `app`; ứng dụng chưa hỗ trợ trả `unsupported` |
| `web/bridge.js` | Nghe `postMessage` từ trang chứa, trả `calculator.exportData()`; tô sáng phím theo lệnh `highlight` |
| `web/index.html` | Thẻ `meta[name="bitex-export-origins"]` (mặc định trống = tắt); nạp `bridge.js` ngay trước `app.js` (công cụ đóng gói demo cần `app.js` đứng cuối) |
| `web/device.css` | Kiểu tô sáng phím `.key.bitex-guide` (có nhấp nháy, tắt khi người dùng chọn giảm chuyển động) |
| `test/bridge.test.js` | Kiểm xuất dữ liệu, chỉ đọc trạng thái, tách bản sao dữ liệu và giới hạn cửa sổ/origin; chạy cùng bộ kiểm: `node --test test/*.test.js` |

Tích hợp cục bộ vào demo.19 từ demo.18. Các hàm xuất chỉ đọc trạng thái; giữ nhánh Verify và những sửa lỗi hiện hành. Số kiểm và phạm vi nghiệm thu thực tế được ghi trong `docs/PROJECT_STATUS.md`; số 6.689 trong bản patch gốc thuộc phiên bản cũ.

## Giao thức

```
trang chứa → máy:  { bitex: 'hello',  id }
máy → trang chứa:  { bitex: 'hello',  id, ok: true, v: 1, model: 'fx-880BTG PLUS', version: '0.7.0-demo.19',
                     features: ['calculate','table','statistics','equation','inequality','error','highlight'], keys: 'fx580' }

trang chứa → máy:  { bitex: 'export', id }
máy → trang chứa:  { bitex: 'export', id, ok: true, data }       // data = calculator.exportData()
                   { bitex: 'export', id, ok: false, error }     // khi có lỗi

trang chứa → máy:  { bitex: 'highlight', id, keys: ['cursor-left', 'negative', 'equals'] }
máy → trang chứa:  { bitex: 'highlight', id, ok: true, keys: 4 }    // số phím tô được; keys: [] để tắt
```

Máy chỉ trả lời tin đến từ trang chứa trực tiếp (`window.parent`) và từ đúng origin đã khai báo; gửi kết quả về đúng origin đó. Origin là giao thức, tên miền và cổng nếu có, không có `/` cuối, đường dẫn hay ký tự đại diện. Dùng HTTPS; HTTP chỉ dùng để thử trên `localhost` / `127.0.0.1`.

**Bật cổng cho một website đã được cho phép**: cấu hình origin chính xác trong HTML của bản phát hành tương ứng, cách nhau bằng dấu cách. Mã nguồn mặc định để trống:

```html
<meta name="bitex-export-origins" content="https://trang-duoc-phep.example https://trang-khac.example">
```

Để trống (mặc định) thì cổng tắt hoàn toàn, máy chạy như cũ. Bản `MO-DEMO.html` dựng bằng `tools/build-preview.py` giữ nguyên thẻ này nên cũng tắt cổng.

**Nhúng iframe và cập nhật gói**: bản Netlify và cấu hình Apache hiện chặn nhúng (`frame-ancestors 'none'`, `X-Frame-Options: DENY`). Chỉ điền meta chưa đủ để nhúng trên hosting. Khi có tên miền được chủ dự án/IT chỉ định, tạo chính sách `frame-ancestors` cho đúng origin đó và xử lý `X-Frame-Options` tương ứng trên riêng bản triển khai được phép. Không mở ký tự đại diện hoặc sửa website khác để thử.

Sau đổi cấu hình, build lại đồng bộ `index.html`, `offline-shell.json`, `release.json` và mã băm; không chèn riêng vào HTML đang được cache. Cổng hiện chỉ được tích hợp cục bộ, chưa bật origin hay phát hành lên Netlify/BITEX. Các ví dụ `.example` là minh họa, không phải tên miền đã được cấp quyền.

## `calculator.exportData()`

Mọi kết quả có `v: 1`, `mode` (chế độ của bộ máy tính toán), `angleUnit` (`deg` | `rad` | `grad`), `model: 'fx-880BTG PLUS'`, `app` (ứng dụng đang mở theo `HOME_APPS`, `null` ở màn hình chọn ứng dụng).

| Ứng dụng | Dữ liệu |
|---|---|
| Ptính thường (`calculate`) | `expr` (chuỗi trao đổi), `text` (chuỗi hiển thị), `value` (số; `null` khi đang gõ) |
| Bảng giá trị (`table`) | `f`, `fText`, `g`, `gText`, `start`, `end`, `step`, `rows: [{x, f, g}]` (chỉ khi bảng đã sinh; ô lỗi là `null`) |
| Thống kê (`statistics`) | `type` (`1var`, `linear`, `quad`, `log`, `exp-e`, `exp-ab`, `power`, `inverse`), `label`, `twoVar`, `frequency`, `rows: [{x, y, f}]` |
| Ptrình (`equation`) | `type` (`poly2`…`poly4`, `simul2`…`simul4`), `group`, `degree` / `unknowns`, `coefficients` (đa thức: bậc cao trước; hệ: n hàng, mỗi hàng n hệ số rồi vế phải), `solved`, `message`, `solutions: [{label, re, im}]`, `extrema: [{kind, x, y}]` |
| Bất Ptrình (`inequality`) | `type` (`poly2-gt`…), `degree`, `relation`, `symbol`, `coefficients`, `solved`, `result` (`{kind:'all'}`, `{kind:'none'}`, `{kind:'set', segments:[{low, high, includeLow, includeHigh}]}`; vô cực là `null`) |
| Màn hình chọn ứng dụng, Phân phối, Bảng tính, Số phức, Hệ đếm cơ số N, Ma trận, Vectơ, Tỉ lệ thức, Hộp Toán học, Khám phá Toán | `unsupported: true` |

**Lỗi** (mọi ứng dụng): khi máy đang hiện màn hình lỗi, có thêm `error = { message, source, text, expr, tree, at }` như emulator580: `message` là loại lỗi (`Math ERROR`, `Syntax ERROR`…, theo chuỗi gốc của bộ máy tính toán, không theo chữ tiếng Việt trên LCD), `text` / `expr` là biểu thức gây lỗi, `tree` là cây gọn (`{c, neg?, k?, s?, e?}` hoặc `{t, <ô>: [...]}`), `at` là đường dẫn tới node lỗi khi máy biết (dấu (−) đặt sau số).

Ví dụ (đã chạy trong `test/bridge.test.js`):

```json
{ "v": 1, "mode": "calculate", "angleUnit": "deg", "expr": "((1)/(2))+sin(30)", "text": "1/2+sin(30)", "value": 1,
  "model": "fx-880BTG PLUS", "app": "calculate" }
{ "v": 1, "mode": "equation", "type": "poly2", "group": "poly", "degree": 2, "coefficients": [1, 5, -6], "solved": true,
  "solutions": [ { "label": "x₁", "re": 1, "im": 0 }, { "label": "x₂", "re": -6, "im": 0 } ],
  "extrema": [ { "kind": "min", "x": -2.5, "y": -12.25 } ], "model": "fx-880BTG PLUS", "app": "equation" }
```

## Chuỗi trao đổi (`expr`, `f`, `g`)

Như emulator580: một dòng ASCII, dấu chấm thập phân; số, `x`, `+ - * / ^ ( ) ,`, `pi`, `e`, `sqrt cbrt root(x,n) abs ln log10 logb(b,x) sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh`. Phân số `((tử)/(mẫu))`, nhân ẩn ghi rõ `*`. Thành phần không dịch được (Σ, ∫, d/dx, Ans, biến nhớ, hằng số khoa học, số thập phân tuần hoàn…) thì `null`; bên nhận dùng `value`, `rows` và `text`.

## Tô sáng phím (`highlight`)

`keys` dùng **bộ tên phím của emulator580** (`data-action`, `data-digit`, `data-shift-action`), để trang chứa không phải biết bàn phím từng model (`hello` trả `keys: 'fx580'`). `bridge.js` đổi sang phím của fx-880BTG PLUS (`data-key` trong `web/model.js`), chức năng SHIFT tô SHIFT trước rồi tới phím chính:

| Tên (emulator580) | Phím fx-880BTG PLUS |
|---|---|
| `0`…`9`, `add`, `subtract`, `multiply`, `divide`, `dot`, `delete`, `shift`, `fraction`, `sqrt`, `square`, `power`, `logn`, `sin`, `cos`, `tan`, `ans`, `on` | cùng tên |
| `clear` · `equals` · `menu` · `optn` | `ac` · `exe` · `home` · `tools` |
| `cursor-up/down/left/right` | `up` / `down` / `left` / `right` |
| `open-paren` · `close-paren` · `times10` · `input-x` · `toggle-exact` | `open` · `close` · `times-ten` · `x` · `format` |
| `negative` · `ln` · `log` · `reciprocal` | SHIFT + `subtract` · SHIFT + `logn` · SHIFT + `square` · SHIFT + `power` |
| `asin` · `acos` · `atan` · `abs` | SHIFT + `sin` · SHIFT + `cos` · SHIFT + `tan` · SHIFT + `multiply` |
| `mixed-number` · `nthroot` · `pi` · `exp` | SHIFT + `fraction` · SHIFT + `sqrt` · SHIFT + `7` · SHIFT + `8` |
| `percent` · `comma` · `toggle-insertion` · `approx` | SHIFT + `divide` · SHIFT + `close` · SHIFT + `delete` · SHIFT + `exe` |

Tên không có phím tương ứng thì bỏ qua; số trả về cho biết đã tô được bao nhiêu phím. Người dùng bấm đúng phím đang sáng thì sang phím kế, hết danh sách thì tắt. Lệnh chỉ đổi lớp CSS, không bấm phím thay người dùng.

## Mở rộng

Thêm ứng dụng mới: viết `exportData()` trong handler tương ứng của `engine.js` (hoặc trả dữ liệu từ `calculator.js` cho ứng dụng không qua handler), thêm tên ứng dụng vào danh sách `supported` của `calculator.exportData()` và `FEATURES` của `bridge.js`, thêm ca vào `test/bridge.test.js`. Đổi cấu trúc dữ liệu thì tăng `v`.
