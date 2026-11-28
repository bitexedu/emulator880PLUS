'use strict';

const storageKey = 'bitex.fx-880btg-plus.settings';
const screen = document.getElementById('lcd');
const keypad = document.getElementById('keypad');

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
const keylog = initializeKeylog880(calculator);

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
    for (const node of keypad.querySelectorAll('.last-pressed')) node.classList.remove('last-pressed');
    if (document.getElementById('key-highlight').checked) button.classList.add('last-pressed');
    const previous = calculator.history.at(-1);
    calculator.press(key.id);
    if (calculator.history.at(-1) !== previous) keylog.record();
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

document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if (event.target.closest?.('#keylog-panel')) return;
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
  const preview = document.getElementById('face-preview');
  if (preview) { preview.src = imageURL; preview.parentElement.style.setProperty('--face-image', 'url("' + imageURL + '")'); }
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

initializeMobile880();
initializeOffline880();
