'use strict';

function randomTrials880(faces, dice, attempts, repeat, random = Math.random) {
  const next = repeat ? seededRandom880(Number(repeat)) : random;
  return Array.from({length: attempts}, () =>
    Array.from({length: dice}, () => Math.floor(next() * faces) + Number(faces === 6)));
}

function seededRandom880(stream = 1) {
  let seed = 34237 * stream;
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function trialFrequencies880(rows, faces) {
  const count = rows[0].length;
  const possible = Array((faces - 1) * count + 1).fill(0);
  const minimum = faces === 6 ? count : 0;
  for (const row of rows) possible[row.reduce((sum, value) => sum + value, 0) - minimum]++;
  return possible.map((frequency, index) => [index + minimum, frequency, frequency / rows.length]);
}

const NUMBER_LINE_RELATIONS_880 = ['x<a','x≤a','x=a','x>a','x≥a','a<x<b','a≤x<b','a<x≤b','a≤x≤b'];

function numberLineText880(entry, format) {
  return entry ? entry.relation.replace(/[ab]/g, name => {
    const index = name === 'a' ? 0 : 1;
    return entry.expressions ? numberLineExpression880(entry.expressions[index]) : format(entry.values[index]);
  }) : '';
}

function numberLineExpression880(nodes) {
  return nodes.map(node => {
    const text = serializeForDisplay([node]);
    // These linear exponent fields retain the automatic closing parenthesis
    // internally. PLUS leaves it out of registered Number Line expressions.
    return ['times10','pow10','epow','sup'].includes(node.type) ? text.slice(0,-1) : text;
  }).join('').replaceAll('-', '−');
}

function numberLineWindow880(entries) {
  const endpoints = entries.filter(Boolean).flatMap(entry => entry.values);
  const min = Math.min(...endpoints);
  const max = Math.max(...endpoints);
  // Sixteen visible ticks leave one tick of padding at each endpoint.
  // The 0..28 / 0..29 PLUS probes distinguish the inclusive scale boundary.
  const spacing = min === max ? Math.abs(min)/20 || 1 : (max-min)/14;
  const unit = 10 ** Math.floor(Math.log10(spacing));
  const scale = unit * [1,2,5,10].find(multiplier => spacing <= multiplier * unit);
  const middle = min === max ? min : min / 2 + max / 2;
  const center = Math.sign(middle) * Math.round(Math.abs(middle) / scale) * scale;
  return {scale, center};
}

// PLUS uses a six-character numeric string in View-Window and on the axis.
// The exponent sign and decimal point consume this budget before math layout.
function numberLineCompact880(value) {
  if (value === 0) return '0';
  const {mantissaStr,exponent} = scientificParts(value,10);
  const scientific = exponent < -2 || exponent+1+Number(value<0)>6;
  if (scientific) {
    const suffix = 'e'+(exponent>=0?'+':'')+exponent;
    const mantissa = trimTrailingZeros(mantissaStr.slice(0,6-suffix.length)).replace(/\.$/,'');
    return (mantissa+suffix).replace(/e([+-]?\d+)$/,(_,power)=>'×10'+toSuperscript(Number(power))).replace('-','−');
  }
  const text = trimTrailingZeros(Number(value.toPrecision(10)).toFixed(Math.max(0,9-exponent)));
  return trimTrailingZeros(text.slice(0,6)).replace(/\.$/,'').replace('-','−');
}

function circleTrigText880(operation, angle, settings) {
  const expression = operation + '(' + angle + ')';
  let value;
  try {
    value = evaluateExpression(expression, 0, {}, settings.angle);
  } catch (_) { return 'ERROR'; }
  if (operation === 'tan' && !settings.io.startsWith('line')) {
    const degrees = settings.angle === 'deg' ? angle : settings.angle === 'grad' ? angle * .9 : angle * 180 / Math.PI;
    const reduced = ((degrees % 180) + 180) % 180;
    for (const [target,result] of [[15,'2−√(3)'],[75,'2+√(3)'],[105,'−2−√(3)'],[165,'−2+√(3)']]) {
      if (Math.abs(reduced-target) < 1e-9) return result;
    }
  }
  const exact = !settings.io.startsWith('line') && tryExactForwardTrig(expression, 0, {}, settings.angle);
  if (exact) {
    if (exact.radicand === 1n) {
      const {num,den} = exact.rational;
      return String(num).replace('-', '−') + (den === 1n ? '' : '┘' + den);
    }
    const {num,den} = exact.coeff;
    return (num < 0 ? '−' : '') + (bigAbs(num) === 1n ? '' : bigAbs(num)) + '√(' + exact.radicand + ')' +
      (den === 1n ? '' : '┘' + den);
  }
  return formatNumber(value, settings.number).replace('-', '−');
}

function circleClockAngle880(hour, larger, settings) {
  const steps = Math.min(hour, 12 - hour);
  const ticks = larger ? 12 - steps : steps;
  if (settings.angle !== 'rad') return formatNumber(ticks * (settings.angle === 'deg' ? 30 : 100/3), settings.number);
  if (ticks === 0) return '0';
  const fraction = fracReduce({num:BigInt(ticks),den:6n});
  return (fraction.num === 1n ? '' : fraction.num) + 'π' + (fraction.den === 1n ? '' : '┘' + fraction.den);
}

function circleRayIndex880(angle, unit) {
  const degrees = unit === 'deg' ? angle : unit === 'grad' ? angle * .9 : angle * 180 / Math.PI;
  const reduced = ((degrees % 360) + 360) % 360;
  // Measured transitions are 8, 23, 38, ... degrees, including negative
  // angles reduced to one turn. 7.99 stays at zero; 8 selects 15 degrees.
  return Math.floor((reduced + 7 + 1e-12) / 15) % 24;
}

const SHEET_COLUMNS_880 = 'ABCDE';
const SHEET_ROWS_880 = 45;
const SHEET_AGGREGATES_880 = {
  Min: values => Math.min(...values), Max: values => Math.max(...values),
  Mean: values => values.reduce((sum, value) => sum + value, 0) / values.length,
  Sum: values => values.reduce((sum, value) => sum + value, 0)
};

const sheetAddress880 = (row, column) => row * SHEET_COLUMNS_880.length + column;
const sheetCharacter880 = node => node?.type === 'char' && !node.constant && !node.eng ? node.ch : '';

function sheetReference880(nodes, start) {
  const fixedColumn = sheetCharacter880(nodes[start]) === '$';
  const columnIndex = start + Number(fixedColumn);
  const letter = sheetCharacter880(nodes[columnIndex]);
  const isColumn = /^[A-F]$/.test(letter);
  const fixedRow = isColumn && sheetCharacter880(nodes[columnIndex + 1]) === '$';
  const firstDigit = columnIndex + 1 + Number(fixedRow);
  let end = firstDigit;
  let digits = '';
  if (isColumn) {
    while (/^[0-9]$/.test(sheetCharacter880(nodes[end]))) digits += sheetCharacter880(nodes[end++]);
  }
  if (!digits && !fixedColumn && !fixedRow) return null;
  const row = Number(digits) - 1;
  const column = SHEET_COLUMNS_880.indexOf(letter);
  if (column < 0 || row < 0 || digits.startsWith('0') || row >= SHEET_ROWS_880) throw new EngineError('Syntax ERROR');
  return {row, column, end};
}

function sheetAggregate880(nodes, start, name, readCell) {
  const first = sheetReference880(nodes, start + name.length + 1);
  if (!first) throw new EngineError('Syntax ERROR');
  const hasRange = sheetCharacter880(nodes[first.end]) === ':';
  const last = hasRange ? sheetReference880(nodes, first.end + 1) : first;
  if (!last || (last.end < nodes.length && sheetCharacter880(nodes[last.end]) !== ')')) throw new EngineError('Syntax ERROR');
  const values = [];
  for (let row = Math.min(first.row,last.row); row <= Math.max(first.row,last.row); row++) {
    for (let column = Math.min(first.column,last.column); column <= Math.max(first.column,last.column); column++) {
      const value = readCell(sheetAddress880(row,column), true);
      if (value !== undefined) values.push(value);
    }
  }
  return {value:values.length ? SHEET_AGGREGATES_880[name](values) : 0, end:Math.min(nodes.length,last.end + 1)};
}

function sheetReferenceNodes880(nodes, readCell) {
  const resolved = [];
  const appendValue = value => {
    if (!Number.isFinite(value)) throw new EngineError('Math ERROR');
    const literal = fractionToEvalLiteral(roundedNumberFraction(value));
    resolved.push(...charNodes('(' + literal + ')'));
  };
  for (let i = 0; i < nodes.length; i++) {
    const reference = sheetReference880(nodes, i);
    if (reference) {
      appendValue(readCell(sheetAddress880(reference.row,reference.column)));
      i = reference.end - 1;
      continue;
    }
    const aggregate = Object.keys(SHEET_AGGREGATES_880).find(name => [...name + '('].every((ch, j) =>
      sheetCharacter880(nodes[i + j]) === ch));
    if (aggregate) {
      const {value, end} = sheetAggregate880(nodes, i, aggregate, readCell);
      appendValue(value);
      i = end - 1;
      continue;
    }
    const node = {...nodes[i]};
    for (const field of TEMPLATE_SLOT_FIELDS[node.type] || []) {
      node[field] = sheetReferenceNodes880(node[field], readCell);
    }
    resolved.push(node);
  }
  return resolved;
}

function sheetNumberNodes880(value) {
  const [mantissa, exponent] = String(value).split('e');
  const nodes = charNodes(mantissa);
  if (exponent) nodes.push({type:'times10', exp:charNodes(exponent.replace(/^\+/, ''))});
  return nodes;
}

function shiftSheetReferences880(nodes, rows, columns) {
  const shifted = [];
  for (let index = 0; index < nodes.length; index++) {
    const reference = sheetReference880(nodes, index);
    if (reference) {
      const fixedColumn = sheetCharacter880(nodes[index]) === '$';
      const fixedRow = sheetCharacter880(nodes[index + Number(fixedColumn) + 1]) === '$';
      const row = reference.row + (fixedRow ? 0 : rows);
      const column = reference.column + (fixedColumn ? 0 : columns);
      const letter = column < 0 || column >= SHEET_COLUMNS_880.length ? '?' : SHEET_COLUMNS_880[column];
      const number = row < 0 || row >= SHEET_ROWS_880 ? '?' : String(row+1);
      shifted.push(...charNodes((fixedColumn ? '$' : '') + letter + (fixedRow ? '$' : '') + number));
      index = reference.end - 1;
    } else {
      const node = {...nodes[index]};
      for (const field of TEMPLATE_SLOT_FIELDS[node.type] || []) node[field] = shiftSheetReferences880(node[field], rows, columns);
      shifted.push(node);
    }
  }
  return shifted;
}

function sheetRange880(text) {
  const match = /^([A-E])([1-9]\d?):([A-E])([1-9]\d?)$/.exec(text);
  if (!match || Number(match[2]) > SHEET_ROWS_880 || Number(match[4]) > SHEET_ROWS_880) throw new EngineError('Range ERROR');
  const first = {row:Number(match[2])-1, column:SHEET_COLUMNS_880.indexOf(match[1])};
  const last = {row:Number(match[4])-1, column:SHEET_COLUMNS_880.indexOf(match[3])};
  return {first:{row:Math.min(first.row,last.row),column:Math.min(first.column,last.column)},
    last:{row:Math.max(first.row,last.row),column:Math.max(first.column,last.column)}};
}

function createSheet880(evaluate, inputBytes) {
  const cells = new Map();
  const size = cell => cell?.formula ? 15 + inputBytes(cell.formula) : cell ? 14 : 0;
  const available = () => 2380 - [...cells.values()].reduce((total, cell) => total + size(cell), 0);
  const cached = (id, omitBlank = false) => {
    const cell = cells.get(id);
    if (cell?.error) throw new EngineError(cell.error);
    return cell?.value ?? (omitBlank ? undefined : 0);
  };
  function storeConstantError(row, column, message) {
    const id = sheetAddress880(row,column);
    if (14 > available() + size(cells.get(id))) throw new EngineError('Memory ERROR');
    cells.set(id,{value:null,error:message});
  }
  function calculate(cell, readCell) {
    try {
      const value = evaluate(sheetReferenceNodes880(cell.formula.slice(1), readCell));
      if (!Number.isFinite(value)) throw new EngineError('Math ERROR');
      cell.value = value;
      cell.error = null;
    } catch (error) {
      if (!(error instanceof EngineError)) throw error;
      cell.value = null;
      cell.error = error.message;
    }
    return cell.error;
  }
  function recalculate() {
    const settled = new Set();
    const active = new Set();
    function readCell(id, omitBlank = false) {
      const cell = cells.get(id);
      if (!cell?.formula || settled.has(id)) return cached(id, omitBlank);
      if (active.has(id)) throw new EngineError('Circular ERROR');
      active.add(id);
      calculate(cell, readCell);
      active.delete(id);
      settled.add(id);
      return cached(id);
    }
    let error = null;
    for (const [id, cell] of cells) {
      if (!cell.formula || settled.has(id)) continue;
      try { readCell(id); }
      catch (failure) {
        if (!(failure instanceof EngineError)) throw failure;
        error ||= failure.message;
      }
    }
    return error;
  }
  return {
    name(row, column) { return SHEET_COLUMNS_880[column] + (row + 1); },
    get(row, column) {
      const cell = cells.get(sheetAddress880(row, column));
      return cell?.error ? 'ERROR' : cell?.value;
    },
    formula(row, column) { return cells.get(sheetAddress880(row, column))?.formula; },
    constantError(row, column) {
      const cell = cells.get(sheetAddress880(row,column));
      return !cell?.formula && cell?.error || null;
    },
    set(row, column, nodes, autoCalc) {
      const id = sheetAddress880(row, column);
      const bytes = inputBytes(nodes);
      if (bytes > 49) throw new EngineError('Syntax ERROR');
      if ((nodes[0]?.ch === '=' ? 15 + bytes : 14) > available() + size(cells.get(id))) throw new EngineError('Memory ERROR');
      if (nodes[0]?.ch === '=') {
        const cell = {formula:cloneNodes(nodes), value:null, error:null};
        cells.set(id, cell);
        const recalculationError = autoCalc ? recalculate() : calculate(cell, (ref, omitBlank) => {
          if (ref === id) throw new EngineError('Circular ERROR');
          return cached(ref, omitBlank);
        });
        return cell.error || recalculationError;
      }
      const value = evaluate(sheetReferenceNodes880(nodes, cached));
      if (!Number.isFinite(value)) throw new EngineError('Math ERROR');
      cells.set(id, {value:roundToSignificantDigits(value, 10)});
      return autoCalc ? recalculate() : null;
    },
    clear(row, column, autoCalc) {
      cells.delete(sheetAddress880(row, column));
      return autoCalc ? recalculate() : null;
    },
    reset() { cells.clear(); },
    available,
    transfer(sourceRow, sourceColumn, targetRow, targetColumn, nodes, cut, autoCalc, errorValue = null) {
      const snapshot = new Map([...cells].map(([id,cell]) => [id, {...cell}]));
      try {
        const copied = cut ? cloneNodes(nodes) : shiftSheetReferences880(nodes, targetRow - sourceRow, targetColumn - sourceColumn);
        if (cut) cells.delete(sheetAddress880(sourceRow,sourceColumn));
        if (errorValue) storeConstantError(targetRow,targetColumn,errorValue);
        else if (!copied.length) cells.delete(sheetAddress880(targetRow,targetColumn));
        const error = !errorValue && copied.length ? this.set(targetRow,targetColumn,copied,false) : null;
        return autoCalc ? recalculate() || error : error;
      } catch (error) {
        cells.clear();
        for (const [id,cell] of snapshot) cells.set(id,cell);
        throw error;
      }
    },
    fill(nodes, range, formula, autoCalc) {
      const {first,last} = sheetRange880(range);
      const snapshot = new Map([...cells].map(([id,cell]) => [id, {...cell}]));
      let error = null;
      try {
        for (let row = first.row; row <= last.row; row++) {
          for (let column = first.column; column <= last.column; column++) {
            const copied = shiftSheetReferences880(nodes, row - first.row, column - first.column);
            try {
              const result = this.set(row,column,formula ? [...charNodes('='),...copied] : copied,false);
              error ||= result;
            } catch (failure) {
              if (formula || !(failure instanceof EngineError) || failure.message === 'Memory ERROR') throw failure;
              // Fill Value stores a failed evaluation as a fixed ERROR cell
              // and continues through the remaining range, like PLUS.
              storeConstantError(row,column,failure.message);
              error ||= failure.message;
            }
          }
        }
        return autoCalc ? recalculate() || error : error;
      } catch (error) {
        // PLUS keeps cells written before an out-of-memory failure, including
        // automatic updates to their dependent formulas.
        if (error.message === 'Memory ERROR' && autoCalc) recalculate();
        if (error.message !== 'Memory ERROR') {
          cells.clear();
          for (const [id,cell] of snapshot) cells.set(id,cell);
        }
        throw error;
      }
    },
    recalculate
  };
}
