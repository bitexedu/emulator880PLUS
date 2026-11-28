'use strict';
// Hợp đồng thao tác chạm của ứng dụng; không phải kỳ vọng toán học CASIO.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {bindKeys} = require('../web/core/touch.js');
function target() {
  const handlers = {}, captures = new Set(), classes = new Set();
  return {handlers, dataset:{}, classes, classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},
    addEventListener:(name,fn)=>(handlers[name]??=[]).push(fn),
    emit(name,props={}) {
      const e={pointerId:1,pointerType:'touch',clientX:20,clientY:20,timeStamp:100,detail:1,target:this,
        preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...props};
      for(const fn of handlers[name]||[]) {fn(e);if(e.stopped) break;} return e;
    },
    getBoundingClientRect:()=>({left:0,top:0,right:40,bottom:40}),
    setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),captures,
    contains:()=>true,closest(){return this;}
  };
}
function keypad() {
  const doc=target(),win=target(),pad=target(),a=target(),b=target(),clicks=[];
  doc.modal=false;doc.querySelector=()=>doc.modal?{}:null;
  a.click=()=>clicks.push('A');b.click=()=>clicks.push('B');
  bindKeys(doc,pad,win);
  const tap=(key, id=1)=>{doc.emit('pointerdown',{target:key,pointerId:id});doc.emit('pointerup',{target:key,pointerId:id});};
  return{doc,win,pad,a,b,clicks,tap};
}
test('100 tap liên tiếp mỗi tap chỉ kích hoạt đúng phím bắt đầu một lần',()=>{
 const t=keypad();for(let i=0;i<100;i++){t.tap(i%2?t.b:t.a);const click=t.doc.emit('click',{target:i%2?t.b:t.a});assert.equal(click.defaultPrevented,true);}
 assert.deepEqual(t.clicks,Array.from({length:100},(_,i)=>i%2?'B':'A'));assert.equal(t.a.classes.size+t.b.classes.size,0);
});
test('trượt ra ngoài phím rồi nhả trên phím khác không nhập nhầm',()=>{
 const t=keypad();t.doc.emit('pointerdown',{target:t.a});t.doc.emit('pointermove',{target:t.b,clientX:60});t.doc.emit('pointerup',{target:t.b,clientX:60,timeStamp:2000});
 assert.deepEqual(t.clicks,[]);assert.equal(t.doc.emit('click',{target:t.b,timeStamp:2001}).defaultPrevented,true);t.tap(t.b);assert.deepEqual(t.clicks,['B']);
});
for(const interrupt of ['pointercancel','calculator-interaction-reset','visibilitychange','blur','pagehide','resize']) test('phím phục hồi sau '+interrupt,()=>{
 const t=keypad();t.doc.emit('pointerdown',{target:t.a});(t.win.handlers[interrupt]?t.win:t.doc).emit(interrupt);t.doc.emit('pointerup',{target:t.a});assert.deepEqual(t.clicks,[]);t.tap(t.b);assert.deepEqual(t.clicks,['B']);
});
test('hai ngón không nhấn nhầm phím; lần chạm mới hoạt động',()=>{
 const t=keypad();t.doc.emit('pointerdown',{target:t.a});t.doc.emit('pointerdown',{target:t.b,pointerId:2});t.doc.emit('pointerup',{target:t.a});t.doc.emit('pointerup',{target:t.b,pointerId:2});assert.deepEqual(t.clicks,[]);t.tap(t.a,3);assert.deepEqual(t.clicks,['A']);
});
test('dialog chặn phím, click bàn phím và trợ năng không bị chặn',()=>{
 const t=keypad();t.doc.modal=true;t.tap(t.a);assert.deepEqual(t.clicks,[]);assert.equal(t.doc.emit('click',{target:t.a,detail:0}).defaultPrevented,undefined);
 assert.equal(t.doc.emit('click',{target:t.a,pointerType:'mouse',timeStamp:2000}).defaultPrevented,undefined);
});
