'use strict';

// Cổng trao đổi dữ liệu (web/bridge.js, calculator.exportData, engine.exportData):
// cùng định dạng với emulator580 để trang chứa dùng chung cho hai model.
const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');

const web = join(__dirname, '..', 'web');
const html = readFileSync(join(web, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script defer src="([^"]+)"/g)].map(match => match[1])
  .filter(filename => !['core/touch.js', 'lcd.js', 'app.js', 'bridge.js'].includes(filename));
const source = scripts.map(filename => readFileSync(join(web, filename), 'utf8')).join('\n');
const {createCalculator880} = runInNewContext(source + '\n({createCalculator880});', {atob, btoa});

function calculator() {
  const instance = createCalculator880();
  return {press(...keys) { keys.forEach(instance.press); return JSON.parse(JSON.stringify(instance.exportData())); }, instance};
}

test('index.html nạp bridge.js trước app.js và có thẻ khai báo origin để trống (cổng tắt)', () => {
  const order = [...html.matchAll(/<script defer src="([^"]+)"/g)].map(match => match[1]);
  assert.equal(order.at(-1), 'app.js');
  assert.ok(order.indexOf('bridge.js') >= 0 && order.indexOf('bridge.js') < order.indexOf('app.js'));
  assert.match(html, /<meta name="bitex-export-origins" content="">/);
});

test('Màn hình chọn ứng dụng và ứng dụng chưa hỗ trợ trả unsupported', () => {
  const c = calculator();
  const home = c.press();
  assert.equal(home.v, 1);
  assert.equal(home.model, 'fx-880BTG PLUS');
  assert.equal(home.app, null);
  assert.equal(home.unsupported, true);
  assert.equal(c.press('8').unsupported, true);
  assert.equal(c.press('home', '4').unsupported, true);
});

test('Tính thường: chuỗi trao đổi ASCII, chuỗi hiển thị và giá trị', () => {
  const c = calculator();
  const input = c.press('1', '1', 'fraction', '2', 'right', 'add', 'sin', '3', '0', 'close');
  assert.equal(input.mode, 'calculate');
  assert.equal(input.expr, '((1)/(2))+sin(30)');
  assert.equal(input.value, null);
  const result = c.press('exe');
  assert.equal(result.value, 1);
  assert.equal(result.text, '1/2+sin(30)');
  assert.equal(c.press('ac', 'x', 'square', 'subtract', '2', 'x').expr, '(x^2)-(2*x)');
  assert.equal(c.press('ac', 'shift', '7', 'multiply', '2').expr, 'pi*2');
});

test('Lỗi: Math ERROR có biểu thức; dấu (−) đặt sai có vị trí node lỗi', () => {
  const c = calculator();
  const math = c.press('1', '8', 'divide', '0', 'exe');
  assert.equal(math.error.message, 'Math ERROR');
  assert.equal(math.error.expr, '8/0');
  assert.deepEqual(math.error.tree, [{c: '8'}, {c: '÷'}, {c: '0'}]);
  const c2 = calculator();
  const syntax = c2.press('1', '3', 'shift', 'subtract', '5', 'exe');
  assert.equal(syntax.error.message, 'Syntax ERROR');
  assert.equal(syntax.error.expr, null);
  assert.deepEqual(syntax.error.at, [1]);
  assert.equal(syntax.error.tree[1].neg, 1);
});

test('Bảng giá trị: f(x), khoảng và các dòng đã sinh', () => {
  const c = calculator();
  const fn = c.press('5', 'tools', '2', '1', 'x', 'square', 'exe');
  assert.equal(fn.mode, 'table');
  assert.equal(fn.f, '(x^2)');
  assert.deepEqual(fn.rows, []);
  const table = c.press('tools', '1', '1', 'exe', '5', 'exe', '1', 'exe', 'exe');
  assert.deepEqual([table.start, table.end, table.step], [1, 5, 1]);
  assert.deepEqual(table.rows.map(r => [r.x, r.f]), [[1, 1], [2, 4], [3, 9], [4, 16], [5, 25]]);
});

test('Phương trình: bậc hai có nghiệm và cực trị; hệ hai ẩn theo hàng', () => {
  const c = calculator();
  const before = c.press('6', '2', '1', '1', 'exe', '5', 'exe', 'shift', 'subtract', '6', 'exe');
  assert.equal(before.solved, false);
  assert.deepEqual(before.coefficients, [1, 5, -6]);
  const poly = c.press('exe');
  assert.equal(poly.type, 'poly2');
  assert.deepEqual(poly.solutions.map(s => [s.re, s.im]), [[1, 0], [-6, 0]]);
  assert.deepEqual(poly.extrema, [{kind: 'min', x: -2.5, y: -12.25}]);
  const sys = calculator().press('6', '1', '1', '4', 'exe', '6', 'exe', '3', 'exe', '1', 'exe', '3', 'exe', '2', 'exe', 'exe');
  assert.equal(sys.group, 'simul');
  assert.deepEqual(sys.coefficients, [[4, 6, 3], [1, 3, 2]]);
  assert.equal(sys.solutions[0].re, -0.5);
  assert.ok(Math.abs(sys.solutions[1].re - 5 / 6) < 1e-12);
});

test('Bất phương trình: hệ số và tập nghiệm dạng các khoảng (vô cực là null)', () => {
  const ineq = calculator().press('7', '2', '1', '1', 'exe', 'shift', 'subtract', '3', 'exe', '2', 'exe', 'exe');
  assert.equal(ineq.type, 'poly3-gt');
  assert.deepEqual(ineq.coefficients, [1, -3, 2, 0]);
  assert.equal(ineq.solved, true);
  assert.deepEqual(ineq.result, {kind: 'set', segments: [
    {low: 0, high: 1, includeLow: false, includeHigh: false},
    {low: 2, high: null, includeLow: false, includeHigh: false}]});
});

test('Thống kê: kiểu, hai biến và các dòng số liệu', () => {
  const one = calculator().press('2', '1', '1', 'exe', '2', 'exe', '3', 'exe', '4', 'exe');
  assert.equal(one.type, '1var');
  assert.equal(one.twoVar, false);
  assert.deepEqual(one.rows.map(r => r.x), [1, 2, 3, 4]);
  const two = calculator().press('2', '2', '1', 'exe', '2', 'exe', '3', 'exe', 'up', 'up', 'up', 'right', '2', 'exe', '4', 'exe', '6', 'exe');
  assert.equal(two.type, 'linear');
  assert.equal(two.twoVar, true);
  assert.deepEqual(two.rows.map(r => [r.x, r.y]), [[1, 2], [2, 4], [3, 6]]);
});

// ----- bridge.js với cửa sổ giả: chỉ trả lời trang cha có origin đã khai báo -----
function bridgeWorld(origins) {
  const listeners = {message: [], click: []};
  const keys = ['left', 'right', 'delete', 'exe', 'shift', 'subtract', 'ac'].map(id => ({
    id, classList: new Set(), closest() { return this; },
    get className() { return [...this.classList].join(' '); }
  }));
  keys.forEach(k => { k.classList.add = k.classList.add.bind(k.classList); k.classList.remove = k.classList.delete.bind(k.classList); });
  const sent = [];
  const parent = {postMessage(data, origin) { sent.push({data: JSON.parse(JSON.stringify(data)), origin}); }};
  const document = {
    querySelector(sel) {
      if (sel.startsWith('meta')) return {content: origins};
      const id = (sel.match(/data-key="([^"]+)"/) || [])[1];
      return keys.find(k => k.id === id) || null;
    },
    querySelectorAll() { return keys.filter(k => k.classList.has('bitex-guide')); },
    addEventListener(type, fn) { listeners[type].push(fn); }
  };
  const window = {parent, addEventListener(type, fn) { listeners[type].push(fn); }};
  const calculator = {exportData: () => ({v: 1, mode: 'calculate', expr: '1+2'})};
  runInNewContext(readFileSync(join(web, 'bridge.js'), 'utf8'),
    {window, document, calculator, MODEL: 'fx-880BTG PLUS', VERSION: 'test', Object});
  const post = (data, origin = 'https://phs.example', source = parent) => listeners.message.forEach(fn => fn({source, origin, data}));
  const click = key => listeners.click.forEach(fn => fn({target: key}));
  return {sent, post, click, keys, lit: () => keys.filter(k => k.classList.has('bitex-guide')).map(k => k.id)};
}

test('bridge.js: hello, export chỉ trả lời origin đã khai báo; origin lạ bị bỏ qua', () => {
  const w = bridgeWorld('https://phs.example');
  w.post({bitex: 'hello', id: 1});
  assert.equal(w.sent[0].data.model, 'fx-880BTG PLUS');
  assert.ok(w.sent[0].data.features.includes('highlight'));
  assert.equal(w.sent[0].origin, 'https://phs.example');
  w.post({bitex: 'export', id: 2});
  assert.deepEqual(w.sent[1].data, {bitex: 'export', id: 2, ok: true, data: {v: 1, mode: 'calculate', expr: '1+2'}});
  w.post({bitex: 'export', id: 3}, 'https://evil.example');
  assert.equal(w.sent.length, 2);
  const off = bridgeWorld('');
  off.post({bitex: 'hello', id: 1});
  assert.equal(off.sent.length, 0);
});

test('bridge.js: highlight đổi tên phím emulator580 sang phím 880, tô lần lượt theo lượt bấm', () => {
  const w = bridgeWorld('https://phs.example');
  w.post({bitex: 'highlight', id: 1, keys: ['cursor-left', 'negative', 'equals', 'không-có', 'menu-x']});
  assert.equal(w.sent[0].data.keys, 4);
  assert.deepEqual(w.lit(), ['left']);
  w.click(w.keys.find(k => k.id === 'left'));
  assert.deepEqual(w.lit(), ['shift']);
  w.click(w.keys.find(k => k.id === 'ac'));
  assert.deepEqual(w.lit(), ['shift']);
  w.click(w.keys.find(k => k.id === 'shift'));
  w.click(w.keys.find(k => k.id === 'subtract'));
  assert.deepEqual(w.lit(), ['exe']);
  w.post({bitex: 'highlight', id: 2, keys: []});
  assert.deepEqual(w.lit(), []);
});

test('exportData chỉ đọc trạng thái nhập, kết quả, lỗi và các màn chuyên dụng', () => {
  const sequences = [[], ['1','2','add','3'], ['1','2','add','3','exe'],
    ['1','8','divide','0','exe'], ['2','1','1','exe','2','exe'],
    ['5','tools','2','1','x','square','exe'],
    ['6','2','1','1','exe','5','exe','shift','subtract','6','exe','exe'],
    ['7','2','1','1','exe','shift','subtract','3','exe','2','exe','exe']];
  for (const keys of sequences) {
    const c = calculator(); c.press(...keys);
    const before = JSON.stringify({state:c.instance.getState(),history:c.instance.history});
    for (let i=0;i<3;i++) c.instance.exportData();
    assert.equal(JSON.stringify({state:c.instance.getState(),history:c.instance.history}),before,keys.join(','));
  }
});

test('dữ liệu trả ra tách khỏi bảng số liệu và hệ số của máy', () => {
  const stats = calculator();stats.press('2','1','1','exe','2','exe');
  const exported = stats.instance.exportData();exported.rows[0].x=999;
  assert.equal(stats.instance.exportData().rows[0].x,1);
  const equation = calculator();equation.press('6','2','1','1','exe','5','exe','shift','subtract','6','exe');
  const coefficients = equation.instance.exportData();coefficients.coefficients[0]=999;
  assert.equal(equation.instance.exportData().coefficients[0],1);
});

test('bridge.js bỏ qua cửa sổ khác, origin opaque và tên miền gần giống', () => {
  const w=bridgeWorld('https://phs.example');
  w.post({bitex:'export',id:1},'https://phs.example',{});
  w.post({bitex:'export',id:2},'null');
  w.post({bitex:'export',id:3},'https://phs.example.evil.example');
  assert.equal(w.sent.length,0);
  w.post({bitex:'hello',id:4});
  assert.equal(w.sent.length,1);
  assert.equal(w.sent[0].origin,'https://phs.example');
});

test('bridge.js không đăng ký sự kiện khi mở độc lập', () => {
  const window={};window.parent=window;
  window.addEventListener=()=>assert.fail('standalone listener');
  const document={querySelector:()=>assert.fail('standalone configuration lookup')};
  runInNewContext(readFileSync(join(web,'bridge.js'),'utf8'),{window,document});
});
