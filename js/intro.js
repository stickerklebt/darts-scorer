/* Intro beim Öffnen + Übergang beim Tippen auf die 501-Kachel („Seide & Titan“).
   Volles Intro (~3,6 s) nur beim allerersten Öffnen (localStorage `darts.introSeen`), danach Kurzversion (~1,5 s).
   Nicht überspringbar: ein unsichtbarer Blocker schluckt alle Taps. Das fertige Layout ist von Anfang an gezeichnet und nur
   unsichtbar (`html.intro-pre` → visibility hidden); jedes Element wird per Web-Animation mit „fill: backwards“ eingeblendet.
   Debug: ?intro=full (volles Intro, Flag zurückgesetzt) · ?intro=slow (volles Intro, 0,25-fach) · ?intro=off (kein Intro) ·
   ?intro=reset (Flag löschen, volles Intro). Alle Stellschrauben: js/intro-config.js. */
import { TUNE, introPlan, ease, span, lerpRect } from './intro-config.js';
import { loadSilk, createSilkGL } from './silkgl.js';
import { sweep } from './ui/metal501.js';

const FLAG = 'darts.introSeen';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const raf = () => new Promise((ok) => requestAnimationFrame(ok));
let busy = false;
export const introBusy = () => busy;

/** Welche Variante? (Debug-Parameter haben Vorrang) */
export function introMode() {
  const q = new URLSearchParams(location.search).get('intro');
  if (q === 'off') return { kind: 'off', slow: 1 };
  if (q === 'full' || q === 'slow' || q === 'reset') { try { localStorage.removeItem(FLAG); } catch (e) { /* privat */ } return { kind: 'full', slow: q === 'slow' ? 4 : 1 }; }
  let seen = false;
  try { seen = localStorage.getItem(FLAG) === '1'; } catch (e) { /* privat */ }
  return { kind: seen ? 'short' : 'full', slow: 1 };
}

/** Vor dem ersten Zeichnen: alles unsichtbar, Taps blockieren */
export function introPrepare() {
  busy = true;
  document.documentElement.classList.add('intro-pre');
  const b = document.createElement('div'); b.className = 'intro-block'; b.setAttribute('aria-hidden', 'true');
  for (const ev of ['pointerdown', 'pointerup', 'click', 'touchstart', 'touchend']) b.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }, { passive: false });
  document.body.appendChild(b);
}
export function introFinish() {
  busy = false;
  document.documentElement.classList.remove('intro-pre');
  document.querySelector('.intro-block')?.remove();
  document.querySelector('.silk-hero')?.classList.add('silk-live');
}

/** Bild + Schrift laden, höchstens TUNE.waitMax warten */
async function ready() {
  const wait = new Promise((ok) => setTimeout(ok, TUNE.waitMax * 1000));
  const img = loadSilk().catch(() => null);
  const font = document.fonts?.load ? document.fonts.load(TUNE.fontCheck).catch(() => null) : Promise.resolve();
  await Promise.race([Promise.all([img, font]), wait]);
  return Promise.race([img, Promise.resolve(null)]);
}

const anim = (el, kf, delay, dur, easing = 'cubic-bezier(.2,.8,.2,1)') => el?.animate(kf, { delay: delay * 1000, duration: Math.max(1, dur * 1000), easing, fill: 'backwards' });

/** Das Intro abspielen (nach dem ersten Zeichnen des Play-Reiters). Läuft bei JEDEM Öffnen (voll beim ersten Mal, sonst kurz);
    ruhig nur bei prefers-reduced-motion (die Einstellung „Bewegung in den Kästen“ betrifft das Intro nicht). kind: Variante erzwingen */
export async function runIntro(opts = {}) {
  // Sicherheitsnetz: ein Fehler im Intro darf die App nie schwarz lassen
  const guard = setTimeout(() => { document.querySelector('.silk-gl')?.remove(); document.querySelector('.silk-css')?.remove(); introFinish(); }, 8000);
  try { await runIntroInner(opts); } catch (e) { console.error('Intro', e); document.querySelector('.silk-gl')?.remove(); document.querySelector('.silk-css')?.remove(); introFinish(); }
  clearTimeout(guard);
}
async function runIntroInner({ still = false, kind = null } = {}) {
  const mode = introMode();
  if (kind && mode.kind !== 'off') mode.kind = kind;
  const hero = document.querySelector('.silk-hero');
  if (mode.kind === 'off' || !hero) { introFinish(); return; }
  const img = await ready();
  await raf();
  // ruhige Variante: nur weich einblenden (prefers-reduced-motion oder „Bewegung in den Kästen“ aus)
  if (reduced() || still || !img) {
    document.documentElement.classList.remove('intro-pre');
    document.getElementById('app')?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out', fill: 'backwards' });
    setTimeout(introFinish, 460);
    try { localStorage.setItem(FLAG, '1'); } catch (e) { /* privat */ }
    return;
  }
  const P = introPlan(mode.kind, mode.slow);
  const R = hero.getBoundingClientRect();
  const tile = { x: R.left, y: R.top, w: R.width, h: R.height, r: parseFloat(getComputedStyle(hero).borderTopLeftRadius) || 0 };
  const full = { x: 0, y: 0, w: innerWidth, h: innerHeight, r: 0 };
  const handoff = P.gather[1];

  // --- DOM: alles per Animation mit „fill: backwards“ – vor dem Start unsichtbar, danach der normale Zustand ---
  anim(hero, [{ opacity: 0 }, { opacity: 1 }], handoff, 0.001, 'linear');
  const digits = [...hero.querySelectorAll('.m501-d')], sub = hero.querySelector('.m501-sub');
  const drop = (el, at, small) => anim(el, [
    { opacity: 0, transform: `translateY(${small ? -10 : -26}px) scale(2.2)`, filter: 'blur(12px) drop-shadow(0 0 0 rgba(0,0,0,0))' },
    { opacity: 1, transform: 'translateY(0) scale(.96)', filter: 'blur(0) drop-shadow(0 2px 1px rgba(0,0,0,.9))', offset: 0.62 },
    { opacity: 1, transform: 'translateY(0) scale(1.01)', filter: 'blur(0) drop-shadow(0 6px 6px rgba(0,0,0,.7))', offset: 0.8 },
    { opacity: 1, transform: 'none', filter: 'blur(0) drop-shadow(0 12px 16px rgba(0,0,0,.55))' },
  ], at, P.digitDur, 'cubic-bezier(.55,0,.35,1)');
  digits.forEach((d, i) => drop(d, P.digits + i * P.digitStep, false));
  drop(sub, P.digits + 2 * P.digitStep, true);
  const land = P.digits + 2 * P.digitStep + P.digitDur * 0.62;
  hero.animate([{ transform: 'none' }, { transform: 'translateY(2px) scale(1.005)', offset: 0.35 }, { transform: 'none' }], { delay: land * 1000, duration: 260, easing: 'ease-out' });
  const ui = [document.querySelector('.resume-wrap'), ...document.querySelectorAll('#app .page > .label, #app .modes > .mode')].filter(Boolean);
  ui.forEach((el, i) => anim(el, [{ opacity: 0, transform: 'translateY(24px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], P.ui + i * P.uiStep, P.uiDur));
  const tabs = document.querySelector('.tabs');
  anim(tabs, [{ opacity: 0, transform: 'translateX(-50%) scale(.85)' }, { opacity: 1, transform: 'translateX(-50%) scale(1.04)', offset: 0.6 }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }], P.tabs, P.tabsDur, 'cubic-bezier(.3,1.4,.5,1)');
  setTimeout(() => sweep(P.sweep[1] * 1000), P.sweep[0] * 1000);
  document.documentElement.classList.remove('intro-pre'); // ab jetzt halten die Animationen die Elemente unsichtbar

  // --- Stoff: WebGL (sonst CSS-Ersatz) ---
  const gl = createSilkGL(img);
  const t0 = performance.now();
  if (gl) {
    document.body.appendChild(gl.canvas);
    const peak = mode.kind === 'full' ? TUNE.distort.peak : TUNE.distort.short;
    const C = [[0.9, 0.7], [-1.1, 0.5], [0.3, -1.2], [-0.8, -0.9]]; // aus welcher Ecke jeder Layer kommt (UV-Versatz)
    await new Promise((done) => {
      const step = (now) => {
        const t = (now - t0) / 1000;
        const g = ease.inOut(span(t, P.gather[0], P.gather[1]));
        const a = t < P.distortPeak ? ease.out(span(t, P.flyIn[0], P.distortPeak)) : 1 - ease.inOut(span(t, P.distortPeak, P.gather[1]));
        const fly = 1 - ease.out(span(t, P.flyIn[0], P.flyIn[1]));
        const slide = mode.kind === 'full' ? a : 0;
        const off = C.map(([x, y], i) => [x * fly + 0.06 * slide * Math.sin(t * 2.6 + i * 1.7), y * fly + 0.05 * slide * Math.cos(t * 2.1 + i)]);
        gl.draw({
          time: t * 1.3, rect: lerpRect(full, tile, g), dist: peak * a + TUNE.distort.rest, blur: TUNE.distort.blur * a,
          layers: mode.kind === 'full' ? 1 - span(t, P.gather[0], P.gather[0] + (P.gather[1] - P.gather[0]) * 0.7) : 0,
          off, vig: g, alpha: mode.kind === 'full' ? span(t, P.black, P.black + 0.15) : 1,
        });
        if (t >= handoff) { hero.classList.add('silk-live'); requestAnimationFrame(() => { gl.destroy(); done(); }); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  } else {
    await cssSilk(tile, P, mode.kind);
    hero.classList.add('silk-live');
  }
  const rest = P.total - (performance.now() - t0) / 1000;
  await new Promise((ok) => setTimeout(ok, Math.max(0, rest * 1000)));
  introFinish();
  try { localStorage.setItem(FLAG, '1'); } catch (e) { /* privat */ }
}

/** Ersatz ohne WebGL: dieselbe Choreografie mit CSS-Transforms der Bild-Layer und einer Clip-Maske */
async function cssSilk(tile, P, kind) {
  const box = document.createElement('div'); box.className = 'silk-css';
  const n = kind === 'full' ? 3 : 1;
  const from = ['translate(-60%,-50%) rotate(-12deg) scale(1.4)', 'translate(65%,-30%) scaleX(-1) rotate(10deg) scale(1.3)', 'translate(10%,70%) scaleY(-1) rotate(-6deg) scale(1.5)'];
  for (let i = 0; i < n; i++) {
    const l = document.createElement('div'); l.className = 'silk-css-l'; box.appendChild(l);
    l.animate([{ transform: from[i], filter: 'blur(10px)', opacity: i ? 0.8 : 1 }, { transform: 'none', filter: 'blur(0)', opacity: i ? 0 : 1 }],
      { delay: P.flyIn[0] * 1000, duration: Math.max(1, (P.gather[1] - P.flyIn[0]) * 1000), easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'both' });
  }
  document.body.appendChild(box);
  const ins = `inset(${tile.y}px ${innerWidth - tile.x - tile.w}px ${innerHeight - tile.y - tile.h}px ${tile.x}px round ${tile.r}px)`;
  const a = box.animate([{ clipPath: 'inset(0 round 0px)' }, { clipPath: ins }], { delay: P.gather[0] * 1000, duration: Math.max(1, (P.gather[1] - P.gather[0]) * 1000), easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' });
  await a.finished.catch(() => {});
  box.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished.then(() => box.remove());
}

/** Tippen auf die 501-Kachel: kurzer Lichtblitz, dann dehnt sich der Stoff aus der Kachel auf Vollbild und blendet in den
    nächsten Screen über (~0,6 s). done() schaltet wie bisher um. */
export async function heroLeave(hero, done, { still = false } = {}) {
  if (busy) return;
  if (reduced() || still || !hero) { done(); return; }
  const img = await loadSilk().catch(() => null);
  const gl = img && createSilkGL(img);
  if (!gl) { done(); return; }
  busy = true;
  sweep(220);
  const R = hero.getBoundingClientRect();
  const tile = { x: R.left, y: R.top, w: R.width, h: R.height, r: parseFloat(getComputedStyle(hero).borderTopLeftRadius) || 0 };
  const full = { x: 0, y: 0, w: innerWidth, h: innerHeight, r: 0 };
  gl.canvas.classList.add('leave');
  document.body.appendChild(gl.canvas);
  const D = TUNE.leave, t0 = performance.now();
  await new Promise((ok) => {
    const step = (now) => {
      const t = (now - t0) / 1000, k = ease.in(Math.min(1, t / D.dur));
      gl.draw({ time: t * 2, rect: lerpRect(tile, full, k), dist: D.distort * Math.sin(Math.PI * Math.min(1, t / D.dur)), blur: TUNE.distort.blur * k,
        vig: 1 - k, flash: Math.max(0, 0.35 - t * 3) });
      if (t >= D.dur) { ok(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  done();
  gl.canvas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D.fade * 1000, easing: 'ease-out', fill: 'forwards' }).finished.then(() => { gl.destroy(); busy = false; });
}
