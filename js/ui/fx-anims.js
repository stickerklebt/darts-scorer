/* Die einzelnen Animationen. Jede baut sich in `el` auf; Stil in css/fx.css.
   ctx = { score, name, finish, label } */
import { add, at, shake, particles, rand, pick, MAGIC } from './fx-core.js';
import { egg, toast, toaster, bacon, teacup, setSquare, balloon, hand, camera, nukeRocket, chestBase, chestLid, bigFish, fist, dartBig, target, rays, boom, star, frost } from './fx-art.js';
import { trophy, magicCorner, COLORS } from './svg.js';
import { esc } from './common.js';

const W = () => window.innerWidth, H = () => window.innerHeight;
/** Großer Titel: Zahl + Zeile darunter */
function title(el, big, sub, cls = '') {
  return add(el, `<div class="fx-big">${esc(big)}</div>${sub ? `<div class="fx-sub">${sub}</div>` : ''}`, `fx-title ${cls}`);
}
const who = (ctx) => (ctx.name ? `<span class="fx-who">${esc(ctx.name)}</span>` : '');

/* ======================= Aufnahmen ======================= */

/** genau 26 – English Breakfast */
export function breakfast(el, ctx) {
  add(el, '', 'fx-bg bg-breakfast');
  add(el, toaster(), 'bf-toaster');
  add(el, toast(), 'bf-toast t1'); add(el, toast(), 'bf-toast t2');
  for (let i = 0; i < 5; i++) {
    const n = add(el, egg(), 'bf-egg');
    const ltr = i % 2 === 0;
    n.style.cssText = `--y0:${rand(10, 60)}vh;--y1:${rand(5, 55)}vh;--x0:${ltr ? -30 : 110}vw;--x1:${ltr ? 110 : -30}vw;--r:${ltr ? 540 : -540}deg;animation-delay:${i * 120}ms;--s:${rand(0.7, 1.2)}`;
  }
  add(el, bacon(), 'bf-bacon');
  add(el, teacup(), 'bf-cup');
  title(el, String(ctx.score), `English Breakfast!${who(ctx)}`, 'tilt');
  const p = particles(el);
  p.every((ps) => { if (Math.random() < 0.4) ps.add({ x: W() * 0.18 + rand(-30, 30), y: H() * 0.86, vy: -rand(60, 120), vx: rand(-15, 15), shape: 'circle', size: rand(3, 6), color: 'rgba(255,255,255,.6)', life: 900, grow: 6 }); }, 0, 1400);
}

/** genau 60 – Dreieck / Mathelehrer */
export function triangle(el, ctx) {
  add(el, '', 'fx-bg bg-chalk');
  add(el, setSquare(), 'tri-square');
  add(el, '<b>60°</b><small>exakt!</small>', 'tri-bubble');
  add(el, '<span>a² + b² = 60</span><span>∠ = 60°</span><span>q.e.d.</span>', 'tri-chalk');
  title(el, String(ctx.score), `Sehr gut, setzen!${who(ctx)}`, 'chalk');
  const p = particles(el);
  p.burst(46, () => ({ x: rand(0, W()), y: rand(-H() * 0.4, 0), vx: rand(-40, 40), vy: rand(80, 240), ay: 260, vr: rand(-6, 6), rot: rand(0, 6), shape: 'tri', size: rand(8, 16), color: pick(['#ffd45c', '#52e4ff', '#ff4fb3', '#f3efe2', '#7dff9b']), life: 1600, fade: false }));
}

/** 100–120: Konfetti */
export function confetti(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  title(el, String(ctx.score), `Ton!${who(ctx)}`, 'pop');
  const p = particles(el);
  const cannon = (x, dir) => p.burst(110, () => ({ x, y: H() + 10, vx: dir * rand(120, 560), vy: -rand(620, 1080), ay: 700, drag: 1.1, vr: rand(-12, 12), rot: rand(0, 6), size: rand(8, 15), color: pick(MAGIC.concat(['#f3efe2', COLORS.red])), life: 2000, fade: false }));
  cannon(0, 1); cannon(W(), -1);
  at(450, () => p.burst(70, () => ({ x: rand(0, W()), y: -20, vx: rand(-40, 40), vy: rand(60, 200), ay: 160, drag: .6, vr: rand(-8, 8), size: rand(7, 13), color: pick(MAGIC), life: 1600, fade: false })));
}

/** 100–120: Ballons */
export function balloons(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  const cols = ['#ff4fb3', '#52e4ff', '#ffd45c', '#a66bff', '#7dff9b', COLORS.red, '#ff7a3d'];
  for (let i = 0; i < 13; i++) {
    const n = add(el, balloon(cols[i % cols.length]), 'bl-b');
    n.style.cssText = `left:${(i / 13) * 100 + rand(-3, 3)}%;--s:${rand(0.7, 1.25)};--sw:${rand(-14, 14)}px;animation-delay:${rand(0, 450)}ms;animation-duration:${rand(1500, 2000)}ms`;
  }
  title(el, String(ctx.score), `Hoch hinaus!${who(ctx)}`, 'pop');
}

/** 100–120: Klatschende Hände */
export function clap(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  const spots = [[14, 22, -14], [76, 18, 12], [10, 70, 10], [80, 68, -10], [46, 84, 0]];
  spots.forEach(([x, y, r], i) => {
    const n = add(el, `<div class="cl-l">${hand(false)}</div><div class="cl-r">${hand(true)}</div><b class="cl-word">CLAP!</b>`, 'cl-pair');
    n.style.cssText = `left:${x}%;top:${y}%;--r:${r}deg;--d:${i * 90}ms`;
  });
  title(el, String(ctx.score), `Applaus!${who(ctx)}`, 'pop');
}

/** 100–120: Paparazzi */
export function paparazzi(el, ctx) {
  add(el, '', 'fx-bg bg-dark');
  const row = add(el, Array.from({ length: 7 }, (_, i) => `<div class="pz-p" style="--i:${i}"><i class="pz-head"></i><i class="pz-body"></i><div class="pz-cam">${camera(false)}</div></div>`).join(''), 'pz-row');
  title(el, String(ctx.score), `Bitte lächeln!${who(ctx)}`, 'pop');
  const flashAt = [150, 330, 460, 640, 780, 930, 1080, 1230, 1380, 1520, 1650];
  flashAt.forEach((t, k) => at(t, () => {
    const f = add(el, '', 'pz-flash');
    f.style.cssText = `left:${rand(8, 92)}%;top:${rand(55, 85)}%`;
    if (k % 3 === 0) { const w = add(el, '', 'fx-white quick'); setTimeout(() => w.remove(), 260); }
    setTimeout(() => f.remove(), 320);
  }));
  return { row };
}

/** 100–120: Feuerwerk */
export function fireworks(el, ctx) {
  add(el, '', 'fx-bg bg-night');
  title(el, String(ctx.score), `Feuerwerk!${who(ctx)}`, 'pop');
  const p = particles(el);
  const rocket = (x, delay, color) => at(delay, () => {
    const y = rand(H() * 0.12, H() * 0.42), t = 520;
    p.add({ x, y: H(), vx: 0, vy: -(H() - y) / (t / 1000), shape: 'circle', size: 3, color: '#fff3c0', life: t, fade: false });
    at(t, () => {
      p.burst(70, (i) => { const a = (i / 70) * 6.283, v = rand(140, 330); return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 120, drag: 1.4, shape: 'circle', size: rand(2, 3.6), color, life: 1300 }; });
      p.burst(16, () => ({ x, y, vx: rand(-80, 80), vy: rand(-80, 80), shape: 'spark', size: rand(6, 10), color: '#fff', life: 600 }));
    });
  });
  [[0.2, 0], [0.75, 220], [0.48, 420], [0.3, 760], [0.68, 940], [0.52, 1180]].forEach(([fx, d], i) => rocket(W() * fx, d, MAGIC[i % MAGIC.length]));
}

/** 121–179: Bass-Drop – alles bebt im Takt */
export function bassdrop(el, ctx) {
  add(el, '', 'fx-bg bg-violet');
  add(el, Array.from({ length: 18 }, (_, i) => `<i style="--i:${i};--h:${rand(30, 100)}%"></i>`).join(''), 'bd-eq');
  const t = title(el, String(ctx.score), `Drop!${who(ctx)}`, 'bd');
  const beats = [250, 650, 1050, 1450, 1650, 1850, 2050];
  beats.forEach((b, i) => at(b, () => {
    shake(i > 3 ? 18 : 12, 260);
    const r = add(el, '', 'bd-ring'); setTimeout(() => r.remove(), 700);
    t.classList.remove('beat'); void t.offsetWidth; t.classList.add('beat');
    el.classList.toggle('inv', i % 2 === 0);
  }));
  at(2250, () => el.classList.remove('inv'));
}

/** 121–179: Bildschirm zersplittert */
export function shatter(el, ctx) {
  const cx = W() / 2 + rand(-40, 40), cy = H() * 0.45;
  let cracks = '';
  for (let i = 0; i < 14; i++) {
    let x = cx, y = cy, d = `M${x} ${y}`;
    const a0 = (i / 14) * 6.283 + rand(-0.15, 0.15);
    for (let k = 0; k < 7; k++) { const a = a0 + rand(-0.35, 0.35), l = rand(50, 120); x += Math.cos(a) * l; y += Math.sin(a) * l; d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; }
    cracks += `<path d="${d}"/>`;
  }
  for (let r = 1; r < 4; r++) {
    let d = '';
    for (let i = 0; i <= 14; i++) { const a = (i / 14) * 6.283, rr = r * 70 + rand(-14, 14); d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(0)} ${(cy + Math.sin(a) * rr).toFixed(0)}`; }
    cracks += `<path d="${d}"/>`;
  }
  add(el, '', 'fx-glass');
  add(el, `<svg viewBox="0 0 ${W()} ${H()}" preserveAspectRatio="none"><g fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="bevel">${cracks}</g><g fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1" transform="translate(1.5 1.5)">${cracks}</g></svg>`, 'sh-cracks');
  add(el, '', 'sh-impact').style.cssText = `left:${cx}px;top:${cy}px`;
  shake(16, 300);
  at(900, () => {
    el.classList.add('broken');
    shake(10, 300);
    const p = particles(el);
    p.burst(90, () => { const a = rand(0, 6.283), v = rand(80, 420); return { x: cx + rand(-120, 120), y: cy + rand(-160, 160), vx: Math.cos(a) * v * 0.6, vy: Math.sin(a) * v * 0.4 - 120, ay: 1300, vr: rand(-8, 8), rot: rand(0, 6), shape: 'shard', size: rand(10, 34), color: 'rgba(200,236,255,.42)', life: 1900, fade: false }; });
    title(el, String(ctx.score), `Glasklar!${who(ctx)}`, 'pop');
  });
}

/** 121–179: Blendeffekt / Lens-Flare */
export function flare(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  const ghosts = [[0.12, 70, '#52e4ff'], [0.28, 26, '#ffd45c'], [0.42, 46, '#ff4fb3'], [0.6, 18, '#a66bff'], [0.74, 88, '#7dff9b'], [0.9, 34, '#ffd45c']]
    .map(([t, s, c]) => `<i class="fl-g" style="--t:${t};--s:${s}px;--c:${c}"></i>`).join('');
  add(el, `<i class="fl-sun"></i><i class="fl-streak"></i>${ghosts}`, 'fl-line');
  title(el, String(ctx.score), `Geblendet!${who(ctx)}`, 'glow');
}

/** 121–179: Greller Lichtblitz */
export function flash(el, ctx) {
  add(el, '', 'fl-white');
  add(el, rays(24, 'rgba(255,255,255,.55)'), 'fl-rays');
  title(el, String(ctx.score), `Blitzlicht!${who(ctx)}`, 'burnin');
  shake(8, 260);
  at(1400, () => { const w = add(el, '', 'fx-white quick'); setTimeout(() => w.remove(), 300); shake(6, 200); });
}

/** 121–179: Einfrieren – Eis, Faust, Splitter */
export function freeze(el, ctx) {
  add(el, frost(), 'fz-ice');
  add(el, '<b>❄</b>', 'fz-label');
  add(el, fist(), 'fz-fist');
  at(1450, () => {
    shake(20, 420);
    el.classList.add('smash');
    const p = particles(el);
    p.burst(110, () => { const a = rand(0, 6.283), v = rand(200, 760); return { x: W() / 2 + rand(-40, 40), y: H() * 0.6 + rand(-40, 40), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, ay: 1200, vr: rand(-10, 10), rot: rand(0, 6), shape: 'shard', size: rand(8, 26), color: pick(['rgba(190,235,255,.85)', 'rgba(255,255,255,.9)', 'rgba(120,200,255,.7)']), life: 1500, fade: false }; });
    title(el, String(ctx.score), `Eiskalt!${who(ctx)}`, 'pop');
  });
}

/** 180: Lootbox – die ganz große Nummer */
export function lootbox(el, ctx) {
  add(el, '', 'lb-black');
  const raysEl = add(el, rays(28, 'rgba(255,255,255,.22)'), 'lb-rays');
  add(el, '', 'lb-glow');
  const chest = add(el, `<div class="lb-lid">${chestLid()}</div>${chestBase()}`, 'lb-chest');
  const cup = add(el, trophy(), 'lb-cup');
  const p = particles(el);
  const col = (t) => (t < 1300 ? '#52e4ff' : t < 1950 ? '#a66bff' : '#ffd45c');
  // Partikel saugen sich in die Truhe
  p.every((ps, t) => {
    const cx = W() / 2, cy = H() * 0.6;
    for (let i = 0; i < (t < 1950 ? 2 : 4); i++) {
      const a = rand(0, 6.283), r = rand(Math.min(W(), H()) * 0.35, Math.max(W(), H()) * 0.6);
      ps.add({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.6, shape: Math.random() < 0.3 ? 'spark' : 'circle', size: rand(2, 5), color: col(t), life: 600 });
    }
  }, 600, 2650);
  [800, 1150, 1500, 1800, 2100, 2300, 2450].forEach((t, i) => at(t, () => shake(3 + i * 2.2, 240)));
  at(700, () => chest.classList.add('charge'));
  at(2650, () => {
    chest.classList.add('open');
    el.classList.add('burst');
    raysEl.classList.add('gold');
    shake(26, 600);
    const w = add(el, '', 'fx-white long'); setTimeout(() => w.remove(), 1100);
    const cx = W() / 2, cy = H() * 0.6;
    p.burst(160, () => { const a = rand(0, 6.283), v = rand(200, 900); return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, ay: 500, drag: 1.2, shape: pick(['spark', 'circle', 'streak']), rot: a, size: rand(3, 9), color: pick(['#ffd45c', '#fff3c0', '#ffffff', '#ff7a3d', '#52e4ff']), life: 1800 }; });
    cup.classList.add('rise');
  });
  at(3200, () => {
    add(el, `<div class="fx-big">180</div><div class="fx-sub">Maximum!${who(ctx)}</div>`, 'fx-title lb-title');
    p.every((ps) => { ps.add({ x: rand(0, W()), y: -10, vx: rand(-30, 30), vy: rand(120, 260), ay: 60, vr: rand(-6, 6), shape: pick(['spark', 'rect']), size: rand(5, 11), color: pick(['#ffd45c', '#fff3c0', '#ff4fb3', '#52e4ff']), life: 2200, fade: false }); }, 3200, 5200);
  });
  [['tl', 3400], ['br', 3500]].forEach(([c, t]) => at(t, () => add(el, magicCorner(), `lb-magic ${c}`)));
}

/* ======================= Finishes (nur X01) ======================= */

/** 2–60: Pfeil fliegt ins Feld und steckt */
export function arrow(el, ctx) {
  add(el, '', 'fx-bg bg-dim light');
  add(el, `<div class="ar-target">${target()}</div><div class="ar-dart">${dartBig()}</div>`, 'ar-wrap');
  add(el, `<div class="fx-sub">Checkout ${ctx.score}${who(ctx)}</div>`, 'fx-title small');
}

/** 61–99: Kameras, Blitze, KLICK! KLICK! */
export function klick(el, ctx) {
  add(el, '', 'fx-bg bg-dark');
  const spots = [[6, 10, -12], [70, 6, 10], [2, 60, 8], [76, 58, -8], [36, 74, 4], [40, 2, -4]];
  spots.forEach(([x, y, r], i) => {
    const n = add(el, camera(true), 'kl-cam');
    n.style.cssText = `left:${x}%;top:${y}%;--r:${r}deg;animation-delay:${i * 70}ms`;
    at(380 + i * 190, () => { n.classList.add('fire'); const w = add(el, '', 'fx-white quick'); setTimeout(() => w.remove(), 220); });
  });
  add(el, '<b>KLICK!</b><b>KLICK!</b>', 'kl-word');
  add(el, `<div class="fx-big">${ctx.score}</div><div class="fx-sub">Checkout${who(ctx)}</div>`, 'fx-title kl-title');
}

/** 100–167: Atomrakete, Explosion, Druckwelle */
export function nuke(el, ctx) {
  add(el, '', 'fx-bg bg-dark');
  add(el, nukeRocket(), 'nk-rocket');
  const p = particles(el);
  p.every((ps, t) => {
    const k = Math.min(1, t / 900), x = -0.15 * W() + k * 0.65 * W(), y = H() * (0.1 + k * 0.4);
    ps.add({ x: x - 60, y: y + rand(-6, 6), vx: -rand(40, 120), vy: rand(-20, 20), shape: 'circle', size: rand(6, 14), grow: 20, color: pick(['rgba(200,200,200,.5)', 'rgba(255,180,60,.6)']), life: 700 });
  }, 0, 900);
  at(950, () => {
    el.classList.add('exploded');
    shake(28, 900);
    add(el, boom(), 'nk-boom');
    add(el, '', 'nk-wave'); add(el, '', 'nk-wave w2');
    const w = add(el, '', 'fx-white'); setTimeout(() => w.remove(), 600);
    const cx = W() / 2, cy = H() * 0.5;
    p.burst(140, () => { const a = rand(0, 6.283), v = rand(150, 800); return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2, ay: 80, shape: 'circle', size: rand(5, 18), grow: -4, color: pick(['#ffd45c', '#ff7a3d', '#c4452f', '#fff3c0', '#5c5c5c']), life: 1500 }; });
    add(el, `<div class="fx-big">${ctx.score}</div><div class="fx-sub">Boom! Checkout${who(ctx)}</div>`, 'fx-title nk-title');
  });
}

/** 170: Big Fish – Wasser, Riesenfisch, Platsch, Flutwelle */
export function bigfish(el, ctx) {
  add(el, '', 'fx-bg bg-dim');
  const wave = (c, o) => `<svg viewBox="0 0 1200 60" preserveAspectRatio="none" style="opacity:${o}"><path d="M0 30 Q75 0 150 30 T300 30 T450 30 T600 30 T750 30 T900 30 T1050 30 T1200 30 V60 H0 Z" fill="${c}"/></svg>`;
  add(el, `<div class="bf-waves"><div class="wv w1">${wave('#2f8fb0', 1)}</div><div class="wv w2">${wave('#57c0d8', 0.85)}</div></div><div class="bf-body"></div>`, 'bf-water');
  add(el, bigFish(), 'bf-fish');
  add(el, `<div class="fx-big">170</div><div class="fx-sub">Big Fish!${who(ctx)}</div>`, 'fx-title bf-title');
  const p = particles(el);
  at(3750, () => {
    shake(30, 700);
    const cx = W() * 0.3, cy = H() * 0.66;
    p.burst(180, () => { const a = rand(-3.0, -0.14), v = rand(300, 1100); return { x: cx + rand(-60, 60), y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 1500, shape: 'drop', rot: 0, size: rand(5, 14), color: pick(['#bfefff', '#57c0d8', '#ffffff', '#2f8fb0']), life: 1600, fade: false }; });
    add(el, '<b>PLATSCH!</b>', 'bf-splash');
  });
  p.every((ps) => { if (Math.random() < 0.5) ps.add({ x: rand(0, W()), y: H() * rand(0.7, 1), vy: -rand(30, 90), vx: rand(-10, 10), shape: 'ring', size: rand(3, 8), color: 'rgba(255,255,255,.7)', life: 900 }); }, 400, 5200);
}
