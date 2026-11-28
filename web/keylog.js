'use strict';

// Presentation/export shell, adapted from the published 580 keylog (qa.1, 23/11).
// The calculator remains the only source of accepted keypad actions.
// Keylog badges show the printed symbols, while KEYS.label remains the
// descriptive accessible name of the physical keypad button.
const KEYLOG_SYMBOLS_880=Object.freeze({
  power:'x□',fraction:'□□',logn:'log▫',
  up:'▲',left:'◀',right:'▶',down:'▼',back:'↩'
});

// Source: supplied Keymap_ClassWiz_CW01_ver1.00.pdf, page 1 (CASIO, 2022).
// These are font character codes for physical keys, not expression text.
// Keep case and punctuation exactly: e.g. o = DEL, O = multiply, [ = x.
const KEYLOG_WORD_CODES_880=Object.freeze({
  on:'W',home:'w',up:'E','page-up':'%','page-down':'&',
  settings:'L',back:'`',left:'!',ok:'|',right:'$',
  shift:'q',variable:"'",function:'Q',down:'R',catalog:'T',tools:'I',
  x:'[',fraction:'a',sqrt:'s',power:'^',square:'d',logn:'i',
  ans:'M',sin:'j',cos:'k',tan:'l',open:'(',close:')',
  '7':'7','8':'8','9':'9',delete:'o',ac:'C',
  '4':'4','5':'5','6':'6',multiply:'O',divide:'P',
  '1':'1','2':'2','3':'3',add:'+',subtract:'p',
  '0':'0',dot:'.','times-ten':'K',format:'n',exe:'B'
});

// The supplied CASIO font's exact outlines are shared by SVG and PNG.
// Keep readable text aliases in JSON/plain copy; Word uses its own font codes.
const KEYLOG_NATIVE_GLYPHS_880=typeof KEYLOG_GLYPHS_880==='object' ? KEYLOG_GLYPHS_880 :
  typeof module==='object' && module.exports ? require('./assets/keylog-glyphs-880.js') : {};
function keylogGlyph880(key) {
  return Object.hasOwn(KEYLOG_WORD_CODES_880,key) ? KEYLOG_NATIVE_GLYPHS_880[KEYLOG_WORD_CODES_880[key]] : undefined;
}

function keylogWordText880(report) {
  return report.keys.map(({key})=> {
    if (!Object.hasOwn(KEYLOG_WORD_CODES_880,key)) throw new RangeError('Unmapped CW01 key: '+key);
    return KEYLOG_WORD_CODES_880[key];
  }).join('');
}

function keylogReport880(history, total, timestamp, model, version, labels) {
  return {schema:1, model, version, exportedAt:timestamp,
    omitted:Math.max(0,total-history.length),
    keys:history.map(({key,shift,app},index) => ({index:index+1,
      step:total-history.length+index+1,key,label:KEYLOG_SYMBOLS_880[key] || labels.get(key) || key,shift,app}))};
}

function paintKeylog880(canvas, report, PathConstructor=typeof Path2D==='function' ? Path2D : null) {
  const keys=report.keys, columns=12, padding=16, cellWidth=48, cellHeight=34, gridTop=76;
  const width=Math.max(340,Math.min(columns,keys.length)*cellWidth+padding*2);
  const height=gridTop+Math.ceil(keys.length/columns)*cellHeight+padding;
  canvas.width=width*2; canvas.height=height*2;
  const context=canvas.getContext('2d');
  if (!context || !PathConstructor && keys.some(({key})=>keylogGlyph880(key))) return false;
  context.scale(2,2);
  context.fillStyle='#e6eee4'; context.fillRect(0,0,width,height);
  context.fillStyle='#142820'; context.font='700 20px system-ui, sans-serif';
  context.fillText('Nhật ký phím · '+report.model,padding,32);
  const range=report.omitted ? ' · Bước '+keys[0].step+'–'+keys.at(-1).step : '';
  context.font='14px system-ui, sans-serif';
  context.fillText(keys.length+' phím'+range,padding,56);
  context.textAlign='center'; context.textBaseline='middle';
  context.font='650 14px system-ui, sans-serif'; context.strokeStyle='#405b49';
  keys.forEach(({key,label},index) => {
    const x=padding+index%columns*cellWidth, y=gridTop+Math.floor(index/columns)*cellHeight;
    context.strokeRect(x,y,cellWidth-6,cellHeight-6);
    const glyph=keylogGlyph880(key), cx=x+(cellWidth-6)/2, cy=y+(cellHeight-6)/2;
    if (glyph) {
      const [xmin,ymin,xmax,ymax]=glyph.bounds, scale=Math.min(24/(xmax-xmin),24/(ymax-ymin));
      context.save();
      context.translate(cx-(xmin+xmax)*scale/2,cy+(ymin+ymax)*scale/2);
      context.scale(scale,-scale);
      context.fill(new PathConstructor(glyph.path));
      context.restore();
    } else context.fillText(label,cx,cy,cellWidth-12);
  });
  return true;
}

function initializeKeylog880(calculator) {
  const get=id=>document.getElementById(id);
  const panel=get('keylog-panel'), preview=get('keylog-preview'), list=get('keylog-keys');
  const count=get('keylog-count'), empty=get('keylog-empty'), status=get('keylog-status');
  const button=get('keylog-button'), device=get('device'), modal=get('utility-dialog');
  const copy=get('keylog-copy'), copySymbols=get('keylog-copy-symbols');
  const image=get('keylog-image'), download=get('keylog-download'), clear=get('keylog-clear');
  const labels=new Map(KEYS.map(({id,label})=>[id,label]));
  let total=calculator.history.length;
  const report=()=>keylogReport880(calculator.history,total,new Date().toISOString(),MODEL,VERSION,labels);
  const atLatest=()=>preview.scrollHeight-preview.clientHeight-preview.scrollTop<8;
  function controls() {
    const n=calculator.history.length;
    list.hidden=!n; empty.hidden=!!n;
    copy.disabled=copySymbols.disabled=image.disabled=download.disabled=clear.disabled=!n;
    count.textContent=n+' phím'+(total>n?' gần nhất':'');
  }
  function item(entry) {
    const li=document.createElement('li');
    li.textContent=entry.label; li.title='Bước '+entry.step;
    const glyph=keylogGlyph880(entry.key);
    if (glyph) {
      const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg'), path=document.createElementNS(ns,'path');
      const [xmin,ymin,xmax,ymax]=glyph.bounds;
      li.setAttribute('class','keylog-native-key');
      li.setAttribute('aria-label','Bước '+entry.step+': '+(labels.get(entry.key)||entry.label));
      svg.setAttribute('viewBox',[xmin,-ymax,xmax-xmin,ymax-ymin].join(' '));
      svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
      path.setAttribute('d',glyph.path); path.setAttribute('transform','scale(1,-1)');
      svg.append(path); li.append(svg);
    }
    return li;
  }
  function showStatus(message) {
    const follow=atLatest(); status.textContent=message;
    if (follow) preview.scrollTop=preview.scrollHeight;
  }
  function render() {
    list.replaceChildren(...report().keys.map(item)); controls();
    preview.scrollTop=preview.scrollHeight;
  }
  function setOpen(showing) {
    document.dispatchEvent(new Event('calculator-interaction-reset'));
    panel.hidden=!showing; button.setAttribute('aria-expanded',String(showing));
    status.textContent='';
    if (showing) render();
  }
  button.addEventListener('click',()=> {
    setOpen(panel.hidden);
    modal.close('keylog');
  });
  get('keylog-close').addEventListener('click',()=> {
    setOpen(false); device.focus({preventScroll:true});
  });
  clear.addEventListener('click',()=> {
    calculator.history.length=0; total=0; list.replaceChildren(); controls();
    showStatus('Đã xóa nhật ký phím.'); device.focus({preventScroll:true});
  });
  copy.addEventListener('click',async()=> {
    if (!calculator.history.length) return;
    let sequence;
    try { sequence=keylogWordText880(report()); }
    catch (_) {
      showStatus('Có phím chưa có mã CASIO. Hãy chép ký hiệu hoặc tải PNG.');
      return;
    }
    try {
      await navigator.clipboard.writeText(sequence);
      showStatus('Đã chép mã Word. Đổi font sang CASIO ClassWiz CW01.');
    } catch (_) {
      showStatus('Trình duyệt không cho sao chép. Hãy tải PNG hoặc JSON.');
    }
  });
  copySymbols.addEventListener('click',async()=> {
    if (!calculator.history.length) return;
    try {
      await navigator.clipboard.writeText(report().keys.map(({label})=>'['+label+']').join(' '));
      showStatus('Đã chép ký hiệu. Có thể dán vào tài liệu hoặc phiếu góp ý.');
    } catch (_) {
      showStatus('Trình duyệt không cho sao chép. Hãy tải PNG hoặc JSON.');
    }
  });
  function save(blob,timestamp,extension) {
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;
    link.download='880btgplus-keylog-'+timestamp.slice(0,19).replace(/:/g,'-')+'.'+extension;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  image.addEventListener('click',()=> {
    if (!calculator.history.length) return;
    const snapshot=report(), canvas=document.createElement('canvas');
    const failure='Không tạo được ảnh. Bạn có thể tải tệp JSON hoặc thử lại.';
    try {
      if (!paintKeylog880(canvas,snapshot)) { showStatus(failure); return; }
      canvas.toBlob(blob=> {
        if (!blob) { showStatus(failure); return; }
        save(blob,snapshot.exportedAt,'png');
        showStatus('Đã tạo ảnh PNG để gửi kèm phiếu góp ý.');
      },'image/png');
    } catch (_) { showStatus(failure); }
  });
  download.addEventListener('click',()=> {
    if (!calculator.history.length) return;
    const snapshot=report();
    save(new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json'}),snapshot.exportedAt,'json');
    showStatus('Đã tạo tệp JSON để gửi kèm phiếu góp ý.');
  });
  return {record() {
    total++;
    if (panel.hidden) return;
    const follow=atLatest();
    if (list.children.length>=500) list.firstElementChild?.remove();
    list.append(item(report().keys.at(-1))); controls(); status.textContent='';
    if (follow) preview.scrollTop=preview.scrollHeight;
  }};
}

if (typeof module==='object' && module.exports) module.exports={keylogReport880,paintKeylog880,keylogWordText880};
