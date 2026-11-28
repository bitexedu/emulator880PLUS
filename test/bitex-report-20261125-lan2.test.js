'use strict';

const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const web=path.join(__dirname,'../web');
const scripts=[...fs.readFileSync(path.join(web,'index.html'),'utf8').matchAll(/<script defer src="([^"]+)"/g)]
  .map(m=>m[1]).filter(p=>!['core/touch.js','lcd.js','app.js'].includes(p));
const source=scripts.map(p=>fs.readFileSync(path.join(web,p),'utf8')).join('\n');
const {createCalculator880,buildLCDFrame880,lcdStatusFlags880}=vm.runInNewContext(source+
  '\n({createCalculator880,buildLCDFrame880,lcdStatusFlags880});',{atob,btoa});

for (const filename of fs.readdirSync(path.join(__dirname,'fixtures')).filter(name =>
  /^classpad-880-bitex-report-20261125-lan2-bug\d{3}-lcd\.json$/.test(name))) {
  const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures',filename),'utf8'));
  for (const [name,keys] of Object.entries(fixture.keys)) test('LCD '+name,()=>{
    const calculator=createCalculator880({angle:fixture.angle,language:fixture.language});
    keys.forEach(calculator.press);
    const state=calculator.getState(), frame=buildLCDFrame880(state);
    assert.ok(frame,'native pixel renderer');
    const expected=[];
    for(const byte of Buffer.from(fixture.frames[name],'base64'))
      for(let i=0;i<(byte&63);i++)expected.push(byte>>6);
    assert.equal(expected.length,192*63,'complete observed PLUS frame');
    if(frame.cursor){
      const [x,y,width,height]=frame.cursor;
      for(let row=Math.max(0,y);row<Math.min(63,y+height);row++)
        for(let col=Math.max(0,x);col<Math.min(192,x+(frame.cursorRows?.[row-y]??width));col++)
          frame.pixels[row*192+col]=1;
    }
    const mismatch=expected.findIndex((p,i)=>p!==frame.pixels[i]);
    assert.equal(mismatch,-1,`${name}: pixel (${mismatch%192},${Math.floor(mismatch/192)})`);
    assert.deepEqual(Array.from(lcdStatusFlags880(state)),fixture.statuses[name]);
  });
}
