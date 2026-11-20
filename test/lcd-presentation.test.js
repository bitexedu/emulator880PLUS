'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {runInNewContext} = require('node:vm');
const native = require('./fixtures/classpad-880-math-nested-cursor-order-lcd.json');

const web = join(__dirname, '..', 'web');
const files = [...readFileSync(join(web, 'index.html'), 'utf8').matchAll(/<script defer src="([^"]+)"/g)]
  .map(match => match[1])
  .filter(name => !['core/touch.js', 'lcd.js', 'app.js'].includes(name));
const source = files.map(name => readFileSync(join(web, name), 'utf8')).join('\n');
const api = runInNewContext(source + '\n({createCalculator880, buildLCDFrame880, lcdTonePath880, lcdCursorPath880, lcdStatusVector880, CLASS_PAD_LCD})', {atob, btoa});

// Rasterize SVG rectangle geometry independently of the run generator. This
// checks the exact occupied native cells, including holes and row boundaries.
function paintPath(pixels, width, height, path, tone = 1) {
  const tokens = path.match(/[Mhvz]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || [];
  let at = 0;
  while (at < tokens.length) {
    assert.equal(tokens[at++], 'M');
    const x = Number(tokens[at++]), y = Number(tokens[at++]);
    assert.equal(tokens[at++], 'h');
    const w = Number(tokens[at++]);
    assert.equal(tokens[at++], 'v');
    const h = Number(tokens[at++]);
    assert.equal(tokens[at++], 'h');
    assert.equal(Number(tokens[at++]), -w);
    assert.equal(tokens[at++], 'z');
    assert.ok(Number.isInteger(x) && Number.isInteger(y));
    assert.ok(Number.isInteger(w) && w > 0);
    assert.ok(Number.isInteger(h) && h > 0);
    for (let row = Math.max(0, y); row < Math.min(height, y + h); row++) {
      for (let col = Math.max(0, x); col < Math.min(width, x + w); col++) {
        pixels[row * width + col] = tone;
      }
    }
  }
}

function decode(encoded) {
  const pixels = [];
  for (const byte of Buffer.from(encoded, 'base64')) {
    for (let i = 0; i < (byte & 63); i++) pixels.push(byte >> 6);
  }
  return Uint8Array.from(pixels);
}

test('SVG tone paths preserve holes, all three ink tones and row-edge runs', () => {
  const width = 7, height = 4, offset = 12;
  const original = Uint8Array.from([
    1,1,0,2,2,3,3,
    3,0,0,1,1,1,1,
    1,1,1,0,2,0,3,
    3,3,3,3,3,3,3
  ]);
  const restored = new Uint8Array(width * (height + offset));
  for (let tone = 1; tone <= 3; tone++) {
    paintPath(restored, width, height + offset,
      api.lcdTonePath880(original, width, height, tone, offset), tone);
  }
  assert.ok(restored.subarray(0, width * offset).every(value => value === 0), 'body cannot enter the indicator strip');
  assert.deepEqual(restored.subarray(width * offset), original);
});

test('transparent LCD cells produce no ink or filled background path', () => {
  const blank = new Uint8Array(192 * 63);
  assert.equal(api.lcdTonePath880(blank, 192, 63, 0, 12), '');
  for (let tone = 1; tone <= 3; tone++) {
    assert.equal(api.lcdTonePath880(blank, 192, 63, tone, 12), '');
  }
});

test('SVG presentation reproduces accepted native MathI bodies and caret shapes', () => {
  for (const [name, keys] of Object.entries(native.keys)) {
    const calculator = api.createCalculator880();
    keys.forEach(key => calculator.press(key));
    const frame = api.buildLCDFrame880(calculator.getState());
    assert.ok(frame, name + ': native LCD frame required');
    const restored = new Uint8Array(192 * 75);
    for (let tone = 1; tone <= 3; tone++) {
      paintPath(restored, 192, 75, api.lcdTonePath880(frame.pixels, 192, 63, tone, 12), tone);
    }
    paintPath(restored, 192, 75, api.lcdCursorPath880(frame));
    assert.deepEqual(restored.subarray(192 * 12), decode(native.frames[name]), name);
  }
});

test('SVG caret retains its native body offset and variable row widths', () => {
  assert.equal(api.lcdCursorPath880({}), '');
  const rectangle = new Uint8Array(192 * 75);
  paintPath(rectangle, 192, 75, api.lcdCursorPath880({cursor:[17,21,3,13]}));
  assert.equal(rectangle.reduce((sum, value) => sum + value, 0), 39);
  for (let y = 0; y < 75; y++) {
    for (let x = 0; x < 192; x++) {
      assert.equal(rectangle[y * 192 + x], Number(y >= 33 && y < 46 && x >= 17 && x < 20));
    }
  }
  const arrow = new Uint8Array(192 * 75);
  const rows = [1,3,7,3,1];
  paintPath(arrow, 192, 75, api.lcdCursorPath880({cursor:[185,1,7,5], cursorRows:rows}));
  assert.equal(arrow.reduce((sum, value) => sum + value, 0), 15);
  rows.forEach((length, row) => {
    const actual = arrow.subarray((13 + row) * 192, (14 + row) * 192);
    assert.equal(actual.reduce((sum, value) => sum + value, 0), length);
    for (let x = 0; x < 192; x++) assert.equal(actual[x], Number(x >= 185 && x < 185 + length));
  });
});

test('indicator SVGs retain their native fractional geometry and original vector shapes', () => {
  for (const [flag, tuple] of Object.entries(api.CLASS_PAD_LCD.status)) {
    const vector = api.lcdStatusVector880(flag);
    const [x,y,width,height,dataURI] = tuple;
    assert.equal(vector.x, x, flag + ': x');
    assert.equal(vector.y, y, flag + ': y');
    assert.equal(vector.width, width, flag + ': width');
    assert.equal(vector.height, height, flag + ': height');
    const expected = Buffer.from(dataURI.split(',')[1], 'base64').toString('utf8');
    assert.equal(vector.svg, expected, flag + ': original SVG including viewBox must survive unchanged');
    assert.match(vector.svg, /viewBox="[^"]+"/);
  }
  assert.match(api.lcdStatusVector880('math').svg, /<polygon\b/);
  assert.match(api.lcdStatusVector880('D').svg, /<path\b/);
  assert.equal(Number.isInteger(api.lcdStatusVector880('D').x), false, 'do not snap the vector indicator to the bitmap grid');
});
