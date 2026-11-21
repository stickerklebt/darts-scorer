/* Spieler-Banner (Backstage, Freundesprofil): Kulisse im Queen-Look, goldenes Band mit Namen,
   rechts daneben der Average, darunter drei Abzeichen (vorerst Platzhalter-Pokale).
   Nur Stilmittel (Strahlenkranz, Pop-Art-Block mit Raster, Sterne) – keine Cover-Motive. */
import { esc, fmt } from './common.js';
import { COLORS, starPath, burstPath } from './svg.js';

/** Kulisse: schwarze Bühne, goldener Strahlenkranz, roter Pop-Art-Block mit Raster, Sterne */
function backdrop() {
  let rays = '';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2, b = a + Math.PI / 56;
    rays += `M200 92L${Math.round(200 + Math.cos(a) * 420)} ${Math.round(92 + Math.sin(a) * 420)}L${Math.round(200 + Math.cos(b) * 420)} ${Math.round(92 + Math.sin(b) * 420)}Z`;
  }
  const st = [[34, 30, 7], [362, 26, 6], [372, 160, 5], [22, 150, 4.5], [300, 18, 3.5], [96, 16, 3.5]]
    .map(([x, y, r], k) => `<path class="pb-star" style="--k:${k}" d="${starPath(x, y, r, r * 0.42, 5, -90, 0.08)}" fill="${COLORS.goldL}"/>`).join('');
  return `<svg class="pb-bg" viewBox="0 0 400 184" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id="pbGlow" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#3a2a12"/><stop offset=".55" stop-color="#140f09"/><stop offset="1" stop-color="#070605"/></radialGradient>
      <pattern id="pbDots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1.8" cy="1.8" r="1.3" fill="#0b0a08" fill-opacity=".28"/><circle cx="5.3" cy="5.3" r="1.3" fill="#0b0a08" fill-opacity=".28"/></pattern>
    </defs>
    <rect width="400" height="184" fill="url(#pbGlow)"/>
    <path class="pb-rays" d="${rays}" fill="${COLORS.gold}" fill-opacity=".09"/>
    <path d="M-10 62 L410 40 L410 132 L-10 150 Z" fill="${COLORS.red}"/>
    <path d="M-10 62 L410 40 L410 132 L-10 150 Z" fill="url(#pbDots)"/>
    <path d="M-10 58 L410 36 M-10 154 L410 136" stroke="${COLORS.gold}" stroke-width="2"/>
    <path d="${burstPath(200, 92, 62, 50, 22)}" fill="${COLORS.ink}" fill-opacity=".22"/>
    ${st}
  </svg>`;
}

/** Abzeichen (Platzhalter): Wappenschild mit kleinem Pokal; tone = Farbe des Schilds */
function badge(tone, k) {
  const K = COLORS.ink, G = COLORS.gold, L = COLORS.goldL;
  return `<svg class="pb-badge" style="--k:${k}" viewBox="0 0 60 66" aria-hidden="true">
    <path d="M30 3 L55 12 V34 C55 50 43 59 30 63 C17 59 5 50 5 34 V12 Z" fill="${K}"/>
    <path d="M30 7 L51 14.5 V34 C51 47.5 41 55 30 58.8 C19 55 9 47.5 9 34 V14.5 Z" fill="${tone}" stroke="${G}" stroke-width="2.4"/>
    <path d="M30 7 L51 14.5 V22 L9 22 V14.5 Z" fill="#fff" fill-opacity=".12"/>
    <path d="M20 19 H40 V27 C40 35 36 39 30 40 C24 39 20 35 20 27 Z" fill="${L}" stroke="${K}" stroke-width="1.6"/>
    <path d="M20 21 H15 C14 28 17 31 21 31 M40 21 H45 C46 28 43 31 39 31" fill="none" stroke="${K}" stroke-width="1.6"/>
    <path d="M27 40 H33 V44 H27 Z M22 44 H38 V48 H22 Z" fill="${G}" stroke="${K}" stroke-width="1.4"/>
    <path d="${starPath(30, 28, 4.2, 1.8)}" fill="${COLORS.red}"/>
  </svg>`;
}

/** Banner: name, avg (Zahl oder null), sub = kleine Zeile über dem Namen */
export function playerBanner({ name, avg = null, sub = '' }) {
  const tones = [COLORS.red, COLORS.blue, '#1f9a4c'];
  return `<section class="pbanner" aria-label="Banner von ${esc(name)}">
    ${backdrop()}
    <div class="pb-ribbon">
      <span class="pb-name">${sub ? `<small>${esc(sub)}</small>` : ''}<b>${esc(name)}</b></span>
      <span class="pb-avg"><small>Ø 501</small><b class="pop">${avg === null || avg === undefined ? '–' : fmt(avg)}</b></span>
    </div>
    <div class="pb-badges">${tones.map((t, k) => badge(t, k)).join('')}</div>
  </section>`;
}
