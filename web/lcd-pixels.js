'use strict';

const LCD880_WIDTH = 192;
const LCD880_BODY = 63;
const LCD880_STATUS = 12;
const LCD880_HEIGHT = LCD880_BODY + LCD880_STATUS;
const spriteCache880 = new WeakMap();
const radicalCache880 = new Map();

function lcdRadicalHook880(height) {
  if (radicalCache880.has(height)) return radicalCache880.get(height);
  const pixels = new Uint8Array(9 * height);
  const point = (x,y) => { pixels[y * 9 + x] = 1; };
  // PLUS uses a sloped stem and the same nine-row check at every height.
  // Verified against the observed 12/15/16/19/20-pixel hooks.
  for (let y = 0; y < height - 1; y++) point(8 - Math.round(2 * y / (height - 2)), y);
  point(6,height - 1);
  point(3,height - 8);
  point(3,height - 7);
  for (let y = height - 9; y < height; y++) point(4 + Math.round((y - height + 9) / 4),y);
  const sprite = [9,height,btoa(Array.from(pixels, value => String.fromCharCode((value << 6) | 1)).join(''))];
  radicalCache880.set(height,sprite);
  return sprite;
}

function readSprite880(sprite) {
  if (spriteCache880.has(sprite)) return spriteCache880.get(sprite);
  const [width, height, encoded] = sprite;
  const pixels = new Uint8Array(width * height);
  let cursor = 0;
  for (const byte of atob(encoded)) {
    const value = byte.charCodeAt(0);
    const count = value & 63;
    pixels.fill(value >> 6, cursor, cursor + count);
    cursor += count;
  }
  spriteCache880.set(sprite, pixels);
  return pixels;
}

function lcdSurface880(width, height) {
  const pixels = new Uint8Array(width * height);
  return {
    pixels,
    rect(x, y, w, h, tone) {
      for (let row = Math.max(0, y); row < Math.min(height, y + h); row++) {
        const left = Math.max(0, x);
        const right = Math.min(width, x + w);
        if (right > left) pixels.fill(tone, row * width + left, row * width + right);
      }
    },
    sprite(sprite, x, y, tint = value => value, opaque = false) {
      const source = readSprite880(sprite);
      const [w, h] = sprite;
      for (let row = Math.max(0, -y); row < Math.min(height - y, h); row++) {
        for (let col = Math.max(0, -x); col < Math.min(width - x, w); col++) {
          const value = source[row * w + col];
          if (value || opaque) pixels[(row + y) * width + x + col] = tint(value);
        }
      }
    }
  };
}

function lcdScrollbar880(surface, offset, count, visible) {
  if (count <= visible) return;
  const start = Math.round(offset * LCD880_BODY / count);
  surface.rect(190, start, 2, Math.round(visible * LCD880_BODY / count), 2);
}

function lcdLocaleAssets880(assets,language) {
  return language === 'en' ? {...assets,...assets.en} : assets;
}

function lcdHome880(state, surface) {
  const tiles = CLASS_PAD_LCD.home[state.settings.language];
  if (!state.settings.hints || !tiles) return null;
  const count = Math.min(6, HOME_APPS.length - state.homeOffset);
  for (let slot = 0; slot < count; slot++) {
    const entry = state.homeOffset + slot;
    surface.sprite(tiles[entry][Number(entry !== state.homeIndex)], slot % 3 * 64, Math.floor(slot / 3) * 32);
  }
  lcdScrollbar880(surface, state.homeOffset / 3, Math.ceil(HOME_APPS.length / 3), 2);
  return HOME_APPS.slice(state.homeOffset, state.homeOffset + count).map(app => app[state.settings.language]).join(', ');
}

const LCD_MENU_NUMBER_KEYS = '1234567890+−×÷.';

function lcdMenu880(state, surface) {
  const {menu, settings} = state;
  if (menu.resetKind) {
    const assets = CLASS_PAD_LCD.reset[settings.language];
    surface.sprite(assets.titles[menu.resetKind],0,0);
    for (const [index,name] of ['yes','cancel'].entries()) {
      const selected = index === menu.selected;
      const y = 32 + index * 16;
      if (selected) surface.rect(0,y,188,15,1);
      surface.sprite(assets[name],0,y,() => selected ? 0 : 1);
    }
    return 'Reset: '+menu.resetKind+', '+menu.rows[menu.selected].name;
  }
  if (menu.confirmation) {
    const assets = CLASS_PAD_LCD.special.regression.clear[settings.language];
    surface.sprite(assets.title,0,0);
    for (const [index,name] of ['yes','cancel'].entries()) {
      const y = 32+index*16;
      const selected = index === menu.selected;
      if (selected) surface.rect(0,y,188,15,1);
      surface.sprite(assets[name],0,y,() => selected ? 0 : 1);
    }
    return menu.confirmation+', '+menu.rows[menu.selected].name;
  }
  if (menu.rows[0]?.numberPreview) {
    menu.rows.slice(menu.offset,menu.offset+menu.capacity).forEach((row,index) => {
      const y = index*16;
      const selected = menu.offset+index === menu.selected;
      if (selected) surface.rect(0,y,188,15,1);
      const {kind,digits} = row.numberPreview;
      const hint = CLASS_PAD_LCD.hints[LCD_MENU_NUMBER_KEYS[menu.offset+index]];
      const badge = hint[Number(selected)] || hint[Number(!selected)];
      const invert = value => value === 1 ? 0 : value === 0 ? 1 : value;
      if (settings.hints) surface.sprite(badge,0,y,hint[Number(selected)] ? undefined : invert,true);
      surface.sprite(CLASS_PAD_LCD.numberMenus.previews[kind][digits],settings.hints ? 11 : 0,y,() => selected ? 0 : 1);
    });
    lcdScrollbar880(surface,menu.offset,menu.rows.length,4);
    return menu.rows.slice(menu.offset,menu.offset+menu.capacity).map(row => row.name).join(', ');
  }
  if (menu.constants || menu.conversions) {
    const assets = menu.constants ? CLASS_PAD_LCD.constants : CLASS_PAD_LCD.conversions;
    menu.rows.slice(menu.offset,menu.offset+menu.capacity).forEach((row,index) => {
      const x = index%2*96;
      const y = Math.floor(index/2)*12+2;
      const selected = Number(menu.offset+index === menu.selected);
      if (selected) surface.rect(x,y,91,11,1);
      if (settings.hints) {
        const variants = assets.hints[menu.offset+index];
        const sprite = variants[selected] || variants[1-selected];
        const invert = value => value === 1 ? 0 : value === 0 ? 1 : value;
        surface.sprite(sprite,x,y,variants[selected] ? undefined : invert,true);
      }
      surface.sprite(assets.labels[row.constant || row.conversion],x+Number(settings.hints)*11,y,() => selected ? 0 : 1);
    });
    lcdScrollbar880(surface,menu.offset/2,Math.ceil(menu.rows.length/2),5);
    return menu.rows.slice(menu.offset,menu.offset+menu.capacity).map(row=>row.name).join(', ');
  }
  if (menu.variables) {
    const font = {...CLASS_PAD_LCD.special.statisticsFont,...CLASS_PAD_LCD.memory.font};
    for (const [index,name] of [...'ABCDEFxyz'].entries()) {
      const x = index % 2 * 96;
      const y = Math.floor(index/2)*13;
      const selected = index === menu.selected;
      const tone = selected ? 0 : 1;
      if (selected) surface.rect(x,y,91,11,1);
      surface.sprite(CLASS_PAD_LCD.memory.names[name],x,y,() => tone);
      surface.sprite(font['='],x+6,y+1,() => tone);
      const value = menu.variables.values[name];
      const science = /^(.+)×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/.exec(value);
      if (science) {
        const coefficient = science[1].slice(0,10-science[2].length-2);
        const text = coefficient+'×10'+science[2];
        const right = x+12+(coefficient.length+science[2].replace('⁻','').length+2)*6;
        if (!lcdArrayCell880(surface,text,right,y+1,tone,10,font,CLASS_PAD_LCD.memory.scientific)) return null;
      } else if (!lcdGridText880(surface,value.slice(0,10),x+12,y+1,tone,false,10,font)) return null;
      if (selected && menu.variables.locked) surface.sprite(CLASS_PAD_LCD.memory.lock,x+85,y+1,() => tone);
    }
    return menu.rows.map(row => row.name).join(', ');
  }
  if (menu.trialForm) {
    const t = menu.trialForm;
    const assets = lcdLocaleAssets880(CLASS_PAD_LCD.trials,settings.language);
    const controls = settings.language === 'en' ? CLASS_PAD_LCD.englishControls : CLASS_PAD_LCD.numberLine;
    for (let row = 0; row < 4; row++) {
      const y = row * 16;
      const selected = menu.selected === row;
      const ink = () => selected ? 0 : 1;
      if (selected) surface.rect(0,y,188,15,1);
      if (row === 3) {
        surface.sprite(controls.run,0,y,ink);
        continue;
      }
      const field = row === 0 && t.faces === 2 ? assets.coinCount : assets.fields[row];
      surface.sprite(field,0,y,ink);
      const value = row === 0 ? String(t.count) : row === 1 ? String(t.attempts) : t.repeat ? '#' + Number(t.repeat) : null;
      if (value) [...value].forEach((char,index) => surface.sprite(char === '#' ? CLASS_PAD_LCD.trials.repeatMark
        : CLASS_PAD_LCD.glyphs[char],143+index*11,y+1,ink));
      else surface.sprite(assets.off,143,y,ink);
      surface.sprite(CLASS_PAD_LCD.menu.arrow[Number(selected)],176,y,undefined,true);
    }
    return menu.rows.map((row,index) => row.name + ' ' + [t.count,t.attempts,t.repeat || 'Tắt',''][index]).join(', ');
  }
  if (menu.size && settings.hints) {
    const {title, labels, confirm} = lcdLocaleAssets880(CLASS_PAD_LCD.arrays,settings.language).forms[state.app];
    surface.sprite(title, 0, 0);
    menu.rows.forEach((row, index) => {
      const y = (index + 1) * 16;
      const selected = Number(index === menu.selected);
      if (selected) surface.rect(0, y, 188, 15, 1);
      const ink = () => selected ? 0 : 1;
      if (index < labels.length) {
        surface.sprite(labels[index], 0, y, ink);
        surface.sprite(CLASS_PAD_LCD.glyphs[menu.size.values[index]], 143, y + 1, ink);
        surface.sprite(CLASS_PAD_LCD.menu.arrow[selected], 176, y, undefined, true);
      } else surface.sprite(confirm, 0, y, ink);
    });
    return menu.size.title + ', ' + menu.rows.map((row, index) =>
      [row.name, menu.size.values[index]].filter(value => value != null).join(' ')).join(', ');
  }
  if (menu.quick && settings.hints) {
    const page = Math.floor(menu.offset / 15);
    const entries = menu.rows.slice(menu.offset, menu.offset + 15);
    const realVerify = state.app === 'calculate' && state.verify;
    entries.forEach((row, index) => {
      const sprite = realVerify ? CLASS_PAD_LCD.verify.quick[page]?.[index]
        : state.app === 'complex' && page === 0 && !state.verify ? CLASS_PAD_LCD.complex.quick[index]
        : CLASS_PAD_LCD.quick[menu.offset + index];
      if (sprite) surface.sprite(sprite, index % 3 * 63, Math.floor(index / 3) * 12);
    });
    const line = Math.round(page * LCD880_BODY / 5);
    if (realVerify) surface.sprite(CLASS_PAD_LCD.verify.scrollbars[page], 190, 0);
    else if (state.app === 'complex' && page === 0 && !state.verify) surface.sprite(CLASS_PAD_LCD.complex.quickScrollbar, 190, 0);
    else surface.rect(190, line, 2, 13, 2);
    return entries.map(row => row.name).join(', ');
  }
  const pairedMenu = (['base-n','statistics'].includes(state.app) && menu.columns === 2) || menu.relations || menu.symbols;
  const english = settings.language === 'en';
  if ((!english && settings.language !== 'vi') || (!pairedMenu && (menu.columns !== 1 || menu.capacity !== 4))) return null;
  const rows = menu.rows.slice(menu.offset, menu.offset + menu.capacity);
  const nameOf = row => row.name.normalize('NFC');
  const labels = menu.relations ? CLASS_PAD_LCD.complex.verifySigns : english
    ? {...CLASS_PAD_LCD.labels,...CLASS_PAD_LCD.equations.englishMenu} : CLASS_PAD_LCD.labels;
  if (!rows.every(row => row.numberFormat || labels[nameOf(row)] || [...nameOf(row)].every(char => CLASS_PAD_LCD.glyphs[char]))) return null;

  if (menu.title && state.app === 'spreadsheet') surface.sprite(lcdLocaleAssets880(CLASS_PAD_LCD.sheet,settings.language).autoTitle, 0, 0);
  if (menu.title && state.app === 'statistics') surface.sprite(lcdLocaleAssets880(CLASS_PAD_LCD.special.regression,settings.language).frequencyTitle, 0, 0);
  if (menu.title && state.app === 'math-box') surface.sprite(lcdLocaleAssets880(CLASS_PAD_LCD.trials,settings.language).viewTitle,0,0);
  if (menu.title && CLASS_PAD_LCD.numberMenus.titles[menu.title]) surface.sprite(CLASS_PAD_LCD.numberMenus.titles[menu.title],0,0);
  rows.forEach((row, index) => {
    const y = (Math.floor(index / menu.columns) + Number(!!menu.title)) * 16;
    const start = pairedMenu ? index % 2 * 99 : 0;
    const width = pairedMenu ? 89 : 188;
    const selected = Number(menu.highlight && menu.selected === menu.offset + index);
    if (selected) surface.rect(start, y, width, 15, 1);
    const key = LCD_MENU_NUMBER_KEYS[menu.offset + index];
    let left = start;
    if (settings.hints && menu.direct && key) {
      const options = CLASS_PAD_LCD.hints[key];
      if (options) {
        const badge = options[selected] || options[1 - selected];
        const invert = value => value === 1 ? 0 : value === 0 ? 1 : value;
        surface.sprite(badge, start, y, options[selected] ? undefined : invert, true);
      }
      left += 11;
    }
    if (row.radio) {
      const radio = menu.circleTypes ? CLASS_PAD_LCD.circle.typeIcons[index]
        : CLASS_PAD_LCD.menu.radio[selected * 2 + Number(row.radio())];
      surface.sprite(radio, left, y, menu.circleTypes ? () => selected ? 0 : 1 : undefined, !menu.circleTypes);
      left += 11;
    }
    const numberLabels = english ? CLASS_PAD_LCD.numberMenus.labels : CLASS_PAD_LCD.numberMenus.vi.labels;
    const alias = row.numberFormat ? numberLabels[row.numberFormat] : labels[nameOf(row)];
    if (alias) surface.sprite(alias, left, y, () => selected ? 0 : 1);
    else {
      const chars = [...nameOf(row)];
      const slots = Math.floor((start + width - (row.arrow ? 12 : 0) - left) / 11);
      if (chars.length > slots) chars.splice(slots - 1, Infinity, '…');
      chars.forEach((char, cell) => surface.sprite(CLASS_PAD_LCD.glyphs[char], left + cell * 11, y, () => selected ? 0 : 1));
    }
    if (row.arrow) surface.sprite(CLASS_PAD_LCD.menu.arrow[selected], 176, y, undefined, true);
    if (row.numberFormat === settings.number.kind) {
      const ink = () => selected ? 0 : 1;
      surface.rect(143,y,33,15,selected ? 1 : 0);
      surface.sprite(CLASS_PAD_LCD.numberMenus.colon,143,y,ink);
      const value = String(settings.number.kind === 'sci' && settings.number.digits === 0 ? 10 : settings.number.digits);
      [...value].forEach((digit,index) => surface.sprite(CLASS_PAD_LCD.glyphs[digit],154+index*11,y+1,ink));
    }
  });
  if (state.app === 'statistics' && menu.rows.length > 4) {
    const total = Math.ceil(menu.rows.length / menu.columns);
    const offset = menu.offset / menu.columns;
    if (total > 4) {
      const start = Math.round(offset * LCD880_BODY / total);
      const end = Math.round((offset + 4) * LCD880_BODY / total);
      surface.rect(190, start, 2, end - start, 2);
    }
  } else if (state.app === 'spreadsheet' && menu.rows.length > 4) {
    const start = Math.round(menu.offset * LCD880_BODY / menu.rows.length);
    const end = Math.round((menu.offset + 4) * LCD880_BODY / menu.rows.length);
    surface.rect(190, start, 2, end - start, 2);
  } else if (menu.symbols) lcdScrollbar880(surface,menu.offset/2,Math.ceil(menu.rows.length/2),4);
  else if (!pairedMenu) lcdScrollbar880(surface, menu.offset, menu.rows.length, 4);
  return [menu.title, ...rows.map(row => row.name+(row.numberFormat === settings.number.kind
    ? ' '+(settings.number.kind === 'sci' && settings.number.digits === 0 ? 10 : settings.number.digits) : ''))].filter(Boolean).join(', ');
}

function lcdBox880(width = 0, top = -6, bottom = 6) {
  return {width, top, bottom, ink: [], markers: []};
}

function lcdInsertionArrow880(view) {
  const [x,y,width,height]=view.cursor;
  const tiny=height<=9;
  view.cursor=[x+2,y+Math.floor((height-7)/2),tiny ? 4 : 8,7];
  view.cursorRows=tiny ? [1,2,3,4,3,2,1] : [2,4,6,8,6,4,2];
}

function lcdPlace880(target, child, x, y) {
  target.ink.push(...child.ink.map(([sprite, dx, dy, ...appearance]) => [sprite, x + dx, y + dy, ...appearance]));
  target.markers.push(...child.markers.map(([dx, dy, width, height]) => [x + dx, y + dy, width, height]));
  target.top = Math.min(target.top, y + child.top);
  target.bottom = Math.max(target.bottom, y + child.bottom);
}

function lcdJoin880(boxes, small = false) {
  const box = small ? lcdBox880(0, -4, 5) : lcdBox880();
  for (const part of boxes) {
    lcdPlace880(box, part, box.width, 0);
    box.width += part.width;
  }
  return box;
}

function lcdMathLayout880(nodes, {cursorList, cursorIndex, linear, arrayMode = false, baseMode = false,
  equationMode = false, solverMode = false, ratioMode = false, complexMode = null} = {}) {
  const big = CLASS_PAD_LCD.normal;
  const small = CLASS_PAD_LCD.script;
  const assets = CLASS_PAD_LCD.symbols;
  const nestedFocus = cursorList && cursorList !== nodes;
  let supported = true;
  const char = (c, tiny, tone) => {
    if (c === '\u2009') return lcdBox880(tiny ? 2 : 4);
    const arrayGlyph = arrayMode && !tiny && c === 'e' ? CLASS_PAD_LCD.arrays.detE : null;
    const baseGlyph = baseMode && !tiny ? CLASS_PAD_LCD.base.font[c] : null;
    const equationGlyph = equationMode && !tiny ? CLASS_PAD_LCD.equations.font[c] : null;
    const ratioGlyph = ratioMode && !tiny ? CLASS_PAD_LCD.ratio.dms[c] : null;
    const sprite = arrayGlyph || baseGlyph || equationGlyph || ratioGlyph || (tiny ? small : big)[c];
    if (!sprite) {
      supported = false;
      return lcdBox880(tiny ? 6 : 11);
    }
    const box = tiny ? lcdBox880(6, -4, 5) : lcdBox880(11, -6, sprite[1] - 6);
    box.ink.push([sprite, 0, box.top, tone]);
    return box;
  };
  const str = (text, tiny, tone) => lcdJoin880([...text].map(c => char(c, tiny, tone)), tiny);
  function stretch(sprite, height) {
    const width = sprite[0];
    if (height === sprite[1]) return sprite;
    const pixels = readSprite880(sprite);
    const runs = [];
    for (let row = 0; row < height; row++) {
      const from = row < 5 ? row : row >= height - 5 ? sprite[1] - height + row : 9;
      for (let x = 0; x < width; x++) runs.push(String.fromCharCode(64 * pixels[from * width + x] + 1));
    }
    return [width, height, btoa(runs.join(''))];
  }

  function bracketPair(inside, tiny, radicalGroup, tone) {
    const height = inside.bottom - inside.top;
    if (tiny ? height <= 9 || height <= 12 && inside.top >= -4
      : height <= 12 || height <= 16 && inside.top >= -6) return null;
    const sprites = tiny ? [assets.scriptOpenTall,assets.scriptCloseTall]
      : height === 16 ? (radicalGroup ? [assets.radicalOpen,assets.radicalClose] : [assets.derivativeOpen,assets.derivativeClose])
      : height >= 24 ? [assets.openFraction,assets.closeFraction] : [assets.openTall,assets.closeTall];
    return sprites.map(sprite => {
      const box = lcdBox880(sprite[0],inside.top,inside.bottom);
      box.ink.push([stretch(sprite,height),0,inside.top,tone]);
      return box;
    });
  }

  function bracketBoxes(list, boxes, tone, tiny = false) {
    const opens = [];
    for (const [i, item] of list.entries()) {
      if (item.type !== 'char') continue;
      if (item.ch === '(') opens.push(i);
      if (item.ch !== ')') continue;
      if (!opens.length) {
        const inside = lcdJoin880(boxes.slice(0, i),tiny);
        const radicalGroup = list.slice(0,i).some(node => node.type === 'sqrt');
        const pair = bracketPair(inside,tiny,radicalGroup,tone);
        if (pair) boxes[i] = pair[1];
        continue;
      }
      const start = opens.pop();
      const inside = lcdJoin880(boxes.slice(start + 1, i),tiny);
      const height = inside.bottom - inside.top;
      const radicalGroup = list.slice(start + 1,i).some(node => node.type === 'sqrt');
      const pair = bracketPair(inside,tiny,radicalGroup,tone);
      if (!pair) continue;
      const pairFunction = ['GCD','LCM','Pol','Rec'].includes(list.slice(Math.max(0,start-3),start).map(part=>part.ch || '').join(''));
      for (const [position, box] of [[start,pair[0]], [i,pair[1]]]) {
        const closeInset = pairFunction && height === 17 && position === i ? 2 : 0;
        box.width -= closeInset;
        box.compactFunctionClose = closeInset > 0;
        if (closeInset) box.ink = box.ink.map(([sprite,x,y,...rest]) => [sprite,x-closeInset,y,...rest]);
        boxes[position] = box;
      }
      if (['²','³'].includes(list[i+1]?.ch) || list[i+1]?.type === 'sup') {
        const exponent = boxes[i+1];
        const shift = inside.top + (tiny ? 4 : 6);
        boxes[i+1] = {...exponent,top:exponent.top+shift,bottom:exponent.bottom+shift,
          ink:exponent.ink.map(([sprite,x,y,...rest]) => [sprite,x,y+shift,...rest]),
          markers:exponent.markers.map(([x,y,...rest]) => [x,y+shift,...rest])};
      }
    }
    for (const start of opens.reverse()) {
      const inside = lcdJoin880(boxes.slice(start + 1),tiny);
      const radicalGroup = list.slice(start + 1).some(node => node.type === 'sqrt');
      const pair = bracketPair(inside,tiny,radicalGroup,tone);
      if (pair) boxes[start] = pair[0];
    }
  }

  function slot(list, tiny, focused, isSlot, padPower = false) {
    const active = list === cursorList;
    const visible = focused || active;
    const tone = !nestedFocus || visible ? 1 : 2;
    const listBox = tiny ? lcdBox880(0, -4, 5) : lcdBox880();
    if (isSlot && !list.length) {
      const sprite = tiny ? (active ? assets.activeScriptPlaceholder : assets.scriptPlaceholder) : assets.placeholder;
      listBox.width = tiny ? 6 : 11;
      listBox.ink.push([sprite, tiny ? 0 : 1, listBox.top, tone]);
      if (active) listBox.markers.push([tiny ? 0 : 0, listBox.top, tiny ? 2 : 3, tiny ? 9 : 13]);
      return listBox;
    }
    const boxes = list.map((item, index) => {
      const inverseStart = item.ch === '⁻' ? index : item.ch === '¹' ? index-1 : -1;
      if (inverseStart >= 0 && list[inverseStart]?.ch === '⁻' &&
          list[inverseStart+1]?.ch === '¹' && list[inverseStart+2]?.ch === '(' &&
          ['sin','cos','tan','sinh','cosh','tanh'].some(name =>
            list.slice(Math.max(0,inverseStart-name.length),inverseStart).map(part=>part.ch || '').join('') === name)) {
        const box = tiny ? lcdBox880(index === inverseStart ? 6 : 0,-4,5) : lcdBox880(index === inverseStart ? 11 : 0);
        if (index === inverseStart) box.ink.push([tiny ? assets.functionInverseSmall : assets.functionInverse,0,tiny ? -4 : -6,tone]);
        return box;
      }
      if (linear && !tiny && inverseStart >= 0 && list[inverseStart]?.ch === '⁻' && list[inverseStart+1]?.ch === '¹') {
        const box = lcdBox880(index === inverseStart ? 11 : 0);
        if (index === inverseStart) box.ink.push([assets.reciprocalLinear,0,-6,tone]);
        return box;
      }
      if (baseMode && item.ch === 'A' && list.slice(index,index+3).map(node => node.ch).join('') === 'Ans') {
        const sprite = CLASS_PAD_LCD.base.ansA;
        const box = lcdBox880(11,-6,6);
        box.ink.push([sprite,0,-6,tone]);
        return box;
      }
      if (item.ch === ' ' && /^\d+$/.test(list[index-1]?.ch || '') && /^\d+$/.test(list[index+1]?.ch || '')) {
        return lcdBox880(tiny ? 2 : 4);
      }
      if (!tiny && item.ch === 'e' && list[index - 1]?.ch === 'R' && list[index + 1]?.ch === 'c') {
        const box = lcdBox880(11);
        box.ink.push([assets.recE,0,-6,tone]);
        return box;
      }
      if (!tiny && item.ch === 'e' && list.slice(index-2,index+4).map(node => node.ch).join('') === 'PreAns') {
        const box = lcdBox880(11);
        box.ink.push([CLASS_PAD_LCD.normal.preAnsE,0,-6,tone]);
        return box;
      }
      if (complexMode && !tiny && item.ch === 'e' && list[index - 1]?.ch === 'R' && list[index + 1]?.ch === 'P') {
        const box = lcdBox880(11);
        box.ink.push([CLASS_PAD_LCD.complex.realPartE, 0, -6, tone]);
        return box;
      }
      return node(item, tiny, visible, tone, index < list.length - 1, padPower);
    });
    if (!linear) boxes.forEach((box,index) => {
      const reciprocal = list[index].ch === '⁻' && list[index+1]?.ch === '¹'
        || list[index].ch === '¹' && list[index-1]?.ch === '⁻';
      const baseIndex = index - (list[index].ch === '¹' && reciprocal ? 2 : 1);
      if (baseIndex < 0 || !(reciprocal || list[index].type === 'sup' || ['²','³','⁻¹'].includes(list[index].ch))) return;
      const rise = Math.min(0,boxes[baseIndex].top - (tiny ? -4 : -6));
      if (!rise) return;
      box.ink = box.ink.map(([sprite,x,y,...rest]) => [sprite,x,y+rise,...rest]);
      box.markers = box.markers.map(([x,y,...rest]) => [x,y+rise,...rest]);
      box.top = Math.min(tiny ? -4 : -6,box.top+rise);
      box.bottom = Math.max(tiny ? 5 : 6,box.bottom+rise);
    });
    if (!linear) bracketBoxes(list, boxes, tone, tiny);
    for (let index = 0; index <= list.length; index++) {
      if (active && index === cursorIndex) {
        const endsInAbs = list[index - 1]?.type === 'abs';
        const endsInRadical = ['sqrt','nthroot'].includes(list[index - 1]?.type);
        const endsInLogPower = list[index - 1]?.type === 'logn' && list[index - 1].arg.at(-1)?.type === 'sup';
        const afterRadicalPower = endsInRadical && list[index-1].arg?.at(-1)?.type === 'sup';
        const calculus = ['integral','derivative','sum','product'];
        const endsInCalculus = calculus.includes(list[index - 1]?.type);
        const afterCalculus = list[index - 1]?.type === 'char' && list.some(item => calculus.includes(item.type));
        const beforeClosing = list[index]?.ch === ')' && list[index - 1]?.type === 'char';
        const afterText = list[index - 1]?.type === 'char' && list[index - 1]?.ch !== ')';
        const postfixOffset = !linear && ['²','³','⁻¹'].includes(list[index-1]?.ch) ? 2
          : !linear && list[index-1]?.ch === '¹' && list[index-2]?.ch === '⁻' ? 3 : 0;
        const postfixBase = postfixOffset && list[index-postfixOffset];
        const postfixLayout = postfixOffset ? boxes[index-postfixOffset] : null;
        const postfixNoExtraRow = ['abs','sqrt','nthroot'].includes(postfixBase?.type);
        const postfixFraction = ['frac','mixed'].includes(postfixBase?.type) ? boxes[index-postfixOffset] : null;
        const nextPower = !linear && list[index]?.type === 'sup' ? boxes[index] : null;
        const powerCursorBox = nextPower && {top:Math.min(nextPower.top,boxes[index-1]?.top ?? nextPower.top),
          bottom:Math.max(nextPower.bottom,boxes[index-1]?.bottom ?? nextPower.bottom)};
        const cursorBox = powerCursorBox || (afterCalculus ? boxes[index - 1] : ['frac','sqrt'].includes(list[index]?.type) ? boxes[index]
          : beforeClosing || afterText || ['frac','mixed','sqrt','nthroot','abs'].includes(list[index-1]?.type)
            ? boxes[index - 1] : listBox);
        const cursorFraction = list[index]?.type === 'frac' ? list[index]
          : list[index - 1]?.type === 'frac' ? list[index - 1] : postfixFraction ? postfixBase : null;
        const radicalDenominator = cursorFraction?.den.some(node => node.type === 'sqrt');
        listBox.markers.push([listBox.width + Number(afterRadicalPower)*2, cursorBox.top, 3,
          Math.max(tiny ? 9 : 13, Math.max(cursorBox.bottom,postfixLayout?.bottom ?? cursorBox.bottom) - cursorBox.top + Number(!tiny && !endsInAbs && !endsInRadical && !endsInLogPower && !postfixNoExtraRow && !endsInCalculus && !radicalDenominator && list[index]?.type !== 'sqrt' && !boxes[index-1]?.compactFunctionClose))]);
      }
      if (!list[index]) break;
      const part = boxes[index];
      lcdPlace880(listBox, part, listBox.width, 0);
      listBox.width += part.width;
    }
    return listBox;
  }

  function node(item, tiny, focused, tone, followed = false, padPower = false) {
    const child = (list, smallFont = tiny, padded = false) => slot(list, smallFont, focused, true, padded);
    const text = s => str(s, tiny, tone);
    const parts = (...boxes) => lcdJoin880(boxes, tiny);
    function frac(num, den) {
      const a = child(num,tiny,true), b = child(den,tiny,true);
      if (linear) return parts(a, text('┘'), b);
      const wide = Math.max(a.width, b.width);
      const box = lcdBox880(wide + 4);
      const gap = tiny || (a.bottom - a.top > 12 && num.at(-1)?.type !== 'sup') ? 1 : 2;
      lcdPlace880(box, a, 2 + Math.floor((wide - a.width) / 2), -gap - a.bottom);
      lcdPlace880(box, b, 2 + Math.floor((wide - b.width) / 2), 3 - b.top);
      box.ink.push([null, 1, 0, tone, wide + 3, 1]);
      return box;
    }
    function sup(list, fixed = false) {
      if (linear && !fixed) return parts(text('^('), child(list, false), text(')'));
      const exponent = child(list, true, true);
      const width = exponent.width + (fixed ? 2 : 0);
      const box = tiny ? lcdBox880(width,-4,5) : lcdBox880(width);
      // Nested powers retain a six-pixel structural bottom. A small log's
      // subscript extends below it and lifts the enclosing exponent.
      const descent = exponent.bottom > 6 ? exponent.bottom - 5 : 0;
      lcdPlace880(box, exponent, 0, (tiny ? -4 : -6) - descent);
      return box;
    }
    function radical(radicand) {
      const tall = radicand.top < -6;
      const tail=item.arg?.at(-1);
      const fixedPowerTail=!tiny && (['²','³','⁻¹'].includes(tail?.ch) ||
        tail?.ch === '¹' && item.arg?.at(-2)?.ch === '⁻');
      const activePowerTail = tail?.type === 'sup' && !!cursorList?.includes(tail);
      const paddedTail = ['frac','mixed','sqrt','nthroot'].includes(tail?.type);
      const radicalDenominator=['sqrt','nthroot'].includes(tail?.den?.at(-1)?.type);
      const fractionDescent = Number(!tiny && ['frac','mixed'].includes(tail?.type) && !radicalDenominator);
      const box = lcdBox880(radicand.width + 12 + (tall && !paddedTail ? 2 : 0),
        radicand.top - 3, Math.max(tiny ? 5 : 7,radicand.bottom+fractionDescent));
      lcdPlace880(box, radicand, 10, 0);
      const hook = lcdRadicalHook880(box.bottom - box.top);
      const hookTop = box.bottom - hook[1];
      box.ink.push([hook, 0, hookTop, tone]);
      if (hookTop > box.top) box.ink.push([null, 8, box.top, tone, 1, hookTop - box.top]);
      box.ink.push([null, 8, box.top, tone, box.width - 8 - Number(tall && (solverMode || fixedPowerTail || activePowerTail)) * 2, 1]);
      if (!tall || paddedTail || equationMode || complexMode === 'result') box.width += 2;
      return box;
    }

    switch (item.type) {
      case 'frac':
        return frac(item.num, item.den);
      case 'mixed':
        return parts(...(!linear ? [lcdBox880(2)] : []),child(item.int), ...(linear ? [text('┘')] : []), frac(item.num, item.den));
      case 'sqrt':
        return linear ? parts(text('√('), child(item.arg), text(')')) : radical(child(item.arg));
      case 'nthroot': {
        if (linear) return parts(child(item.idx), text('√('), child(item.arg), text(')'));
        const root = radical(child(item.arg));
        const index = child(item.idx, true);
        const box = lcdBox880(root.width + index.width - 2);
        lcdPlace880(box, root, index.width, 0);
        lcdPlace880(box, index, 2, root.top + 5 - index.bottom);
        return box;
      }
      case 'lcd-science': {
        const box = lcdBox880(24);
        const negative = item.exponent.startsWith('−');
        box.ink.push([negative ? assets.scientificNegativeBase : assets.scientificBase, 0, -6, tone]);
        let left = 22;
        for (const digit of negative ? item.exponent.slice(1) : item.exponent) {
          const glyph = ratioMode && digit === '0' ? CLASS_PAD_LCD.ratio.engineeringZero
            : arrayMode && digit === '0' ? CLASS_PAD_LCD.arrays.exponentZero : CLASS_PAD_LCD.scientific[digit];
          if (!glyph) { supported = false; break; }
          box.ink.push([glyph, left, -6, tone]);
          left += glyph[0];
        }
        box.width = 2 + left;
        return box;
      }
      case 'integral': {
        if (linear) { supported = false; return lcdBox880(); }
        const upper = child(item.upper, true);
        const lower = child(item.lower, true);
        const body = child(item.body);
        const limitWidth = 13 + Math.max(upper.width, lower.width);
        const box = lcdBox880(limitWidth + body.width + 22, -17, 14);
        box.ink.push([assets.integral, 0, -17, tone]);
        lcdPlace880(box, upper, 11, -11);
        lcdPlace880(box, lower, 11, 9);
        lcdPlace880(box, body, limitWidth, 0);
        box.ink.push([assets.integralDx, limitWidth + body.width + 1, -6, tone]);
        return box;
      }
      case 'sum':
      case 'product': {
        if (linear) { supported = false; return lcdBox880(); }
        const upper = child(item.upper, true);
        const lower = child(item.lower, true);
        const body = child(item.body);
        const width = Math.max(18, 12 + lower.width, upper.width);
        const box = lcdBox880(width + body.width + 25, -16, 17);
        box.ink.push([assets[item.type], Math.floor((width - 15) / 2) + 1, -6, tone]);
        box.ink.push([assets.indexEquals, Math.floor((width - 12 - lower.width) / 2) + 1, 8, tone]);
        lcdPlace880(box, upper, Math.floor((width - upper.width) / 2), -12);
        lcdPlace880(box, lower, Math.floor((width - 12 - lower.width) / 2) + 12, 12);
        const height = body.bottom - body.top;
        if (height > 12) {
          const left = height === 16 ? assets.derivativeOpen : stretch(assets.openFraction, height);
          const right = height === 16 ? assets.derivativeClose : stretch(assets.closeFraction, height);
          box.ink.push([left,width + 1,body.top,tone],
            [right,width + 12 + body.width,body.top,tone]);
          lcdPlace880(box,body,width + 12,0);
        } else lcdPlace880(box, parts(text('('), body, text(')')), width + 1, 0);
        return box;
      }
      case 'abs': {
        const body = child(item.arg);
        if (linear) return parts(text('Abs('), body, text(')'));
        const fractionDescent = Number(!tiny && ['frac','mixed'].includes(item.arg.at(-1)?.type));
        const box = lcdBox880(body.width + 12, body.top - 2, Math.max(tiny ? 5 : 7,body.bottom+fractionDescent));
        const height = box.bottom - box.top;
        box.ink.push([null, 2, box.top, tone, 2, height],
          [null, box.width - 3, box.top, tone, 2, height]);
        lcdPlace880(box, body, 6, 0);
        return box;
      }
      case 'derivative': {
        if (linear) { supported = false; return lcdBox880(); }
        const body = child(item.body);
        const point = child(item.point, true);
        const start = 26 + 22 + body.width;
        const box = lcdBox880(start + 23 + point.width, -14, 16);
        box.ink.push([assets.derivative, 0, -14, tone], [assets.evalBar, start + 1, -6, tone],
          [assets.evalEquals, start + 5, 5, tone]);
        const height = body.bottom - body.top;
        if (height > 12) {
          const fraction = item.body.some(node => node.type === 'frac');
          const left = height === 16 ? assets.derivativeOpen : stretch(fraction ? assets.openFraction : assets.openTall, height);
          const right = height === 16 ? assets.derivativeClose : stretch(fraction ? assets.closeFraction : assets.closeTall, height);
          const closeGap = item.body.at(-1)?.type === 'abs' ? -2 : 0;
          box.ink.push([left, 26, body.top, tone], [right, 37 + body.width + closeGap, body.top, tone]);
          lcdPlace880(box, body, 37, 0);
        } else lcdPlace880(box, parts(text('('), body, text(')')), 26, 0);
        lcdPlace880(box, point, start + 18, 9);
        return box;
      }
      case 'factorPower': {
        if (!linear) return sup(item.exp,true);
        const box = lcdBox880(item.exp.length * 9 + 2);
        item.exp.forEach((digit,index) => box.ink.push([CLASS_PAD_LCD.scientific[digit.ch],index*9,-6,tone]));
        return box;
      }
      case 'sup':
        return sup(item.exp, !linear && (solverMode || followed || padPower || cursorList?.includes(item)));
      case 'pow10':
      case 'epow':
      case 'times10':
        return parts(text({pow10:'10', epow:'e', times10:'×10'}[item.type]), sup(item.exp,item.type === 'times10' && !linear));
      case 'logn': {
        if (linear) return parts(text('log('), child(item.base), text(','), child(item.arg), text(')'));
        const base = child(item.base, true);
        const sub = tiny ? lcdBox880(base.width, -4, 5) : lcdBox880(base.width);
        lcdPlace880(sub, base, 0, (tiny ? 3 : 5) + Math.max(0,-4-base.top));
        const argument = child(item.arg, tiny, true);
        const pair = bracketPair(argument,tiny,item.arg.some(node => node.type === 'sqrt'),tone)
          || [text('('),text(')')];
        return parts(text('log'), sub, pair[0], argument, pair[1]);
      }
      case 'recurring': {
        const ink = item.digits === cursorList ? 1 : tone;
        const delimiter = sprite => {
          const box = lcdBox880(11,-6,7);
          box.ink.push([sprite,0,-6,ink]);
          return box;
        };
        return parts(delimiter(assets.recurringLeft),child(item.digits),delimiter(assets.recurringRight));
      }
      case 'angle': {
        const suffix = text({deg:'°',rad:'ʳ',grad:'ᵍ'}[item.unit]);
        if (item.unit === 'deg' && !tiny) suffix.ink = [[assets.angleDegree,0,-6,tone]];
        return parts(child(item.arg),suffix);
      }
      case 'char':
        if (item.stat && !tiny && CLASS_PAD_LCD.special.statInput[item.ch]) {
          const sprite = CLASS_PAD_LCD.special.statInput[item.ch];
          const box = lcdBox880(sprite[0],-6,sprite[1]-6);
          box.ink.push([sprite,0,-6,tone]);
          return box;
        }
        if ((item.constant || item.conversion) && !tiny) {
          const sprite = item.constant ? CLASS_PAD_LCD.constants.input[item.constant]
            : CLASS_PAD_LCD.conversions.input[UNIT_CONVERSIONS[item.conversion].baseId || item.conversion];
          if (sprite) {
            const box = lcdBox880(sprite[0],-6,sprite[1]-6);
            box.ink.push([sprite,0,-6,tone]);
            return box;
          }
        }
        if (!tiny && (item.combinatoric || (item.eng && !baseMode))) {
          const sprite = (item.combinatoric ? assets.combinatoric : assets.engineer)[item.ch];
          if (sprite) {
            const box = lcdBox880(11,-6,sprite[1]-6);
            box.ink.push([sprite,0,-6,tone]);
            return box;
          }
        }
        if (item.constant) return text(SCIENTIFIC_CONSTANTS[item.constant].symbol);
        if (item.negative) return text(tiny ? '−' : '~');
        if (item.imaginary) return text('𝑖');
        if (arrayMode && ['²','³','¹','⁻'].includes(item.ch)) {
          if (item.ch === '⁻') return lcdBox880();
          const sprite = CLASS_PAD_LCD.arrays.postfix[item.ch];
          const box = lcdBox880(sprite[0]);
          box.ink.push([sprite, 0, -6, tone]);
          return box;
        }
        if (item.ch === '²' || item.ch === '³') return linear && item.ch === '²' ? text('²')
          : sup(charNodes(item.ch === '²' ? '2' : '3'), true);
        if (item.ch === '⁻' || item.ch === '¹') {
          const sprite = assets[item.ch === '⁻' ? 'supMinus' : 'supOne'];
          const top = linear ? -6 : tiny ? -8 : -10;
          const box = lcdBox880(sprite[0], top, tiny ? 5 : 6);
          box.ink.push([sprite, 0, top, tone]);
          return box;
        }
        if (item.ch === '⁻¹') return sup(charNodes('−1'), true);
        return text(item.ch);
      default:
        supported = false;
        return lcdBox880();
    }
  }
  const box = slot(nodes, false, false, false);
  return supported ? box : null;
}

function ratioNodes880(numerator, denominator) {
  return [{type:'frac', num:numerator, den:denominator}];
}

function lcdResultNodes880(data) {
  if (data.factorization) return [...data.factorization.matchAll(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)|([^⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g)].flatMap(match => match[1]
    ? [{type:'factorPower',exp:charNodes([...match[1]].map(c => String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).join(''))}]
    : charNodes(match[2]));
  if (data.recurringDecimal) {
    const match = /^(.*)‹([0-9]+)›$/.exec(data.recurringDecimal);
    if (match) return [...lcdResultNodes880({result:match[1]}), {type:'recurring',digits:charNodes(match[2])}];
  }
  if (data.coordinateResult) {
    const {labels,values} = data.coordinateResult;
    return labels.flatMap((label,index) => [...charNodes((index ? ',' : '') + label + '='),
      ...lcdResultNodes880({result:values[index]})]);
  }
  if (data.exactFraction) {
    const {negative, int, num, den} = data.exactFraction;
    const fraction = int === undefined ? ratioNodes880(charNodes(num), charNodes(den))
      : [{type:'mixed', int:charNodes(int), num:charNodes(num), den:charNodes(den)}];
    return [...(negative ? [{type:'char', ch:'−', negative:true}] : []), ...fraction];
  }
  if (data.exactSurdNodes) return data.exactSurdNodes.map((node,index) =>
    index === 0 && node.ch === '−' ? {...node,negative:true} : node);
  if (data.exactSurd) {
    const s = data.exactSurd;
    const root = [...(s.coeffNum === '1' ? [] : charNodes(s.coeffNum)), {type:'sqrt', arg:charNodes(s.radicand)}];
    const coeff = s.coeffDen === '1' ? root : ratioNodes880(root, charNodes(s.coeffDen));
    const rational = s.rationalNum === '0' ? [] : s.rationalDen === '1' ? charNodes(s.rationalNum)
      : ratioNodes880(charNodes(s.rationalNum), charNodes(s.rationalDen));
    const nodes = [...charNodes(s.rationalNegative ? '−' : ''), ...rational,
      ...charNodes(s.coeffNegative ? '−' : rational.length ? '+' : ''), ...coeff];
    if (nodes[0]?.ch === '−') nodes[0].negative = true;
    return nodes;
  }
  if (data.exactPi) {
    const {num, den, negative} = data.exactPi;
    const numerator = charNodes((num === '1' ? '' : num) + 'π');
    return [...charNodes(negative ? '−' : ''), ...(den === '1' ? numerator : ratioNodes880(numerator, charNodes(den)))];
  }
  const text = String(data.dmsResult || data.factorization || data.result || '');
  const scientific = /^(.*)×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/.exec(text);
  if (scientific) {
    const exponent = [...scientific[2]].map(c => c === '⁻' ? '−' : String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).join('');
    return [...lcdResultNodes880({result:scientific[1]}), {type:'lcd-science', exponent}];
  }
  const prefix = text.startsWith('-') || text.startsWith('−') ? [{type:'char', ch:'−', negative:true}] : [];
  const tokens = charNodes(prefix.length ? text.slice(1) : text);
  if (/^[0-9., ]+[mμnpfkMGTPE]?$/.test(prefix.length ? text.slice(1) : text)) {
    if (/[mμnpfkMGTPE]$/.test(text)) tokens.at(-1).eng = true;
  }
  if (data.complexResult) {
    for (const token of tokens) if (token.ch === 'i') token.imaginary = true;
  }
  return [...prefix, ...tokens];
}

function lcdComplexPart880(text) {
  const imaginary = text.endsWith('i');
  const value = imaginary ? text.slice(0,-1) : text;
  const fraction = /^([−-]?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(value);
  const surd = /^([−-]?)(\d*)√(\d+)(?:\/(\d+))?$/.exec(value);
  const pi = /^([−-]?)(\d*)π(?:\/(\d+))?$/.exec(value);
  let nodes;
  if (fraction) {
    const [, sign, int, num, den] = fraction;
    nodes = lcdResultNodes880({exactFraction:{negative:!!sign,int,num,den}});
  } else if (surd || pi) {
    const [, sign, coefficient, digit, denominator] = surd || pi;
    const num = surd ? [...charNodes(coefficient), {type:'sqrt',arg:charNodes(digit)}]
      : charNodes((coefficient || '') + 'π');
    const den = surd ? denominator : digit;
    nodes = [...(sign ? [{type:'char',ch:'−',negative:true}] : []),
      ...(den ? ratioNodes880(num,charNodes(den)) : num)];
  } else nodes = lcdResultNodes880({result:value});
  if (imaginary) nodes.push({type:'char',ch:'i',imaginary:true});
  return nodes;
}

function drawLCDMath880(surface, box, x, y, invert = false) {
  for (const [sprite, dx, dy, tone, w, h] of box.ink) {
    const ink = invert ? 0 : tone;
    if (sprite) surface.sprite(sprite, x + dx, y + dy, () => ink);
    else surface.rect(x + dx, y + dy, w, h, ink);
  }
}

function lcdMath880(state, surface, view) {
  const {data, settings, app} = state;
  const arrayMode = app === 'matrix' || app === 'vector';
  const statistics = app === 'statistics';
  const linear = arrayMode || statistics || settings.io.startsWith('line');
  if (!['input','result'].includes(data.mode)) return null;
  const editing = data.mode === 'input';
  const arrayPreviousResults = arrayMode && !editing ? data.arrayPreviousResults || [] : [];
  const expr = lcdMathLayout880(editing ? data.nodes : data.expressionNodes, {
    cursorList: editing ? data.cursorList : null, cursorIndex: data.cursorIndex, linear, arrayMode,
    solverMode:app === 'equation', complexMode:app === 'complex' ? 'input' : null
  });
  const verifying = !editing && data.verifyResult != null;
  const complex = !editing && !verifying && data.complexDisplay;
  const complexFirst = complex && lcdComplexPart880(complex.left);
  const complexTail = complex && [...charNodes(complex.separator), ...lcdComplexPart880(complex.right)];
  if (complex && !complex.left && complex.separator === '−') complexTail[0].negative = true;
  let answerNodes = editing ? null : verifying ? [] : complex
    ? [...(complex.stacked ? [] : complexFirst), ...complexTail] : lcdResultNodes880(data);
  if (data.remainderResult?.layout === 'inline') {
    const {quotient,remainder} = data.remainderResult;
    answerNodes = charNodes(quotient+',R='+remainder);
  }
  if (!editing && !verifying && !complex && data.exactPi?.den !== undefined && data.exactPi.den !== '1') {
    const {negative,num,den} = data.exactPi;
    answerNodes = [...(negative ? [{type:'char',ch:'−',negative:true}] : []),
      ...ratioNodes880(charNodes(num),charNodes(den)),...charNodes('π')];
  }
  const answerLayout = {linear, complexMode:complex ? 'result' : null, ratioMode:!!(data.dmsResult || data.engineeringPresentation)};
  const answer = answerNodes && lcdMathLayout880(answerNodes, answerLayout);
  const firstLine = complex?.stacked && lcdMathLayout880(complexFirst, answerLayout);
  if (expr === null || (!editing && answer === null)) return null;
  // A full seventeen-cell LineI expression advances the caret to an empty
  // next line; results start below that line as observed for scalars/pairs.
  const arrayExpressionRows = data.lineReplayOnly ? 0 : linear ? Math.floor(expr.width / 187) + 1 : 1;
  const wrappedArrayExpression = arrayExpressionRows > 1;
  const history = ['calculate','statistics'].includes(app) && linear ? (data.lineHistory || []).map(previous => {
    const expression = lcdMathLayout880(previous.expressionNodes,{linear:true});
    const value = lcdMathLayout880(lcdResultNodes880(previous),{linear:true,
      ratioMode:!!(previous.dmsResult || previous.engineeringPresentation)});
    if (!expression || !value) return null;
    return {previous,expression,value,rows:previous.lineReplayOnly ? 1 : Math.floor(expression.width/187)+2};
  }) : [];
  if (history.some(entry => !entry)) return null;
  const historyRows = history.reduce((rows,entry) => rows+entry.rows,0);
  const clippedRows = history.length ? Math.max(0,historyRows+arrayExpressionRows+Number(!editing)-4) : 0;
  const historyOrigin = 14*(historyRows-clippedRows);
  let historyRow = -clippedRows;
  for (const {previous,expression,value,rows} of history) {
    const wrapped = {...expression,ink:expression.ink.map(([sprite,dx,dy,...rest]) =>
      [sprite,dx%187,dy+Math.floor(dx/187)*14,...rest])};
    if (!previous.lineReplayOnly) drawLCDMath880(surface,wrapped,0,14*historyRow-expression.top);
    const emptyEngineer = previous.lineSettings?.engineer && !previous.dmsResult &&
      !/[mμnpfkMGTPE]$/.test(previous.result || '');
    drawLCDMath880(surface,value,LCD880_WIDTH-value.width-(emptyEngineer ? 11 : 0),14*(historyRow+rows-1)-value.top);
    historyRow += rows;
  }
  let x = 0;
  let y = -expr.top+historyOrigin;
  if (expr.markers[0]) {
    let [cx, cy, w, h] = expr.markers[0];
    if (linear) {
      cy += Math.floor(cx / 187) * 14;
      cx %= 187;
    }
    if (linear) h = Math.min(13,h);
    if (linear && data.overwrite) { cx++; cy+=10; w=10; h=3; }
    if (h === 14 && data.cursorList === data.nodes && data.nodes.every(node => node.type === 'char')) h = 13;
    if (app === 'complex' && h === 14 && data.cursorList === data.nodes) h = 13;
    if (app === 'equation' && data.cursorList === data.nodes && h > 13 && data.nodes[data.cursorIndex - 1]?.type !== 'sup') {
      cy += h - 13;
      if (data.nodes.some(node => node.type === 'sqrt')) cy--;
      h = 13;
    }
    const cursorCellWidth = h === 9 ? Math.max(6,w) : w;
    const overflow = Math.max(0, cx + cursorCellWidth - (LCD880_WIDTH - 8));
    x = linear ? 0 : -Math.ceil(overflow / 8) * 8;
    y -= Math.max(0, cy + y + h - LCD880_BODY);
    view.cursor = [cx + x, cy + y, w, h];
    if (data.insertionArrow && !linear) lcdInsertionArrow880(view);
  }
  if (!editing && expr.width + answer.width > LCD880_WIDTH &&
      expr.bottom - expr.top + answer.bottom - answer.top >= LCD880_BODY) {
    y = Math.min(y, LCD880_BODY - 2 - answer.bottom + answer.top - expr.bottom);
  }
  if (arrayPreviousResults.length < 3 && !data.lineReplayOnly) {
    const expressionBox = wrappedArrayExpression ? {...expr,ink:expr.ink.map(([sprite,dx,dy,...rest]) =>
      [sprite,dx % 187,dy + Math.floor(dx / 187)*14,...rest])} : expr;
    drawLCDMath880(surface, expressionBox, x, y);
  }
  if (arrayMode && editing && data.nodes.length === 0) {
    surface.sprite(lcdLocaleAssets880(CLASS_PAD_LCD.arrays,settings.language).prompt[app], 0, 34);
  }
  if (statistics && editing && data.nodes.length === 0) {
    const sprites = lcdLocaleAssets880(CLASS_PAD_LCD.special.regression,settings.language);
    surface.sprite(sprites.calculationLabel, LCD880_WIDTH-sprites.calculationLabel[0], 34);
    const model = statisticsTypeById(data.statisticsType).label;
    if (data.statisticsType === '1var' && sprites.oneVariableLabel)
      surface.sprite(sprites.oneVariableLabel,LCD880_WIDTH-sprites.oneVariableLabel[0],48);
    else if (data.statisticsType === 'quad') surface.sprite(sprites.calculationModel, 84, 48);
    else [...model].forEach((char, index) => {
      const glyph = CLASS_PAD_LCD.glyphs[char];
      if (glyph) surface.sprite(glyph, LCD880_WIDTH - 11 * (model.length - index), 48);
    });
    return (settings.language === 'en' ? 'Statistics, ' : 'Thống kê, ') + model;
  }
  const solver = CLASS_PAD_LCD.equations.solver[settings.language];
  if (app === 'equation' && editing && data.nodes.length === 0 && solver) {
    surface.sprite(solver.prompt, 0, 48);
    return settings.language === 'vi' ? 'Nhập phương trình' : 'Input Equation';
  }
  if (x < 0) {
    surface.rect(0, 0, 11, Math.max(13,y + expr.bottom), 0);
    surface.sprite(CLASS_PAD_LCD.symbols.scrollLeft, 0, y - 6);
  }
  if (!wrappedArrayExpression && expr.width + x > LCD880_WIDTH) {
    const {scrollRight, resultScrollRight} = CLASS_PAD_LCD.symbols;
    const edge = LCD880_WIDTH - 11;
    surface.rect(edge, 0, 11, editing ? Math.max(13,y + expr.bottom) : y + expr.bottom, 0);
    surface.sprite(editing ? scrollRight : resultScrollRight, edge + Number(editing), editing ? y - 6 : y - 3);
  }
  if (verifying) {
    const outcome = data.verifyResult ? 'true' : 'false';
    const label = linear ? CLASS_PAD_LCD.verifyLinear[settings.language][outcome]
      : lcdLocaleAssets880(CLASS_PAD_LCD.special,settings.language).notes[outcome];
    surface.sprite(label, LCD880_WIDTH - label[0], linear ? 14 * arrayExpressionRows + historyOrigin : 48);
  } else if (data.coordinateResult?.layout === 'rows') {
    const {labels,values} = data.coordinateResult;
    for (const [index,label] of labels.entries()) {
      const caption = lcdMathLayout880(charNodes(label+'='),{linear:true});
      const value = lcdMathLayout880(lcdResultNodes880({result:values[index]}),{linear:true});
      if (!caption || !value) return null;
      const baseline = 14*(arrayExpressionRows+index)-value.top;
      drawLCDMath880(surface,caption,0,baseline);
      drawLCDMath880(surface,value,LCD880_WIDTH-value.width,baseline);
    }
  } else if (answer) {
    const radical = !linear && data.exactSurd?.coeffDen === '1' &&
      (!data.exactSurdNodes || answerNodes.every(node => node.type === 'char' || node.type === 'sqrt'));
    const complexRadical = !!complex && answerNodes.some(node => node.type === 'sqrt');
    const pair = data.coordinateResult?.layout === 'inline' || data.remainderResult?.layout === 'inline';
    const plainNumber = answerNodes.every(node => node.type === 'char' || node.type === 'lcd-science' || node.type === 'recurring');
    const baseline = arrayPreviousResults.length ? 14 * Math.min(3,arrayPreviousResults.length + 1) - answer.top
      : linear || statistics ? 14 * (arrayExpressionRows + Number(!!firstLine)) - answer.top + historyOrigin : plainNumber ? 55
      : LCD880_BODY - 2 - answer.bottom + Number(radical || complexRadical || pair);
    const limit = data.coordinateResult ? lcdCoordinateScrollLimit880(data) : complex ? lcdComplexScrollLimit880(data,settings) : 0;
    const offset = Math.min(limit,data.coordinateResult?.horizontalOffset || complex?.horizontalOffset || 0);
    const emptyEngineer = settings.engineer && !complex && !data.dmsResult && !/[mμnpfkMGTPE]$/.test(data.result || '');
    const left = limit ? -offset : (data.engineering ? 182 : LCD880_WIDTH) - answer.width - (emptyEngineer ? 11 : 0);
    for (const [index, result] of arrayPreviousResults.entries()) {
      const row = lcdMathLayout880(lcdResultNodes880({result}), {linear:true});
      if (!row) return null;
      drawLCDMath880(surface, row, LCD880_WIDTH - row.width,
        14 * (index + Number(arrayPreviousResults.length < 3)) - row.top);
    }
    drawLCDMath880(surface, answer, left, baseline);
    if (data.engineering) {
      surface.sprite(CLASS_PAD_LCD.ratio.engineeringArrows,181,baseline-7);
      if (data.engineeringRight === false) surface.rect(184,baseline-6,8,5,0);
    }
    if (limit) lcdEquationArrows880(surface,offset,offset < limit,baseline,baseline+answer.top,baseline+answer.bottom);
    if (firstLine) drawLCDMath880(surface, firstLine, LCD880_WIDTH - firstLine.width, baseline - 14);
  }
  const inputText = editing ? data.buffer || '' : serializeForDisplay(data.expressionNodes);
  if (editing) return inputText;
  const accessibleResult = verifying ? (settings.language === 'en'
    ? (data.verifyResult ? 'True' : 'False') : (data.verifyResult ? 'Đúng' : 'Sai')) : complex || answerNodes.some(node => node.type === 'lcd-science')
    ? data.result : data.factorization || serializeForDisplay(answerNodes);
  return inputText + (verifying ? ', ' : ' = ') + accessibleResult;
}

function lcdComplexScrollLimit880(data, settings) {
  const parts = data.complexDisplay;
  if (!parts || parts.stacked) return 0;
  const nodes = [...lcdComplexPart880(parts.left),...charNodes(parts.separator),...lcdComplexPart880(parts.right)];
  const box = lcdMathLayout880(nodes,{linear:settings.io.startsWith('line'),complexMode:'result'});
  return box?.width > LCD880_WIDTH ? Math.ceil((box.width-LCD880_WIDTH)/8)*8 : 0;
}

function lcdCoordinateScrollLimit880(data) {
  const box = data.coordinateResult?.layout === 'inline' && lcdMathLayout880(lcdResultNodes880(data));
  return box?.width > LCD880_WIDTH ? Math.ceil((box.width-LCD880_WIDTH)/8)*8 : 0;
}

function lcdBase880(state, surface, view) {
  const {data, settings, base} = state;
  const editing = data.mode === 'input';
  const {titles, prompt} = lcdLocaleAssets880(CLASS_PAD_LCD.base,settings.language);
  surface.sprite(titles[base.id], 0, 0);
  const nodes = editing ? data.nodes : data.expressionNodes;
  const box = lcdMathLayout880(nodes, {cursorList:editing ? data.cursorList : null, cursorIndex:data.cursorIndex,
    linear:true, baseMode:true});
  if (!box) return null;
  const cursor = box.markers[0];
  const expressionRows = Math.floor(box.width / 187) + 1;
  const baseline = 14 - box.top;
  const wrapped = {...box,ink:box.ink.map(([sprite,dx,dy,...rest]) =>
    [sprite,dx % 187,dy + Math.floor(dx / 187)*14,...rest])};
  drawLCDMath880(surface, wrapped, 0, baseline);
  if (cursor) {
    const [x, y, width, height] = cursor;
    view.cursor = [x % 187, y + baseline + Math.floor(x / 187)*14, width, Math.min(13, height)];
  }
  if (editing) {
    if (!nodes.length) surface.sprite(prompt, 0, 34);
    return base.label + ' ' + data.buffer;
  }
  const result = base.id === 'bin' ? data.result.split(' ') : [data.result];
  const perLine = base.id === 'bin' ? 4 : 1;
  for (let index = 0; index < result.length; index += perLine) {
    const groups = result.slice(index, index + perLine);
    let right = LCD880_WIDTH;
    for (const group of groups.reverse()) {
      const value = lcdMathLayout880(lcdResultNodes880({result:group}), {linear:true, baseMode:true});
      if (!value) return null;
      drawLCDMath880(surface, value, right - value.width, 14*(expressionRows+1) + (index / perLine) * 14 - value.top);
      right -= value.width + 4;
    }
  }
  return base.label + ' ' + data.expression + ' = ' + data.result;
}

function lcdError880(state, surface) {
  if (state.data.mode !== 'error') return null;
  if (state.data.message === 'No Operator') {
    const {noOperator, chooseOperator, verifyBack} = lcdLocaleAssets880(CLASS_PAD_LCD.complex,state.settings.language);
    const back = state.data.verifyErrorBack;
    surface.sprite(noOperator, 0, 0);
    surface.rect(0, back ? 48 : 32, 188, 15, 1);
    surface.sprite(chooseOperator, 0, 32, () => back ? 1 : 0);
    surface.sprite(verifyBack, 0, 48, () => back ? 0 : 1);
    return state.settings.language === 'en' ? 'No Operator, '+(back ? 'Back' : 'Select Operator')
      : 'Không có Toán tử, '+(back ? 'Trở lại' : 'Chọn Toán tử');
  }
  if (state.settings.language === 'en') {
    const {englishErrors, englishBack} = CLASS_PAD_LCD.equations;
    const sprite = state.data.message === 'Range ERROR' ? CLASS_PAD_LCD.explorer.en.rangeError : englishErrors[state.data.message];
    if (!sprite) return null;
    surface.sprite(sprite, 0, 0);
    surface.sprite(CLASS_PAD_LCD.symbols.errorAlert, 85, 21);
    surface.sprite(englishBack, 0, 48);
    return state.data.message + '. Back';
  }
  if (state.settings.language !== 'vi') return null;
  const error = {'Math ERROR':['errorMath','Lỗi phép tính'], 'Syntax ERROR':['errorSyntax','Lỗi cú pháp'],
    'Stack ERROR':['errorStack','Lỗi nhóm phtính'],
    'Time Out':['errorTimeout','Hết thời gian'],
    'Memory ERROR':['errorMemory','Lỗi bộ nhớ'], 'Dimension ERROR':['errorDimension','Lỗi kích thước'],
    'Circular ERROR':['errorCircular','Lỗi vòng lặp'],
    'Not Defined':['errorNotDefined','Không xác định'],
    'Range ERROR':['errorRange','Lỗi phạm vi'],
    'Argument ERROR':['errorArgument','Lỗi đối số'], 'Cannot Solve':['errorSolve','Không giải được']}[state.data.message];
  if (!error) return null;
  const assets = CLASS_PAD_LCD.symbols;
  surface.sprite(error[0] === 'errorRange' ? CLASS_PAD_LCD.explorer.rangeError : assets[error[0]], 0, 0);
  surface.sprite(assets.errorAlert, 85, 21);
  surface.sprite(assets.errorBack, 0, 48);
  return error[1] + '. Trở lại';
}

function lcdGridText880(surface, text, x, y, tone = 1, alignRight = false, limit = Infinity,
  font = CLASS_PAD_LCD.special.grid) {
  const chars = [...String(text)].slice(0, limit);
  if (!chars.every(char => font[char])) return false;
  const left = alignRight ? x - chars.length * 6 : x;
  chars.forEach((char, i) => surface.sprite(font[char], left + i * 6, y, () => tone));
  return true;
}

function lcdFooter880(state, surface, view, value, right = 181) {
  const {data, settings} = state;
  const editing = !!data.draftNodes;
  const arrayMode = data.mode === 'matrix' || data.mode === 'vector';
  const sheet = state.app === 'spreadsheet';
  const coefficient = ['equation','inequality','ratio'].includes(state.app);
  const lineCoordinates = data.mode === 'geometry' && data.stage === 'coordinates' && data.sub?.kind === 'line';
  if ((sheet || state.app === 'table') && !editing && value === 'ERROR') {
    const error = CLASS_PAD_LCD.sheet.errorValue;
    surface.sprite(error,right-error[0],49);
    return true;
  }
  const linear = sheet || arrayMode || coefficient || ['statistics','distribution','table'].includes(state.app) || lineCoordinates || data.mode === 'formula-counts' ||
    editing && ['statistics','table','distribution','math-explorer','math-box'].includes(state.app) || settings.io.startsWith('line');
  const nodes = editing ? data.draftNodes : data.cellNodes || lcdResultNodes880({result:value, exactFraction:data.selectedFraction});
  const box = lcdMathLayout880(nodes, {linear, cursorList:editing ? data.cursorList : null,
    cursorIndex:data.cursorIndex, arrayMode});
  if (!box) return false;
  const cursor = box.markers[0];
  // Keep the next edit unit visible after an interior caret. The LineI ^(
  // prefix is one cursor step but occupies two cells. Scroll in eight pixels.
  const powerPrefix = data.cursorList?.[data.cursorIndex]?.ch === '^' && data.cursorList?.[data.cursorIndex+1]?.ch === '(';
  const coefficientEdge = data.cursorIndex < data.cursorList?.length ? 181 - (powerPrefix ? 22 : 11) : 181;
  const scroll = !cursor ? 0 : sheet ? Math.max(0,Math.ceil((cursor[0]-181)/8)*8)
    : arrayMode ? Math.max(0,Math.ceil((cursor[0]-176)/11)*11)
    : coefficient ? Math.max(0,Math.ceil((cursor[0]-coefficientEdge)/8)*8) : 0;
  // PLUS bounds plain Table footer alignment to 13 cells, with a sign cell.
  // Overflow remains clipped at the LCD edge; scientific layouts use full width.
  const x = editing ? -scroll : sheet && box.width > right ? 5
    : state.app === 'table' && !String(value).includes('×10')
      ? right-Math.min(box.width,/^[−-]/.test(value) ? 154 : 143) : right-box.width;
  const y = linear ? 55 : 61 - box.bottom;
  drawLCDMath880(surface, box, x, y);
  if ((arrayMode || sheet || coefficient) && editing) {
    const top = y + box.top;
    const {scrollLeft, scrollRight} = CLASS_PAD_LCD.symbols;
    if (scroll) {
      surface.rect(0, top, 11, 13, 0);
      surface.sprite(scrollLeft, 0, top);
    }
    if (box.width + x > LCD880_WIDTH) {
      surface.rect(LCD880_WIDTH - 11, top, 11, 13, 0);
      surface.sprite(scrollRight, LCD880_WIDTH - 11 + Number(coefficient), top);
    }
  }
  if (cursor) {
    const [left, top, width, height] = cursor;
    view.cursor = sheet && data.inputRemaining <= 10
      ? [x+left+1,y+top,10,height] : [x+left,y+top,width,linear ? Math.min(13,height) : height];
  }
  return true;
}

function lcdDataGrid880(state, surface, view) {
  const {data, app, settings} = state;
  const assets = lcdLocaleAssets880(CLASS_PAD_LCD.special,settings.language);
  const sheet = app === 'spreadsheet';
  const distribution = app === 'distribution';
  const columns = sheet ? data.heading.slice(1).map((label, index) => ({
    label, cells:data.rows.map((row, rowIndex) => ({
      text:typeof row[index + 1] === 'number' ? lcdCompactGridNumber880(row[index + 1]) : String(row[index + 1]),
      selected:data.cursor === rowIndex && data.column === index + 1
    }))
  })) : data.columns;
  if (!columns.every(column => assets.headings[column.label] || (distribution && column.label === 'P'))) return null;
  const first = sheet ? data.rows[0][0] - 1 : distribution ? data.listOffset : data.rowOffset ?? Math.max(0, data.cursor - 3);
  const focusedRow = sheet ? data.cursor : data.cursor - first;
  if (sheet) {
    const hasNextColumn = data.heading.at(-1) !== SHEET_COLUMNS_880.at(-1);
    surface.rect(19, 0, 1, 8, 2);
    surface.rect(0, 8, 20, 1, 2);
    if (hasNextColumn) surface.rect(188, 0, 4, 9, 2);
    for (let row = 1; row < 4; row++) {
      surface.rect(0, 8 + row * 10, 20, 1, 3);
      surface.rect(20, 8 + row * 10, hasNextColumn ? 172 : 168, 1, 2);
    }
  }
  for (let row = 0; row < 4; row++) {
    const y = 10 + row * 10;
    if (sheet) surface.rect(0, y - 1, 20, 9, row === focusedRow ? 1 : 2);
    lcdGridText880(surface, first + row + 1, 19, y, sheet ? 0 : 1, true);
  }
  if (!sheet) surface.rect(19, 0, 1, 48, 2);
  for (const [index, column] of columns.entries()) {
    const x = 20 + 42 * index;
    const selectedColumn = sheet && data.column === index + 1;
    if (sheet) surface.rect(x, 0, 41, 9, selectedColumn ? 1 : 2);
    const heading = app === 'table' && column.label === 'x' ? 'tableX'
      : app === 'table' && column.label === 'g(x)' && index === 1 ? 'tableOnlyG' : column.label;
    const label = distribution && heading === 'P' ? CLASS_PAD_LCD.distribution.headingP : assets.headings[heading];
    surface.sprite(label, x, 0, () => sheet ? 0 : 1);
    if (sheet) surface.rect(x + 41, 0, 1, 9, 3);
    surface.rect(x + 41, sheet ? 9 : 0, 1, sheet ? 39 : 48, 2);
    for (let row = 0; row < 4; row++) {
      const cell = column.cells[(sheet ? 0 : first) + row];
      const y = 10 + row * 10;
      if (cell?.selected) {
        if (sheet) {
          surface.rect(x, y - 1, 41, 9, 1);
        } else surface.rect(x + 2, y, 36, 8, 1);
      }
      const value = ['statistics','distribution','table'].includes(app) && typeof cell?.value === 'number'
        ? trimTrailingZeros(lcdCompactGridNumber880(cell.value)).replace('.',settings.decimal === 'comma' ? ',' : '.') : cell?.compactText ?? cell?.text ?? '';
      const tone = cell?.selected ? 0 : 1;
      if ((sheet || app === 'table') && value === 'ERROR') surface.sprite(CLASS_PAD_LCD.sheet.cellError, x + 9, y, () => tone);
      else if (app === 'table' && value.includes('×10')) {
        if (!lcdArrayCell880(surface, value, x + 39, y, tone, 6, CLASS_PAD_LCD.special.grid, CLASS_PAD_LCD.explorer.countsScience)) return null;
      }
      else if (distribution || ((sheet || app === 'statistics') && value.includes('×10'))) {
        const science = CLASS_PAD_LCD.explorer.countsScience;
        if (!lcdArrayCell880(surface, value, x + 39, y, tone, 6, CLASS_PAD_LCD.special.grid, science)) return null;
      } else if (!lcdGridText880(surface, value, x + 39, y, tone, true, 6)) return null;
    }
  }
  const note = data.undefinedFunctions?.join('/');
  const value = sheet ? data.cellText : data.selectedText;
  if (sheet && data.grab) {
    surface.sprite(lcdLocaleAssets880(CLASS_PAD_LCD.sheet,settings.language).grab, 0, 48);
    return settings.language === 'en' ? 'Set:[OK]' : 'Cài đặt:[OK]';
  }
  if (sheet && data.pasting) {
    surface.sprite(lcdLocaleAssets880(CLASS_PAD_LCD.sheet,settings.language).paste, 0, 48);
    if (data.pasteSource.cut) surface.sprite(CLASS_PAD_LCD.sheet.cutIcon, 0, 48, undefined, true);
    const {row,column} = data.pasteSource;
    if (row >= 0 && row < 4 && column >= 0 && column < columns.length) {
      const x = 20 + 42 * column, y = 9 + row * 10;
      surface.rect(x,y,41,1,2);
      surface.rect(x,y+8,41,1,2);
      surface.rect(x,y,1,9,2);
      surface.rect(x+40,y,1,9,2);
    }
    return settings.language === 'en' ? 'Paste:[OK]' : 'Dán:[OK]';
  }
  if (!data.draftNodes && !value && data.verifyCell) {
    surface.sprite(lcdLocaleAssets880(assets.table,settings.language).defineValue, 0, 48);
    return settings.language === 'en' ? 'Enter Value' : 'Nhập Giá trị';
  }
  if (!data.draftNodes && !value && note) {
    const sprite = {'f(x)/g(x)':assets.notes.bothUndefined, 'g(x)':assets.notes.gUndefined}[note];
    if (!sprite) return null;
    surface.sprite(sprite, 0, 48);
  } else {
    const filledTable = app === 'table';
    const twoStatistics = app === 'statistics' && (columns.some(column => column.key === 'y') || (!data.draftNodes && !!value));
    if (!lcdFooter880(state, surface, view, value || '', distribution || sheet || filledTable || twoStatistics ? 192 : 181)) return null;
  }
  if (distribution) surface.sprite(lcdLocaleAssets880(CLASS_PAD_LCD.distribution,settings.language).captions[data.typeId], 104, 0);
  return (data.typeLabel || state.appName || app) + ' ' + (value || note || '');
}

function lcdFields880(state, surface, view) {
  const {data, settings} = state;
  const {forms, notes} = lcdLocaleAssets880(CLASS_PAD_LCD.special,settings.language);
  const distribution = data.mode === 'distribution';
  const dist = lcdLocaleAssets880(CLASS_PAD_LCD.distribution,settings.language);
  if (data.result !== null && data.result !== undefined) {
    const resultLabel = data.typeId === 'inverse-normal' ? dist.inverseResult
      : data.typeId === 'normal-pd' ? notes.probability : dist.probabilityResult;
    surface.sprite(resultLabel, 0, 0);
    return lcdFooter880(state, surface, view, data.result, 192) ? data.unknownLabel + ' = ' + data.result : null;
  }
  const cells = data.fields?.map((cell, i) => ({...cell, selected:i === data.active})) || data.cells;
  const offset = data.fieldOffset ?? Number(cells[3]?.selected);
  surface.sprite(distribution ? dist.titles[data.typeId] : forms.range[0], 0, 0);
  if (!data.draftNodes) lcdScrollbar880(surface, offset, cells.length + 1, 4);
  for (const [local, cell] of cells.slice(offset, offset + 3).entries()) {
    const index = offset + local;
    const y = 16 + local * 16;
    const inverted = cell.selected && !data.draftNodes;
    if (inverted) surface.rect(0, y, 188, 15, 1);
    const execute = cell.label === 'Execute';
    const label = execute ? forms.execute : distribution ? dist.fields[cell.label] : forms.range[index + 1];
    surface.sprite(label, 0, y, () => inverted ? 0 : 1);
    if (execute) continue;
    const editing = cell.selected && !!data.draftNodes;
    const cellText = (distribution || state.app === 'table') && typeof cell.value === 'number'
      ? lcdFormValue880(cell.value,{kind:'norm',digits:1}).replace('.',settings.decimal === 'comma' ? ',' : '.') : cell.text;
    const nodes = editing ? data.draftNodes : lcdResultNodes880({result:cellText});
    const box = lcdMathLayout880(nodes, {cursorList:editing ? data.cursorList : null,
      cursorIndex:data.cursorIndex, linear:true});
    if (!box || box.bottom - box.top > 15) return null;
    const baseline = y + 7;
    const cursor = editing && box.markers[0];
    const edge = data.cursorIndex < data.cursorList?.length ? 170 : 181;
    const scroll = distribution && cursor ? Math.max(0,Math.ceil((77+cursor[0]-edge)/8)*8) : 0;
    if (distribution && editing) {
      const field = lcdSurface880(LCD880_WIDTH,LCD880_BODY);
      drawLCDMath880(field,box,77-scroll,baseline);
      for (let row=y;row<Math.min(y+15,LCD880_BODY);row++)
        surface.pixels.set(field.pixels.subarray(row*LCD880_WIDTH+77,(row+1)*LCD880_WIDTH),row*LCD880_WIDTH+77);
      if (scroll) { surface.rect(77,y+1,11,13,0); surface.sprite(CLASS_PAD_LCD.symbols.scrollLeft,77,y+1); }
      if (77-scroll+box.width > LCD880_WIDTH) {
        surface.rect(181,y+1,11,13,0); surface.sprite(CLASS_PAD_LCD.symbols.scrollRight,181,y+1);
      }
    } else drawLCDMath880(surface, box, 77, baseline, inverted);
    if (cursor) {
      const [x, top, width, height] = cursor;
      view.cursor = [77-scroll+x,baseline+top,width,height];
    }
  }
  return cells.map(cell => cell.label + ' ' + cell.text).join(', ');
}

function lcdStatisticsResults880(state, surface) {
  const {data} = state;
  const {statistics, statisticsFont, statisticsScience, regression} = CLASS_PAD_LCD.special;
  if (data.screen === 'regression') {
    const title = regression.titles[data.header];
    if (!title) return null;
    surface.sprite(title, 36, 0);
    const font = {...statisticsFont, '-':regression.minus, '−':regression.minus};
    for (const [index, row] of data.rows.entries()) {
      const y = 10 * (index + 1);
      surface.sprite(regression.terms[row.label], 66, y);
      const scientific = /^(.*?)×10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(row.text);
      if (scientific) {
        const cells = scientific[1].length + 2 + scientific[2].replace('⁻','').length;
        if (!lcdArrayCell880(surface,row.text,78+cells*6,y,1,Infinity,font,statisticsScience)) return null;
      } else if (!lcdGridText880(surface, row.text, 78, y, 1, false, 12, font)) return null;
    }
    return data.header + ', ' + data.rows.map(row => row.label + '=' + row.text).join(', ');
  }
  const rows = data.rows.slice(data.statsTop, data.statsTop + 6);
  const listFont = {...statisticsFont, '-':statisticsScience.mantissaMinus, '−':statisticsScience.mantissaMinus};
  for (const [index, row] of rows.entries()) {
    const y = index * 10;
    if (!statistics[row.label]) return null;
    const scientific = /^(.*?)×10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/.exec(row.text);
    if (scientific) {
      const cells = scientific[1].length + 2 + scientific[2].replace('⁻','').length;
      if (!lcdArrayCell880(surface,row.text,84+cells*6,y,1,Infinity,listFont,statisticsScience)) return null;
    } else if (!lcdGridText880(surface, row.text, 84, y, 1, false, Infinity, listFont)) return null;
    surface.sprite(statistics[row.label], 36, y);
    surface.sprite(statisticsFont['='], 78, y);
  }
  const page = data.statsTop / 6;
  const pages = Math.ceil(data.rows.length / 6);
  if (data.rows.length === STAT_TWOVAR_ROWS.length) {
    surface.rect(190, Math.round(page * LCD880_BODY / pages), 2, Math.ceil(LCD880_BODY / pages), 2);
  } else lcdScrollbar880(surface, page, pages, 1);
  return rows.map(row => row.label + '=' + row.text).join(', ');
}

function lcdCoefficientEditor880(state, surface, view) {
  const {app, data, settings} = state;
  const {coefficients, statisticsFont, notes} = CLASS_PAD_LCD.special;
  const coefficientFont = app === 'ratio'
    ? {...statisticsFont, '-': CLASS_PAD_LCD.ratio.coefficientMinus, '−': CLASS_PAD_LCD.ratio.coefficientMinus}
    : statisticsFont;
  if (data.result != null) {
    if (app !== 'ratio') return null;
    const nodes = lcdResultNodes880(data);
    const box = lcdMathLayout880(nodes, {linear:settings.io.startsWith('line'), ratioMode:true});
    if (!box) return null;
    surface.sprite(notes.ratioResult, 0, 0);
    const right = data.engineering ? 182 : LCD880_WIDTH;
    const plainNumber = nodes.every(node => node.type === 'char' || node.type === 'lcd-science');
    drawLCDMath880(surface, box, right - box.width, plainNumber ? 55 : 61 - box.bottom);
    if (data.engineering) surface.sprite(CLASS_PAD_LCD.ratio.engineeringArrows, 181, 48);
    return 'X = ' + data.result;
  }
  const offset = data.coefficientOffset;
  const key = app === 'ratio' ? data.typeLabel : data.typeId === 'simul2' ? 'linear2'
    : offset === undefined ? data.typeId : `${data.typeId}-${offset}`;
  const layout = coefficients[key];
  const cells = offset === undefined ? data.cells : data.cells.filter((_, index) => {
    const col = index % data.columns;
    return col >= offset && col < offset + 3;
  });
  if (!layout || layout[1].length !== cells.length) return null;
  const [stencil, slots] = layout;
  surface.sprite(stencil, 0, 0);
  for (const [i, cell] of cells.entries()) {
    const [left, right, y, sign] = slots[i];
    const leading = app !== 'ratio' && !sign && i % 3 === 0;
    const fixedNegative = app !== 'ratio' && !sign && cell.negative;
    const tone = cell.selected ? 0 : 1;
    if (cell.selected) surface.rect(left, y, right - left, 10, 1);
    if (sign) {
      const subtraction = cell.negative;
      surface.rect(sign, y + 4, 5, 1, tone);
      if (!subtraction) surface.rect(sign + 2, y + 2, 1, 5, tone);
    }
    if (fixedNegative) surface.rect(left + 1, y + 4, 5, 1, tone);
    const compactNumber = typeof cell.value === 'number' ? lcdCompactGridNumber880(Math.abs(cell.value))
      .replace('.',settings.decimal === 'comma' ? ',' : '.') : null;
    const prefix = cell.negative && !sign && !leading && !fixedNegative ? '−' : '';
    const value = compactNumber !== null ? prefix+compactNumber : sign || leading || fixedNegative ? cell.absText : cell.text;
    const maxWidth = Math.floor((right - (sign ? sign + 7 : left)) / 6);
    if (value.length > maxWidth || value.includes('×10')) {
      const compact = prefix+(compactNumber ?? cell.compactText ?? '');
      if ((compactNumber === null && !cell.compactText) || !lcdArrayCell880(surface, compact, right, y, tone, maxWidth,
        coefficientFont, CLASS_PAD_LCD.equations.coefficientScientific)) return null;
    } else if (!lcdGridText880(surface, value, right, y, tone, true, maxWidth, coefficientFont)) return null;
  }
  const active = data.cells.findIndex(cell => cell.selected);
  const value = data.cells[active].text;
  return lcdFooter880(state, surface, view, value, 192) ? (data.header || data.typeLabel || app) + ' ' + value : null;
}

function lcdEquationFraction880(fraction) {
  const {num, den, negative} = fraction;
  if (den === '1') return lcdResultNodes880({result:(negative ? '−' : '') + num});
  return lcdResultNodes880({exactFraction:fraction});
}

function lcdEquationSurd880(surd) {
  if (surd.coeffNum === '0') {
    return lcdEquationFraction880({num:surd.rationalNum, den:surd.rationalDen, negative:surd.rationalNegative});
  }
  if (surd.radicand === '1' && surd.rationalNum === '0') {
    return lcdEquationFraction880({num:surd.coeffNum, den:surd.coeffDen, negative:surd.coeffNegative});
  }
  const nodes = lcdResultNodes880({exactSurd:surd});
  if (nodes[0]?.ch === '−') nodes[0].negative = true;
  return nodes;
}

function lcdEquationNodes880(root) {
  if (root.form === 'fraction') return lcdEquationFraction880(root.fraction);
  if (root.form === 'surd') return lcdEquationSurd880(root.surd);
  if (root.form === 'polar') {
    const angle = /^(.*∠)(−?)(\d*)π\/(\d+)$/.exec(root.text);
    if (angle) return [...lcdResultNodes880({result:angle[1]}), ...charNodes(angle[2]),
      ...ratioNodes880(charNodes(angle[3] || '1'), charNodes(angle[4])), ...charNodes('π')];
  }
  if (root.form === 'complexDecimal' || root.form === 'complex') {
    const decimal = root.form === 'complexDecimal';
    const real = decimal ? !root.reIsZero : root.re.rationalNum !== '0' || root.re.coeffNum !== '0';
    const negative = decimal ? root.imNegative
      : root.im.rationalNum !== '0' ? root.im.rationalNegative : root.im.coeffNegative;
    const unit = decimal ? root.imIsOne
      : root.im.coeffNum === '0' ? root.im.rationalNum === '1' && root.im.rationalDen === '1'
        : root.im.rationalNum === '0' && root.im.radicand === '1' && root.im.coeffNum === '1' && root.im.coeffDen === '1';
    const realNodes = !real ? [] : decimal ? lcdResultNodes880({result:root.re}) : lcdEquationSurd880(root.re);
    const imaginary = unit ? [] : decimal ? lcdResultNodes880({result:root.im})
      : lcdEquationSurd880({...root.im, rationalNegative:false, coeffNegative:false});
    if (real || negative) realNodes.push({type:'char', ch:negative ? '−' : '+', negative:negative && !real});
    return [...realNodes, ...imaginary, {type:'char', ch:'i', imaginary:true}];
  }
  return lcdResultNodes880({result:root.text});
}

function lcdEquationMessage880(state, surface, message) {
  const messages = CLASS_PAD_LCD.equations.messages[state.settings.language];
  if (!messages?.[message]) return null;
  surface.sprite(messages[message], 0, 48);
  const labels = state.settings.language === 'vi' ? {none:'Vô nghiệm', infinite:'Vô số nghiệm', all:'Tất cả số thực'}
    : {none:'No Solution', infinite:'Infinite Solution', all:'All Real Numbers'};
  return labels[message];
}

function lcdEquationResult880(state, surface) {
  const {data, settings} = state;
  const {headers, labels, extrema} = CLASS_PAD_LCD.equations;
  const root = data.result;
  if (root.kind === 'message') {
    return lcdEquationMessage880(state, surface, root.message === 'Infinite Solution' ? 'infinite' : 'none');
  }
  if (root.form === 'message') return null;
  let header = null;
  if (/^ax/.test(root.header)) header = headers[data.typeId];
  else if (root.header) {
    const key = {'Min of':'min2', 'Max of':'max2', 'Local Min':'min3', 'Local Max':'max3'};
    header = extrema[settings.language]?.[key[Object.keys(key).find(prefix => root.header.startsWith(prefix))]];
  }
  if ((root.header && !header) || !labels[root.label]) return null;
  const nodes = lcdEquationNodes880(root);
  const box = lcdMathLayout880(nodes, {linear:settings.io.startsWith('line')});
  if (!box || (box.width > 192 && root.form !== 'complexDecimal')) return null;
  if (header) surface.sprite(header, 0, 0);
  surface.sprite(labels[root.label], 0, header?.[1] ?? 0);
  const radical = !settings.io.startsWith('line') && nodes.some(node => node.type === 'sqrt')
    && !nodes.some(node => node.type === 'frac');
  const offset = root.horizontalOffset || 0;
  const plainDecimal = root.form === 'decimal' && nodes.every(node => ['char','lcd-science'].includes(node.type));
  drawLCDMath880(surface, box, Math.max(0,192-box.width)-offset,plainDecimal ? 55 : 61-box.bottom+Number(radical));
  const more = box.width > 192 && box.width - offset > 190;
  lcdEquationArrows880(surface, offset, more);
  return root.label + '=' + (root.form === 'decimal' ? root.text : serializeForDisplay(nodes));
}

function lcdEquationArrows880(surface, offset, more, baseline = 55, top = 49, bottom = 61) {
  const {arrows} = CLASS_PAD_LCD.equations;
  for (const [show, direction, x] of [[offset > 0, 'left', 0], [more, 'right', 181]]) {
    if (!show) continue;
    const arrowTop = baseline - 6;
    const arrowBottom = arrowTop + 14;
    const left = direction === 'left';
    surface.rect(left ? 0 : LCD880_WIDTH - 8, top, left ? 7 : 8, arrowTop - top, 0);
    surface.rect(x, arrowTop, 11, 14, 0);
    surface.rect(left ? 0 : LCD880_WIDTH - 5, arrowBottom, left ? 7 : 5, bottom - arrowBottom, 0);
    surface.sprite(arrows[direction], x, arrowTop);
  }
}

function lcdInequalityNodes880(result, bounds) {
  const bound = point => {
    if (!bounds) return lcdEquationNodes880(point.display);
    let index = bounds.findIndex(existing => existing.value === point.value);
    if (index === -1) {
      index = bounds.length;
      bounds.push(point);
    }
    return charNodes(String.fromCharCode(97 + index));
  };
  const [first, second] = result.segments;
  if (result.segments.length === 2 && !first.low && !second.high && !first.includeHigh && !second.includeLow &&
      first.high?.value === second.low?.value && first.high) return [...charNodes('x≠'), ...bound(first.high)];
  return result.segments.flatMap(({low, high, includeLow, includeHigh}, segment) => {
    const nodes = segment ? charNodes(',') : [];
    if (low && high && low.value === high.value) return [...nodes, ...charNodes('x='), ...bound(low)];
    if (low) nodes.push(...bound(low), ...charNodes(includeLow ? '≤' : '<'));
    nodes.push(...charNodes('x'));
    if (high) nodes.push(...charNodes(includeHigh ? '≤' : '<'), ...bound(high));
    return nodes;
  });
}

function lcdInequalityLayout880(nodes, settings) {
  return lcdMathLayout880(nodes, {linear:settings.io.startsWith('line'), equationMode:true});
}

function lcdInequalityScrollLimit880(result, settings, box = lcdInequalityLayout880(lcdInequalityNodes880(result), settings)) {
  return !result.compact && box?.width > LCD880_WIDTH ? Math.ceil((box.width - LCD880_WIDTH) / 8) * 8 : 0;
}

function lcdInequalityResult880(state, surface) {
  const {data, settings} = state;
  const result = data.result;
  if (result.kind !== 'set') return lcdEquationMessage880(state, surface, result.kind);
  const nodes = lcdInequalityNodes880(result);
  const bounds = [];
  const symbolic = lcdInequalityNodes880(result, bounds);
  if (result.compact) {
    const font = {...CLASS_PAD_LCD.special.statisticsFont, ...CLASS_PAD_LCD.equations.compactInequality};
    const title = serializeForDisplay(symbolic);
    if (bounds.length > 4 || !lcdGridText880(surface, title, 0, 0, 1, false, Infinity, font)) return null;
    for (const [index, bound] of bounds.entries()) {
      const y = 12 * (index + 1);
      // The compact ClassPad rows reserve twelve character cells, including the sign.
      const number = bound.display.text;
      const display = number.includes('×10') ? number : number.slice(0, 12).replace(/[.,]$/, '');
      if (!lcdGridText880(surface, String.fromCharCode(97 + index) + '=', 0, y, 1, false, Infinity, font) ||
          !lcdArrayCell880(surface, display, LCD880_WIDTH, y, 1, 12, font)) return null;
    }
    return serializeForDisplay(nodes);
  }
  const header = lcdInequalityLayout880(symbolic, settings);
  const box = lcdInequalityLayout880(nodes, settings);
  if (!header || !box || header.width > LCD880_WIDTH) return null;
  const limit = lcdInequalityScrollLimit880(result, settings, box);
  const offset = Math.min(limit, result.horizontalOffset || 0);
  const baseline = 61 - box.bottom + Number(box.bottom === 7);
  drawLCDMath880(surface, header, 0, -header.top);
  drawLCDMath880(surface, box, Math.max(0, LCD880_WIDTH - box.width) - offset, baseline);
  lcdEquationArrows880(surface, offset, offset < limit, baseline, baseline + box.top, baseline + box.bottom);
  return serializeForDisplay(nodes);
}

function lcdCalc880(state,surface,view) {
  const {data,settings} = state;
  const linear = settings.io.startsWith('line');
  const expr = lcdMathLayout880(data.expressionNodes,{linear});
  if (!expr || expr.bottom-expr.top > 34) return null;
  drawLCDMath880(surface,expr,0,-expr.top);
  if (expr.width > LCD880_WIDTH) {
    surface.rect(181,0,11,Math.max(13,expr.bottom-expr.top),0);
    surface.sprite(CLASS_PAD_LCD.symbols.resultScrollRight,181,-expr.top-3);
  }
  const editing = !!data.editing || data.draftNodes.length > 0;
  const selectedNodes = lcdResultNodes880({result:data.selectedText});
  const selectedTop = linear ? data.runSelected ? 32 : 16 : 48;
  if (!editing) surface.rect(0,selectedTop,188,15,1);
  const controls = settings.language === 'en' ? CLASS_PAD_LCD.englishControls : CLASS_PAD_LCD.numberLine;
  if (linear && !data.runSelected) surface.sprite(controls.run,0,32);
  if (data.runSelected) {
    if (linear) {
      const label = lcdMathLayout880([...charNodes(data.variable+' ='),...selectedNodes],{linear});
      if (!label) return null;
      drawLCDMath880(surface,label,0,23);
    }
    surface.sprite(controls.run,0,selectedTop,() => 0);
    return data.expression + ', Vận hành';
  }
  const label = lcdMathLayout880(charNodes(data.variable+' ='),{linear});
  const value = lcdMathLayout880(editing ? data.draftNodes : selectedNodes,
    {linear:true,cursorList:editing ? data.cursorList : null,cursorIndex:data.cursorIndex});
  if (!label || !value) return null;
  drawLCDMath880(surface,label,0,selectedTop+7,!editing);
  drawLCDMath880(surface,value,33,selectedTop+7,!editing);
  if (value.markers[0]) {
    const [x,y,width,height] = value.markers[0];
    view.cursor = [33+x,selectedTop+7+y,width,height];
  }
  return data.expression + ', ' + data.variable + '=' + (editing ? serializeForDisplay(data.draftNodes) : data.selectedText);
}

function lcdSolver880(state, surface, view) {
  const {data, settings} = state;
  const {solver:locales, residual:residualLabel} = CLASS_PAD_LCD.equations;
  const solver = locales[settings.language];
  if (!solver) return null;
  const vi = settings.language === 'vi';
  const linear = settings.io.startsWith('line');
  if (data.mode === 'solve') {
    const label = lcdMathLayout880(charNodes(data.variable + '='), {linear});
    const value = lcdMathLayout880(lcdResultNodes880({result:data.result}), {linear});
    const residual = lcdMathLayout880(lcdResultNodes880({result:data.residual}), {linear});
    if (!label || !value || !residual) return null;
    let start = 35;
    let prefix = data.expression;
    if (data.continue) {
      start = 0;
      prefix = data.continueExitSelected ? (vi ? 'Thoát' : 'Exit') : (vi ? 'Tiếp tục' : 'Continue');
      for (const [index, option] of ['continue','exit'].entries()) {
        const y = 32 + 16 * index;
        const selected = Boolean(index) === data.continueExitSelected;
        if (selected) surface.rect(0, y, 188, 15, 1);
        surface.sprite(solver[option], 0, y, () => selected ? 0 : 1);
      }
    } else {
      const expr = lcdMathLayout880(data.expressionNodes, {linear, solverMode:true});
      if (!expr || expr.width > 192 || expr.bottom - expr.top > 34) return null;
      drawLCDMath880(surface, expr, 0, -expr.top);
    }
    drawLCDMath880(surface, label, 0, start + 6);
    drawLCDMath880(surface, value, 192 - value.width, start + 6);
    surface.sprite(residualLabel, 0, start + 14);
    drawLCDMath880(surface, residual, 192 - residual.width, start + 20);
    return `${prefix}, ${data.variable}=${data.result}, L−R=${data.residual}`;
  }
  if (data.phase === 'choose') {
    const offset = Math.max(0, data.selectedIndex - 2);
    surface.sprite(solver.choose, 0, 0);
    for (const [index, name] of data.variables.slice(offset, offset + 3).entries()) {
      const box = lcdMathLayout880(charNodes(name), {linear});
      if (!box) return null;
      const y = (index + 1) * 16;
      const selected = offset + index === data.selectedIndex;
      if (selected) surface.rect(0, y, 188, 15, 1);
      drawLCDMath880(surface, box, 0, y + 7, selected);
    }
    lcdScrollbar880(surface, offset, data.variables.length, 3);
    return (vi ? 'Giải theo biến, ' : 'Solve Target, ') + data.variables.join(', ');
  }
  if (data.phase !== 'form') return null;
  const editing = data.editingInitial || data.draftNodes.length > 0;
  const label = lcdMathLayout880(charNodes(data.variable + ' ='), {linear});
  const value = lcdMathLayout880(editing ? data.draftNodes : lcdResultNodes880({result:data.selectedText}), {
    linear, cursorList:editing ? data.cursorList : null, cursorIndex:data.cursorIndex
  });
  if (!label || !value || value.width > 151 || value.bottom - value.top > 15) return null;
  surface.sprite(solver.initial, 0, 0);
  const selected = !editing && !data.runSelected;
  if (selected || data.runSelected) surface.rect(0, selected ? 32 : 48, 188, 15, 1);
  drawLCDMath880(surface, label, 0, 39, selected);
  drawLCDMath880(surface, value, 33, 39, selected);
  surface.sprite(solver.run, 0, 48, () => data.runSelected ? 0 : 1);
  const marker = value.markers[0];
  if (marker) view.cursor = [33 + marker[0], 39 + marker[1], marker[2], marker[3]];
  const title = vi ? 'Nhập Gtrị ban đầu' : 'Enter Initial Value';
  const run = vi ? 'Vận hành' : 'Execute';
  return `${title}, ${data.variable}=${editing ? serializeForDisplay(data.draftNodes) : data.selectedText}, ${run}`;
}

function lcdNumberLine880(state, surface, view) {
  const {data, settings} = state;
  const assets = lcdLocaleAssets880(CLASS_PAD_LCD.numberLine,state.settings.language);
  const language = settings.language;
  const ink = chosen => () => chosen ? 0 : 1;
  const paintText = (text, x, y, chosen = false, draft = false) => {
    const nodes = draft ? data.draftNodes : data.stage === 'window' ? lcdResultNodes880({result:text}) : charNodes(text);
    if (!draft && (data.stage === 'bounds' || data.stage === 'window')) {
      nodes.forEach((node,index)=>{if(node.ch==='−' && (index===0 || nodes[index-1]?.ch==='(')) node.negative=true;});
    }
    const box = lcdMathLayout880(nodes, draft ? {linear:true,cursorList:data.cursorList,cursorIndex:data.cursorIndex} : {linear:true,arrayMode:data.stage==='window'});
    if (!box) return false;
    drawLCDMath880(surface, box, x, y + 7, chosen);
    if (draft && box.markers[0]) {
      const [left, top, width, height] = box.markers[0];
      view.cursor = [x + left, y + 7 + top, width, height];
    }
    return true;
  };
  const paintCaption = (text, x, y, chosen = false) => {
    for (const [index, char] of [...text].entries()) {
      const sprite = assets.captionFont[char] || CLASS_PAD_LCD.glyphs[char] || CLASS_PAD_LCD.normal[char];
      if (!sprite) return false;
      surface.sprite(sprite, x + 11 * index, y, ink(chosen));
    }
    return true;
  };
  if (data.stage === 'plot') {
    const {center, scale} = data.window;
    const font = {...CLASS_PAD_LCD.special.grid, '−':assets.axisMinus};
    const left = 11, right = 180;
    // PLUS snaps endpoints to half-tick positions, including decimal input.
    const toPixel = value => 93 + 5 * Math.round(2 * (value - center) / scale);
    const visible = data.entries.map((entry, index) => entry && {...entry,index}).filter(Boolean);
    for (const [i, entry] of visible.entries()) {
      const y = 22 - 9 * (visible.length - 1 - i);
      const selected = entry.index === data.cursor;
      const tone = selected ? 1 : 2;
      const dot = (x, open) => {
        if (x < left || x > right) return;
        const shape = selected ? [3,5,7,7,7,5,3] : [3,5,5,5,3];
        const hole = selected ? [0,0,1,3,1,0,0] : [0,3,3,3,0];
        const top = y - Math.floor(shape.length / 2);
        shape.forEach((width, row) => {
          surface.rect(x - Math.floor(width / 2), top + row, width, 1, tone);
          if (open && hole[row]) surface.rect(x - Math.floor(hole[row] / 2), top + row, hole[row], 1, 0);
        });
      };
      const arrow = forwards => {
        if (forwards) surface.sprite(assets.rayArrow, right - 4, y - 3, () => tone);
        else [1,2,3,4,3,2,1].forEach((width, row) => surface.rect(left + 4 - width, y - 3 + row, width, 1, tone));
      };
      const relation = entry.relation;
      const [start, end] = entry.values.map(toPixel);
      if (relation === 'x=a') {dot(start, false); continue;}
      const rayLeft = end === undefined && /^[x][<≤]/.test(relation);
      const rayRight = end === undefined && !rayLeft;
      const from = rayLeft ? left : start;
      const to = rayRight ? right : end ?? start;
      if (to < left || from > right) continue;
      const clipFrom = Math.max(left + Number(rayLeft)*3, from);
      const clipTo = Math.min(right - Number(selected && rayRight), to);
      surface.rect(clipFrom, y - Number(selected), clipTo - clipFrom + 1, selected ? 3 : 1, tone);
      if (rayLeft) arrow(false);
      else dot(from, relation[1] === '<' || relation[1] === '>');
      if (rayRight) arrow(true);
      else dot(to, relation[rayLeft ? 1 : 3] === '<');
    }
    surface.sprite(assets.axis, 0, 28);
    const axisLabel = value => {
      const text = numberLineCompact880(Number(value.toPrecision(12)));
      const science = /^(.*)×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/.exec(text);
      if (!science) return {plain:text,width:text.length*6};
      const exponent = Number([...science[2]].map(c=>c==='⁻'?'-':String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).join(''));
      const digits = String(Math.abs(exponent));
      return {mantissa:science[1],exponent,digits,width:science[1].length*6+12+digits.length*6};
    };
    const [a,b,c] = [-8,0,8].map(offset => axisLabel(center+offset*scale));
    const paintAxis = (label,x) => {
      if (label.plain !== undefined) return lcdGridText880(surface,label.plain,x,37,1,false,Infinity,font);
      if (!lcdGridText880(surface,label.mantissa,x,37,1,false,Infinity,font)) return false;
      let left = x+label.mantissa.length*6;
      surface.sprite(assets.axisScience[label.exponent<0?'negativeBase':'base'],left,37);
      left += 12;
      for (const digit of label.digits) {
        const sprite = assets.axisScience[digit];
        if (!sprite) return false;
        surface.sprite(sprite,left,37);left+=6;
      }
      return true;
    };
    if (!paintAxis(a,13) || !paintAxis(b,94-b.width/2) || !paintAxis(c,175-c.width)) return null;
    surface.rect(0, 46, LCD880_WIDTH, 1, 2);
    if (!paintCaption('ABC'[data.cursor] + ':' + data.texts[data.cursor], 0, 48)) return null;
    surface.rect(189,48,3,15,0);
    return 'ABC'[data.cursor] + ': ' + data.texts[data.cursor] + ', ' + [a,b,c].map(label => label.plain ?? label.mantissa+'e'+label.exponent).join(', ');
  }
  const list = data.stage === 'list';
  const bounds = data.stage === 'bounds';
  const values = list ? data.texts : data.values;
  const ready = list ? data.entries.some(Boolean) : values.every(Boolean);
  if (bounds) {
    const title = assets.sampleTitles[data.relation] || CLASS_PAD_LCD.labels[data.relation];
    surface.sprite(title, 0, 0, ink(false));
  }
  const accessible = [];
  for (let row = 0; row <= values.length; row++) {
    const y = (row + Number(bounds)) * 16;
    const draft = row === data.cursor && !!data.draftNodes;
    const chosen = row === data.cursor && !draft && (row < values.length || ready);
    if (chosen) surface.rect(0, y, 188, 15, 1);
    if (row === values.length) {
      const button = bounds ? ready ? assets.confirm : assets.confirmOff : ready ? assets.run : assets.runOff;
      surface.sprite(button, 0, y, chosen ? ink(true) : undefined);
      accessible.push(bounds ? (language==='en'?'Confirm':'Xác nhận') : (language==='en'?'Execute':'Vận hành'));
    } else {
      const field = list ? assets.formLetters[row] : bounds ? assets.boundsFields[row] : assets.windowFields[row];
      surface.sprite(field, 0, y, ink(chosen));
      if (values[row] || draft) {
        const drawn = list ? paintCaption(values[row], field[0], y, chosen) : paintText(values[row], field[0], y, chosen, draft);
        if (!drawn) return null;
      }
      if (list) {
        // Registered expressions stop before the arrow control and border.
        surface.rect(176,y,12,15,Number(chosen));
        surface.rect(188,y,4,15,0);
        surface.sprite(CLASS_PAD_LCD.menu.arrow[Number(chosen)],176,y,undefined,true);
      }
      const fieldName = list ? 'ABC'[row] : bounds ? 'ab'[row] : (language==='en'?['Scale','Center']:['Tỷ lệ','Giữa'])[row];
      accessible.push(fieldName + ': ' + values[row]);
    }
  }
  return accessible.join(', ');
}

function lcdCircle880(state, surface, view) {
  const {data, settings} = state;
  const assets = lcdLocaleAssets880(CLASS_PAD_LCD.circle,settings.language);
  const controls = settings.language === 'en' ? CLASS_PAD_LCD.englishControls : CLASS_PAD_LCD.numberLine;
  const text = (value, x, y, small = false, chosen = false) => {
    const font = small ? {...CLASS_PAD_LCD.special.statisticsFont, ...assets.small}
      : {...CLASS_PAD_LCD.normal, ...CLASS_PAD_LCD.glyphs, ...assets.large};
    const chars = [...value];
    if (!chars.every(char => char === ' ' || font[char])) return false;
    chars.forEach((char, index) => {
      const sprite = small && char === '−' && index > 0 ? assets.small.binaryMinus : font[char];
      if (char !== ' ') surface.sprite(sprite, x + index * (small ? 6 : 11), y, () => chosen ? 0 : 1);
    });
    return true;
  };
  if (data.stage === 'error') {
    if (data.error && data.error !== 'Range ERROR') return lcdError880({...state,data:{mode:'error',message:data.error}},surface);
    if (settings.language === 'en') return lcdError880({...state,data:{mode:'error',message:'Range ERROR'}},surface);
    surface.sprite(assets.rangeError, 0, 0);
    surface.sprite(CLASS_PAD_LCD.symbols.errorAlert, 85, 21);
    surface.sprite(CLASS_PAD_LCD.symbols.errorBack, 0, 48);
    return 'Lỗi phạm vi, Trở lại';
  }
  const clock = data.type === 'clock';
  if (data.stage === 'form') {
    const last = clock ? 1 : 3;
    const values = clock ? [] : data.angles;
    const ready = clock || values.some(value => value !== null);
    const rows = [];
    for (let row = 0; row <= last; row++) {
      const y = row * 16;
      const editing = row === data.cursor && !!data.draftNodes;
      const chosen = row === data.cursor && !editing && (row !== last || ready);
      if (chosen) surface.rect(0, y, 188, 15, 1);
      const disabledSelected = row === last && row === data.cursor && !ready;
      if (disabledSelected) surface.rect(0,y,188,15,2);
      const tint = () => chosen ? 0 : 1;
      if (row === 0) {
        surface.sprite(assets.formLabels[data.type], 0, 0, tint);
        surface.sprite(CLASS_PAD_LCD.menu.arrow[Number(chosen)], 176, 0, undefined, true);
      } else if (row === last) {
        surface.sprite(ready ? controls.run : controls.runOff, 0, y, chosen || disabledSelected ? () => 0 : undefined);
      } else {
        surface.sprite(assets.thetaFields[row - 1], 0, y, tint);
        if (editing) {
          const box = lcdMathLayout880(data.draftNodes, {linear:true,cursorList:data.cursorList,cursorIndex:data.cursorIndex});
          if (!box) return null;
          drawLCDMath880(surface, box, 55, y + 7);
          if (box.markers[0]) {
            const [x, top, width, height] = box.markers[0];
            view.cursor = [55 + x, y + 7 + top, width, height];
          }
        } else if (values[row - 1] !== null && !text(data.angleTexts[row - 1], 55, y, false, chosen)) return null;
      }
      rows.push(row === 0 ? data.type : row === last ? 'Vận hành' : 'θ' + row + '=' + data.angleTexts[row - 1]);
    }
    return rows.join(', ');
  }
  surface.sprite(assets[data.type], 0, 0);
  if (clock) {
    surface.sprite(assets.clockHands[data.hour-1],0,0);
    surface.sprite(assets.clockSpinner, 72, 0);
    assets.clockFields.forEach((sprite, index) => surface.sprite(sprite, 88, 16 * (index + 1)));
    const smallAngle = circleClockAngle880(data.hour, false, settings);
    const largeAngle = circleClockAngle880(data.hour, true, settings);
    if (!text(String(data.hour).padStart(2,' ') + ':00', 88, 0) || !text(smallAngle, 121, 16) || !text(largeAngle, 121, 32)) return null;
    return data.hour + ':00, θ1=' + smallAngle + ', θ2=' + largeAngle;
  }
  const selected = data.cursor;
  for (const index of [1 - selected, selected]) {
    if (data.angles[index] === null) continue;
    const ray = circleRayIndex880(data.angles[index],settings.angle);
    const sprites = index !== selected ? assets.rays.faint : data.type === 'semi' ? assets.rays.halfBold : assets.rays.bold;
    surface.sprite(sprites[ray],0,0);
  }
  const quadrant = Math.floor(circleRayIndex880(data.angles[selected],settings.angle)/6);
  const thetaX = quadrant === 0 || quadrant === 3 ? 56 : -1;
  assets.trigLabels[selected].forEach((label, index) => surface.sprite(label, 78, 1 + index * 13));
  const label = assets.thetaLabels[selected];
  surface.sprite(label, 78, 48);
  if (!text(data.angleTexts[selected], 110, 48)) return null;
  // The expression footer stops at the native scrollbar gutter.
  surface.rect(189,48,3,15,0);
  surface.sprite(CLASS_PAD_LCD.circle.thetaGraph[selected], thetaX, data.type === 'unit' && quadrant >= 2 ? 51 : 7);
  const values = ['sin','cos','tan'].map(operation => circleTrigText880(operation, data.angles[selected], settings));
  if (!values.every((value, index) => {
    const scientific = /^(.*)×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/.exec(value);
    if (scientific) {
      const exponent = [...scientific[2]].map(c => c === '⁻' ? '-' : String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c))).join('');
      const mantissa = scientific[1].slice(0,10-1-exponent.length);
      const y = 5 + index * 13;
      if (!text(mantissa,114,y,true)) return false;
      const glyphs = CLASS_PAD_LCD.special.statisticsScience;
      let left = 114 + mantissa.length * 6;
      surface.sprite(glyphs[exponent.startsWith('-') ? 'negativeTimesTen' : '×10'],left,y);
      left += 12;
      for (const digit of exponent.replace('-','')) { surface.sprite(glyphs[digit],left,y); left += 6; }
      return true;
    }
    const visible = value.slice(0,10);
    const trimmed = /^−?\d+\.\d+$/.test(visible) ? visible.replace(/0+$/, '').replace(/\.$/, '') : visible;
    return text(trimmed, 114, 5 + index * 13, true);
  })) return null;
  if (data.angles.every(value => value !== null)) {
    const scrollbar = selected ? 32 : 0;
    surface.rect(190, scrollbar, 2, 32, 2);
  }
  return 'θ' + (selected + 1) + '=' + data.angles[selected] + ', ' + values.join(', ');
}

function lcdSheetForm880(state, surface, view) {
  const {data, settings} = state;
  const assets = lcdLocaleAssets880(CLASS_PAD_LCD.sheet,settings.language);
  if (data.mode === 'sheet-memory') {
    surface.sprite(assets.memory, 44, 0);
    const text = String(data.available).padStart(4,' ');
    [...text].forEach((char, index) => {
      if (char !== ' ') surface.sprite(CLASS_PAD_LCD.glyphs[char], index * 11, 0);
    });
    return text.trim() + (settings.language === 'en' ? ' Bytes Free' : ' Byte chưa sd');
  }
  surface.sprite(data.formula ? assets.fillFormula : assets.fillValue, 0, 0);
  for (let index = 0; index < 3; index++) {
    const y = 16 * (index + 1);
    const editing = index === data.cursor && !!data.draftNodes;
    const ready = data.nodes.length > 0;
    const chosen = index === data.cursor && !editing && (index !== 2 || ready);
    if (chosen) surface.rect(0, y, 188, 15, 1);
    const tint = () => chosen ? 0 : 1;
    const label = index === 0 ? data.formula ? assets.formulaField : assets.valueField
      : index === 1 ? assets.rangeField : ready ? assets.fillConfirm : assets.fillConfirmOff;
    surface.sprite(label, 0, y, index === 2 && !ready ? undefined : tint);
    if (index === 2) continue;
    const prefix = index === 0 && data.formula ? charNodes('=') : [];
    const nodes = [...prefix, ...(editing ? data.draftNodes : index === 0 ? data.nodes : charNodes(data.range))];
    const box = lcdMathLayout880(nodes, {linear:true});
    if (!box) return null;
    const x = label[0];
    drawLCDMath880(surface, box, x, y + 7, chosen);
    if (editing) {
      // The prefix belongs to the field label. Keep the editable list as the cursor owner.
      const draft = lcdMathLayout880(data.draftNodes, {linear:true,cursorList:data.cursorList,cursorIndex:data.cursorIndex});
      const marker = draft?.markers[0];
      if (marker) {
        const start = x+prefix.length*11;
        const scroll = Math.max(0,Math.ceil((start+marker[0]-181)/8)*8);
        const field = lcdSurface880(LCD880_WIDTH,LCD880_BODY);
        drawLCDMath880(field,draft,start-scroll,y+7);
        for (let row=y;row<y+15;row++) {
          for (let column=start;column<LCD880_WIDTH;column++) {
            surface.pixels[row*LCD880_WIDTH+column] = field.pixels[row*LCD880_WIDTH+column];
          }
        }
        if (scroll) {
          surface.rect(start,y+1,11,13,0);
          surface.sprite(CLASS_PAD_LCD.symbols.scrollLeft,start,y+1);
        }
        view.cursor = data.inputRemaining <= 10
          ? [start+marker[0]-scroll+1,y+7+marker[1],10,marker[3]]
          : [start+marker[0]-scroll,y+7+marker[1],marker[2],marker[3]];
      }
    }
  }
  return (settings.language==='en' ? (data.formula?'Fill Formula':'Fill Value') : (data.formula?'Điền công thức':'Điền giá trị')) + ', ' + serializeForDisplay(data.nodes) + ', ' + data.range;
}

function lcdTrials880(state,surface,view) {
  const {data,settings} = state;
  const assets = lcdLocaleAssets880(CLASS_PAD_LCD.trials,settings.language);
  if (data.trialStage === 'list') {
    surface.rect(19,0,1,48,2);
    const headings = data.heading.slice(1);
    headings.forEach((label,index) => {
      const left = 20 + index*42;
      surface.sprite(label === '●' ? assets.headsHeading : assets.listHeadings[label],left,0);
      surface.rect(left+41,0,1,48,2);
    });
    for (let row = 0; row < 4; row++) {
      const index = data.cursor + row;
      const y = 10 + row*10;
      if (!lcdGridText880(surface,index+1,19,y,1,true)) return null;
      const values = data.rows[index]?.slice(1);
      if (!values) continue;
      for (const [column,value] of values.entries()) {
        const center = 41 + column*42;
        if (data.trialFaces === 2 && column < data.trialCount) surface.sprite(assets.coinFaces[value],center-3,y);
        else if (!lcdGridText880(surface,String(value),center-String(value).length*3,y)) return null;
      }
    }
    return data.rows.slice(data.cursor,data.cursor+4).map(row => row.join(', ')).join('. ');
  }
  surface.sprite(assets.frequencyHeader,0,0);
  if (data.trialFaces === 6) {
    surface.rect(0,0,27,9,0);
    surface.sprite(assets.listHeadings.Sum,-7,0);
  }
  for (const x of [27,57,99]) surface.rect(x,9,1,39,2);
  surface.sprite(assets.attemptsLabel,100,0);
  const attempts = lcdMathLayout880(charNodes(String(data.attempts)),{linear:true});
  if (!attempts) return null;
  drawLCDMath880(surface,attempts,104,22);
  const first = Math.max(0,data.cursor-3);
  for (let row = 0; row < 4; row++) {
    const index = first+row;
    const values = data.rows[index];
    if (!values) continue;
    const y = 10+row*10;
    if (data.trialFaces === 2) surface.sprite(assets.sidePrefix,0,y);
    if (!lcdGridText880(surface,values[0],25,y,1,true) || !lcdGridText880(surface,values[1],55,y,1,true)) return null;
    const selected = index === data.cursor;
    if (selected) surface.rect(60,y,36,8,1);
    if (!lcdGridText880(surface,statCellText(values[2],settings.number),97,y,selected ? 0 : 1,true,6)) return null;
  }
  if (!lcdFooter880(state,surface,view,data.selectedText,192)) return null;
  return 'Tần số Tương đối, ' + data.selectedText;
}

// Data grids use Norm 1 regardless of the result setting. The
// exponent minus shares the base sprite, leaving its cell for the mantissa.
function lcdCompactGridNumber880(value) {
  const number = {kind:'norm',digits:1};
  const text = formatNumber(value,number);
  const scientific = /^(.*)×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/.exec(text);
  if (!scientific) return statCellText(value,number);
  const room = 6-2-scientific[2].replace('⁻','').length;
  const mantissa = scientific[1].slice(0,Math.max(1,room)).replace(/\.$/,'');
  return mantissa+'×10'+scientific[2];
}

function lcdExplorer880(state, surface, view) {
  const {data,settings} = state;
  const assets = lcdLocaleAssets880(CLASS_PAD_LCD.explorer,settings.language);
  if (data.mode === 'formula-warning') {
    surface.sprite(assets.manyModes,0,0);
    return data.message;
  }
  if (data.mode === 'formula-menu') {
    return lcdMenu880({...state,app:'statistics',menu:{rows:data.rows,selected:data.cursor,offset:data.offset,
      columns:1,capacity:4,direct:true,highlight:true}},surface);
  }
  if (data.mode === 'formula-counts') {
    surface.sprite(CLASS_PAD_LCD.explorer.countsHeader,0,0);
    for (const x of [19,103,145]) surface.rect(x,9,1,39,2);
    const first = Math.max(0,data.cursor - 3);
    for (let row = 0; row < 4; row++) {
      const index = first + row;
      const y = 10 + row * 10;
      if (!lcdGridText880(surface,index+1,19,y,1,true)) return null;
      if (index >= data.counts.length) continue;
      const [lower,upper] = data.rangeValues[index].map(lcdCompactGridNumber880);
      const science = CLASS_PAD_LCD.explorer.countsScience;
      const cell = (value,right,tone=1) => lcdArrayCell880(surface,value,right,y,tone,6,CLASS_PAD_LCD.special.grid,science);
      if (!cell(lower,59) || !lcdGridText880(surface,'-',59,y) || !cell(upper,101)) return null;
      const selected = index === data.cursor;
      if (selected) surface.rect(106,y,36,8,1);
      if (!cell(lcdCompactGridNumber880(data.counts[index]),143,selected ? 0 : 1)) return null;
    }
    const text = formatNumber(data.counts[data.cursor],settings.number);
    if (!lcdFooter880(state,surface,view,text,192)) return null;
    return data.ranges[data.cursor] + ', n = ' + text;
  }
  const result = data.resultData || {result:data.result,exactFraction:data.exactFraction};
  return lcdGeometry880({...state,data:{...data,stage:data.mode === 'formula-result' ? 'result' : 'form',result}},
    surface,view,CLASS_PAD_LCD.explorer);
}

// Native numeric forms have six full-size cells; the packed scientific base
// and superscript exponent share that same pixel budget.
function lcdFormValue880(value, number) {
  const full = formatNumber(value,number);
  const scientific = /^(.*)×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/.exec(full);
  if (!scientific) return full.slice(0,6).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/,'');
  let mantissa = scientific[1];
  while (mantissa.length > 1) {
    const text = mantissa.replace(/\.$/,'') + '×10' + scientific[2];
    if (lcdMathLayout880(lcdResultNodes880({result:text}),{linear:true})?.width <= 66) return text;
    mantissa = mantissa.slice(0,-1);
  }
  return mantissa + '×10' + scientific[2];
}

function lcdGeometry880(state, surface, view, assets = CLASS_PAD_LCD.geometry) {
  const {data, settings} = state;
  assets = lcdLocaleAssets880(assets,settings.language);
  const controls = settings.language === 'en' ? CLASS_PAD_LCD.englishControls : CLASS_PAD_LCD.numberLine;
  if (data.stage === 'result') {
    if (data.message) return lcdEquationMessage880(state,surface,data.message);
    if (data.coefficients) {
      const cells = data.coefficients.map((text,index) => ({text,absText:text.replace(/^[-−]/,''),negative:/^[-−]/.test(text),selected:index === data.resultCursor}));
      return lcdCoefficientEditor880({...state,app:'equation',data:{typeId:'plane',cells,header:'P',selectedText:data.coefficients[data.resultCursor],selectedFraction:data.coefficientFractions?.[data.resultCursor]}}, surface, view);
    }
    const header = assets.results[data.resultLabel];
    if (!header) return null;
    surface.sprite(header, 0, 0);
    const result = data.decimal ? {result:data.result.result} : data.result;
    let nodes = lcdResultNodes880(result);
    if (result.exactPi?.den !== undefined && result.exactPi.den !== '1') {
      const {negative,num,den} = result.exactPi;
      nodes = [...(negative ? [{type:'char',ch:'−',negative:true}] : []),
        ...ratioNodes880(charNodes(num),charNodes(den)), ...charNodes('π')];
    }
    const box = lcdMathLayout880(nodes, {linear:settings.io.startsWith('line'),equationMode:true});
    if (!box) return null;
    const y = 61 - box.bottom + Number(!!result.exactSurd && box.bottom - box.top <= 16);
    drawLCDMath880(surface, box, LCD880_WIDTH - box.width, y);
    return (data.label || data.resultLabel) + ' = ' + result.result;
  }
  const coordinates = data.stage === 'coordinates';
  if (coordinates && data.sub.kind === 'line') {
    const [stencil, slots] = assets.line;
    const selectedIndex = data.cursor === 6 ? data.sub.confirmCursor ?? 5 : data.cursor;
    surface.sprite(stencil, 0, 0);
    if (data.sub.index === 1) surface.sprite(assets.lineBTitle,0,0,undefined,true);
    for (const [index, [left,right,y,sign]] of slots.entries()) {
      const value = data.sub.values[index];
      const selected = index === selectedIndex;
      const tone = selected ? 0 : 1;
      if (selected) surface.rect(left,y,right-left,10,1);
      if (sign) {
        surface.rect(sign,y+4,5,1,tone);
        if (value >= 0) surface.rect(sign+2,y+2,1,5,tone);
      }
      const text = formatNumber(sign ? Math.abs(value) : value, settings.number);
      if (!lcdGridText880(surface,text,right,y,tone,true,6,CLASS_PAD_LCD.special.statisticsFont)) return null;
    }
    const value = data.sub.values[selectedIndex];
    const footer = {...state,data:{...data,selectedText:formatNumber(value,settings.number),
      cellNodes:lcdResultNodes880({result:formatNumber(value,settings.number),...data.sub.valueExact?.[selectedIndex]})}};
    if (!lcdFooter880(footer,surface,view,footer.data.selectedText,192)) return null;
    return 'Line ' + 'AB'[data.sub.index] + ', ' + data.sub.values.join(', ');
  }
  const fields = coordinates ? ['x','y','z'] : data.fields;
  const values = coordinates ? data.sub.values : data.values;
  const memories = !coordinates && !!data.assigned;
  const title = coordinates ? CLASS_PAD_LCD.labels[(settings.language === 'en' ? 'Point ' : 'Điểm ') + 'ABC'[data.sub.index]] : assets.titles[data.title];
  if (!title) return null;
  surface.sprite(title, 0, 0);
  const offset = data.offset ?? Math.max(0,data.cursor - 2);
  const ready = !memories || data.assigned.every(index => index !== null);
  if (!data.draftNodes) lcdScrollbar880(surface,offset,fields.length + 1,3);
  for (let index = offset; index < Math.min(fields.length + 1,offset + 3); index++) {
    const y = 16 * (index - offset + 1);
    const editing = index === data.cursor && !!data.draftNodes;
    const chosen = index === data.cursor && !editing && (index < fields.length || ready);
    if (chosen) surface.rect(0,y,188,15,1);
    const ink = () => chosen ? 0 : 1;
    if (index === fields.length) {
      const sprite = coordinates ? ready ? controls.confirm : controls.confirmOff
        : ready ? controls.run : controls.runOff;
      surface.sprite(sprite,0,y,ready ? ink : undefined);
      continue;
    }
    let x = coordinates ? 33 : memories ? 143 : assets.valueLeft || 110;
    if (coordinates) {
      surface.sprite(assets.coordinates[fields[index]],0,y,ink);
    } else surface.sprite(assets.fields[fields[index]],0,y,ink);
    if (memories) surface.sprite(CLASS_PAD_LCD.menu.arrow[Number(chosen)],176,y,undefined,true);
    const text = memories ? data.assigned[index] === null ? '' : 'ABC'[data.assigned[index]]
      : lcdFormValue880(values[index],data.inputNumber || settings.number);
    const nodes = editing ? data.draftNodes : memories ? charNodes(text) : lcdResultNodes880({result:text,...((coordinates ? data.sub.valueExact : data.valueExact)?.[index] || {exactFraction:data.valueFractions?.[index]})});
    const box = lcdMathLayout880(nodes, {linear:true,cursorList:editing ? data.cursorList : null,cursorIndex:data.cursorIndex});
    if (!box) return null;
    drawLCDMath880(surface,box,x,y + 7,chosen);
    if (editing && box.markers[0]) {
      const [left,top,width,height] = box.markers[0];
      view.cursor = [x+left,y+7+top,width,height];
    }
  }
  return data.title + ', ' + fields.map((field,index) => field + '=' + (values?.[index] ?? data.assigned?.[index] ?? '')).join(', ');
}

function lcdSpecial880(state, surface, view) {
  const {app, data} = state;
  if (data.mode === 'calc' && data.operation === 'calc') return lcdCalc880(state,surface,view);
  if (data.trialStage) return lcdTrials880(state,surface,view);
  if (data.mode === 'trial-attempts') {
    const assets = lcdLocaleAssets880(CLASS_PAD_LCD.trials,state.settings.language);
    surface.sprite(assets.attemptsTitle,0,0);
    surface.sprite(assets.attemptsRange,0,32);
    const editing = !!data.draftNodes;
    const selected = data.cursor === 0 && !editing;
    if (selected) surface.rect(0,16,188,15,1);
    const prefix = charNodes(':');
    const nodes = editing ? data.draftNodes : charNodes(String(data.value));
    const left = 11;
    const prefixBox = lcdMathLayout880(prefix,{linear:true});
    const box = lcdMathLayout880(nodes,{linear:true,cursorList:editing ? data.cursorList : null,cursorIndex:data.cursorIndex});
    if (!box || !prefixBox) return null;
    drawLCDMath880(surface,prefixBox,0,23,selected);
    drawLCDMath880(surface,box,left,23,selected);
    if (box.markers[0]) {
      const [x,y,width,height] = box.markers[0];
      view.cursor = [left+x,23+y,width,height];
    }
    if (data.cursor === 1) surface.rect(0,48,188,15,1);
    surface.sprite(assets.confirm,0,48,() => data.cursor === 1 ? 0 : 1);
    return 'Số lần thử ' + (editing ? serializeForDisplay(nodes) : data.value);
  }
  if (app === 'math-explorer' && data.mode.startsWith('formula-')) return lcdExplorer880(state,surface,view);
  if (data.mode === 'geometry') return lcdGeometry880(state, surface, view);
  if (data.mode === 'sheet-fill' || data.mode === 'sheet-memory') return lcdSheetForm880(state, surface, view);
  if (data.mode === 'circle') return lcdCircle880(state, surface, view);
  if (data.mode === 'number-line') return lcdNumberLine880(state, surface, view);
  if (app === 'table' && data.tableFeedback !== undefined) {
    const sprites = lcdLocaleAssets880(CLASS_PAD_LCD.special.table,state.settings.language);
    surface.sprite(data.tableFeedback ? sprites.correct : sprites.incorrect, 0, 0);
    surface.sprite(data.tableFeedback ? sprites.accept : state.settings.language === 'en'
      ? CLASS_PAD_LCD.equations.englishBack : CLASS_PAD_LCD.symbols.errorBack, 0, 48);
    return state.settings.language === 'en' ? (data.tableFeedback ? 'True, OK' : 'False, Back')
      : (data.tableFeedback ? 'Đúng, OK' : 'Sai, Trở lại');
  }
  if (data.mode === 'function-edit' || data.mode === 'variable-edit' || (app === 'table' && data.screen === 'func')) {
    const options = {linear:state.settings.io.startsWith('line')};
    const label = lcdMathLayout880(charNodes(data.prompt), options);
    const draft = lcdMathLayout880(data.draftNodes || [], {...options, cursorList:data.cursorList, cursorIndex:data.cursorIndex});
    if (!label || !draft) return null;
    const x = label.width;
    const y = -Math.min(label.top,draft.top);
    drawLCDMath880(surface, label, 0, y);
    drawLCDMath880(surface, draft, x, y);
    const cursor = draft.markers[0];
    if (cursor) {
      const [left, top, width, height] = cursor;
      const rootEnd = data.cursorList === data.draftNodes && data.cursorIndex === data.draftNodes.length;
      view.cursor = data.mode !== 'table' && !(data.mode === 'variable-edit' && app === 'complex') && rootEnd && height > 13
        ? [x + left, y + Math.max(top, -6), width, 13]
        : [x + left, y + top, width, height];
      if (data.insertionArrow && !options.linear) lcdInsertionArrow880(view);
      if (data.overwrite && options.linear) view.cursor=[x+left+1,y+top+10,10,3];
    }
    return data.prompt + serializeForDisplay(data.draftNodes || []);
  }
  if ((app === 'matrix' || app === 'vector') && Array.isArray(data.cellText)) return lcdArray880(state, surface, view);
  if (app === 'spreadsheet' || (['statistics','table','distribution'].includes(app) && Array.isArray(data.columns))) {
    return lcdDataGrid880(state, surface, view);
  }
  if ((app === 'table' && data.screen === 'range') ||
      (app === 'distribution' && ['variable','params'].includes(data.screen))) {
    return lcdFields880(state, surface, view);
  }
  if (app === 'statistics' && ['stats','regression'].includes(data.screen)) return lcdStatisticsResults880(state, surface);
  if (app === 'equation' && (data.mode === 'solve' || data.operation === 'solve')) return lcdSolver880(state, surface, view);
  if (app === 'equation' && data.mode === 'equation' && data.result) return lcdEquationResult880(state, surface);
  if (app === 'inequality' && data.result) return lcdInequalityResult880(state, surface);
  if (['equation','inequality','ratio'].includes(app) && Array.isArray(data.cells)) {
    return lcdCoefficientEditor880(state, surface, view);
  }
  return null;
}

function lcdArray880(state, surface, view) {
  const {data} = state;
  const vector = data.mode === 'vector';
  const rows = (vector ? data.cellText.map(value => [value]) : data.cellText).map((values,row) =>
    values.map((text,col) => {
      const number = vector ? data.values?.[row] : data.values?.[row]?.[col];
      return typeof number === 'number' ? lcdCompactGridNumber880(number)
        .replace('.',state.settings.decimal === 'comma' ? ',' : '.') : text;
    }));
  const selected = vector ? {row:data.cursor, col:0} : data.cursor;
  const {names} = CLASS_PAD_LCD.arrays;
  if (names[data.name]) surface.sprite(names[data.name], 0, 0);
  else {
    surface.sprite(names[data.name.slice(0, 3)], 0, 0);
    surface.sprite(names[data.name.at(-1)], 18, 0);
  }
  const bottom = 10 + (rows.length - 1) * 10 + 8;
  const right = 60 + (rows[0].length - 1) * 42;
  surface.rect(17, 10, 2, bottom - 10, 1);
  surface.rect(right + 2, 10, 2, bottom - 10, 1);
  for (const y of [10, bottom - 2]) {
    surface.rect(17, y, 4, 2, 1);
    surface.rect(right, y, 4, 2, 1);
  }
  for (const [row, values] of rows.entries()) {
    const y = 10 + row * 10;
    for (const [col, value] of values.entries()) {
      const x = 22 + col * 42;
      const focused = row === selected.row && col === selected.col;
      if (focused) surface.rect(x, y, 36, 8, 1);
      if (!lcdArrayCell880(surface,value,x+37,y,focused ? 0 : 1,6,CLASS_PAD_LCD.special.grid,
          CLASS_PAD_LCD.explorer.countsScience)) return null;
    }
  }
  if (!lcdFooter880(state, surface, view, data.selectedText, 192)) return null;
  const position = vector ? String(selected.row + 1) : (selected.row + 1) + ', ' + (selected.col + 1);
  const footer = data.draftNodes ? serializeForDisplay(data.draftNodes) : data.selectedText;
  return data.name + ' ' + rows.map(row => row.join(', ')).join('; ') + '. Ô ' + position + ': ' + footer;
}

function lcdArrayCell880(surface, value, right, y, tone, maxWidth = 6, font = CLASS_PAD_LCD.special.grid,
  scientificFont = {}) {
  const scientific = /^(.+)×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)$/.exec(value);
  if (!scientific) return value.length <= maxWidth && lcdGridText880(surface, value, right, y, tone, true, maxWidth, font);
  const {compact} = CLASS_PAD_LCD.arrays;
  const glyph = ch => scientificFont[ch] || compact[ch];
  const negative = scientific[2].startsWith('⁻');
  const digits = negative ? scientific[2].slice(1) : scientific[2];
  const exponentCells = digits.length + Number(negative && !scientificFont.negativeTimesTen);
  if (scientific[1].length + exponentCells + 2 > maxWidth) return false;
  const exponent = [...digits].map(char => String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(char)));
  const exponentStart = right - exponent.length * 6;
  const mantissaEnd = exponentStart - 12;
  if (!lcdGridText880(surface, scientific[1], mantissaEnd, y, tone, true, Infinity, font)) return false;
  surface.sprite(negative && scientificFont.negativeTimesTen || glyph('×10'), mantissaEnd, y, () => tone);
  if (negative) surface.sprite(glyph('−'), exponentStart - 6, y, () => tone);
  exponent.forEach((char, i) => {
    surface.sprite(glyph(char), exponentStart + i * 6, y, () => tone);
  });
  return true;
}

function buildLCDFrame880(state) {
  if (!state.power || state.notice) return null;
  const surface = lcdSurface880(LCD880_WIDTH, LCD880_BODY);
  const view = {pixels:surface.pixels, cursor:null};
  const text = state.menu ? lcdMenu880(state, surface)
    : state.home ? lcdHome880(state, surface)
      : state.data.mode === 'error' ? lcdError880(state, surface)
        : state.app === 'base-n' ? lcdBase880(state, surface, view)
          : ['input','result'].includes(state.data.mode) ? lcdMath880(state, surface, view) : lcdSpecial880(state, surface, view);
  return text === null ? null : {...view, text};
}

const LCD880_COLORS = [[0,0,0,0],[21,28,22,255],[77,87,78,255],[149,165,150,255]];

function lcdStatusFlags880(state) {
  const {power, home, menu, notice, shifted, data, settings, app} = state;
  if (menu && state.verify) return ['verify'];
  if (!power || home || (menu && !menu.trialForm) || notice || data.hideStatus || data.grab || data.pasting || data.mode === 'sheet-memory' || data.mode === 'formula-menu' ||
      (data.mode === 'error' && !data.calculusError && !state.verify && !['Not Defined','Circular ERROR','Argument ERROR'].includes(data.message) &&
        !['calculate','distribution','equation','inequality','spreadsheet','ratio','complex','statistics','matrix','vector','table','math-explorer','math-box'].includes(app))) return [];
  const flags = shifted ? ['S'] : [];
  if (app === 'base-n') {
    if (data.scrollDown) flags.push('down');
    if (data.scrollUp) flags.push('up');
    return flags;
  }
  const numericEditor = (data.mode === 'extras-grid' && !data.trialStage) || app === 'spreadsheet' || app === 'matrix' || app === 'vector' ||
    app === 'distribution' || app === 'statistics';
  if (!numericEditor && !settings.io.startsWith('line')) flags.push('math');
  flags.push({deg:'D',rad:'R',grad:'G'}[settings.angle]);
  if (settings.number.kind !== 'norm') flags.push(settings.number.kind.toUpperCase());
  if (settings.engineer) flags.push('E');
  if (app === 'complex' || data.complexResults) flags.push(settings.complex === 'rect' ? 'i' : 'do');
  if (state.verify) flags.push('verify');
  if (!['matrix','vector','statistics'].includes(app) && !(data.mode === 'calc' && data.operation === 'calc' && settings.io.startsWith('line'))) {
    const root = app === 'equation' && data.result?.kind === 'root' ? data.result : null;
    if (data.scrollDown || (root && root.index < root.count - 1)) flags.push('down');
    if (data.scrollUp || (root && root.index > 0)) flags.push('up');
  }
  return flags;
}

// Keep native cell geometry, but let the browser rasterize the complete vector
// silhouette once. Enlarging a tiny bitmap with nearest-neighbour sampling at
// fractional scales made identical strokes alternate between two screen widths.
function lcdTonePath880(pixels, width, height, tone, yOffset = 0) {
  if (!tone) return '';
  const runs = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width;) {
      if (pixels[y * width + x] !== tone) { x++; continue; }
      const left = x++;
      while (x < width && pixels[y * width + x] === tone) x++;
      const length = x - left;
      runs.push(`M${left} ${y + yOffset}h${length}v1h${-length}z`);
    }
  }
  return runs.join('');
}

function lcdCursorPath880(frame) {
  if (!frame.cursor) return '';
  const [x, y, width, height] = frame.cursor;
  if (frame.cursorRows) return frame.cursorRows.map((count, row) => count > 0
    ? `M${x} ${y + LCD880_STATUS + row}h${count}v1h${-count}z` : '').join('');
  return `M${x} ${y + LCD880_STATUS}h${width}v${height}h${-width}z`;
}

function lcdStatusVector880(flag) {
  const [x, y, width, height, mask] = CLASS_PAD_LCD.status[flag];
  return {x, y, width, height, svg:atob(mask.slice(mask.indexOf(',') + 1))};
}

function lcdSVGElement880(tag, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function renderLCDStatus880(state) {
  const status = lcdSVGElement880('g', {'aria-hidden':'true'});
  for (const flag of lcdStatusFlags880(state)) {
    const {x,y,width,height,svg} = lcdStatusVector880(flag);
    const icon = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    for (const [key,value] of Object.entries({x,y,width,height,preserveAspectRatio:'none'}))
      icon.setAttribute(key,String(value));
    icon.style.fill = 'var(--ink)';
    status.append(icon);
  }
  return status;
}

function paintLCDFrame880(screen, frame, state) {
  const svg = lcdSVGElement880('svg', {class:'lcd-native', viewBox:`0 0 ${LCD880_WIDTH} ${LCD880_HEIGHT}`,
    role:'img', 'aria-label':frame.text || 'Dòng nhập LCD trống', focusable:'false'});
  for (let tone = 1; tone < LCD880_COLORS.length; tone++) {
    const path = lcdTonePath880(frame.pixels, LCD880_WIDTH, LCD880_BODY, tone, LCD880_STATUS);
    if (path) svg.append(lcdSVGElement880('path', {d:path, fill:`rgb(${LCD880_COLORS[tone].slice(0,3).join(',')})`}));
  }
  svg.append(renderLCDStatus880(state));
  const cursor = lcdCursorPath880(frame);
  if (cursor) svg.append(lcdSVGElement880('path', {class:'lcd-native-cursor',d:cursor,'aria-hidden':'true'}));
  screen.append(element('div', 'lcd-native-stage', svg));
}
