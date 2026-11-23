/* Versuche/Treffer in Statistiken: zuerst nur die Prozente. Antippen blendet die Zahlen kurz ein (Fade),
   nach 6 s blenden sie wieder aus. Markierung: Behälter `.has-rv`, versteckter Teil `.rv`. */
export const rv = (text) => `<span class="rv">${text}</span>`;
const timers = new WeakMap();
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-act]')) return;
  const box = e.target.closest('.has-rv');
  if (!box) return;
  clearTimeout(timers.get(box));
  // nochmal tippen blendet sofort wieder aus
  if (box.classList.toggle('rv-on')) timers.set(box, setTimeout(() => box.classList.remove('rv-on'), 6000));
});

/* Diagramme (`.has-tg`): Antippen blendet Zahlen, Achsen, Legende und Erklärung für 5 s ein; nochmal tippen blendet sie aus.
   Ein Tipp auf einen Match-Punkt (data-act) öffnet weiter das Match. */
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-act]')) return;
  const box = e.target.closest('.has-tg');
  if (!box) return;
  clearTimeout(timers.get(box));
  const on = !box.classList.contains('rv-on');
  setChart(box, on);
  if (on) timers.set(box, setTimeout(() => setChart(box, false), 5000));
});

/* Diagramm auf-/zuzoomen: viewBox weich zwischen Ausschnitt (nur Linien/Balken) und ganzem Bild (mit Achsen) wechseln */
const anims = new WeakMap();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function setChart(box, on) {
  box.classList.toggle('rv-on', on);
  for (const svg of box.querySelectorAll('svg.chart[data-crop]')) {
    const from = svg.getAttribute('viewBox').split(/\s+/).map(Number), to = svg.dataset[on ? 'full' : 'crop'].split(/\s+/).map(Number);
    cancelAnimationFrame(anims.get(svg));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { svg.setAttribute('viewBox', to.join(' ')); continue; }
    const t0 = performance.now(), ms = 520;
    const step = (now) => {
      const k = ease(Math.min(1, (now - t0) / ms));
      svg.setAttribute('viewBox', from.map((f, i) => (f + (to[i] - f) * k).toFixed(2)).join(' '));
      if (k < 1) anims.set(svg, requestAnimationFrame(step));
    };
    anims.set(svg, requestAnimationFrame(step));
  }
}

/* Doppel-Liste: unten ausblenden nur, solange noch etwas darunter kommt (ganz unten gescrollt → `.end`, kein Leerraum nötig) */
document.addEventListener('scroll', (e) => {
  const el = e.target;
  if (!el.classList?.contains('dbl-scroll') && !el.classList?.contains('fl-scroll')) return;
  el.classList.toggle('end', el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  // Scroll-Regler nur zeigen, solange gewischt wird
  el.classList.add('scrolling'); clearTimeout(timers.get(el));
  timers.set(el, setTimeout(() => el.classList.remove('scrolling'), 900));
}, true);

