'use strict';

const MODEL = 'fx-880BTG PLUS';
const VERSION = '0.7.0-demo.19';

// A portable demo can embed the same assets; hosted builds use normal URLs.
function assetURL880(path) {
  return typeof BUNDLED_ASSETS880 === 'object' && BUNDLED_ASSETS880[path] || path;
}

const HOME_APPS = [
  ['1', 'calculate', 'Ptính thường', 'Calculate'],
  ['2', 'statistics', 'Thống kê', 'Statistics'],
  ['3', 'distribution', 'Phân phối', 'Distribution'],
  ['4', 'spreadsheet', 'Bảng tính', 'Spreadsheet'],
  ['5', 'table', 'Bảnggiá trị', 'Table'],
  ['6', 'equation', 'Ptrình', 'Equation'],
  ['7', 'inequality', 'Bất Ptrình', 'Inequality'],
  ['8', 'complex', 'Số phức', 'Complex'],
  ['9', 'base-n', 'Hệđếm cơsố N', 'Base-N'],
  ['0', 'matrix', 'Ma trận', 'Matrix'],
  ['add', 'vector', 'Vectơ', 'Vector', '+'],
  ['subtract', 'ratio', 'Tỉ lệ thức', 'Ratio', '−'],
  ['multiply', 'math-box', 'HộpToánhọc', 'Math Box', '×'],
  ['divide', 'math-explorer', 'KhámPháToán', 'MathExplorer', '÷']
].map(([key, id, vi, en, hint = key], index) => ({key, id, vi, en, hint, icon: index + 1}));

// Key centers on the common 506 × 1059 crop of the four product TIFFs.
const FACE_WIDTH = 506;
const FACE_HEIGHT = 1059;
const KEYS = [
  ['on', 'ON', 68, 411, 49],
  ['home', 'HOME', 141, 414, 61],
  ['up', '↑', 289, 414, 61],
  ['page-up', '⇈', 437, 420, 60, 64],
  ['page-down', '⇊', 437, 476, 60, 54],
  ['settings', 'SETTINGS', 68, 479, 60],
  ['back', 'Quay lại', 142, 479, 60],
  ['left', '←', 215, 479, 60],
  ['ok', 'OK', 289, 479, 60],
  ['right', '→', 363, 479, 60],
  ['shift', 'SHIFT', 68, 556, 61],
  ['variable', 'VARIABLE', 142, 557, 61],
  ['function', 'FUNCTION', 216, 557, 61],
  ['down', '↓', 289, 543, 60],
  ['catalog', 'CATALOG', 364, 557, 61],
  ['tools', 'TOOLS', 438, 557, 61],
  ...[
    [['x', 'x'], ['fraction', 'Phân số'], ['sqrt', '√'], ['power', 'Lũy thừa'], ['square', 'x²'], ['logn', 'log cơ số']],
    [['ans', 'Ans'], ['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan'], ['open', '('], ['close', ')']]
  ].flatMap((row, rowIndex) => row.map(([id, name], index) =>
    [id, name, [68, 142, 216, 290, 364, 438][index], [622, 686][rowIndex], 65])),
  ...[
    [['7', '7'], ['8', '8'], ['9', '9'], ['delete', 'DEL'], ['ac', 'AC']],
    [['4', '4'], ['5', '5'], ['6', '6'], ['multiply', '×'], ['divide', '÷']],
    [['1', '1'], ['2', '2'], ['3', '3'], ['add', '+'], ['subtract', '−']],
    [['0', '0'], ['dot', '.'], ['times-ten', '×10ˣ'], ['format', 'FORMAT'], ['exe', 'EXE']]
  ].flatMap((row, rowIndex) => row.map(([id, name], index) =>
    [id, name, [72, 162, 253, 344, 435][index], [759, 835, 911, 987][rowIndex], 79]))
].map(([id, label, x, y, width, height = width]) => ({id, label, x, y, width, height}));

const KEYBOARD = {
  Enter: 'exe', '=': 'exe', Escape: 'ac', Backspace: 'delete', Delete: 'delete',
  Home: 'home', PageUp: 'page-up', PageDown: 'page-down', F1: 'shift', F2: 'settings',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide', '^': 'power',
  '.': 'dot', ',': 'dot', '(': 'open', ')': 'close',
  x: 'x', s: 'sin', c: 'cos', t: 'tan', f: 'fraction', r: 'sqrt', d: 'format'
};
