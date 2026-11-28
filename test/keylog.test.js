'use strict';
// App presentation/export contracts; these are not new PLUS LCD observations.
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {keylogReport880,paintKeylog880,keylogWordText880}=require('../web/keylog.js');
const nativeGlyphs=require('../web/assets/keylog-glyphs-880.js');
const nativeReference=require('../docs/qa/keylog880-symbols-demo18/source-glyph-hashes.json');
const {createHash}=require('node:crypto');
const source=fs.readFileSync(require.resolve('../web/keylog.js'),'utf8');
const model=vm.runInNewContext(fs.readFileSync(require.resolve('../web/model.js'),'utf8')+'\n({KEYS});');
const labels=new Map(model.KEYS.map(({id,label})=>[id,label]));
const reference=JSON.parse(fs.readFileSync(require.resolve('../docs/qa/keylog580-symbol-reference-20261126.json'),'utf8'));
const entry=key=>({key,shift:key!=='shift',app:'calculate'});
const report=(keys,total=keys.length)=>keylogReport880(keys,total,'2026-11-25T07:00:00Z','fx-880BTG PLUS','demo.13',labels);
class TestPath {constructor(path){this.path=path;}}
const paint=(c,r)=>paintKeylog880(c,r,TestPath);

test('all 48 rendered key outlines are identical to the supplied CASIO font, with no font fallback',()=>{
 assert.equal(Object.keys(nativeGlyphs).length,48);
 for(const [code,hash] of Object.entries(nativeReference.pathSha256)) {
  const glyph=nativeGlyphs[code];
  assert.equal(createHash('sha256').update(glyph.path).digest('hex'),hash,code);
  const [xmin,ymin,xmax,ymax]=glyph.bounds;
  assert(xmax>xmin&&ymax>ymin,code);
 }
 const c=canvas(),r=report(model.KEYS.map(({id})=>entry(id)));
 assert.equal(paint(c,r),true);
 assert.deepEqual(c.paths.map(p=>p.path),[...keylogWordText880(r)].map(code=>nativeGlyphs[code].path));
 const html=fs.readFileSync(require.resolve('../web/index.html'),'utf8');
 assert(html.indexOf('src="assets/keylog-glyphs-880.js"')<html.indexOf('src="keylog.js"'));
});

// Independently transcribed from the supplied CASIO CW01 keymap, page 1,
// in physical PLUS keypad order. See docs/keymaps/casio-classwiz-cw01/.
test('Word copy covers all 48 PLUS keys with the exact supplied CW01 codes',()=>{
 const keys=model.KEYS.map(({id})=>id);
 const expected="WwE%&L`!|$q'QRTI[as^diMjkl()789oC456OP123+p0.KnB";
 assert.equal(keys.length,48);assert.equal(expected.length,48);
 const r=report(keys.map(entry));
 assert.equal(keylogWordText880(r),expected);
 assert.equal(new Set(expected).size,48,'case-sensitive codes distinguish every physical key');
});

test('Word copy maps physical SHIFT presses and adds no brackets, spaces or expression substitutions',()=>{
 const r=report(['2','power','3','exe','shift','sin','variable','back','left','x'].map(entry));
 r.keys.forEach(k=>{k.label='unrelated display label';k.shift=true;});
 assert.equal(keylogWordText880(r),"2^3Bqj'`![");
 assert.equal(keylogWordText880(report([])),'');
});

test('Word copy preserves the retained 500-key order after the oldest keys are omitted',()=>{
 const keys=Array.from({length:500},(_,i)=>entry(i%2?'multiply':'delete'));
 const r=report(keys,520);
 assert.equal(r.omitted,20);assert.equal(keylogWordText880(r),'oO'.repeat(250));
 assert.equal(r.keys[0].step,21);assert.equal(r.keys.at(-1).step,520);
});

test('an unmapped future key blocks Word copy instead of losing or inventing a glyph',()=>{
 for (const key of ['future-key','toString','__proto__']) {
  assert.throws(()=>keylogWordText880(report(['1',key,'exe'].map(entry))),RangeError);
 }
});

test('JSON and plain symbol copy keep readable aliases while PNG uses the native key outlines',()=>{
 const r=report(reference.keys.map(entry));
 assert.deepEqual(r.keys.map(key=>key.label),reference.labels);
 assert.equal(labels.get('power'),'Lũy thừa','the accessible keypad description stays descriptive');
 const c=canvas();paint(c,r);
 assert.deepEqual(c.paths.map(p=>p.path),[...keylogWordText880(r)].map(code=>nativeGlyphs[code].path));
});

test('keylog exports an independent snapshot with labels, modifiers and omitted step numbers',()=>{
 const history=Array.from({length:500},()=>entry('sqrt'));
 const r=report(history,520);history.length=0;
 assert.equal(r.omitted,20);assert.equal(r.keys.length,500);
 assert.deepEqual(r.keys[0],{index:1,step:21,key:'sqrt',label:'√',shift:true,app:'calculate'});
 assert.equal(r.keys.at(-1).step,520);assert.equal(r.model,'fx-880BTG PLUS');
});

function canvas(contextAvailable=true){
 const drawn=[],paths=[];const context={scale(){},save(){},restore(){},translate(){},fill(p){paths.push(p);},
  fillRect(){},strokeRect(){},fillText(...args){drawn.push(args);}};
 return{drawn,paths,getContext:()=>contextAvailable?context:null,toBlob(fn){fn(new Blob(['PNG'],{type:'image/png'}));}};
}
test('PNG draws every retained key in order, including rows outside the scroll preview',()=>{
 const c=canvas(),r=report(Array.from({length:500},(_,i)=>entry(i%2?'sqrt':'exe')),520);
 assert.equal(paint(c,r),true);assert.equal(c.width,1216);assert.equal(c.height,3040);
 assert.equal(c.drawn[0][0],'Nhật ký phím · fx-880BTG PLUS');
 assert.equal(c.drawn[1][0],'500 phím · Bước 21–520');
 assert.equal(c.paths.length,500);
 assert.deepEqual(c.paths.map(p=>p.path),[...keylogWordText880(r)].map(code=>nativeGlyphs[code].path));
 assert.equal(paint(canvas(false),r),false);
});

function shell(options={}){
 const nodes=new Map(),blobs=new Map(),downloads=[],clipboard=[];
 const element=()=>({hidden:false,disabled:false,textContent:'',children:[],attrs:{},handlers:{},scrollTop:0,scrollHeight:100,clientHeight:100,
  addEventListener(name,fn){this.handlers[name]=fn;},setAttribute(k,v){this.attrs[k]=v;},
  append(child){this.children.push(child);child.remove=()=>this.children.splice(this.children.indexOf(child),1);},
  replaceChildren(...children){this.children=[];children.forEach(c=>this.append(c));},
  get firstElementChild(){return this.children[0];},focus(){this.focused=true;},close(value){this.closedWith=value;},
  async click(){if(this.disabled)return;await this.handlers.click?.();}
 });
 const get=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);};
 const document={getElementById:get,dispatchEvent(){},body:{appendChild(){}},createElementNS:()=>element(),createElement(tag){
   if(tag==='canvas')return canvas(!options.noCanvas);
   const el=element();el.click=()=>downloads.push({name:el.download,blob:blobs.get(el.href)});el.remove=()=>{};return el;
 }};
 get('keylog-panel').hidden=true;
 const calculator={history:[],answer:42};
 const context={document,KEYLOG_GLYPHS_880:nativeGlyphs,Path2D:options.noPath?undefined:TestPath,navigator:{clipboard:{async writeText(text){
   if(options.noClipboard)throw new Error('Clipboard unavailable');clipboard.push(text);
 }}},
  KEYS:[...labels].map(([id,label])=>({id,label})),MODEL:'fx-880BTG PLUS',VERSION:'demo.13',Event,Blob,
  URL:{createObjectURL(blob){const id='blob:'+blobs.size;blobs.set(id,blob);return id;},revokeObjectURL(){}},setTimeout(){}};
 vm.runInNewContext(source+'\nthis.init=initializeKeylog880;',context);
 const control=context.init(calculator);
 return{get,calculator,downloads,clipboard,
  press(key){calculator.history.push(entry(key));if(calculator.history.length>500)calculator.history.shift();control.record();}};
}
test('the nonmodal panel updates while typing; clear resets only the audit, then accepts new keys',async()=>{
 const s=shell();await s.get('keylog-button').click();
 assert.equal(s.get('utility-dialog').closedWith,'keylog');assert.equal(s.get('keylog-panel').hidden,false);
 assert.equal(s.get('keylog-image').disabled,true);
 assert.equal(s.get('keylog-copy').disabled,true);assert.equal(s.get('keylog-copy-symbols').disabled,true);
 s.press('1');s.press('exe');assert.equal(s.get('keylog-count').textContent,'2 phím');
 assert.deepEqual(s.get('keylog-keys').children.map(x=>x.textContent),['1','EXE']);
 await s.get('keylog-clear').click();
 assert.equal(s.calculator.answer,42);assert.equal(s.calculator.history.length,0);
 assert.equal(s.get('keylog-image').disabled,true);assert.equal(s.get('device').focused,true);
 s.press('sqrt');await s.get('keylog-download').click();
 const r=JSON.parse(await s.downloads[0].blob.text());assert.equal(r.omitted,0);assert.equal(r.keys[0].step,1);
});
test('the panel uses the same SVG paths as PNG and exposes descriptive key names to screen readers',async()=>{
 const s=shell();await s.get('keylog-button').click();
 for(const key of ['power','fraction','sqrt','logn','home','catalog','tools'])s.press(key);
 const entries=s.get('keylog-keys').children;
 const codes=['^','a','s','i','w','T','I'];
 entries.forEach((li,i)=>{
  assert.equal(li.attrs.class,'keylog-native-key');
  assert.match(li.attrs['aria-label'],/^Bước \d+: /);
  const svg=li.children[0],path=svg.children[0];
  assert.equal(svg.attrs['aria-hidden'],'true');assert.equal(path.attrs.transform,'scale(1,-1)');
  assert.equal(path.attrs.d,nativeGlyphs[codes[i]].path);
 });
 assert.match(entries[0].attrs['aria-label'],/Lũy thừa/);
});

test('PNG never substitutes a system font when native vector drawing is unavailable',async()=>{
 assert.equal(paintKeylog880(canvas(),report([entry('power')]),null),false);
 const s=shell({noPath:true});await s.get('keylog-button').click();s.press('power');
 await s.get('keylog-image').click();assert.equal(s.downloads.length,0);
 assert.match(s.get('keylog-status').textContent,/Không tạo được ảnh/);
 await s.get('keylog-copy').click();assert.deepEqual(s.clipboard,['^']);
 await s.get('keylog-download').click();assert.equal(JSON.parse(await s.downloads[0].blob.text()).keys[0].key,'power');
});
test('close and reopen retain the 500 latest keys and true step numbers; scrolling back stays put',async()=>{
 const s=shell();await s.get('keylog-button').click();
 for(let i=0;i<520;i++)s.press(i%2?'sqrt':'1');
 assert.equal(s.get('keylog-keys').children.length,500);
 assert.equal(s.get('keylog-keys').firstElementChild.title,'Bước 21');
 assert.equal(s.get('keylog-count').textContent,'500 phím gần nhất');
 const p=s.get('keylog-preview');p.scrollHeight=1000;p.clientHeight=100;p.scrollTop=40;
 s.press('exe');assert.equal(p.scrollTop,40);
 await s.get('keylog-close').click();s.press('shift');await s.get('keylog-button').click();
 assert.equal(s.get('keylog-keys').children.length,500);
 assert.equal(s.get('keylog-keys').children.at(-1).textContent,'SHIFT');
 assert.equal(s.get('keylog-keys').firstElementChild.title,'Bước 23');
});
test('Word copy and symbol copy preserve the same sequence while PNG and JSON keep display labels',async()=>{
 const s=shell();await s.get('keylog-button').click();
 const keys=['shift','power','fraction','logn','back','up','left','right','down','sqrt','exe'];
 const symbols=['SHIFT','x□','□□','log▫','↩','▲','◀','▶','▼','√','EXE'];
 keys.forEach(s.press);
 assert.deepEqual(s.get('keylog-keys').children.map(x=>x.textContent),symbols);
 await s.get('keylog-copy').click();assert.deepEqual(s.clipboard,['q^ai`E!$RsB']);
 assert.match(s.get('keylog-status').textContent,/CASIO ClassWiz CW01/);
 await s.get('keylog-copy-symbols').click();assert.equal(s.clipboard[1],symbols.map(label=>'['+label+']').join(' '));
 await s.get('keylog-image').click();await s.get('keylog-download').click();
 assert.match(s.downloads[0].name,/^880btgplus-keylog-.*\.png$/);assert.equal(s.downloads[0].blob.type,'image/png');
 const r=JSON.parse(await s.downloads[1].blob.text());assert.equal(r.model,'fx-880BTG PLUS');
 assert.deepEqual(r.keys.map(k=>k.label),symbols);
});
test('clipboard denial or an unmapped key leaves history and the alternative exports usable',async()=>{
 const s=shell({noClipboard:true});await s.get('keylog-button').click();s.press('power');
 await s.get('keylog-copy').click();assert.equal(s.clipboard.length,0);
 assert.match(s.get('keylog-status').textContent,/không cho sao chép/);
 await s.get('keylog-copy-symbols').click();assert.equal(s.clipboard.length,0);
 assert.equal(s.calculator.history.length,1);assert.equal(s.get('keylog-image').disabled,false);
 const other=shell();await other.get('keylog-button').click();other.press('future-key');
 await other.get('keylog-copy').click();assert.equal(other.clipboard.length,0);
 assert.match(other.get('keylog-status').textContent,/chưa có mã CASIO/);
 await other.get('keylog-copy-symbols').click();assert.deepEqual(other.clipboard,['[future-key]']);
});
test('an unavailable canvas offers JSON and leaves the calculator and log usable',async()=>{
 const s=shell({noCanvas:true});await s.get('keylog-button').click();s.press('1');
 await s.get('keylog-image').click();assert.equal(s.downloads.length,0);
 assert.match(s.get('keylog-status').textContent,/Không tạo được ảnh/);
 s.press('exe');await s.get('keylog-download').click();
 assert.equal(JSON.parse(await s.downloads[0].blob.text()).keys.length,2);
});
