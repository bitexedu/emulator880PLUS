'use strict';

function initializeOffline880() {
  const note=document.getElementById('offline-status'), update=document.getElementById('update-version');
  const message=document.getElementById('update-status');
  let checking=false, reopening=false, registration, ready=false;
  const observed=new WeakSet();
  function show() {
    note.dataset.error=String(!ready);
    note.textContent=ready ? (navigator.onLine ? 'Sẵn sàng dùng ngoại tuyến.' : 'Đang dùng ngoại tuyến. Máy tính vẫn hoạt động.')
      : 'Chưa sẵn sàng dùng ngoại tuyến. Hãy giữ kết nối để tải đủ chương trình.';
  }
  async function checkCache(worker) {
    if (!worker) return false;
    const channel=new MessageChannel();
    const complete=await new Promise(resolve => {
      const timer=setTimeout(() => resolve(false),6000);
      channel.port1.onmessage=e => { clearTimeout(timer); resolve(e.data?.ready === true && e.data?.model === MODEL); };
      worker.postMessage({type:'CHECK_880_CACHE'},[channel.port2]);
    });
    channel.port1.close(); return complete;
  }
  function offerUpdate() {
    update.hidden=!(registration?.waiting && navigator.serviceWorker.controller);
    if (!update.hidden) message.textContent='Có bản mới. Hoàn tất phép tính rồi chọn cập nhật để mở lại máy.';
  }
  async function prepare() {
    if (checking) return;
    if (typeof BUNDLED_ASSETS880==='object') { ready=true; show(); return; }
    if (location.protocol==='file:' || !('serviceWorker' in navigator) || !isSecureContext) { show(); return; }
    checking=true;
    try {
      const response=await fetch('release.json',{cache:'no-store'});
      if (!response.ok) throw new Error('release unavailable');
      const release=await response.json();
      if (release.model!==MODEL || !/^[a-f0-9]{64}$/.test(release.source?.sha256 || '')) throw new Error('invalid release');
      registration=await navigator.serviceWorker.register('sw.js?build='+release.source.sha256,{scope:'./',updateViaCache:'none'});
      function watch() {
        const worker=registration.installing;
        if (!worker || observed.has(worker)) return;
        observed.add(worker);
        worker.addEventListener('statechange',async () => {
          if (worker.state==='installed') offerUpdate();
          if (worker.state==='redundant' && !registration.active) { ready=false; show(); }
        });
      }
      registration.addEventListener('updatefound',watch); watch();
      const active=await new Promise((resolve,reject) => {
        const timer=setTimeout(() => reject(new Error('cache timeout')),20000);
        navigator.serviceWorker.ready.then(value => { clearTimeout(timer); resolve(value); });
      });
      ready=await checkCache(active.active); show(); offerUpdate();
    } catch (_) {
      ready=await checkCache(navigator.serviceWorker?.controller); show();
      message.textContent=navigator.onLine ? 'Chưa kiểm tra được bản mới. Bạn vẫn có thể tiếp tục tính toán.' : 'Kết nối mạng để kiểm tra phiên bản mới.';
    } finally { checking=false; }
  }
  navigator.serviceWorker?.addEventListener('controllerchange',async () => {
    if (reopening) { location.reload(); return; }
    ready=await checkCache(navigator.serviceWorker.controller); show();
  });
  update.addEventListener('click',() => {
    if (!registration?.waiting) return;
    reopening=true; update.disabled=true;
    registration.waiting.postMessage({type:'ACTIVATE_880_UPDATE'});
  });
  document.getElementById('check-version').addEventListener('click',async () => {
    if (!navigator.onLine) { message.textContent='Đang ngoại tuyến. Kết nối mạng để kiểm tra bản mới.'; return; }
    message.textContent='Đang kiểm tra phiên bản…'; await prepare();
    if (ready && update.hidden) message.textContent='Bạn đang dùng phiên bản hiện có. Bản mới sẽ được thông báo khi tải xong.';
  });
  window.addEventListener('online',prepare); window.addEventListener('offline',show);
  prepare();
}
