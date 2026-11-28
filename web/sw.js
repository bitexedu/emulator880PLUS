'use strict';

const scopeURL = new URL(self.registration.scope);
const build = new URL(self.location.href).searchParams.get('build');
const cachePrefix = 'bitex-fx880plus:' + encodeURIComponent(scopeURL.pathname) + ':';
const cacheName = cachePrefix + build;
const releaseURL = new URL('release.json', scopeURL).href;
// Netlify consumes these directives during deployment; it does not serve them.
// Their hashes still belong to the package identity, not the runtime cache.
const runtimeEntries = manifest => Object.entries(manifest.assets)
  .filter(([path]) => !['_headers','_redirects','feedback-success.html'].includes(path));
const localURL = path => {
  const url = new URL(path, scopeURL);
  if (url.origin !== scopeURL.origin || !url.pathname.startsWith(scopeURL.pathname) || url.search || url.hash) {
    throw new Error('Asset outside calculator scope');
  }
  return url.href;
};

async function verifiedResponse(url, expected) {
  const response = await fetch(url, {cache:'no-store'});
  if (!response.ok || response.redirected) throw new Error('Incomplete offline download');
  const bytes = await response.clone().arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
    byte => byte.toString(16).padStart(2,'0')).join('');
  if (digest !== expected) throw new Error('Offline asset checksum mismatch');
  return response;
}

async function verifiedPage(manifest) {
  // Hosting can rewrite HTML (forms/badges). The immutable JSON envelope
  // retains the exact reviewed page; both envelope and HTML are verified.
  const path = manifest.offlineShell;
  if (!path || !manifest.assets[path]) throw new Error('Missing offline shell');
  const source = await verifiedResponse(localURL(path),manifest.assets[path]);
  const {html} = await source.clone().json();
  if (typeof html !== 'string') throw new Error('Invalid offline shell');
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(html))),
    byte => byte.toString(16).padStart(2,'0')).join('');
  if (digest !== manifest.assets['index.html']) throw new Error('Offline page checksum mismatch');
  const headers = Object.fromEntries(source.headers);
  for (const key of ['content-length','content-encoding','etag']) delete headers[key];
  headers['content-type']='text/html; charset=utf-8';
  return new Response(html,{headers});
}

self.addEventListener('install', event => event.waitUntil((async () => {
  if (!/^[a-f0-9]{64}$/.test(build || '')) throw new Error('Packaged build required');
  const response = await fetch(releaseURL,{cache:'no-store'});
  if (!response.ok || response.redirected) throw new Error('Release manifest unavailable');
  const manifest = await response.clone().json();
  if (manifest.model !== 'fx-880BTG PLUS' || manifest.source?.sha256 !== build ||
      !manifest.assets?.['index.html'] || !manifest.scope || !manifest.scopeSha256) {
    throw new Error('Release manifest mismatch');
  }
  const assets = [...runtimeEntries(manifest),[manifest.scope,manifest.scopeSha256]];
  const downloads = assets.map(([path,hash]) => [localURL(path),hash]);
  // Download and verify everything before exposing the new cache to clients.
  const cache = await caches.open(cacheName);
  try {
    let next = 0;
    await Promise.all(Array.from({length:4},async () => {
      while (next < downloads.length) {
        const [url,hash] = downloads[next++];
        await cache.put(url,await (url === localURL('index.html') && manifest.offlineShell
          ? verifiedPage(manifest) : verifiedResponse(url,hash)));
      }
    }));
    const index = await cache.match(localURL('index.html'));
    await cache.put(scopeURL.href,index);
    await cache.put(releaseURL,response);
  } catch (error) {
    await caches.delete(cacheName);
    throw error;
  }
})()));

self.addEventListener('activate', event => event.waitUntil((async () => {
  if (!(await caches.has(cacheName))) throw new Error('Offline cache missing');
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== cacheName)
    .map(name => caches.delete(name)));
  await self.clients.claim();
})()));

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_880_UPDATE') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'CHECK_880_CACHE' && event.ports?.[0]) event.waitUntil((async () => {
    let ready=false;
    try {
      const cache=await caches.open(cacheName), stored=await cache.match(releaseURL);
      if (stored) {
        const manifest=await stored.json();
        const paths=[...runtimeEntries(manifest).map(([path]) => path),manifest.scope];
        ready=!!(await cache.match(scopeURL.href)) && (await Promise.all(paths.map(path => cache.match(localURL(path))))).every(Boolean);
      }
    } catch (_) { /* Missing or evicted data is not offline-ready. */ }
    event.ports[0].postMessage({ready,model:'fx-880BTG PLUS',build});
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== scopeURL.origin || !url.pathname.startsWith(scopeURL.pathname)) return;
  const canonical = new URL(url.pathname,scopeURL.origin).href;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    // Discover updates online while keeping the installed build usable offline.
    if (canonical === releaseURL) {
      try { const response = await fetch(request); if (response.ok) return response; } catch (_) {}
    }
    return await cache.match(canonical) || fetch(request);
  })());
});
