'use strict';

function element(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter(child => child !== null && child !== undefined));
  return node;
}

function optionNumber(key) {
  return element('span', 'option', element('span', '', key));
}

const MENU_SHORTCUTS = ['1','2','3','4','5','6','7','8','9','0','+','−','×','÷','.'];

function renderLCD(screen, state) {
  const {power, home, homeIndex, homeOffset, settings, notice, menu} = state;
  const vi = settings.language === 'vi';
  screen.replaceChildren();
  screen.classList.toggle('darker', settings.contrast > 0);
  screen.classList.toggle('lighter', settings.contrast < 0);
  if (!power) return;
  const frame = buildLCDFrame880(state);
  if (frame) {
    paintLCDFrame880(screen, frame, state);
    return;
  }

  screen.append(element('div', 'indicators', renderLCDStatus880(state)));

  if (notice) {
    screen.append(element('div', 'notice', element('div', '', notice.title), element('small', '', notice.subtitle)));
  } else if (menu) {
    if (menu.size) screen.append(element('div', 'mode-title', menu.size.title));
    renderMenu(screen, menu, settings.hints);
  } else if (home) {
    const grid = element('div', 'app-grid');
    HOME_APPS.slice(homeOffset, homeOffset + 6).forEach((app, index) => {
      const icon = element('span', 'app-icon');
      icon.style.setProperty('--icon', 'url("' + assetURL880('assets/home/' + app.icon + '.png') + '")');
      const name = element('span', '', vi ? app.vi : app.en);
      if (!vi || app.icon <= 6) {
        name.className = 'app-name bitmap';
        name.style.setProperty('--name', 'url("' + assetURL880('assets/home/' + (vi ? 'vi' : 'en') + '-' + app.icon + '.png') + '")');
      }
      const tile = element('div', 'app-tile' + (homeIndex === index + homeOffset ? ' selected' : ''), icon, name);
      if (settings.hints) tile.append(optionNumber(app.hint));
      grid.append(tile);
    });
    screen.append(grid, rail(homeOffset, HOME_APPS.length, 6));
  } else {
    renderData(screen, state, vi);
  }
}

function renderMenu(screen, menu, hints) {
  if (menu.title) screen.append(element('div', 'mode-title', menu.title));
  const kind = menu.columns === 3 ? ' shortcut-grid' : '';
  const list = element('div', 'menu' + kind);
  list.style.gridTemplateColumns = 'repeat(' + menu.columns + ', minmax(0, 1fr))';
  if (menu.columns === 2) list.style.gridAutoRows = '4.9cqw';
  menu.rows.slice(menu.offset, menu.offset + menu.capacity).forEach((row, index) => {
    const selected = menu.highlight && menu.offset + index === menu.selected;
    const line = element('div', 'menu-row' + (selected ? ' selected' : ''));
    const option = MENU_SHORTCUTS[menu.offset + index];
    if (hints && menu.direct && option) line.append(optionNumber(option));
    if (row.radio) line.append(element('span', '', row.radio() ? '◉' : '○'));
    const value = menu.size?.values[index];
    line.append(element('span', 'menu-label', value == null ? row.name : row.name + ' ' + value));
    if (row.arrow) line.append(element('span', 'menu-arrow', '▸'));
    list.append(line);
  });
  screen.append(list);
  if (menu.rows.length > menu.capacity) screen.append(rail(menu.offset, menu.rows.length, menu.capacity));
}

function rail(offset, count, visible) {
  const line = element('div', 'rail', element('i'));
  line.firstChild.style.top = (offset / count * 100) + '%';
  line.firstChild.style.height = (visible / count * 100) + '%';
  line.setAttribute('aria-hidden', 'true');
  return line;
}

function fraction(numerator, denominator) {
  return element('span', 'frac', element('span', '', numerator), element('span', '', denominator));
}

function radical(prefix, argument) {
  return element('span', 'radical', element('span', '', prefix), element('span', '', argument));
}

function mathNodes(nodes, cursorList = null, cursorIndex = null, linear = false, nested = false) {
  const content = document.createDocumentFragment();
  const active = nodes === cursorList;
  if (!nodes.length) {
    if (nested) content.append(element('span', 'empty' + (active ? ' active' : '')));
    else if (active) content.append(element('span', 'caret'));
    return content;
  }
  const child = list => mathNodes(list, cursorList, cursorIndex, linear, true);
  const superscript = list => linear ? element('span', '', '^(', child(list), ')') : element('sup', '', child(list));
  nodes.forEach((node, index) => {
    if (active && index === cursorIndex) content.append(element('span', 'caret'));
    switch (node.type) {
      case 'frac':
        content.append(linear ? element('span', '', child(node.num), '┘', child(node.den)) : fraction(child(node.num), child(node.den)));
        break;
      case 'mixed':
        content.append(linear ? element('span', '', child(node.int), '┘', child(node.num), '┘', child(node.den))
          : element('span', 'mixed', child(node.int), fraction(child(node.num), child(node.den))));
        break;
      case 'sqrt':
      case 'cbrt': {
        const prefix = node.type === 'sqrt' ? '√' : '∛';
        content.append(linear ? element('span', '', prefix, '(', child(node.arg), ')') : radical(prefix, child(node.arg)));
        break;
      }
      case 'nthroot':
        content.append(element('span', '', element('sup', '', child(node.idx)), radical('√', child(node.arg))));
        break;
      case 'abs':
        content.append(element('span', '', '|', child(node.arg), '|'));
        break;
      case 'sup':
        content.append(superscript(node.exp));
        break;
      case 'pow10':
      case 'epow':
      case 'times10':
        content.append(element('span', '', {pow10:'10', epow:'e', times10:'×10'}[node.type], superscript(node.exp)));
        break;
      case 'logn':
        content.append(linear ? element('span', '', 'log(', child(node.base), ',', child(node.arg), ')')
          : element('span', '', 'log', element('sub', '', child(node.base)), '(', child(node.arg), ')'));
        break;
      case 'sum':
      case 'product':
      case 'integral': {
        const symbol = {sum:'Σ', product:'Π', integral:'∫'}[node.type];
        const limits = element('span', 'template-stack', element('span', '', child(node.upper)),
          element('b', '', symbol), element('span', '', node.type === 'integral' ? '' : 'x=', child(node.lower)));
        content.append(limits, element('span', '', child(node.body), node.type === 'integral' ? 'dx' : ''));
        break;
      }
      case 'derivative':
        content.append(fraction('d', 'dx'), element('span', '', '(', child(node.body), ')|', element('sub', '', 'x=', child(node.point))));
        break;
      case 'recurring':
        content.append(element('span', '', '‹', child(node.digits), '›'));
        break;
      case 'angle':
        content.append(child(node.arg), ANGLE_UNIT_SYMBOLS[node.unit]);
        break;
      default:
        content.append(node.constant ? SCIENTIFIC_CONSTANTS[node.constant].symbol : node.ch || '');
    }
  });
  if (active && cursorIndex === nodes.length) content.append(element('span', 'caret'));
  return content;
}

function exactResult(data, linear) {
  if (data.verifyResult !== undefined && data.verifyResult !== null) return data.verifyResult ? 'True' : 'False';
  if (data.dmsResult) return data.dmsResult;
  if (data.factorization) return data.factorization;
  const frac = data.exactFraction;
  if (frac) {
    const lead = (frac.negative ? '−' : '') + (frac.int || '');
    if (linear) return lead + (frac.int ? '┘' : '') + frac.num + '┘' + frac.den;
    return element('span', 'mixed', lead, fraction(frac.num, frac.den));
  }
  if (data.exactPi) {
    const {num, den, negative} = data.exactPi;
    const term = (num === '1' ? '' : num) + 'π';
    return element('span', 'mixed', negative ? '−' : '', den === '1' ? term : fraction(term, den));
  }
  if (data.exactSurdNodes) return mathNodes(data.exactSurdNodes);
  if (data.exactSurd) {
    const s = data.exactSurd;
    const rational = s.rationalNum === '0' ? '' : s.rationalDen === '1' ? s.rationalNum : fraction(s.rationalNum, s.rationalDen);
    const coefficient = s.coeffNum === '1' ? '' : s.coeffNum;
    const root = element('span', 'mixed', coefficient, radical('√', s.radicand));
    return element('span', 'mixed', s.rationalNegative ? '−' : '', rational,
      s.coeffNegative ? '−' : rational ? '+' : '', s.coeffDen === '1' ? root : fraction(root, s.coeffDen));
  }
  return data.result == null ? '' : String(data.result).replaceAll('-', '−');
}

const ERROR_VI = {
  'Math ERROR': 'Lỗi TOÁN', 'Syntax ERROR': 'Lỗi CÚ PHÁP', 'Argument ERROR': 'Lỗi ĐỐI SỐ',
  'Circular ERROR': 'Lỗi vòng lặp',
  'Stack ERROR': 'Lỗi NGĂN XẾP', 'Dimension ERROR': 'Lỗi KÍCH THƯỚC', 'Range ERROR': 'Lỗi PHẠM VI', 'Cannot Solve': 'Không thể giải'
};

function renderData(screen, state, vi) {
  const {data, settings, app} = state;
  if (state.base && data.mode !== 'error') screen.append(element('div', 'mode-title', '[' + state.base.label + ']'));
  const linear = app === 'matrix' || app === 'vector' || settings.io.startsWith('line');
  const draft = (nodes, cursorList, cursorIndex) => element('span', 'math', mathNodes(nodes, cursorList, cursorIndex, linear));
  const appendMath = (expression, result = null) => {
    const input = element('div', 'expression' + (result === null ? ' full' : ''), expression);
    const area = element('div', 'math-area', input, result === null ? null : element('div', 'result', element('span', 'math', result)));
    screen.append(area);
    if (input.querySelector('.caret,.active')) input.scrollLeft = input.querySelector('.caret,.active').offsetLeft - input.clientWidth + 16;
  };

  if (data.mode === 'error') {
    screen.append(element('div', 'notice',
      element('div', '', (vi && ERROR_VI[data.message]) || data.message),
      element('small', '', vi ? '← → Đến lỗi   AC: Hủy' : '← → Goto   AC: Cancel')));
  } else if (data.mode === 'extras-grid') {
    const offset = Math.max(0,data.cursor - 2);
    const rows = data.rows.slice(offset,offset + 4).map((row, index) => row.map((value, column) =>
      ({text:typeof value === 'number' ? formatNumber(value, settings.number) : String(value),
        selected:offset + index === data.cursor && column === data.column})));
    renderTableLCD(screen, data.heading, rows, data.grab ? (vi ? 'Cài đặt:[OK]' : 'Set:[OK]') :
      data.draftNodes ? draft(data.draftNodes, data.cursorList, data.cursorIndex) : data.selectedText);
  } else if (data.mode === 'formula-edit') {
    screen.append(element('div', 'mode-title', data.title));
    appendMath(draft(data.nodes || [], data.cursorList, data.cursorIndex));
  } else if (data.mode === 'formula-result') {
    appendMath(data.label + '=', exactResult(data, linear));
  } else if (data.mode === 'formula-form' || data.mode === 'formula-menu') {
    const isForm = data.mode === 'formula-form';
    const offset = Math.max(0, data.cursor - (isForm ? 2 : 3));
    if (isForm) screen.append(element('div', 'mode-title', data.title));
    const rows = isForm ? data.rows.map(name => ({name})) : data.rows;
    renderMenu(screen, {rows, offset, selected:data.cursor, highlight:true, columns:1,
      capacity:isForm ? 3 : 4, direct:!isForm}, settings.hints);
    if (data.draftNodes) {
      const input = element('div', 'draft-overlay', draft(data.draftNodes, data.cursorList, data.cursorIndex));
      input.style.top = (10 + (data.cursor - offset) * 6.1) + 'cqw';
      screen.append(input);
    }
  } else if (data.mode === 'formula-counts') {
    const offset = Math.max(0, data.cursor - 2);
    const rows = data.counts.slice(offset, offset + 3).map((count, index) => [
      {text:data.ranges[offset + index]},
      {text:String(count), selected:offset + index === data.cursor}
    ]);
    renderTableLCD(screen, ['uᵢ ≤ x < uᵢ₊₁', 'n'], rows,
      data.draftNodes ? draft(data.draftNodes, data.cursorList, data.cursorIndex) : String(data.counts[data.cursor]));
  } else if (data.mode === 'input') {
    appendMath(draft(data.nodes, data.cursorList, data.cursorIndex));
  } else if (data.mode === 'result') {
    appendMath(draft(data.expressionNodes), exactResult(data, linear));
  } else if (data.mode === 'calc') {
    screen.append(element('div', 'mode-title', data.variable + '=' + data.selectedText));
    appendMath(draft(data.draftNodes, data.cursorList, data.cursorIndex));
  } else if (data.mode === 'solve') {
    screen.append(element('div', 'mode-title', data.title || data.variable + '=' + data.result));
    appendMath(draft(data.expressionNodes), 'L−R=' + data.residual);
  } else if (data.columns && Array.isArray(data.columns)) {
    const offset = Math.max(0, (data.cursor || 0) - 2);
    const columns = data.columns.map(col => col.label);
    const rows = Array.from({length: 3}, (_, row) => data.columns.map(col => col.cells[offset + row] || {text:''}));
    const undefinedStatus = data.undefinedFunctions?.length
      ? data.undefinedFunctions.join('/') + (vi ? ':Chưa XĐ' : ':Undefined') : '';
    renderTableLCD(screen, columns, rows, data.draftNodes ? draft(data.draftNodes, data.cursorList, data.cursorIndex)
      : data.selectedText || undefinedStatus);
  } else if (data.mode === 'function-edit' || (data.mode === 'table' && data.screen === 'func')) {
    screen.append(element('div', 'mode-title', data.prompt));
    appendMath(draft(data.draftNodes || [], data.cursorList, data.cursorIndex));
  } else if (data.fields || Array.isArray(data.cells)) {
    const cells = data.cells || data.fields.map((field, index) => ({...field, selected:index === data.active}));
    if (data.result != null) {
      const solution = typeof data.result === 'object' ? data.result : null;
      const title = solution?.header || data.header;
      if (title && !solution?.message) screen.append(element('div', 'mode-title', title));
      const selection = solution?.label || data.unknownLabel;
      let result = solution?.message || exactResult({...data,
        exactFraction:solution?.fraction || data.exactFraction,
        exactSurd:solution?.surd || data.exactSurd,
        result:solution?.text || (solution ? '' : data.result)}, linear);
      if (solution?.form === 'complexDecimal') {
        result = (solution.reIsZero ? (solution.imNegative ? '−' : '') : solution.re + (solution.imNegative ? '−' : '+')) +
          (solution.imIsOne ? '' : solution.im) + 'i';
      } else if (solution?.form === 'complex') {
        const real = solution.re;
        const imaginary = solution.im;
        result = element('span', 'math',
          solutionPart(real, linear), imaginary.negative ? '−' : '+', solutionPart(imaginary, linear), 'i');
      } else if (solution?.segments) {
        const endpoint = part => part?.text || (Number.isFinite(part) ? String(part) : part === -Infinity ? '−∞' : '∞');
        result = solution.segments.map(segment => (segment.includeLow ? '[' : '(') + endpoint(segment.low) +
          ';' + endpoint(segment.high) + (segment.includeHigh ? ']' : ')')).join(' ∪ ');
      }
      appendMath(selection ? selection + '=' : '', result);
    } else if (data.mode === 'distribution' || data.mode === 'table') {
      const selected = Math.max(0, cells.findIndex(cell => cell.selected));
      const offset = Math.max(0, selected - 2);
      if (data.mode === 'table') screen.append(element('div','mode-title',vi ? 'Phạm vi bảng' : 'Table Range'));
      renderTableLCD(screen, null, cells.slice(offset, offset + 3).map(cell => [{...cell, text:cell.label + (cell.text ? ': ' + cell.text : '')}]),
        data.draftNodes ? draft(data.draftNodes, data.cursorList, data.cursorIndex) : '');
    } else {
      const width = data.columns || cells.length;
      const rows = Array.from({length: Math.ceil(cells.length / width)}, (_, index) =>
        cells.slice(index * width, (index + 1) * width).map(cell => ({...cell, text:cell.label + '=' + cell.text})));
      screen.append(element('div', 'mode-title', data.header || state.appName));
      renderTableLCD(screen, null, rows, data.draftNodes ? draft(data.draftNodes, data.cursorList, data.cursorIndex) : '');
    }
  } else if (data.options) {
    renderMenu(screen, {rows:data.options.map(name => ({name})), columns:1, capacity:4, offset:0,
      direct:true, highlight:false, selected:0}, settings.hints);
  } else if (data.values) {
    screen.append(element('div', 'mode-title', data.title || state.appName));
    const rows = data.mode === 'matrix'
      ? data.values.map((row, y) => row.map((value, x) => ({text:String(value), selected:y === data.cursor.row && x === data.cursor.col})))
      : [data.values.map((value, x) => ({text:String(value), selected:x === data.cursor}))];
    renderTableLCD(screen, null, rows, data.draftNodes ? draft(data.draftNodes, data.cursorList, data.cursorIndex) : data.selectedText);
  } else if (data.rows && Array.isArray(data.rows)) {
    screen.append(element('div', 'mode-title', data.header || data.typeLabel || state.appName));
    renderTableLCD(screen, null, data.rows.slice(data.statsTop || 0, (data.statsTop || 0) + 3)
      .map(row => [{text:row.label + ' = ' + row.text}]));
  } else {
    screen.append(element('div', 'notice', element('div', '', data.title || state.appName),
      element('small', '', data.prompt || data.selectText || '')));
  }
}

function solutionPart(part, linear) {
  if (!part) return '';
  if (part.kind === 'fraction') return exactResult({exactFraction:part}, linear);
  if (part.radicand) return exactResult({exactSurd:part}, linear);
  return part.text || part.num || '';
}

function renderTableLCD(screen, headings, rows, selectedText) {
  const grid = element('div', 'mode-grid');
  const count = headings?.length || Math.max(1, ...rows.map(row => row.length));
  grid.style.gridTemplateColumns = 'repeat(' + count + ',minmax(0,1fr))';
  if (headings) grid.append(...headings.map(heading => element('span', 'cell', heading)));
  for (const row of rows) {
    grid.append(...row.map(cell => element('span', 'cell' + (cell.selected ? ' selected' : ''), cell.text)));
  }
  screen.append(grid);
  if (selectedText !== undefined && selectedText !== '') screen.append(element('div', 'mode-title', selectedText));
}
