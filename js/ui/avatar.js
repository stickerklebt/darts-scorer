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
    <text x="32" y="41" text-anchor="middle" font-family="'Fell Digits', 'Cinzel', serif" font-size="22" fill="${b.ink}">${b.initials}</text>
    <path d="${sparkPath(53, 11, 6)}" fill="${COLORS.spark}"/>
  </svg>`;
}

/* Gezeichnete Avatare (eigene Comic-Figuren, flache Farben, Konturen, Queen-Rahmen) */
const K = '#0b0a08', SKIN = '#f2c9a0';
const frame = (bg) => `<rect width="64" height="64" fill="${bg}"/>
  <g fill="${K}" opacity=".18">${Array.from({ length: 49 }, (_, i) => `<circle cx="${4.5 + (i % 7) * 9}" cy="${4.5 + Math.floor(i / 7) * 9}" r="1.6"/>`).join('')}</g>`;
const border = `<rect x="2.5" y="2.5" width="59" height="59" fill="none" stroke="${COLORS.gold}" stroke-width="1.6"/>`;
const ART = {
  // Schwarze Lederjacke, kurze graue Haare, Brille
  jensn: (b) => `${frame(b.color)}
    <path d="M8 64 C9 50 18 45 32 45 C46 45 55 50 56 64 Z" fill="#141210" stroke="${K}" stroke-width="2"/>
    <path d="M32 46 L24 64 M32 46 L40 64" stroke="#3a342c" stroke-width="2"/>
    <path d="M21 47 L30 58 L32 47 Z M43 47 L34 58 L32 47 Z" fill="#2a2620" stroke="${K}" stroke-width="1.5"/>
    <path d="M28 46 L32 52 L36 46 Z" fill="#26221c"/>
    <rect x="27" y="38" width="10" height="9" fill="${SKIN}" stroke="${K}" stroke-width="1.5"/>
    <ellipse cx="32" cy="29" rx="12" ry="13" fill="${SKIN}" stroke="${K}" stroke-width="2"/>
    <path d="M19.5 26 C19 15 26 12 32 12 C39 12 45 15 44.5 26 C42 20 37 18 32 18.5 C26 18 22 20 19.5 26 Z" fill="#b8b6ae" stroke="${K}" stroke-width="1.8"/>
    <rect x="22" y="27" width="8.5" height="6" rx="1.5" fill="#e8e7e5" stroke="${K}" stroke-width="1.8"/>
    <rect x="33.5" y="27" width="8.5" height="6" rx="1.5" fill="#e8e7e5" stroke="${K}" stroke-width="1.8"/>
    <path d="M30.5 29 H33.5" stroke="${K}" stroke-width="1.6"/>
    <circle cx="26.3" cy="30" r="1.2" fill="${K}"/><circle cx="37.7" cy="30" r="1.2" fill="${K}"/>
    <path d="M28 37 C30 38.5 34 38.5 36 37" fill="none" stroke="${K}" stroke-width="1.5" stroke-linecap="round"/>`,
  // Schwarzer Fedora, weißer Glitzerhandschuh, rot-schwarze Jacke
  mj: (b) => `${frame(b.color)}
    <path d="M10 64 C11 50 19 45 32 45 C45 45 53 50 54 64 Z" fill="${COLORS.red}" stroke="${K}" stroke-width="2"/>
    <path d="M27 45 L32 64 L37 45 Z" fill="#141210"/><path d="M15 54 H22 M15 58 H22 M42 54 H49 M42 58 H49" stroke="${COLORS.gold}" stroke-width="1.6"/>
    <rect x="28" y="38" width="8" height="8" fill="#e8c09a" stroke="${K}" stroke-width="1.5"/>
    <path d="M22 26 C22 36 26 41 32 41 C38 41 42 36 42 26 Z" fill="#e8c09a" stroke="${K}" stroke-width="2"/>
    <path d="M21 30 C19 36 20 42 22 44 M43 30 C45 36 44 42 42 44" fill="none" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="28" cy="31" r="1.2" fill="${K}"/><circle cx="36" cy="31" r="1.2" fill="${K}"/>
    <path d="M29 36.5 C31 37.5 33 37.5 35 36.5" fill="none" stroke="${K}" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M13 27 C20 24.5 44 24.5 51 27 C47 29 17 29 13 27 Z" fill="#141210" stroke="${K}" stroke-width="1.6"/>
    <path d="M21 26 C21 16 25 12 32 12 C39 12 43 16 43 26 Z" fill="#141210" stroke="${K}" stroke-width="1.8"/>
    <path d="M21.5 22 H42.5" stroke="#f3e9d2" stroke-width="2"/>
    <g transform="translate(51 40) rotate(-14)"><path d="M-6 10 V-2 C-6 -5 -3 -5 -3 -2 V-8 C-3 -11 0 -11 0 -8 V-9 C0 -12 3 -12 3 -9 V-6 C3 -9 6 -9 6 -6 V4 C6 9 3 11 0 11 H-4 Z" fill="#f6f4ee" stroke="${K}" stroke-width="1.6"/>
      <path d="M-3 0 l1 1 M1 -4 l1 1 M3 3 l1 1 M-1 6 l1 1" stroke="#d1d0cd" stroke-width="1.4"/><path d="M-4 -6 l1 -1 M4 -2 l1 -1" stroke="${COLORS.gold}" stroke-width="1.4"/></g>`,
  // Darts-Spieler: kurze, zurückgekämmte Haare, Spieler-Trikot
  phil: (b) => `${frame(b.color)}
    <path d="M8 64 C9 50 18 45 32 45 C46 45 55 50 56 64 Z" fill="#c8ccd0" stroke="${K}" stroke-width="2"/>
    <path d="M12 56 L24 48 M52 56 L40 48" stroke="${COLORS.yellow}" stroke-width="3"/><path d="M14 62 L26 54 M50 62 L38 54" stroke="${COLORS.red}" stroke-width="2.4"/>
    <path d="M26 45 L32 52 L38 45 Z" fill="#f3e9d2" stroke="${K}" stroke-width="1.5"/>
    <circle cx="44" cy="55" r="3.2" fill="${COLORS.yellow}" stroke="${K}" stroke-width="1.2"/>
    <rect x="27" y="38" width="10" height="9" fill="${SKIN}" stroke="${K}" stroke-width="1.5"/>
    <path d="M19.5 30 C19.5 21 24 17 32 17 C40 17 44.5 21 44.5 30 C44.5 38 40 43 32 43 C24 43 19.5 38 19.5 30 Z" fill="${SKIN}" stroke="${K}" stroke-width="2"/>
    <path d="M19.5 27 C18 15 26 10.5 33 11 C41 11.5 46 16 44.5 27 C43 21 41 19 38 18.5 C34 17.5 27 18 22 22 C21 24 20.5 25 19.5 27 Z" fill="#6b5a44" stroke="${K}" stroke-width="1.8"/>
    <path d="M24 17 C29 14 36 14 41 17 M23 20 C29 17 37 17 42 20" fill="none" stroke="#4a3d2c" stroke-width="1.3"/>
    <circle cx="27" cy="30" r="1.3" fill="${K}"/><circle cx="37" cy="30" r="1.3" fill="${K}"/>
    <path d="M24.5 26.5 L29.5 27 M34.5 27 L39.5 26.5" stroke="${K}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M27.5 36.5 C30 39 34 39 36.5 36.5" fill="none" stroke="${K}" stroke-width="1.6" stroke-linecap="round"/>`,
  // Eigenständige Comic-Figur: Kappe, Sternchen-Augen, breites Grinsen
  dreimac: (b) => `${frame(b.color)}
    <path d="M10 64 C11 52 19 47 32 47 C45 47 53 52 54 64 Z" fill="${COLORS.green}" stroke="${K}" stroke-width="2"/>
    <text x="32" y="60" text-anchor="middle" font-family="'Fell Digits', 'Cinzel', serif" font-size="9" fill="${COLORS.yellow}">3</text>
    <circle cx="32" cy="31" r="15" fill="#f6d36b" stroke="${K}" stroke-width="2"/>
    <path d="M16.5 26 C17 15 25 11 32 11 C39 11 47 15 47.5 26 Z" fill="${COLORS.red}" stroke="${K}" stroke-width="1.8"/>
    <path d="M44 25 C50 24.5 54 26 55 28 C51 28.5 47 28 44 27 Z" fill="${COLORS.red}" stroke="${K}" stroke-width="1.6"/>
    <circle cx="32" cy="13" r="2" fill="${COLORS.yellow}" stroke="${K}" stroke-width="1.2"/>
    <path d="${'M26 31 l1.2 2.4 2.6.4 -1.9 1.8.5 2.6 -2.4-1.2 -2.4 1.2.5-2.6 -1.9-1.8 2.6-.4z'}" fill="${K}" transform="translate(0 -3)"/>
    <path d="${'M38 31 l1.2 2.4 2.6.4 -1.9 1.8.5 2.6 -2.4-1.2 -2.4 1.2.5-2.6 -1.9-1.8 2.6-.4z'}" fill="${K}" transform="translate(0 -3)"/>
    <path d="M23.5 37 C27 43.5 37 43.5 40.5 37 Z" fill="${K}"/><path d="M26.5 38.2 H37.5" stroke="#f3e9d2" stroke-width="1.6"/>
    <circle cx="21" cy="35" r="2" fill="${COLORS.red}" opacity=".55"/><circle cx="43" cy="35" r="2" fill="${COLORS.red}" opacity=".55"/>`,
};

export function avatar(id, size = 40) {
  const b = bot(id);
  if (!b) return '';
  const url = found.get(id);
  const art = b.art && ART[b.art] ? `<svg viewBox="0 0 64 64" aria-hidden="true">${ART[b.art](b)}${border}</svg>` : null;
  return `<span class="av" style="width:${size}px;height:${size}px">${url ? `<img src="${url}" alt="">` : art || placeholder(b)}</span>`;
}
