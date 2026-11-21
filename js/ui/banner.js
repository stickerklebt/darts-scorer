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
/** Rankenband unten am Banner: dünne Dornenranke mit kleinen Blättern und Röschen */
function vineStrip() {
  let x = 70, g = '';
  const pts = [];
  while (x < 560) { pts.push(x); x += 46; }
  g += `<path d="M60 9 ${pts.map((p, i) => `Q${p + 11} ${i % 2 ? 2 : 16} ${p + 23} 9`).join(' ')}" fill="none" stroke="#2f5e22" stroke-width="1.6"/>`;
  pts.forEach((p, i) => {
    g += leaf(p + 8, i % 2 ? 6 : 12, .55, i % 2 ? -40 : 40);
    if (i % 3 === 1) g += rose(p + 23, 9, 5, i * 30, i % 2);
    if (i % 3 === 2) g += star(p + 23, i % 2 ? 3 : 15, 2.4);
  });
  return `<svg class="pb-strip" viewBox="0 0 600 18" preserveAspectRatio="xMinYMid slice" aria-hidden="true">${g}</svg>`;
}

/** Medaillenband, an dem der Pokal vom Banner hängt: zwei Bänder (Rot mit Goldstreifen) laufen zu einem Goldring */
const hanger = (i) => `<svg class="pb-hang" viewBox="0 0 40 34" aria-hidden="true">
  <path d="M6 0 H17 L22 26 H17 Z" fill="#a8142a" stroke="#3a0409" stroke-width=".6"/><path d="M10 0 H13 L18.5 26 H15.5 Z" fill="#e7b73c"/>
  <path d="M34 0 H23 L18 26 H23 Z" fill="#8e1022" stroke="#3a0409" stroke-width=".6"/><path d="M30 0 H27 L21.5 26 H24.5 Z" fill="#c9971f"/>
  <circle cx="20" cy="28.5" r="4.2" fill="none" stroke="#ffd86b" stroke-width="2.2"/><circle cx="20" cy="28.5" r="4.2" fill="none" stroke="#6e4a0c" stroke-width=".6"/>
</svg>`;

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
    const inner = `${hanger(i)}${t ? trophyBadge(b.tier) : `<span class="pb-empty">${edit ? '+' : ''}</span>`}`;
    const title = t ? `${t.name} · ${TIER_NAMES[b.tier]}` : 'Leerer Platz';
    return edit
      ? `<button class="pb-slot ${open === i ? 'on' : ''}" style="--k:${i}" data-act="badgeSlot" data-v="${i}" title="${esc(title)}" aria-label="${esc(title)} – ändern">${inner}</button>`
      : `<span class="pb-slot" style="--k:${i}" title="${esc(title)}">${inner}</span>`;
  }).join('');
  return `<section class="pbanner" aria-label="Banner von ${esc(name)}">
    <div class="pb-band">
      <div class="pb-ribbon"><div class="pb-in">
        <span class="pb-name"><b data-t="${esc(name)}">${esc(name)}</b>${sparkles(16, 3)}</span>
        <span class="pb-avg"><b>${avg === null || avg === undefined ? '–' : fmt(avg)}</b>${sparkles(5, 11)}</span>
      </div></div>
      ${bouquetLeft()}${bouquetRight()}${vineStrip()}
    </div>
    <div class="pb-badges">${slots}</div>
    ${open !== null ? picker(open, state, badges.map((b) => b?.id || null)) : ''}
  </section>`;
}
