/* Versuche/Treffer in Statistiken: zuerst nur die Prozente. Antippen blendet die Zahlen kurz ein (Fade),
   nach 6 s blenden sie wieder aus. Markierung: Behälter `.has-rv`, versteckter Teil `.rv`. */
export const rv = (text) => `<span class="rv">${text}</span>`;
const timers = new WeakMap();
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-act]')) return;
  const box = e.target.closest('.has-rv');
  if (!box) return;
  box.classList.add('rv-on');
  clearTimeout(timers.get(box));
  timers.set(box, setTimeout(() => box.classList.remove('rv-on'), 6000));
});

/* Diagramme (`.has-tg`): Antippen blendet Zahlen, Achsen, Legende und Erklärung für 5 s ein; nochmal tippen blendet sie aus.
   Ein Tipp auf einen Match-Punkt (data-act) öffnet weiter das Match. */
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-act]')) return;
  const box = e.target.closest('.has-tg');
  if (!box) return;
  clearTimeout(timers.get(box));
  if (box.classList.toggle('rv-on')) timers.set(box, setTimeout(() => box.classList.remove('rv-on'), 5000));
});
