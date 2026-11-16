/* Bot-Bilder: bots/<bot-id>.png bzw. .jpg, eingetragen in bots/bilder.json – sonst gestalteter Platzhalter. */
import { BOTS, bot } from '../bots.js';
import { COLORS, sparkPath } from './svg.js';

const found = new Map(); // id → URL oder null

/** Einmal beim Start die Bilderliste bots/bilder.json lesen (keine 404-Fehler für fehlende Bilder). */
export async function probeBotImages(onDone) {
  try {
    const r = await fetch('bots/bilder.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const list = await r.json();
    let changed = false;
    for (const b of BOTS) {
      const file = list[b.id];
      if (typeof file === 'string' && /^[\w.-]+\.(png|jpe?g)$/i.test(file)) { found.set(b.id, `bots/${file}`); changed = true; }
    }
    if (changed) onDone?.();
  } catch (e) { /* offline oder keine Liste: Platzhalter */ }
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
