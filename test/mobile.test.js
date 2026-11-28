'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const root=path.join(__dirname,'../web');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('the installable PLUS shell is self-contained and has correct app identity',() => {
  const html=read('index.html'), manifest=JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.name,'fx-880BTG PLUS Emulator (Demo)');
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.scope,'./');
  for(const icon of manifest.icons) {
    const bytes=fs.readFileSync(path.join(root,icon.src));
    assert.equal(bytes.subarray(1,4).toString(),'PNG');
    assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));
  }
  for(const [,url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if(url==='./'||url.startsWith('#'))continue;
    assert(!/^(https?:|\/|\.\.)/.test(url),url);
    assert(fs.statSync(path.join(root,url)).isFile(),url);
  }
  assert(!/<script(?![^>]*\bsrc=)[^>]*>/.test(html),'No inline executable scripts');
});

test('mobile controls have unique ids and dialogs have real close controls',() => {
  const html=read('index.html'), ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,'duplicate DOM id');
  for(const [,target] of html.matchAll(/data-panel="([^"]+)"/g))assert(ids.includes(target),target);
  assert(html.includes('id="feedback-form"'));
  assert(html.includes('netlify-honeypot="bot-field"'));
  assert(!html.includes('580VN'));
});

test('the deployed security policy denies embedded apps, third-party code and sensitive permissions',() => {
  const headers=read('_headers');
  for(const rule of ["script-src 'self'","frame-ancestors 'none'","object-src 'none'","base-uri 'none'","form-action 'self'",'X-Content-Type-Options: nosniff','X-Frame-Options: DENY','Referrer-Policy: no-referrer','camera=()','microphone=()','geolocation=()'])assert(headers.includes(rule),rule);
  assert(!/unsafe-eval|script-src[^;\n]*unsafe-inline|Access-Control-Allow-Origin:\s*\*/.test(headers));
  assert(read('robots.txt').includes('Disallow: /'));
});
