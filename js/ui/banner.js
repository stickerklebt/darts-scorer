/* Spieler-Banner (Backstage, Freundesprofil): goldenes Band von links bis rechts mit Namen und Average dicht beieinander,
   darunter drei Abzeichen (Trophäen). Eigenes Banner: Abzeichen antippen → darunter Auswahl aller Trophäen
   (erreichte farbig in ihrer Stufe, noch nicht erreichte ausgegraut). */
import { ui } from '../store.js';
import { esc, fmt } from './common.js';
import { COLORS, starPath, sparkles } from './svg.js';
import { TROPHIES, CATEGORIES, TIER_NAMES, trophyById } from '../trophies.js';

/** Farben je Stufe: [Schild, Rand, Pokal] */
const TONES = {
  bronze: ['#7a4420', '#d08a52', '#e0a36c'],
  silver: ['#5c646d', '#e2e6ea', '#cfd5db'],
  gold: ['#9c6f14', '#ffd86b', '#ffd23f'],
  royal: ['#8e1022', '#ecc96a', '#ffd23f'],
  legendary: ['#1a1408', '#fff4c4', '#ffe27a'],
  none: ['#2a251e', '#4d4537', '#5b5140'],
};

/** Ein Abzeichen: gleiches Pokal-Wappen für alle, Farbe nach Stufe (tier null = ausgegraut) */
export function trophyBadge(tier, cls = '') {
  const [shield, rim, cup] = TONES[tier] || TONES.none, K = COLORS.ink;
  const star = tier ? (tier === 'royal' || tier === 'legendary' ? COLORS.goldL : COLORS.red) : '#3a342b';
  return `<svg class="tb ${tier ? `t-${tier}` : 't-none'} ${cls}" viewBox="0 0 60 66" aria-hidden="true">
    <path d="M30 3 L55 12 V34 C55 50 43 59 30 63 C17 59 5 50 5 34 V12 Z" fill="${K}"/>
    <path d="M30 7 L51 14.5 V34 C51 47.5 41 55 30 58.8 C19 55 9 47.5 9 34 V14.5 Z" fill="${shield}" stroke="${rim}" stroke-width="2.6"/>
    <path d="M30 7 L51 14.5 V22 L9 22 V14.5 Z" fill="#fff" fill-opacity="${tier ? 0.14 : 0.04}"/>
    <path d="M20 19 H40 V27 C40 35 36 39 30 40 C24 39 20 35 20 27 Z" fill="${cup}" stroke="${K}" stroke-width="1.6"/>
    <path d="M20 21 H15 C14 28 17 31 21 31 M40 21 H45 C46 28 43 31 39 31" fill="none" stroke="${K}" stroke-width="1.6"/>
    <path d="M27 40 H33 V44 H27 Z M22 44 H38 V48 H22 Z" fill="${rim}" stroke="${K}" stroke-width="1.4"/>
    <path d="${starPath(30, 28, 4.2, 1.8)}" fill="${star}"/>
    ${tier === 'legendary' ? `<path class="tb-shine" d="M30 7 L51 14.5 V34 C51 47.5 41 55 30 58.8 C19 55 9 47.5 9 34 V14.5 Z" fill="none" stroke="#fff" stroke-width="2.6" pathLength="100" stroke-dasharray="14 86"/>` : ''}
  </svg>`;
}

/** Grüne Ranke mit Blättern (unter dem Band, links und rechts der Abzeichen) – frei gezeichnet, kein Wappenmotiv */
const vine = (flip) => `<svg class="pb-vine ${flip ? 'r' : ''}" viewBox="0 0 120 40" aria-hidden="true">
  <path d="M118 6 C96 4 86 18 70 18 C56 18 54 8 44 10 C34 12 34 26 22 26 C12 26 8 18 4 22" fill="none" stroke="#3f7a2c" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M44 10 C40 18 46 22 50 20 M70 18 C72 26 80 28 82 24 M22 26 C20 32 26 36 30 32" fill="none" stroke="#3f7a2c" stroke-width="1.6" stroke-linecap="round"/>
  ${[[96, 8, -30], [78, 15, 20], [58, 13, -40], [36, 15, 30], [14, 24, -20], [50, 20, 60], [82, 24, -10]].map(([x, y, r]) => `<path d="M${x} ${y} c3 -5 9 -5 11 -1 c-3 4 -8 5 -11 1z" transform="rotate(${r} ${x} ${y})" fill="#5aa13c" stroke="#1d3a14" stroke-width=".8"/>`).join('')}
  <g transform="translate(6 22)"><circle r="6.2" fill="#9e1028"/><path d="M-4 -1 C-3 -5 3 -5 4 -1 C3 3 -3 3 -4 -1Z" fill="#d42a44"/>
    <path d="M-2 -1.5 C-1 -3.5 2 -3 2 -0.5 C1 1.5 -1.5 1 -2 -1.5Z" fill="#f0566c"/><circle r="1.1" fill="#7a0a1c"/></g></svg>`;

/** Fortschritt einer noch nicht (ganz) erreichten Stufe als kurzer Text */
function progress(t, st) {
  const nx = st.next;
  if (!nx) return '';
  if (t.key === 'bestLegInv' || /^beat:/.test(t.key) || nx.need <= 1) return '';
  if (t.key === 'bestAvg' || t.key === 'bestDbl') return `bisher ${fmt(st.value)}`;
  return `${Math.min(st.value, nx.need).toLocaleString('de-DE')} / ${Math.round(nx.need).toLocaleString('de-DE')}`;
}

/** Auswahlfenster unter dem Banner: alle Trophäen nach Kategorie; erreichte antippen = in den Platz setzen */
function picker(slot, state, chosen) {
  const cur = chosen[slot];
  const cell = (t) => {
    const st = state[t.id], tier = st?.tier || null, lvl = tier ? t.levels[st.level] : t.levels[0];
    const used = chosen.includes(t.id) && cur !== t.id;
    const prog = progress(t, st || {});
    return `<button class="tp-c ${tier ? 'got' : 'locked'} ${cur === t.id ? 'on' : ''} ${used ? 'used' : ''}" ${tier ? `data-act="badgeSet" data-v="${t.id}"` : 'disabled'}>
      ${trophyBadge(tier)}<b>${esc(t.name)}</b><small>${tier ? TIER_NAMES[tier] : 'Noch nicht erreicht'}</small>
      <em>${esc(st?.next && tier ? `Nächste Stufe: ${st.next.text}` : lvl.text)}</em>${prog ? `<i>${prog}</i>` : ''}</button>`;
  };
  const got = TROPHIES.filter((t) => state[t.id]?.tier).length;
  return `<div class="tpick"><span class="tp-arrow" style="--slot:${slot}"></span>
    <div class="tp-head"><b>Abzeichen ${slot + 1} wählen</b><small>${got} von ${TROPHIES.length} erreicht</small>
      ${cur ? '<button class="btn line sm-btn" data-act="badgeSet" data-v="">Leeren</button>' : ''}<button class="tp-x" data-act="badgeSlot" data-v="${slot}" aria-label="Schließen">×</button></div>
    ${CATEGORIES.map(([k, name]) => `<h4>${name}</h4><div class="tp-grid">${TROPHIES.filter((t) => t.cat === k).map(cell).join('')}</div>`).join('')}
  </div>`;
}

/**
 * Banner. badges = [{ id, tier } | null] × 3. Mit state (eigene Trophäen) sind die Abzeichen antippbar und öffnen die Auswahl.
 */
export function playerBanner({ name, avg = null, badges = [null, null, null], state = null }) {
  const edit = !!state, open = edit && Number.isInteger(ui.badgePick) ? ui.badgePick : null;
  const slots = badges.map((b, i) => {
    const t = b && trophyById(b.id);
    const inner = t ? trophyBadge(b.tier) : `<span class="pb-empty">${edit ? '+' : ''}</span>`;
    const title = t ? `${t.name} · ${TIER_NAMES[b.tier]}` : 'Leerer Platz';
    return edit
      ? `<button class="pb-slot ${open === i ? 'on' : ''}" style="--k:${i}" data-act="badgeSlot" data-v="${i}" title="${esc(title)}" aria-label="${esc(title)} – ändern">${inner}</button>`
      : `<span class="pb-slot" style="--k:${i}" title="${esc(title)}">${inner}</span>`;
  }).join('');
  return `<section class="pbanner" aria-label="Banner von ${esc(name)}">
    <div class="pb-ribbon"><div class="pb-in">
      ${vine(false)}
      <span class="pb-name"><b data-t="${esc(name)}">${esc(name)}</b>${sparkles(10, 3)}</span>
      <span class="pb-avg"><b>${avg === null || avg === undefined ? '–' : fmt(avg)}</b></span>
      ${vine(true)}
    </div></div>
    <div class="pb-badges">${slots}</div>
    ${open !== null ? picker(open, state, badges.map((b) => b?.id || null)) : ''}
  </section>`;
}
