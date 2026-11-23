/* Spieler-Banner (Backstage, Freundesprofil, VS-Intro): goldenes Band von links bis rechts mit Namen und Average dicht beieinander.
   (Trophäen/Pokale gibt es nicht mehr.) */
import { avatar } from './avatar.js';
import { esc, fmt } from './common.js';
import { COLORS, starPath, sparkles } from './svg.js';



/* ---------- Schmuck am Banner: Rosen, Knospen, Blätter, Dornenranken, Gold-Schnörkel, Sterne (frei gezeichnet) ---------- */
const R2 = (x) => Math.round(x * 10) / 10;
/** Rose in Draufsicht: äußere Blütenblätter, zweiter Kranz, gewundene Mitte, Lichtkanten. size ≈ Radius */
function rose(x, y, size, rot = 0, tone = 0) {
  const dark = ['#6e0816', '#7a0a1c'][tone], mid = ['#a8142a', '#b8182f'][tone], light = ['#d42a44', '#e0405a'][tone];
  const petal = (r, a, w, fill) => `<path d="M0 0 C${R2(-w)} ${R2(-r * 0.4)} ${R2(-w * 0.8)} ${R2(-r)} 0 ${R2(-r * 1.05)} C${R2(w * 0.8)} ${R2(-r)} ${R2(w)} ${R2(-r * 0.4)} 0 0Z" transform="rotate(${a})" fill="${fill}" stroke="#3a0409" stroke-width=".5"/>`;
  let g = '';
  for (let i = 0; i < 5; i++) g += petal(size, i * 72 + 18, size * 0.75, dark);
  for (let i = 0; i < 5; i++) g += petal(size * 0.74, i * 72 + 54, size * 0.55, mid);
  return `<g transform="translate(${x} ${y}) rotate(${rot})">${g}
    <circle r="${R2(size * 0.42)}" fill="${light}" stroke="#3a0409" stroke-width=".5"/>
    <path d="M${R2(-size * 0.3)} 0 A${R2(size * 0.3)} ${R2(size * 0.3)} 0 1 1 ${R2(size * 0.12)} ${R2(size * 0.26)} M${R2(-size * 0.12)} ${R2(-size * 0.05)} A${R2(size * 0.14)} ${R2(size * 0.14)} 0 1 1 ${R2(size * 0.06)} ${R2(size * 0.12)}" fill="none" stroke="#5a0611" stroke-width="${R2(Math.max(0.6, size * 0.07))}" stroke-linecap="round"/>
    <path d="M${R2(-size * 0.62)} ${R2(-size * 0.5)} Q${R2(-size * 0.2)} ${R2(-size * 0.9)} ${R2(size * 0.3)} ${R2(-size * 0.72)}" fill="none" stroke="#ff8a9c" stroke-opacity=".55" stroke-width="${R2(size * 0.08)}" stroke-linecap="round"/></g>`;
}
/** Knospe mit Kelchblättern */
const bud = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M0 0 C-4 -3 -3 -9 0 -12 C3 -9 4 -3 0 0Z" fill="#a8142a" stroke="#3a0409" stroke-width=".5"/>
  <path d="M0 -2 C-1.5 -5 -1 -9 0 -11" stroke="#d42a44" stroke-width="1" fill="none"/>
  <path d="M0 0 C-5 -1 -6 -5 -5 -7 C-3 -5 -2 -3 0 -1 M0 0 C5 -1 6 -5 5 -7 C3 -5 2 -3 0 -1" fill="#3f7a2c" stroke="#1d3a14" stroke-width=".5"/></g>`;
/** Rosenblatt mit Mittelader und gezacktem Rand */
const leaf = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
  <path d="M0 0 C3 -4 9 -5 14 -1 L12.6 -.4 L13.4 .6 L11.6 1 L12 2 C7 4.5 2.5 3 0 0Z" fill="#4f8f34" stroke="#1d3a14" stroke-width=".6"/>
  <path d="M0 0 C5 -.4 9 .2 12.5 .3 M4 .1 L6.5 -2.2 M7.5 .2 L10 -1.8 M5 .2 L7 2 M8.5 .3 L10.5 1.6" stroke="#2a5a1c" stroke-width=".5" fill="none"/></g>`;
/** Gold-Schnörkel (Filigran) */
const scroll = (x, y, s, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" fill="none" stroke="#e7b73c" stroke-width="1.6" stroke-linecap="round">
  <path d="M0 0 C8 -10 22 -10 26 -2 C29 4 22 9 17 5 C13 2 16 -3 20 -1"/>
  <path d="M0 0 C10 6 20 14 34 10 C40 8 42 2 38 0 C35 -1 33 2 35 4" stroke-width="1.3"/>
  <path d="M8 -6 C6 -10 8 -14 12 -14" stroke-width="1"/><circle cx="12" cy="-14" r="1.4" fill="#ffd86b" stroke="none"/>
  <path d="M30 13 C33 17 31 21 27 21" stroke-width="1"/><circle cx="27" cy="21" r="1.2" fill="#ffd86b" stroke="none"/></g>`;
const star = (x, y, r) => `<path d="${starPath(x, y, r, r * 0.42, 5, -90, 0.06)}" fill="#ffd86b" stroke="#6e4a0c" stroke-width=".5"/>`;

/** Rosenstrauß am linken Ende: zwei Rosen, Knospen, Blätter, Dornenstiele, Schnörkel nach oben und unten */
function bouquetLeft() {
  return `<svg class="pb-deco pb-l" viewBox="0 0 120 140" aria-hidden="true">
    ${scroll(30, 18, 1.15)}${scroll(30, 122, 1.15)}
    <path d="M14 70 C30 60 50 40 78 34 M14 70 C34 82 52 102 82 108 M20 72 C40 70 70 72 104 66" fill="none" stroke="#2f5e22" stroke-width="2.4" stroke-linecap="round"/>
    ${[[40, 52, -40], [58, 41, -20], [44, 89, 40], [62, 101, 25], [74, 70, -5]].map(([x, y, r]) => `<path d="M${x} ${y} l2.5 -3.5 l.6 4z" transform="rotate(${r} ${x} ${y})" fill="#2f5e22"/>`).join('')}
    ${leaf(52, 45, 1.2, -50)}${leaf(36, 60, 1.05, -150)}${leaf(56, 99, 1.2, 40)}${leaf(38, 82, 1, 150)}${leaf(86, 68, 1.1, -15)}${leaf(70, 74, .9, 30)}
    ${bud(80, 33, 1.15, 60)}${bud(84, 108, 1.15, 120)}${bud(106, 66, 1.05, 90)}
    ${rose(22, 58, 15, 10, 0)}${rose(24, 86, 13, 50, 1)}
    ${star(98, 22, 4)}${star(104, 118, 3.4)}${star(8, 128, 3)}
  </svg>`;
}
/** Kleiner Strauß an der Kerbe rechts */
function bouquetRight() {
  return `<svg class="pb-deco pb-r" viewBox="0 0 90 120" aria-hidden="true">
    ${scroll(48, 14, .9, true)}${scroll(48, 106, .9, true)}
    <path d="M70 60 C56 48 42 40 22 38 M70 60 C56 72 42 80 24 84" fill="none" stroke="#2f5e22" stroke-width="2.2" stroke-linecap="round"/>
    ${leaf(46, 44, 1, -160)}${leaf(44, 76, 1, 160)}${leaf(30, 40, .85, 190)}
    ${bud(22, 38, 1, -70)}${bud(24, 84, 1, -110)}
    ${rose(66, 60, 13, -20, 0)}
    ${star(16, 60, 3.6)}
  </svg>`;
}

/** Banner mit Namen und Average (pic = Bot-Bild auf dem Band). */
export function playerBanner({ name, avg = null, variant = '', pic = null, noAvg = false }) {
  return `<section class="pbanner ${variant ? `pb-${variant}` : ''}" aria-label="Banner von ${esc(name)}">
    <div class="pb-band">
      <div class="pb-ribbon"><div class="pb-in">
        ${pic ? `<span class="pb-pic">${avatar(pic, 64)}</span>` : ''}
        <span class="pb-name"><b data-t="${esc(name)}">${esc(name)}</b>${sparkles(16, 3)}</span>
        ${noAvg ? '' : `<span class="pb-avg"><b>${avg === null || avg === undefined ? '–' : fmt(avg)}</b>${sparkles(5, 11)}</span>`}
      </div></div>
      ${bouquetLeft()}${bouquetRight()}
    </div>
  </section>`;
}
