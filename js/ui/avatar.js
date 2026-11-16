/* Bot-Bilder: lädt bots/<bot-id>.png bzw. .jpg, falls vorhanden – sonst gestalteter Platzhalter. */
import { BOTS, bot } from '../bots.js';
import { COLORS, sparkPath } from './svg.js';

const found = new Map(); // id → URL oder null

/** Einmal beim Start prüfen, welche Bilder es gibt. onDone wird aufgerufen, wenn sich etwas ändert. */
export function probeBotImages(onDone) {
  if (typeof Image === 'undefined') return;
  for (const b of BOTS) {
    const tryUrl = (exts) => {
      if (!exts.length) { found.set(b.id, null); return; }
      const url = `bots/${b.id}.${exts[0]}`, img = new Image();
      img.onload = () => { found.set(b.id, url); onDone?.(); };
      img.onerror = () => tryUrl(exts.slice(1));
      img.src = url;
    };
    tryUrl(['png', 'jpg']);
  }
}

/** Platzhalter: Initialen in Bot-Farbe, Stein-Körnung, Zebra-Kante, Funke. */
function placeholder(b) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <defs><filter id="avn-${b.id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="2" seed="3"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .7 -.2"/><feComposite in2="SourceGraphic" operator="in"/></filter></defs>
    <rect width="64" height="64" fill="${b.color}"/>
    <rect width="64" height="64" fill="${b.color}" filter="url(#avn-${b.id})"/>
    <path d="M0 18 L12 22 L18 15 L27 20" fill="none" stroke="${COLORS.ink}" stroke-width="1" opacity=".45"/>
    <g fill="${COLORS.ink}" opacity=".5">${[0, 1, 2, 3].map((i) => `<rect x="${4 + i * 16}" y="56" width="8" height="8"/>`).join('')}</g>
    <text x="32" y="41" text-anchor="middle" font-family="'Metal Mania', serif" font-size="27" fill="${b.ink}">${b.initials}</text>
    <path d="${sparkPath(53, 11, 6)}" fill="${COLORS.spark}"/>
  </svg>`;
}

export function avatar(id, size = 40) {
  const b = bot(id);
  if (!b) return '';
  const url = found.get(id);
  return `<span class="av" style="width:${size}px;height:${size}px">${url ? `<img src="${url}" alt="">` : placeholder(b)}</span>`;
}
