/* Drehrad zum Auswählen einer Zahl (z. B. „First to … Legs“ 1–20): waagerechte Leiste mit Einrasten (scroll-snap),
   die Zahl in der Mitte gilt. Zahlen weiter außen werden kleiner und blasser (wie auf einer Walze).
   Antippen einer Zahl dreht das Rad dorthin. Ändert sich der Wert, wird onPick(key, value) aufgerufen. */

const ITEM = 56; // Breite einer Zahl in px (muss zu .wheel-i in screens.css passen)

/** HTML des Rads. key = Optionsname (z. B. 'target'), Werte min…max */
export function wheelHTML(key, min, max, value) {
  const items = [];
  for (let v = min; v <= max; v++) items.push(`<button class="wheel-i ${v === value ? 'on' : ''}" data-wheel-v="${v}" tabindex="-1">${v}</button>`);
  return `<div class="wheel-box"><div class="wheel" data-wheel="${key}" data-min="${min}" data-value="${value}" role="slider" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}" tabindex="0">
    <div class="wheel-track">${items.join('')}</div></div></div>`;
}

let onPick = () => {};
const timers = new WeakMap();
const user = new WeakSet(); // Rad, das gerade vom Nutzer gedreht wird – dann nicht von außen zurücksetzen

/** Optik: Zahlen je nach Abstand zur Mitte verkleinern/abdunkeln */
function shade(w) {
  const mid = w.scrollLeft + w.clientWidth / 2;
  for (const el of w.querySelectorAll('.wheel-i')) {
    const c = el.offsetLeft + el.offsetWidth / 2, d = Math.min(1, Math.abs(c - mid) / (ITEM * 3.2));
    el.style.transform = `scale(${(1.25 - d * 0.55).toFixed(3)})`;
    el.style.opacity = (1 - d * 0.75).toFixed(3);
  }
}
const valueAt = (w) => Number(w.dataset.min) + Math.round(w.scrollLeft / ITEM);

/** Nach jedem Neuzeichnen: Räder auf ihren Wert stellen (sofern nicht gerade gedreht wird) */
export function initWheels(pick) {
  onPick = pick || onPick;
  for (const w of document.querySelectorAll('.wheel')) {
    const target = (Number(w.dataset.value) - Number(w.dataset.min)) * ITEM;
    if (!user.has(w) && Math.abs(w.scrollLeft - target) > 2) w.scrollLeft = target;
    shade(w);
  }
}

/* Haptik (nur Handy): bei jeder Zahl, die beim Drehen in die Mitte rückt, ein kurzer Tick.
   Android: navigator.vibrate. iPhone (Safari ab iOS 18): Umschalten eines versteckten Switch-Kästchens löst den System-Tick aus. */
const PHONE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
let hapticLabel = null;
function tick() {
  if (!PHONE) return;
  if (navigator.vibrate) { navigator.vibrate(6); return; }
  if (!hapticLabel) {
    hapticLabel = document.createElement('label');
    hapticLabel.setAttribute('aria-hidden', 'true');
    hapticLabel.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;left:-10px;top:0';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.setAttribute('switch', ''); cb.tabIndex = -1;
    hapticLabel.appendChild(cb); document.body.appendChild(hapticLabel);
  }
  hapticLabel.click();
}
const lastTick = new WeakMap();

document.addEventListener('scroll', (e) => {
  const w = e.target;
  if (!w.classList?.contains('wheel')) return;
  user.add(w);
  requestAnimationFrame(() => shade(w));
  const cur = valueAt(w);
  if (lastTick.has(w) && lastTick.get(w) !== cur) tick();
  lastTick.set(w, cur);
  clearTimeout(timers.get(w));
  // Wert erst übernehmen, wenn das Rad eingerastet ist
  timers.set(w, setTimeout(() => {
    user.delete(w);
    const v = valueAt(w);
    if (String(v) !== w.dataset.value) { w.dataset.value = String(v); onPick(w.dataset.wheel, v); }
  }, 140));
}, true);

document.addEventListener('click', (e) => {
  const b = e.target.closest?.('.wheel-i');
  if (!b) return;
  const w = b.closest('.wheel');
  w.scrollTo({ left: (Number(b.dataset.wheelV) - Number(w.dataset.min)) * ITEM, behavior: 'smooth' });
});
document.addEventListener('keydown', (e) => {
  const w = e.target.closest?.('.wheel');
  if (!w || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  e.preventDefault();
  w.scrollBy({ left: e.key === 'ArrowRight' ? ITEM : -ITEM, behavior: 'smooth' });
});

/* Mit der Maus (bzw. jedem Zeiger) am Rad ziehen: beim Loslassen auf die nächste Zahl einrasten, mit etwas Schwung */
let drag = null;
document.addEventListener('pointerdown', (e) => {
  const w = e.target.closest?.('.wheel');
  if (!w || e.pointerType === 'touch') return; // Finger wischen nativ
  drag = { w, x: e.clientX, left: w.scrollLeft, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
  w.style.scrollSnapType = 'none';
  w.classList.add('dragging');
});
document.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 3) drag.moved = true;
  drag.w.scrollLeft = drag.left - dx;
  const now = performance.now();
  drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT); drag.lastX = e.clientX; drag.lastT = now;
});
function endDrag() {
  if (!drag) return;
  const { w, v, moved } = drag;
  drag = null;
  w.classList.remove('dragging');
  const goal = Math.round((w.scrollLeft - v * 120) / ITEM) * ITEM; // Schwung: schnell gezogen → ein paar Zahlen weiter
  w.style.scrollSnapType = '';
  w.scrollTo({ left: Math.max(0, goal), behavior: 'smooth' });
  if (moved) { const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; document.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', stop, true), 50); }
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);
