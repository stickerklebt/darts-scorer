/* Die einzelnen Animationen. Jede baut sich in `el` auf; Stil in css/fx.css.
   ctx = { score, name, finish, label } */
import { add, at, shake, particles, rand, pick, MAGIC } from './fx-core.js';
import { egg, toast, toaster, bacon, teacup, setSquare, balloon, hand, camera, nukeRocket, chestBase, chestLid, bigFish, fist, dartBig, target, rays, boom, star, frost } from './fx-art.js';
import { trophy as trophy_, cornerOrnament, magicCorner, COLORS } from './svg.js';
import { esc } from './common.js';

const W = () => window.innerWidth, H = () => window.innerHeight;
/** Großer Titel: Zahl + Zeile darunter */
function title(el, big, sub, cls = '') {
  return add(el, `<div class="fx-big">${esc(big)}</div>${sub ? `<div class="fx-sub">${sub}</div>` : ''}`, `fx-title ${cls}`);
}
const who = (ctx) => (ctx.name ? `<span class="fx-who">${esc(ctx.name)}</span>` : '');

/* ======================= Aufnahmen ======================= */

/** genau 26 – English Breakfast (4 s): Toaster springt zweimal, Eier-Wellen, Speck brutzelt, Tee dampft, Stempel */
export function breakfast(el, ctx) {
  add(el, '', 'fx-bg bg-breakfast');
  add(el, toaster(), 'bf-toaster');
  add(el, toast(), 'bf-toast t1'); add(el, toast(), 'bf-toast t2');
  for (let i = 0; i < 12; i++) {
    const n = add(el, egg(), 'bf-egg');
    const ltr = i % 2 === 0;
    n.style.cssText = `--y0:${rand(8, 60)}vh;--y1:${rand(5, 55)}vh;--x0:${ltr ? -30 : 110}vw;--x1:${ltr ? 110 : -30}vw;--r:${ltr ? 540 : -540}deg;animation-delay:${i * 260}ms;--s:${rand(0.7, 1.2)}`;
  }
  add(el, bacon(), 'bf-bacon'); add(el, bacon(), 'bf-bacon b2');
  add(el, teacup(), 'bf-cup');
  title(el, String(ctx.score), `English Breakfast!${who(ctx)}`, 'tilt');
  at(2300, () => add(el, '<b>Serviert!</b>', 'fx-stamp'));
  const p = particles(el);
  p.every((ps) => { if (Math.random() < 0.4) ps.add({ x: W() * 0.18 + rand(-30, 30), y: H() * 0.86, vy: -rand(60, 120), vx: rand(-15, 15), shape: 'circle', size: rand(3, 6), color: 'rgba(255,255,255,.6)', life: 900, grow: 6 }); }, 0, 3600);
}

/** genau 60 – Geodreieck / Mathelehrer (4 s) */
export function triangle(el, ctx) {
  add(el, '', 'fx-bg bg-chalk');
  add(el, setSquare(), 'tri-square');
  add(el, '<b>60°</b><small>exakt!</small>', 'tri-bubble');
  add(el, '<span>a² + b² = 60</span><span>∠α = 60°</span><span>⇒ Treffer</span><span>q.e.d.</span>', 'tri-chalk');
  title(el, String(ctx.score), `Sehr gut, setzen!${who(ctx)}`, 'chalk');
  at(2400, () => add(el, '<b>1+</b><small>mit Sternchen</small>', 'fx-stamp grade'));
  const p = particles(el);
  const wave = () => p.burst(40, () => ({ x: rand(0, W()), y: rand(-H() * 0.4, 0), vx: rand(-40, 40), vy: rand(80, 240), ay: 260, vr: rand(-6, 6), rot: rand(0, 6), shape: 'tri', size: rand(8, 16), color: pick(['#ffd23f', '#2f6fe4', '#e5402c', '#f3e9d2', '#1f9a4c']), life: 1900, fade: false }));
  wave(); at(1400, wave); at(2700, wave);
}

/** 100–120: Konfetti (4 s) – drei Kanonensalven, Regen, Schlussbukett */
export function confetti(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  title(el, String(ctx.score), `Ton!${who(ctx)}`, 'pop');
  const p = particles(el);
  const cannon = (x, dir, n = 110) => p.burst(n, () => ({ x, y: H() + 10, vx: dir * rand(120, 560), vy: -rand(620, 1080), ay: 700, drag: 1.1, vr: rand(-12, 12), rot: rand(0, 6), size: rand(8, 15), color: pick(MAGIC), life: 2400, fade: false }));
  const rain = () => p.burst(80, () => ({ x: rand(0, W()), y: -20, vx: rand(-40, 40), vy: rand(60, 200), ay: 160, drag: .6, vr: rand(-8, 8), size: rand(7, 13), color: pick(MAGIC), life: 2200, fade: false }));
  cannon(0, 1); cannon(W(), -1);
  at(500, rain);
  at(1300, () => { cannon(0, 1, 80); cannon(W(), -1, 80); });
  at(2200, () => { cannon(W() / 2, 0.4, 70); cannon(W() / 2, -0.4, 70); rain(); });
}

/** 100–120: Ballons (4 s) – zwei Schwärme, einer platzt */
export function balloons(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  const cols = ['#e5402c', '#2f6fe4', '#ffd23f', '#8b5cf6', '#1f9a4c', '#f3e9d2', '#e3ae2b'];
  for (let i = 0; i < 22; i++) {
    const n = add(el, balloon(cols[i % cols.length]), 'bl-b');
    n.style.cssText = `left:${((i % 11) / 11) * 100 + rand(-3, 3)}%;--s:${rand(0.7, 1.25)};--sw:${rand(-14, 14)}px;animation-delay:${(i < 11 ? 0 : 1300) + rand(0, 500)}ms;animation-duration:${rand(2300, 2800)}ms`;
  }
  title(el, String(ctx.score), `Hoch hinaus!${who(ctx)}`, 'pop');
  at(1900, () => { add(el, '<b>PENG!</b>', 'fx-pow'); shake(6, 200); });
}

/** 100–120: Applaus (4 s) – Hände, dann Bravo-Rufe und Rosen */
export function clap(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  const spots = [[14, 22, -14], [76, 18, 12], [10, 70, 10], [80, 68, -10], [46, 84, 0]];
  spots.forEach(([x, y, r], i) => {
    const n = add(el, `<div class="cl-l">${hand(false)}</div><div class="cl-r">${hand(true)}</div><b class="cl-word">CLAP!</b>`, 'cl-pair');
    n.style.cssText = `left:${x}%;top:${y}%;--r:${r}deg;--d:${i * 90}ms`;
  });
  title(el, String(ctx.score), `Applaus!${who(ctx)}`, 'pop');
  at(1800, () => ['BRAVO!', 'ZUGABE!', 'BRAVO!'].forEach((w, i) => { const b = add(el, `<b>${w}</b>`, 'fx-pow small'); b.style.cssText = `left:${15 + i * 30}%;top:${30 + (i % 2) * 34}%;animation-delay:${i * 220}ms`; }));
  const p = particles(el);
  at(2100, () => p.burst(26, () => ({ x: rand(0, W()), y: -20, vx: rand(-30, 30), vy: rand(150, 300), ay: 300, vr: rand(-5, 5), shape: 'spark', size: rand(8, 13), color: pick(['#e5402c', '#ffd23f']), life: 1800, fade: false })));
}

/** 100–120: Paparazzi (4 s) – Blitzlichtgewitter, Steigerung, Titelbild */
export function paparazzi(el, ctx) {
  add(el, '', 'fx-bg bg-dark');
  add(el, Array.from({ length: 7 }, (_, i) => `<div class="pz-p" style="--i:${i}"><i class="pz-head"></i><i class="pz-body"></i><div class="pz-cam">${camera(false)}</div></div>`).join(''), 'pz-row');
  title(el, String(ctx.score), `Bitte lächeln!${who(ctx)}`, 'pop');
  const flashAt = [];
  for (let t = 150; t < 3500; t += t < 1500 ? rand(150, 260) : rand(70, 140)) flashAt.push(t);
  flashAt.forEach((t, k) => at(t, () => {
    const f = add(el, '', 'pz-flash');
    f.style.cssText = `left:${rand(8, 92)}%;top:${rand(50, 88)}%`;
    if (k % 4 === 0) { const w = add(el, '', 'fx-white quick'); setTimeout(() => w.remove(), 260); }
    setTimeout(() => f.remove(), 320);
  }));
  at(2600, () => add(el, '<b>TITELSEITE!</b>', 'fx-stamp'));
}

/** 100–120: Feuerwerk (4 s) */
export function fireworks(el, ctx) {
  add(el, '', 'fx-bg bg-night');
  title(el, String(ctx.score), `Feuerwerk!${who(ctx)}`, 'pop');
  const p = particles(el);
  const rocket = (x, delay, color, big = false) => at(delay, () => {
    const y = rand(H() * 0.12, H() * 0.42), t = 520;
    p.add({ x, y: H(), vx: 0, vy: -(H() - y) / (t / 1000), shape: 'circle', size: 3, color: '#fff3c0', life: t, fade: false });
    at(t, () => {
      const n = big ? 120 : 70;
      p.burst(n, (i) => { const a = (i / n) * 6.283, v = rand(140, big ? 420 : 330); return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 120, drag: 1.4, shape: 'circle', size: rand(2, 3.6), color, life: 1400 }; });
      p.burst(16, () => ({ x, y, vx: rand(-80, 80), vy: rand(-80, 80), shape: 'spark', size: rand(6, 10), color: '#fff', life: 600 }));
    });
  });
  [[0.2, 0], [0.75, 220], [0.48, 420], [0.3, 760], [0.68, 940], [0.52, 1180], [0.15, 1500], [0.85, 1650], [0.4, 1900], [0.6, 2050]].forEach(([fx, d], i) => rocket(W() * fx, d, MAGIC[i % MAGIC.length]));
  [0.25, 0.5, 0.75].forEach((fx, i) => rocket(W() * fx, 2500 + i * 120, '#ffd23f', true));
}

/** 121–179: Bass-Drop (5 s) – Aufbau, Drop, Nachbeben */
export function bassdrop(el, ctx) {
  add(el, '', 'fx-bg bg-violet');
  add(el, Array.from({ length: 18 }, (_, i) => `<i style="--i:${i};--h:${rand(30, 100)}%"></i>`).join(''), 'bd-eq');
  const t = title(el, String(ctx.score), `Drop!${who(ctx)}`, 'bd');
  const beats = [300, 800, 1300, 1700, 2000, 2250, 2450, 2600, 2700, 2800, 3300, 3800, 4300];
  beats.forEach((b, i) => at(b, () => {
    const big = b === 2800;
    shake(big ? 34 : i > 5 ? 16 : 10, big ? 600 : 260);
    const r = add(el, '', 'bd-ring'); setTimeout(() => r.remove(), 700);
    t.classList.remove('beat'); void t.offsetWidth; t.classList.add('beat');
    el.classList.toggle('inv', i % 2 === 0);
    if (big) { const w = add(el, '', 'fx-white'); setTimeout(() => w.remove(), 600); add(el, '<b>WUMMS!</b>', 'fx-pow'); }
  }));
  at(4500, () => el.classList.remove('inv'));
}

/** 121–179: Bildschirm zersplittert (5 s) – zwei Einschläge, Bruch, Splitterregen */
export function shatter(el, ctx) {
  const crackSet = (cx, cy, n = 14) => {
    let c = '';
    for (let i = 0; i < n; i++) {
      let x = cx, y = cy, d = `M${x} ${y}`;
      const a0 = (i / n) * 6.283 + rand(-0.15, 0.15);
      for (let k = 0; k < 7; k++) { const a = a0 + rand(-0.35, 0.35), l = rand(50, 120); x += Math.cos(a) * l; y += Math.sin(a) * l; d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; }
      c += `<path d="${d}"/>`;
    }
    for (let r = 1; r < 4; r++) { let d = ''; for (let i = 0; i <= 14; i++) { const a = (i / 14) * 6.283, rr = r * 70 + rand(-14, 14); d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(0)} ${(cy + Math.sin(a) * rr).toFixed(0)}`; } c += `<path d="${d}"/>`; }
    return c;
  };
  const hit = (cx, cy) => {
    const c = crackSet(cx, cy);
    add(el, `<svg viewBox="0 0 ${W()} ${H()}" preserveAspectRatio="none"><g fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="bevel">${c}</g><g fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1" transform="translate(1.5 1.5)">${c}</g></svg>`, 'sh-cracks');
    add(el, '', 'sh-impact').style.cssText = `left:${cx}px;top:${cy}px`;
    shake(16, 300);
  };
  add(el, '', 'fx-glass');
  hit(W() * 0.35, H() * 0.38);
  at(1300, () => hit(W() * 0.66, H() * 0.58));
  at(2200, () => {
    el.classList.add('broken');
    shake(14, 400);
    const p = particles(el);
    p.burst(140, () => { const a = rand(0, 6.283), v = rand(80, 420); return { x: rand(0, W()), y: rand(0, H() * 0.8), vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v * 0.4 - 120, ay: 1300, vr: rand(-8, 8), rot: rand(0, 6), shape: 'shard', size: rand(10, 34), color: 'rgba(220,236,255,.45)', life: 2400, fade: false }; });
    title(el, String(ctx.score), `Glasklar!${who(ctx)}`, 'pop');
  });
}

/** 121–179: Blendeffekt (5 s) – zwei Lichtdurchgänge, Glanz auf dem Titel */
export function flare(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  const ghosts = [[0.12, 70, '#2f6fe4'], [0.28, 26, '#ffd23f'], [0.42, 46, '#e5402c'], [0.6, 18, '#8b5cf6'], [0.74, 88, '#1f9a4c'], [0.9, 34, '#ffd23f']]
    .map(([t, s, c]) => `<i class="fl-g" style="--t:${t};--s:${s}px;--c:${c}"></i>`).join('');
  add(el, `<i class="fl-sun"></i><i class="fl-streak"></i>${ghosts}`, 'fl-line');
  at(2300, () => add(el, `<i class="fl-sun"></i><i class="fl-streak"></i>${ghosts}`, 'fl-line rev'));
  title(el, String(ctx.score), `Geblendet!${who(ctx)}`, 'glow shine');
}

/** 121–179: Greller Lichtblitz (5 s) – drei Blitze, Einbrennen, Nachglühen */
export function flash(el, ctx) {
  add(el, '', 'fl-white');
  add(el, rays(24, 'rgba(255,255,255,.55)'), 'fl-rays');
  title(el, String(ctx.score), `Blitzlicht!${who(ctx)}`, 'burnin');
  shake(8, 260);
  [1700, 2900, 3300].forEach((t) => at(t, () => { const w = add(el, '', 'fx-white quick'); setTimeout(() => w.remove(), 300); shake(6, 200); }));
}

/** 121–179: Einfrieren (5 s) – Eis wächst, knackt, Faust, Splitter, Auftauen */
export function freeze(el, ctx) {
  add(el, frost(), 'fz-ice');
  add(el, '<b>❄</b>', 'fz-label');
  [900, 1500, 2000].forEach((t) => at(t, () => shake(4, 160)));
  add(el, fist(), 'fz-fist');
  at(2550, () => {
    shake(24, 480);
    el.classList.add('smash');
    const p = particles(el);
    p.burst(150, () => { const a = rand(0, 6.283), v = rand(200, 800); return { x: W() / 2 + rand(-40, 40), y: H() * 0.6 + rand(-40, 40), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, ay: 1200, vr: rand(-10, 10), rot: rand(0, 6), shape: 'shard', size: rand(8, 26), color: pick(['rgba(190,235,255,.85)', 'rgba(255,255,255,.9)', 'rgba(120,200,255,.7)']), life: 1900, fade: false }; });
    title(el, String(ctx.score), `Eiskalt!${who(ctx)}`, 'pop');
    add(el, '<b>KRACH!</b>', 'fx-pow');
  });
}

/** 180 (7 s): Dunkel, Lichtkegel, Funken, Wackeln – dann steigt ein riesiger Pokal auf, Strahlen, Goldregen, „180“ */
export function trophy(el, ctx) {
  add(el, '', 'lb-black');
  add(el, '<i class="sp l"></i><i class="sp r"></i>', 'tr-spots');
  const raysEl = add(el, rays(32, 'rgba(255,210,63,.26)'), 'lb-rays');
  add(el, '', 'tr-glow');
  const cup = add(el, `<div class="tr-cup-in">${trophy_()}</div><i class="tr-shine"></i>`, 'tr-cup');
  add(el, '', 'tr-plinth');
  const p = particles(el);
  // Funken sammeln sich in der Mitte
  p.every((ps, t) => {
    const cx = W() / 2, cy = H() * 0.48;
    for (let i = 0; i < (t < 1600 ? 2 : 4); i++) {
      const a = rand(0, 6.283), r = rand(Math.min(W(), H()) * 0.35, Math.max(W(), H()) * 0.6);
      ps.add({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.5, vy: -Math.sin(a) * r * 1.5, shape: Math.random() < 0.35 ? 'spark' : 'circle', size: rand(2, 5), color: pick(['#ffd23f', '#f7d46a', '#f3e9d2']), life: 640 });
    }
  }, 500, 2600);
  [700, 1100, 1450, 1750, 2000, 2200, 2400, 2550].forEach((t, i) => at(t, () => shake(2 + i * 2.4, 220)));
  at(2650, () => {
    el.classList.add('burst');
    raysEl.classList.add('gold');
    shake(28, 700);
    const w = add(el, '', 'fx-white long'); setTimeout(() => w.remove(), 1100);
    cup.classList.add('rise');
    const cx = W() / 2, cy = H() * 0.5;
    p.burst(180, () => { const a = rand(0, 6.283), v = rand(200, 950); return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, ay: 500, drag: 1.2, shape: pick(['spark', 'circle', 'streak']), rot: a, size: rand(3, 9), color: pick(['#ffd23f', '#fff3c0', '#ffffff', '#e3ae2b', '#e5402c']), life: 2000 }; });
  });
  at(3300, () => {
    add(el, `<div class="fx-big">180</div><div class="fx-sub">Maximum!${who(ctx)}</div>`, 'fx-title lb-title');
    p.every((ps) => { ps.add({ x: rand(0, W()), y: -10, vx: rand(-30, 30), vy: rand(120, 260), ay: 60, vr: rand(-6, 6), shape: pick(['spark', 'rect', 'rect']), size: rand(5, 12), color: pick(['#ffd23f', '#f7d46a', '#fff3c0', '#e5402c', '#2f6fe4', '#f3e9d2']), life: 2600, fade: false }); }, 3300, 6800);
  });
  at(4200, () => { cup.classList.add('gleam'); shake(6, 200); });
  [['tl', 3500], ['tr', 3600], ['bl', 3700], ['br', 3800]].forEach(([c, t]) => at(t, () => add(el, cornerOrnament(), `tr-corner ${c}`)));
}

/* ======================= Finishes (nur X01) ======================= */

/** 2–60 (2 s): Pfeil fliegt ins Feld, steckt, Ring, Stempel */
export function arrow(el, ctx) {
  add(el, '', 'fx-bg bg-dim light');
  add(el, `<div class="ar-target">${target()}</div><div class="ar-dart">${dartBig()}</div><i class="ar-ring"></i>`, 'ar-wrap');
  add(el, `<div class="fx-sub">Checkout ${ctx.score}${who(ctx)}</div>`, 'fx-title small');
  at(700, () => shake(5, 160));
}

/** 61–99 (4 s): Kameras in Wellen, Blitze, KLICK! KLICK! */
export function klick(el, ctx) {
  add(el, '', 'fx-bg bg-dark');
  const spots = [[6, 10, -12], [70, 6, 10], [2, 60, 8], [76, 58, -8], [36, 74, 4], [40, 2, -4], [18, 36, 6], [60, 34, -6]];
  spots.forEach(([x, y, r], i) => {
    const n = add(el, camera(true), 'kl-cam');
    n.style.cssText = `left:${x}%;top:${y}%;--r:${r}deg;animation-delay:${i * 90 + (i > 5 ? 900 : 0)}ms`;
    [380 + i * 190, 1900 + i * 140, 2900 + i * 90].forEach((t) => at(t, () => { n.classList.remove('fire'); void n.offsetWidth; n.classList.add('fire'); if (i % 2 === 0) { const w = add(el, '', 'fx-white quick'); setTimeout(() => w.remove(), 220); } }));
  });
  add(el, '<b>KLICK!</b><b>KLICK!</b>', 'kl-word');
  add(el, `<div class="fx-big">${ctx.score}</div><div class="fx-sub">Checkout${who(ctx)}</div>`, 'fx-title kl-title');
}

/** 100–167 (5 s): Atomrakete, Explosion, Druckwellen, Pilzwolke */
export function nuke(el, ctx) {
  add(el, '', 'fx-bg bg-dark');
  add(el, nukeRocket(), 'nk-rocket');
  const p = particles(el);
  p.every((ps, t) => {
    const k = Math.min(1, t / 1600), x = -0.15 * W() + k * 0.65 * W(), y = H() * (0.1 + k * 0.4);
    ps.add({ x: x - 60, y: y + rand(-6, 6), vx: -rand(40, 120), vy: rand(-20, 20), shape: 'circle', size: rand(6, 14), grow: 20, color: pick(['rgba(200,200,200,.5)', 'rgba(255,180,60,.6)']), life: 700 });
  }, 0, 1600);
  at(1650, () => {
    el.classList.add('exploded');
    shake(30, 1000);
    add(el, boom(), 'nk-boom');
    add(el, '', 'nk-wave'); add(el, '', 'nk-wave w2'); add(el, '', 'nk-wave w3');
    const w = add(el, '', 'fx-white'); setTimeout(() => w.remove(), 600);
    const cx = W() / 2, cy = H() * 0.5;
    p.burst(160, () => { const a = rand(0, 6.283), v = rand(150, 820); return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2, ay: 80, shape: 'circle', size: rand(5, 18), grow: -4, color: pick(['#ffd23f', '#ff7a3d', '#e5402c', '#fff3c0', '#5c5c5c']), life: 1700 }; });
    add(el, `<div class="fx-big">${ctx.score}</div><div class="fx-sub">Boom! Checkout${who(ctx)}</div>`, 'fx-title nk-title');
  });
  at(2500, () => add(el, '<i class="cap"></i><i class="stem"></i>', 'nk-mush'));
  at(3300, () => shake(10, 500));
}

/** 170 (8 s): Wasser, Riesenfisch, Sprung, Platsch, Flutwelle, Ablaufen */
export function bigfish(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  const wave = (c, o) => `<svg viewBox="0 0 1200 60" preserveAspectRatio="none" style="opacity:${o}"><path d="M0 30 Q75 0 150 30 T300 30 T450 30 T600 30 T750 30 T900 30 T1050 30 T1200 30 V60 H0 Z" fill="${c}"/></svg>`;
  add(el, `<div class="bf-waves"><div class="wv w1">${wave('#2f6fe4', 1)}</div><div class="wv w2">${wave('#6c9cf0', 0.85)}</div></div><div class="bf-body"></div>`, 'bf-water');
  add(el, bigFish(), 'bf-fish');
  add(el, `<div class="fx-big">170</div><div class="fx-sub">Big Fish!${who(ctx)}</div>`, 'fx-title bf-title');
  const p = particles(el);
  at(5000, () => {
    shake(32, 800);
    const cx = W() * 0.3, cy = H() * 0.66;
    p.burst(200, () => { const a = rand(-3.0, -0.14), v = rand(300, 1150); return { x: cx + rand(-60, 60), y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 1500, shape: 'drop', rot: 0, size: rand(5, 14), color: pick(['#cfe0ff', '#6c9cf0', '#ffffff', '#2f6fe4']), life: 1700, fade: false }; });
    add(el, '<b>PLATSCH!</b>', 'bf-splash');
  });
  p.every((ps) => { if (Math.random() < 0.5) ps.add({ x: rand(0, W()), y: H() * rand(0.7, 1), vy: -rand(30, 90), vx: rand(-10, 10), shape: 'ring', size: rand(3, 8), color: 'rgba(255,255,255,.7)', life: 900 }); }, 400, 7000);
}
