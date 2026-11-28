'use strict';
// Hosting-only adapter. The Netlify runtime remains unchanged.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../hosting/bitex/bitex-hosting.js'),'utf8');

function environment(present=true){
 const controls=[{disabled:false},{disabled:false},{disabled:false}],listeners=[];
 const status={textContent:''};
 const form={querySelectorAll:()=>controls,addEventListener(...args){listeners.push(args);}};
 vm.runInNewContext(source,{document:{getElementById:id=>id==='feedback-form'?(present?form:null):status}});
 return{controls,status,listeners};
}
test('BITEX static hosting disables feedback controls and gives a truthful alternative',()=>{
 const e=environment();assert(e.controls.every(c=>c.disabled));
 assert.match(e.status.textContent,/chưa bật/);assert.match(e.status.textContent,/PNG hoặc JSON/);
});
test('BITEX feedback guard stops the original POST handler before a request can be sent',()=>{
 const e=environment(),[type,handler,options]=e.listeners[0];
 assert.equal(type,'submit');assert.equal(options.capture,true);
 let prevented=false,stopped=false;
 handler({preventDefault(){prevented=true;},stopImmediatePropagation(){stopped=true;}});
 assert(prevented&&stopped);assert.match(e.status.textContent,/chưa bật/);
});
test('the BITEX guard is harmless if no feedback panel exists',()=>{
 assert.equal(environment(false).listeners.length,0);
});

test('BITEX tracking preserves queued entries and supplies the standard GTM load trigger',()=>{
 const existing={event:'existing'},dataLayer=[existing];
 const context={window:{dataLayer}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../hosting/bitex/bitex-tracking.js'),'utf8'),context);
 assert.equal(context.window.dataLayer,dataLayer);
 assert.equal(dataLayer[0],existing);
 assert.equal(dataLayer.length,3);
 assert.equal(dataLayer[1][0],'js');
 assert(Number.isFinite(dataLayer[1][1].getTime()));
 assert.equal(dataLayer[2].event,'gtm.js');
 assert.equal(typeof dataLayer[2]['gtm.start'],'number');
 assert.deepEqual(Object.keys(dataLayer[2]).sort(),['event','gtm.start']);
});

test('BITEX tracking initializes from an empty page without calculator globals',()=>{
 const context={window:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../hosting/bitex/bitex-tracking.js'),'utf8'),context);
 assert.equal(context.window.dataLayer.length,2);
 context.gtag('test');
 assert.equal(context.window.dataLayer[2][0],'test');
});

test('BITEX CSP permits GTM and Analytics without allowing arbitrary or inline scripts',()=>{
 const policy=fs.readFileSync(require.resolve('../hosting/bitex/apache.htaccess'),'utf8')
   .match(/Header always set Content-Security-Policy "([^"]+)"/)[1];
 const directives=Object.fromEntries(policy.split(';').map(s=>s.trim().split(/\s+/)).filter(x=>x[0]).map(([k,...v])=>[k,v]));
 assert.deepEqual(directives['script-src'],["'self'",'https://www.googletagmanager.com']);
 assert(directives['connect-src'].includes('https://*.google-analytics.com'));
 assert.deepEqual(directives['worker-src'],["'self'"]);
 assert.deepEqual(directives['form-action'],["'none'"]);
 assert.deepEqual(directives['frame-ancestors'],["'none'"]);
});
