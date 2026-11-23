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
