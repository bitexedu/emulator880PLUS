'use strict';

const storageKey = 'bitex.fx-880btg-plus.settings';
const screen = document.getElementById('lcd');
const keypad = document.getElementById('keypad');
const log = document.getElementById('log');
const status = document.getElementById('log-status');

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') return saved;
  } catch {
    // The calculator also runs with browser storage disabled.
  }
  return {};
}

const calculator = createCalculator880(readSettings());
let saved = '';
let offTimer;
const buttons = new Map();
const keyboardPressed = new Map();

for (const key of KEYS) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'key';
  button.dataset.key = key.id;
  button.setAttribute('aria-label', key.label);
  button.style.left = ((key.x - key.width / 2) / FACE_WIDTH * 100) + '%';
  button.style.top = ((key.y - key.height / 2) / FACE_HEIGHT * 100) + '%';
  button.style.width = (key.width / FACE_WIDTH * 100) + '%';
  button.style.height = (key.height / FACE_HEIGHT * 100) + '%';
  button.addEventListener('click', () => {
    calculator.press(key.id);
    render();
  });
  keypad.append(button);
  buttons.set(key.id, button);
}

function render() {
  const state = calculator.getState();
  document.documentElement.lang = state.settings.language;
  buttons.get('shift').setAttribute('aria-pressed', String(state.shifted));
  document.getElementById('build-info').textContent = MODEL + ' · ' + VERSION +
    (state.settings.language === 'en' ? ' · Preview' : ' · Bản dùng thử');
  renderLCD(screen, state);
  renderLog();
  const currentSettings = JSON.stringify(state.settings);
  if (currentSettings !== saved) {
    saved = currentSettings;
    try { localStorage.setItem(storageKey, currentSettings); } catch {}
  }
  clearTimeout(offTimer);
  if (state.power) offTimer = setTimeout(() => {
    calculator.powerOff();
    render();
  }, state.settings.autoOff * 60_000);
}

function renderLog() {
  if (!log.parentElement.open) return;
  const atEnd = log.scrollTop >= log.scrollHeight - log.clientHeight - 2;
  log.replaceChildren(...calculator.history.map(entry => element('li', '', buttons.get(entry.key).ariaLabel)));
  if (atEnd) log.scrollTop = log.scrollHeight;
}

log.parentElement.addEventListener('toggle', renderLog);
document.getElementById('clear-log').addEventListener('click', () => {
  calculator.history.length = 0;
  status.textContent = '';
  renderLog();
});
document.getElementById('copy-log').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(calculator.history.map(entry => buttons.get(entry.key).ariaLabel).join(' → '));
    status.textContent = 'Đã sao chép.';
  } catch {
    status.textContent = 'Trình duyệt không cho phép sao chép.';
  }
});
document.getElementById('export-log').addEventListener('click', () => {
  const keys = calculator.history.map(({key, shift, app}, index) => ({index:index + 1, key, shift, app}));
  const content = new Blob([JSON.stringify({model:MODEL, version:VERSION, keys}, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fx-880btg-plus-nhat-ky-phim.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target.closest?.('input,textarea,select,[contenteditable=true]')) return;
  if (event.key === 'Enter' && event.target.closest?.('button,summary,a') && !event.target.closest('.key')) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const action = /^\d$/.test(key) ? key : KEYBOARD[key];
  const button = buttons.get(action);
  if (!button) return;
  event.preventDefault();
  if (event.repeat && action === 'shift') return;
  keyboardPressed.set(event.code, button);
  button.classList.add('keyboard-pressed');
  button.focus({preventScroll:true});
  button.click();
});
document.addEventListener('keyup', event => {
  keyboardPressed.get(event.code)?.classList.remove('keyboard-pressed');
  keyboardPressed.delete(event.code);
});
window.addEventListener('blur', () => {
  for (const button of keyboardPressed.values()) button.classList.remove('keyboard-pressed');
  keyboardPressed.clear();
});

function setFaceColor(color) {
  const face = document.getElementById('face');
  const option = [...document.querySelectorAll('[name="face-color"]')].find(input => input.value === color);
  if (!option) return;
  option.checked = true;
  const imageURL = assetURL880('assets/face-' + color + '.webp');
  face.src = imageURL;
  face.parentElement.style.setProperty('--face-image', 'url("' + imageURL + '")');
  try { localStorage.setItem(storageKey + '.color', color); } catch {}
}
try { setFaceColor(localStorage.getItem(storageKey + '.color')); } catch {}
document.querySelector('.colors').addEventListener('change', event => {
  setFaceColor(event.target.value);
  buttons.get('home').focus({preventScroll:true});
});

CalculatorTouch.bindKeys(document, keypad, window);
render();

let checkingOffline880 = false;
let reopening880 = false;
const observedWorkers880 = new WeakSet();
navigator.serviceWorker?.addEventListener('controllerchange',() => {
  if (reopening880) window.location.reload();
});

async function prepareOffline880() {
  if (window.location.protocol === 'file:' || typeof BUNDLED_ASSETS880 === 'object') return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  if (checkingOffline880) return;
  checkingOffline880 = true;
  const note = document.getElementById('offline-status');
  const update = document.getElementById('update-version');
  try {
    const response = await fetch('release.json',{cache:'no-store'});
    if (!response.ok) return; // Source development stays uncached.
    const release = await response.json();
    if (release.model !== MODEL || !/^[a-f0-9]{64}$/.test(release.source?.sha256 || '')) return;
    document.getElementById('check-version').hidden = false;
    note.hidden = false;
    note.textContent = 'Đang lưu để dùng ngoại tuyến…';
    const registration = await navigator.serviceWorker.register('sw.js?build=' + release.source.sha256,
      {scope:'./',updateViaCache:'none'});
    const offerUpdate = () => {
      update.hidden = !(registration.waiting && navigator.serviceWorker.controller);
      if (update.hidden) return;
      note.textContent = 'Có bản mới. Cập nhật sẽ mở lại máy.';
    };
    update.onclick = () => {
      if (!registration.waiting) return;
      reopening880 = true;
      update.disabled = true;
      registration.waiting.postMessage({type:'ACTIVATE_880_UPDATE'});
    };
    const observeInstall = () => {
      const worker = registration.installing;
      if (!worker || observedWorkers880.has(worker)) return;
      observedWorkers880.add(worker);
      worker.addEventListener('statechange',() => {
        if (worker.state === 'installed') offerUpdate();
        if (worker.state === 'redundant' && !registration.active) note.textContent = 'Chưa lưu được bản ngoại tuyến.';
      });
    };
    registration.addEventListener('updatefound',observeInstall);
    observeInstall();
    await navigator.serviceWorker.ready;
    note.textContent = 'Đã lưu để dùng ngoại tuyến.';
    offerUpdate();
  } catch (_) {
    note.hidden = false;
    note.textContent = navigator.serviceWorker.controller
      ? 'Đã lưu để dùng ngoại tuyến.' : 'Chưa lưu được bản ngoại tuyến.';
  } finally {
    checkingOffline880 = false;
  }
}
document.getElementById('check-version').addEventListener('click',prepareOffline880);
window.addEventListener('online',prepareOffline880);
prepareOffline880();
