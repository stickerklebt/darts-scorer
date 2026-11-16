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

/** Platzhalter: Initialen in Bot-Farbe, Pop-Art-Raster, Goldrahmen, Stern. */
function placeholder(b) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" fill="${b.color}"/>
    <g fill="${COLORS.ink}" opacity=".22">${Array.from({ length: 49 }, (_, i) => `<circle cx="${4.5 + (i % 7) * 9}" cy="${4.5 + Math.floor(i / 7) * 9}" r="1.7"/>`).join('')}</g>
    <rect x="3" y="3" width="58" height="58" fill="none" stroke="${COLORS.gold}" stroke-width="1.5"/>
    <text x="32" y="41" text-anchor="middle" font-family="Cinzel, serif" font-weight="900" font-size="22" fill="${b.ink}">${b.initials}</text>
    <path d="${sparkPath(53, 11, 6)}" fill="${COLORS.spark}"/>
  </svg>`;
}

export function avatar(id, size = 40) {
  const b = bot(id);
  if (!b) return '';
  const url = found.get(id);
  return `<span class="av" style="width:${size}px;height:${size}px">${url ? `<img src="${url}" alt="">` : placeholder(b)}</span>`;
}
