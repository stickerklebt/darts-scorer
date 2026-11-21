/* Spieler-Banner (Backstage, Freundesprofil): goldenes Band von links bis rechts mit Namen und Average dicht beieinander,
   darunter drei Abzeichen (Trophäen). Eigenes Banner: Abzeichen antippen → darunter Auswahl aller Trophäen
   (erreichte farbig in ihrer Stufe, noch nicht erreichte ausgegraut). */
import { ui } from '../store.js';
import { esc, fmt } from './common.js';
import { COLORS, starPath, sparkles } from './svg.js';
import { TROPHIES, CATEGORIES, TIER_NAMES, trophyById } from '../trophies.js';

/** Metall je Stufe: Verlauf von links nach rechts (dunkel → hell → dunkel), dazu Sockel und Schild */
const METAL = {
  bronze: { m: ['#4e2810', '#9a5a2a', '#f0b98a', '#c47c42', '#5e3214'], base: '#1b1612', plate: '#c47c42' },
  silver: { m: ['#4b4f54', '#a3a9b0', '#ffffff', '#c6cbd1', '#5c6166'], base: '#1b1a19', plate: '#c6cbd1' },
  gold: { m: ['#6e4a0c', '#c9971f', '#fff0b0', '#e7b73c', '#7f560f'], base: '#151310', plate: '#e7b73c' },
  royal: { m: ['#6e4a0c', '#c9971f', '#fff0b0', '#e7b73c', '#7f560f'], base: '#6e0a1a', plate: '#e7b73c' },
  legendary: { m: ['#8a5c08', '#e8b52a', '#ffffff', '#ffd24a', '#9a6a0c'], base: '#0d0b08', plate: '#ffd24a' },
  none: { m: ['#24211d', '#3d3831', '#5f584d', '#433d35', '#24211d'], base: '#191714', plate: '#3d3831' },
};

/** Ein Pokal (für alle Trophäen gleich): Schale mit zwei Henkeln, Knauf, Fuß, Marmorsockel mit Schild.
    Farbe nach Stufe, nicht erreicht = dunkelgrau. */
export function trophyBadge(tier, cls = '') {
  const k = tier || 'none', c = METAL[k], id = `tm-${k}`;
  const stops = c.m.map((col, i) => `<stop offset="${[0, 0.3, 0.48, 0.66, 1][i]}" stop-color="${col}"/>`).join('');
  const bowl = 'M15 9 H45 C45 25 39.5 34.5 30 37.5 C20.5 34.5 15 25 15 9 Z';
  return `<svg class="tb t-${k} ${cls}" viewBox="0 0 60 72" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0">${stops}</linearGradient>
      <linearGradient id="${id}v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
    <path d="M16 12 C5 11 4 26 18 29 M44 12 C55 11 56 26 42 29" fill="none" stroke="url(#${id})" stroke-width="3.4" stroke-linecap="round"/>
    <path d="${bowl}" fill="url(#${id})"/><path d="${bowl}" fill="url(#${id}v)"/>
    <ellipse cx="30" cy="9" rx="15" ry="2.6" fill="${c.m[0]}"/><ellipse cx="30" cy="8.6" rx="13.4" ry="1.6" fill="${c.m[1]}" opacity=".7"/>
    <path d="M20 12 C20 22 22.5 29 26 33" fill="none" stroke="#fff" stroke-opacity="${tier ? 0.75 : 0.12}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M27.5 37 H32.5 L32 41 H28 Z" fill="url(#${id})"/>
    <ellipse cx="30" cy="42.5" rx="4.4" ry="2.4" fill="url(#${id})"/>
    <path d="M28.6 44.5 H31.4 L32 50 H28 Z" fill="url(#${id})"/>
    <path d="M23 54 C23 51 26 50 30 50 C34 50 37 51 37 54 Z" fill="url(#${id})"/>
    <rect x="17" y="54" width="26" height="16" rx="1.5" fill="${c.base}"/>
    <rect x="17" y="54" width="26" height="2" fill="#fff" fill-opacity=".1"/>
    <rect x="21.5" y="58.5" width="17" height="7.5" rx="1" fill="${c.plate}" opacity="${tier ? 1 : 0.5}"/>
    <path d="M24 61.2 H36 M25.5 63.6 H34.5" stroke="#000" stroke-opacity=".45" stroke-width=".8"/>
    ${k === 'legendary' ? `<path class="tb-shine" d="${bowl}" fill="none" stroke="#fff" stroke-width="1.6" pathLength="100" stroke-dasharray="16 84"/>` : ''}
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
      <span class="pb-avg"><b>${avg === null || avg === undefined ? '–' : fmt(avg)}</b>${sparkles(5, 11)}</span>
      ${vine(true)}
    </div></div>
    <div class="pb-badges">${slots}</div>
    ${open !== null ? picker(open, state, badges.map((b) => b?.id || null)) : ''}
  </section>`;
}
