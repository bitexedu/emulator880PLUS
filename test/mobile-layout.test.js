'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'), {join}=require('node:path'), {runInNewContext}=require('node:vm');
const {calculatorFit880,hostingWidgetPaints880}=require('../web/mobile.js');
const model=runInNewContext(readFileSync(join(__dirname,'../web/model.js'),'utf8')+';({KEYS,FACE_WIDTH,FACE_HEIGHT})');
const ratio=model.FACE_WIDTH/model.FACE_HEIGHT;
const keys=Array.from(model.KEYS,k=>({left:(k.x-k.width/2)/model.FACE_WIDTH,right:(k.x+k.width/2)/model.FACE_WIDTH,
  top:(k.y-k.height/2)/model.FACE_HEIGHT,bottom:(k.y+k.height/2)/model.FACE_HEIGHT}));
const box=(w,h)=>({left:2,top:2,width:w-4,height:h-4});
const overlap=(fit,key,b)=>fit.left+key.left*fit.width<b.right && fit.left+key.right*fit.width>b.left &&
  fit.top+key.top*fit.height<b.bottom && fit.top+key.bottom*fit.height>b.top;
const visible={display:'block',visibility:'visible',opacity:'1',clipPath:'none'};

test('an empty Netlify clip or hidden widget cannot reserve phone space',()=>{
  // Actual public widget at430×744: iframe216×92, fully clipped toM0 0Z.
  for(const clipPath of ['path("M 0 0 Z")',"path('M0,0z')"])
    assert.equal(hostingWidgetPaints880({...visible,clipPath}),false);
  for(const hidden of [{display:'none'},{visibility:'hidden'},{opacity:'0'}])
    assert.equal(hostingWidgetPaints880({...visible,...hidden}),false);
  assert.equal(hostingWidgetPaints880(visible),true);
  assert.equal(hostingWidgetPaints880({...visible,clipPath:'path("M 8 8 H 190 V 60 H 8 Z")'}),true);
});

test('the reported430×744 view uses the full height when the badge paints nothing',()=>{
  const fit=calculatorFit880(box(430,744),keys);
  assert(Math.abs(fit.height-740)<1e-8);
  assert(Math.abs(fit.width-740*ratio)<1e-8);
  assert(fit.width>308.65625*1.14,'at least14% larger than the observed demo.11');
});

test('a visible bottom widget remains clear of every calculator key',()=>{
  const badge={left:214,top:652,right:430,bottom:744};
  const fit=calculatorFit880(box(430,744),keys,[badge]);
  assert(fit.width>308.65,'key geometry preserves more space than reserving the whole device');
  assert(keys.every(k=>!overlap(fit,k,badge)));
  assert(Math.abs(fit.width/fit.height-ratio)<1e-10);
});

test('unused top space is used before reducing key size',()=>{
  const available=box(430,1000),badge={left:214,top:900,right:430,bottom:1000};
  const before=calculatorFit880(available,keys),after=calculatorFit880(available,keys,[badge]);
  assert.equal(after.width,before.width);
  assert(after.top<before.top);
  assert(after.top>=available.top);
  assert(keys.every(k=>!overlap(after,k,badge)));
});

test('a hosting badge in a desktop gutter cannot shrink the machine',()=>{
  const available=box(1280,900),badge={left:1000,top:808,right:1280,bottom:900};
  assert.deepEqual(calculatorFit880(available,keys,[badge]),calculatorFit880(available,keys));
});

test('all48 native hit boxes fit portrait, landscape and desktop without distortion',()=>{
  assert.equal(keys.length,48);
  for(const [w,h] of [[320,568],[390,844],[430,744],[430,932],[844,390],[1280,900]]) {
    const a=box(w,h),fit=calculatorFit880(a,keys);
    for(const k of keys) {
      assert(fit.left+k.left*fit.width>=0 && fit.left+k.right*fit.width<=w);
      assert(fit.top+k.top*fit.height>=0 && fit.top+k.bottom*fit.height<=h);
    }
    assert(Math.abs(fit.width/fit.height-ratio)<1e-10);
  }
});
