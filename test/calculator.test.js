'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');

const web = join(__dirname, '..', 'web');
const scripts = [...readFileSync(join(web, 'index.html'), 'utf8').matchAll(/<script defer src="([^"]+)"/g)]
  .map(match => match[1])
  .filter(filename => !['core/touch.js', 'lcd.js', 'app.js'].includes(filename));
const source = scripts.map(filename => readFileSync(join(web, filename), 'utf8')).join('\n');
const factory = runInNewContext(source + '\n({createCalculator880, HOME_APPS, KEYS, groupedStats880, randomTrials880, trialFrequencies880});', {atob,btoa});
const {createCalculator880, HOME_APPS, KEYS} = factory;

function calculator(settings) {
  const instance = createCalculator880(settings);
  return {
    press(...keys) { keys.forEach(instance.press); return instance.getState(); },
    data() { return instance.getState().data; },
    history: instance.history
  };
}

test('HOME selects and scrolls the 14 PLUS apps, including the overlapping last row', () => {
  const c = calculator();
  assert.equal(HOME_APPS.length, 14);
  assert.equal(new Set(KEYS.map(key => key.id)).size, 48);
  assert.equal(c.press('page-down').homeOffset, 6);
  assert.equal(c.press('page-down').homeOffset, 9);
  assert.equal(c.press('right','right','down','right','ok').app, 'math-explorer');
  assert.equal(c.press('home','1').app, 'calculate');
});

test('EXE calculates, replays history, clears errors and distinguishes the negative sign', () => {
  const c = calculator();
  assert.equal(c.press('1','1','2','add','3','exe').data.result, '15');
  assert.equal(c.press('ac','2','multiply','3','exe').data.result, '6');
  assert.equal(c.press('up').data.result, '15');
  assert.equal(c.press('ac','8','divide','0','exe').data.message, 'Math ERROR');
  assert.equal(c.press('right').data.mode, 'error');
  assert.equal(c.press('back').data.mode, 'input');
  assert.equal(c.press('ac','shift','subtract','2','square','exe').data.result, '-4');
});

test('fraction template editing and reversible FORMAT', () => {
  const c = calculator();
  const state = c.press('1','1','fraction','2','right','add','1','fraction','3','exe').data;
  assert.equal(state.exactFraction.num, '5');
  assert.equal(state.exactFraction.den, '6');
  assert.equal(c.press('format').data.exactFraction, undefined);
  assert.equal(c.press('format').data.exactFraction.den, '6');
  assert.equal(c.press('shift','format','2').data.result, '0.8333333333');
});

test('SETTINGS routes input/output, angle and both ×10 modes', () => {
  const c = calculator();
  c.press('1','settings','1','2','2','ac');
  assert.equal(c.press('sin','shift','7','divide','2','close','exe').data.result, '1');
  assert.equal(c.press('ac','1','0','0','divide','2','times-ten','2','exe').data.result, '5000');
  c.press('settings','1','9','2','ac','ac');
  assert.equal(c.press('1','0','0','divide','2','times-ten','2','exe').data.exactFraction.den, '2');
});

test('quick CATALOG selects log, percentage and factorial shortcuts', () => {
  const c = calculator();
  assert.equal(c.press('1','shift','catalog','7','1','0','0','exe').data.result, '2');
  assert.equal(c.press('ac','1','0','shift','divide','exe').data.result, '0.1');
  assert.equal(c.press('ac','5','shift','catalog','0','exe').data.result, '120');
  assert.equal(c.press('ac','shift','8','exe').data.result, '2.718281828');
});

test('VARIABLE recalls, stores and inserts SHIFT variables', () => {
  const c = calculator();
  c.press('1','8','exe','variable','ok','1');
  assert.equal(c.press('ac','shift','4','add','1','exe').data.result, '9');
});

test('polynomial and complex route through the shared engine', () => {
  const c = calculator();
  const eq = c.press('6','2','1','1','exe','5','exe','shift','subtract','6','exe','exe').data;
  assert.equal(eq.result.text, '1');
  assert.equal(c.press('home','8','1','add','shift','9','exe').data.result, '1+i');
});

test('linear system and ratio preserve the input cells on return', () => {
  const c = calculator();
  const eq = c.press('6','1','1','4','exe','6','exe','3','exe','1','exe','3','exe','2','exe','exe').data;
  assert.equal(eq.result.label, 'x');
  c.press('home','page-down','subtract','1','3','exe','8','exe','1','2','exe');
  const ratio = c.press('exe').data;
  assert.equal(ratio.exactFraction.num, '9');
  assert.equal(ratio.exactFraction.den, '2');
});

test('MathExplorer evaluates independence, total probability and Bayes exactly', () => {
  const c = calculator();
  c.press('page-down','page-down','divide','1','1');
  const independent = c.press('0','dot','2','exe','0','dot','5','exe','exe').data;
  assert.equal(independent.exactFraction.num, '1');
  assert.equal(independent.exactFraction.den, '10');
  c.press('back','back','2');
  const total = c.press('down','0','dot','1','exe','0','dot','3','exe','exe').data;
  assert.equal(total.exactFraction.num, '13');
  assert.equal(total.exactFraction.den, '50');
  c.press('back','back','3','down','down','down');
  const bayes = c.press('exe').data;
  assert.equal(bayes.exactFraction.num, '1');
  assert.equal(bayes.exactFraction.den, '13');
});

test('MathExplorer collects grouped frequencies and reports the manual example mean', () => {
  const c = calculator();
  c.press('page-down','page-down','divide','2','1','4','5','exe','1','7','0','exe','5','exe','exe');
  assert.equal(c.data().ranges.length, 5);
  c.press('8','exe','1','0','exe','8','exe','1','0','exe','4','exe','exe');
  assert.equal(c.press('1').data.result, '156.5');
  const results = factory.groupedStats880(145, 5, [8,10,8,10,4]);
  assert.equal(results[1], 41.5);
  assert.equal(results[7].length, 2);
});

test('dice simulation is bounded and the same-result setting reproduces a trial', () => {
  const c = calculator();
  c.press('page-down','page-down','multiply','1','down','down','down','exe','2');
  assert.equal(c.data().mode, 'extras-grid');
  assert.equal(c.data().rows.reduce((count, row) => count + row[1], 0), 5);
  const a = factory.randomTrials880(6,3,250,true);
  const b = factory.randomTrials880(6,3,250,true);
  assert.deepEqual(a, b);
  assert.ok(a.flat().every(n => n >= 1 && n <= 6));
});

test('spreadsheet stores individual cells and clears only the selected cell', () => {
  const c = calculator();
  c.press('4','7','add','5','exe','8','exe','up');
  assert.equal(c.data().selectedText, 'A2 = 8');
  c.press('delete','up');
  assert.equal(c.data().selectedText, 'A1 = 12');
  assert.equal(c.press('down').data.selectedText, 'A2 = ');
});

test('power off blocks input and bounds the key log', () => {
  const c = calculator();
  assert.equal(c.press('1','shift','ac','5').power, false);
  assert.equal(c.press('on').power, true);
  c.press(...Array(505).fill('1'));
  assert.equal(c.history.length, 500);
});

test('Bảng giá trị starts on the grid, defines f(x) and runs Table Range', () => {
  const c = calculator();
  assert.equal(c.press('5').data.screen, 'table');
  assert.equal(c.press('tools','2','1').data.prompt, 'f(x)=');
  assert.equal(c.press('x','square','exe').data.screen, 'table');
  assert.equal(c.press('tools','1','1','exe','5','exe','1','exe','exe').data.columns[1].cells[4].text, '25');
});
