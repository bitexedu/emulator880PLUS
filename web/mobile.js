'use strict';

function hostingWidgetPaints880(style) {
  const clip = String(style.clipPath || '').toLowerCase().replace(/[\s,"']/g,'');
  return style.display !== 'none' && !['hidden','collapse'].includes(style.visibility) &&
    Number(style.opacity) !== 0 && clip !== 'path(m00z)';
}

// Preserve the face ratio and all key hit boxes. Move into unused top space
// before reducing size for a genuinely visible bottom hosting control.
function calculatorFit880(box, keys, obstacles = [], ratio = 506/1059) {
  let width = Math.max(0,Math.min(box.width,box.height*ratio));
  for (let pass=0;pass<=keys.length;pass++) {
    const height=width/ratio, left=box.left+(box.width-width)/2;
    let top=box.top+(box.height-height)/2, limit=width;
    for (const obstacle of obstacles) for (const key of keys) {
      if (left+key.right*width<=obstacle.left || left+key.left*width>=obstacle.right ||
          top+key.top*height>=obstacle.bottom || top+key.bottom*height+3<=obstacle.top) continue;
      top=Math.max(box.top,Math.min(top,obstacle.top-3-key.bottom*height));
      limit=Math.min(limit,Math.max(0,(obstacle.top-3-box.top)/key.bottom*ratio));
    }
    if (limit>=width-.01) return {width,height,left,top};
    width=Math.max(0,limit);
  }
  return {width,height:width/ratio,left:box.left+(box.width-width)/2,top:box.top};
}

// Application controls stay outside the calculator's state and LCD renderer.
function initializeMobile880() {
  const stage = document.getElementById('device-stage');
  const device = document.getElementById('device');
  const modal = document.getElementById('utility-dialog');
  const menuButton = document.getElementById('app-menu-button');
  let panel, installPrompt, justInstalled = false, fitting = false;
  const resetTouch = () => document.dispatchEvent(new Event('calculator-interaction-reset'));
  const installed = () => justInstalled || matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const keyBoxes=KEYS.map(key => ({left:(key.x-key.width/2)/FACE_WIDTH,
    right:(key.x+key.width/2)/FACE_WIDTH,top:(key.y-key.height/2)/FACE_HEIGHT,
    bottom:(key.y+key.height/2)/FACE_HEIGHT}));

  function fit() {
    if (fitting) return;
    fitting = true;
    const r = stage.getBoundingClientRect(), css = getComputedStyle(stage);
    const box={left:r.left+parseFloat(css.paddingLeft),top:r.top+parseFloat(css.paddingTop),
      width:r.width-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),
      height:r.height-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)};
    const frame=document.getElementById('nl-badge-frame') || document.getElementById('nl-hud-frame');
    const badge=frame?.getBoundingClientRect();
    // A fully clipped iframe has no painted or interactive area to reserve.
    // Reading its visibility never changes or hides the platform's badge.
    const obstacles=badge?.height>0 && badge.height<=120 && badge.top>box.top &&
      hostingWidgetPaints880(getComputedStyle(frame)) ? [badge] : [];
    const layout=calculatorFit880(box,keyBoxes,obstacles);
    device.style.setProperty('--device-width',layout.width+'px');
    device.style.marginBottom='0px';
    device.style.transform='translateY('+(layout.top-box.top-(box.height-layout.height)/2)+'px)';
    fitting = false;
  }
  const sizing = new ResizeObserver(fit); sizing.observe(stage);
  const badgeChanges = new MutationObserver(fit);
  let trackedBadge;
  const watchBadge = () => {
    const badge = document.getElementById('nl-badge-frame') || document.getElementById('nl-hud-frame');
    if (badge !== trackedBadge) {
      if (trackedBadge) sizing.unobserve(trackedBadge);
      badgeChanges.disconnect();
      trackedBadge=badge;
      if (badge) {
        sizing.observe(badge);
        badgeChanges.observe(badge,{attributes:true,attributeFilter:['style','class','hidden']});
      }
    }
    fit();
  };
  new MutationObserver(watchBadge).observe(document.body, {childList:true}); watchBadge();
  window.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('resize', fit);
  fit();

  function open(id) {
    const next = document.getElementById(id);
    if (!next?.classList.contains('app-dialog')) return;
    resetTouch();
    if (panel) panel.hidden = true;
    panel = next; panel.hidden = false; panel.scrollTop = 0;
    modal.dataset.panel = id;
    modal.style.left = ''; modal.style.top = '';
    modal.setAttribute('aria-labelledby', panel.getAttribute('aria-labelledby'));
    if (!modal.open) { modal.returnValue=''; modal.showModal(); }
    panel.querySelector('[data-close-dialog]').focus({preventScroll:true});
    modal.dispatchEvent(new Event('shell-panel-change'));
    if (id === 'install-dialog') showInstall(platform);
    if (id === 'zoom-panel') syncZoom();
    if (id === 'feedback-panel') {
      document.getElementById('feedback-version').value = VERSION;
      document.getElementById('feedback-keys').value = calculator.history.map(e => buttons.get(e.key).ariaLabel).join(' → ');
    }
    positionMenu();
  }
  function positionMenu() {
    if (!modal.open || panel?.id !== 'app-menu') return;
    const r = menuButton.getBoundingClientRect();
    modal.style.left = Math.max(6, Math.min(r.left, innerWidth-modal.offsetWidth-6)) + 'px';
    modal.style.top = Math.max(6, Math.min(r.bottom+6, innerHeight-modal.offsetHeight-6)) + 'px';
  }
  menuButton.addEventListener('click', () => open('app-menu'));
  for (const button of document.querySelectorAll('[data-panel]'))
    button.addEventListener('click', () => open(button.dataset.panel));
  for (const button of document.querySelectorAll('[data-close-dialog]'))
    button.addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => {
    if (modal.open) return;
    resetTouch(); if (panel) panel.hidden = true; panel = null;
    (modal.returnValue==='keylog' ? device : menuButton).focus({preventScroll:true});
  });
  let backdrop = false;
  modal.addEventListener('pointerdown', e => { backdrop = e.target === modal; });
  modal.addEventListener('pointercancel', () => { backdrop = false; });
  modal.addEventListener('click', e => { if (backdrop && e.target === modal) modal.close(); backdrop = false; });
  window.addEventListener('resize', positionMenu);

  const highlight = document.getElementById('key-highlight');
  try { highlight.checked = localStorage.getItem(storageKey+'.highlight') === 'true'; } catch (_) {}
  highlight.addEventListener('change', () => {
    try { localStorage.setItem(storageKey+'.highlight', String(highlight.checked)); } catch (_) {}
    if (!highlight.checked) for (const key of buttons.values()) key.classList.remove('last-pressed');
  });

  const zoom = document.getElementById('lcd-zoom');
  function syncZoom() {
    if (!modal.open || panel?.id !== 'zoom-panel') return;
    const target = document.getElementById('zoom-device');
    const clone = screen.cloneNode(true); clone.removeAttribute('id');
    clone.removeAttribute('aria-live');
    for (const node of clone.querySelectorAll('[id]')) node.removeAttribute('id');
    target.replaceChildren(clone);
    target.style.width = Number(zoom.value) * 100 + '%';
    document.getElementById('lcd-zoom-value').value = Math.round(Number(zoom.value)*100)+'%';
  }
  zoom.addEventListener('input', syncZoom);
  new MutationObserver(syncZoom).observe(screen, {childList:true, subtree:true});

  document.getElementById('fullscreen-button').addEventListener('click', async () => {
    if (!document.fullscreenEnabled) { open('install-dialog'); return; }
    modal.close();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) { open('install-dialog'); }
  });
  document.addEventListener('fullscreenchange', () => {
    document.getElementById('fullscreen-label').textContent = document.fullscreenElement ? 'Thoát toàn màn hình' : 'Toàn màn hình'; fit();
  });

  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let platform = ios ? 'ios' : /Android/.test(navigator.userAgent) ? 'android' : 'desktop';
  const installNow = document.getElementById('install-now');
  function showInstall(value) {
    platform = value;
    for (const b of document.querySelectorAll('[data-install-platform]')) {
      const selected = b.dataset.installPlatform === value;
      b.setAttribute('aria-pressed', String(selected));
      document.getElementById('install-'+b.dataset.installPlatform).hidden = !selected;
    }
    installNow.hidden = Boolean(installed()) || value === 'ios';
    document.getElementById('install-complete').hidden = !installed();
    document.getElementById('install-shortcut').hidden = Boolean(installed());
    document.getElementById('install-url').value = new URL('./', location.href).href;
  }
  for (const b of document.querySelectorAll('[data-install-platform]')) b.addEventListener('click', () => showInstall(b.dataset.installPlatform));
  document.getElementById('install-shortcut').addEventListener('click', () => open('install-dialog'));
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt=e; showInstall(platform); });
  window.addEventListener('appinstalled', () => { justInstalled=true; installPrompt=null; showInstall(platform); });
  installNow.addEventListener('click', async () => {
    const message = document.getElementById('install-prompt-status');
    if (!installPrompt) {
      message.textContent = platform === 'desktop'
        ? 'Chrome/Edge: mở menu trình duyệt, chọn Cài đặt trang này dưới dạng ứng dụng. Safari trên Mac: Tệp → Thêm vào Dock.'
        : 'Mở menu Chrome → Thêm vào màn hình chính → Cài đặt. Trên iPhone/iPad, dùng Chia sẻ trong Safari.';
      return;
    }
    const prompt = installPrompt; installPrompt=null; installNow.disabled=true;
    try {
      await prompt.prompt(); const choice=await prompt.userChoice;
      message.textContent = choice.outcome === 'accepted' ? 'Hãy mở 880BTG PLUS từ biểu tượng vừa cài.' : 'Bạn có thể cài sau theo hướng dẫn phía trên.';
    } catch (_) { message.textContent='Hãy cài từ menu trình duyệt theo hướng dẫn phía trên.'; }
    finally { installNow.disabled=false; showInstall(platform); }
  });
  document.getElementById('install-copy-link').addEventListener('click', async () => {
    const input=document.getElementById('install-url'), message=document.getElementById('install-copy-status');
    try { await navigator.clipboard.writeText(input.value); message.textContent='Đã sao chép đường dẫn.'; }
    catch (_) { input.focus(); input.select(); message.textContent='Hãy chọn Sao chép cho đường dẫn đang được chọn.'; }
  });
  showInstall(platform);
  const note=document.getElementById('offline-status');
  const syncNote=() => {
    document.getElementById('install-offline-status').textContent=note.textContent;
    document.getElementById('install-offline-status').dataset.error=note.dataset.error || 'true';
  };
  new MutationObserver(syncNote).observe(note,{childList:true,attributes:true,characterData:true,subtree:true}); syncNote();

  const form=document.getElementById('feedback-form');
  form.addEventListener('submit', async e => {
    e.preventDefault(); const message=document.getElementById('feedback-status');
    const file=document.getElementById('feedback-image').files[0];
    if (file && (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size>5*1024*1024)) {
      message.textContent='Chọn ảnh PNG, JPEG hoặc WebP không quá 5 MB.'; return;
    }
    if (!navigator.onLine || location.protocol==='file:') { message.textContent='Cần có mạng để gửi. Nội dung đang nhập được giữ trong cửa sổ này.'; return; }
    const submit=form.querySelector('[type=submit]'); submit.disabled=true; message.textContent='Đang gửi góp ý…';
    try {
      const response=await fetch(new URL('./',location.href),{method:'POST',body:new FormData(form),credentials:'same-origin'});
      if (!response.ok) throw new Error('feedback rejected');
      message.textContent='Đã gửi góp ý. Cảm ơn bạn đã giúp BITEX kiểm tra.';
      form.reset();
    } catch (_) { message.textContent='Chưa gửi được. Nội dung vẫn được giữ; hãy thử lại khi có mạng ổn định.'; }
    finally { submit.disabled=false; }
  });
}

if (typeof module === 'object' && module.exports) module.exports={calculatorFit880,hostingWidgetPaints880};
