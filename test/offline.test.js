'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {createHash,webcrypto} = require('node:crypto');
const {runInNewContext} = require('node:vm');
const source = readFileSync(join(__dirname,'../web/sw.js'),'utf8');
const scope = 'https://example.test/880/';
const digest = text => createHash('sha256').update(text).digest('hex');
const build = 'a'.repeat(64);
const prefix = 'bitex-fx880plus:%2F880%2F:';

function environment(options = {}) {
  const assets = {'index.html':'<title>880</title>','app.js':'calculator()','assets/face.webp':'face'};
  const manifest = {model:'fx-880BTG PLUS',source:{sha256:build},
    assets:Object.fromEntries(Object.entries(assets).map(([path,text])=>[path,digest(text)])),
    scope:'PHAM-VI-BAN-THU.md',scopeSha256:digest('scope')};
  if (options.manifest) options.manifest(manifest);
  const responses = new Map(Object.entries({...assets,'PHAM-VI-BAN-THU.md':'scope','release.json':JSON.stringify(manifest)})
    .map(([path,text])=>[new URL(path,scope).href,text]));
  if (options.responses) options.responses(responses);
  const stores = options.stores || new Map();
  const handlers = {};
  let offline = false, claimed = 0, activated = 0;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name,new Map());
      const store = stores.get(name);
      return {
        async put(url,response) { store.set(String(url),await response.clone().text()); },
        async match(url) { const text = store.get(String(url)); return text === undefined ? undefined : new Response(text); }
      };
    },
    async has(name) { return stores.has(name); },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const self = {registration:{scope},location:{href:scope+'sw.js?build='+(options.build || build)},
    clients:{async claim(){claimed++;}},async skipWaiting(){activated++;},
    addEventListener(type,handler){handlers[type]=handler;}};
  const fetch = async input => {
    if (offline) throw new Error('Network unavailable');
    const url = typeof input === 'string' ? input : input.url;
    return new Response(responses.get(url) ?? 'missing',{status:responses.has(url) ? 200 : 404});
  };
  runInNewContext(source,{self,caches,fetch,URL,Response,Uint8Array,crypto:webcrypto});
  return {stores,responses,manifest,offline(){offline=true;},get claimed(){return claimed;},get activated(){return activated;},
    async dispatch(type,extra={}) {
      let pending;
      handlers[type]({...extra,waitUntil(value){pending=value;},respondWith(value){pending=value;}});
      return await pending;
    }};
}

test('offline install verifies all assets and reloads the root without a network',async () => {
  const env = environment();
  await env.dispatch('install');
  await env.dispatch('activate');
  assert.equal(env.claimed,1);
  env.offline();
  for (const path of ['','index.html','app.js','assets/face.webp','release.json','PHAM-VI-BAN-THU.md']) {
    const result = await env.dispatch('fetch',{request:new Request(scope+path)});
    assert.equal(result.status,200,path);
  }
  const root = await env.dispatch('fetch',{request:new Request(scope)});
  assert.equal(await root.text(),'<title>880</title>');
});

test('worker restart finds the installed cache from its build URL',async () => {
  const original = environment();
  await original.dispatch('install');
  const restarted = environment({stores:original.stores});
  restarted.offline();
  const result = await restarted.dispatch('fetch',{request:new Request(scope+'app.js?v=1')});
  assert.equal(await result.text(),'calculator()');
});

test('failed checksum cannot replace the existing installed build',async () => {
  const previous = prefix+'b'.repeat(64);
  const stores = new Map([[previous,new Map([['old','working']])]]);
  const env = environment({stores,responses(map){map.set(scope+'app.js','mixed deployment');}});
  await assert.rejects(env.dispatch('install'),/checksum/);
  assert.equal(stores.has(prefix+build),false);
  assert.equal(stores.get(previous).get('old'),'working');
});

test('manifest identity and every asset path must belong to the same PLUS build',async () => {
  for (const change of [m=>m.model='fx-580VN X',m=>m.source.sha256='b'.repeat(64),
    m=>m.assets['../580/app.js']=digest('other'),m=>m.assets['https://other.test/app.js']=digest('other')]) {
    const env = environment({manifest:change});
    await assert.rejects(env.dispatch('install'));
    assert.equal(env.stores.size,0);
  }
});

test('activation only cleans old PLUS caches in this exact application scope',async () => {
  const keep = ['fx580-offline-v1','bitex-fx880plus:%2Fother%2F:'+'b'.repeat(64)];
  const env = environment({stores:new Map([...keep,prefix+'b'.repeat(64)].map(name=>[name,new Map()]))});
  await env.dispatch('install');
  await env.dispatch('activate');
  assert.deepEqual([...env.stores.keys()].sort(),[...keep,prefix+build].sort());
});

test('new manifest is discovered online while old assets keep the installed version',async () => {
  const env = environment();
  await env.dispatch('install');
  env.responses.set(scope+'release.json','new release');
  env.responses.set(scope+'app.js','new app');
  const release = await env.dispatch('fetch',{request:new Request(scope+'release.json')});
  const app = await env.dispatch('fetch',{request:new Request(scope+'app.js')});
  assert.equal(await release.text(),'new release');
  assert.equal(await app.text(),'calculator()');
});

test('background installation waits for a deliberate update action',async () => {
  const env = environment();
  await env.dispatch('install');
  assert.equal(env.activated,0);
  await env.dispatch('message',{data:{type:'unrelated'}});
  assert.equal(env.activated,0);
  await env.dispatch('message',{data:{type:'ACTIVATE_880_UPDATE'}});
  assert.equal(env.activated,1);
});

test('POST and other origins or application paths are not intercepted',async () => {
  const env = environment();
  for (const request of [new Request(scope,{method:'POST'}),new Request('https://other.test/880/'),new Request('https://example.test/580/')]) {
    assert.equal(await env.dispatch('fetch',{request}),undefined);
  }
});
