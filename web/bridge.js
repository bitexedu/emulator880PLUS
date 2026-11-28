'use strict';
// Cổng trao đổi dữ liệu: trang chứa bản giả lập trong khung (iframe) hỏi dữ liệu đang có
// trên máy để dùng ở ứng dụng khác (vẽ đồ thị, thống kê…) và nhờ máy tô sáng phím hướng dẫn.
// Cùng giao thức với emulator580 (docs/CONG-TRAO-DOI-DU-LIEU.md) để trang chứa dùng chung cho
// hai model. Chỉ đọc trạng thái và đổi lớp CSS; người dùng vẫn tự bấm phím.
// Mở riêng (không nằm trong khung) hoặc chưa khai báo origin thì không làm gì.
//
//   trang chứa → máy:  { bitex: 'hello', id }
//   máy → trang chứa:  { bitex: 'hello', id, ok: true, v: 1, model: 'fx-880BTG PLUS', features: [...], keys: 'fx580' }
//   trang chứa → máy:  { bitex: 'export', id }
//   máy → trang chứa:  { bitex: 'export', id, ok: true, data }  hoặc  { …, ok: false, error }
//   trang chứa → máy:  { bitex: 'highlight', id, keys: ['cursor-left', 'delete', …] }
//   máy → trang chứa:  { bitex: 'highlight', id, ok: true, keys: số phím tô được }
//
// Tên phím trong highlight dùng bộ tên của emulator580 (data-action / data-shift-action) để
// trang chứa không phải biết bàn phím từng model; bảng KEYMAP đổi sang phím của fx-880BTG PLUS.
// Tên nào không có phím tương ứng thì bỏ qua (số trả về cho biết đã tô được bao nhiêu phím).
(function () {
  if (typeof window === 'undefined' || window.parent === window) return;
  const config = document.querySelector('meta[name="bitex-export-origins"]');
  const allowedOrigins = new Set((config?.content || '').trim().split(/\s+/).filter(Boolean));
  if (!allowedOrigins.size) return;
  const FEATURES = ['calculate', 'table', 'statistics', 'equation', 'inequality', 'error', 'highlight'];
  const same = id => [id];
  const shifted = id => ['shift', id];
  // Tên phím emulator580 → dãy phím fx-880BTG PLUS (web/model.js; chức năng SHIFT theo calculator.js).
  const KEYMAP = {
    on: same('on'), menu: same('home'), shift: same('shift'), optn: same('tools'),
    'cursor-up': same('up'), 'cursor-down': same('down'), 'cursor-left': same('left'), 'cursor-right': same('right'),
    clear: same('ac'), delete: same('delete'), equals: same('exe'),
    add: same('add'), subtract: same('subtract'), multiply: same('multiply'), divide: same('divide'),
    dot: same('dot'), times10: same('times-ten'), 'open-paren': same('open'), 'close-paren': same('close'),
    fraction: same('fraction'), sqrt: same('sqrt'), square: same('square'), power: same('power'), logn: same('logn'),
    sin: same('sin'), cos: same('cos'), tan: same('tan'), ans: same('ans'), 'input-x': same('x'), 'toggle-exact': same('format'),
    negative: shifted('subtract'), ln: shifted('logn'), log: shifted('square'), reciprocal: shifted('power'),
    asin: shifted('sin'), acos: shifted('cos'), atan: shifted('tan'), abs: shifted('multiply'),
    'mixed-number': shifted('fraction'), nthroot: shifted('sqrt'), pi: shifted('7'), exp: shifted('8'),
    percent: shifted('divide'), comma: shifted('close'), 'toggle-insertion': shifted('delete'), approx: shifted('exe')
  };
  for (let d = 0; d <= 9; d++) KEYMAP[String(d)] = same(String(d));

  // ----- Tô sáng LẦN LƯỢT từng phím; bấm đúng phím đang sáng thì sang phím kế -----
  let guide = null;
  const keyEl = id => document.querySelector('#keypad .key[data-key="' + id + '"]');
  function paint() {
    document.querySelectorAll('#keypad .key.bitex-guide').forEach(el => el.classList.remove('bitex-guide'));
    if (!guide || guide.i >= guide.list.length) { guide = null; return; }
    guide.list[guide.i].classList.add('bitex-guide');
  }
  function highlight(names) {
    const list = [];
    for (const name of Array.isArray(names) ? names : []) {
      if (typeof name !== 'string' || !/^[a-z0-9-]+$/.test(name) || !Object.hasOwn(KEYMAP, name)) continue;
      const els = KEYMAP[name].map(keyEl);
      if (els.every(Boolean)) list.push(...els);
    }
    guide = list.length ? { list, i: 0 } : null;
    paint();
    return list.length;
  }
  document.addEventListener('click', event => {
    const key = event.target && event.target.closest ? event.target.closest('.key') : null;
    if (guide && key && key === guide.list[guide.i]) { guide.i++; paint(); }
  }, true);

  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin === 'null' || !allowedOrigins.has(event.origin)) return;
    const msg = event.data;
    if (!msg || typeof msg !== 'object' || !['export', 'hello', 'highlight'].includes(msg.bitex)) return;
    const reply = body => event.source.postMessage({ bitex: msg.bitex, id: msg.id, ...body }, event.origin);
    if (msg.bitex === 'hello') { reply({ ok: true, v: 1, model: MODEL, version: VERSION, features: FEATURES, keys: 'fx580' }); return; }
    if (msg.bitex === 'highlight') { reply({ ok: true, keys: highlight(msg.keys) }); return; }
    try {
      reply({ ok: true, data: calculator.exportData() });
    } catch (e) {
      reply({ ok: false, error: String(e && e.message || e) });
    }
  });
})();
