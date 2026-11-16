/* Gemeinsame UI-Helfer */
import { nameOf, isTeam, sideName } from '../store.js';
import { GAMES } from '../games.js';
import { PLAYER_COLORS, PLAYER_INK } from './svg.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (x, d = 1) => (x === null || x === undefined ? '–' : x.toFixed(d).replace('.', ','));
export const pcVars = (i) => `--pc:${PLAYER_COLORS[i % 6]};--pi:${PLAYER_INK[i % 6]}`;

export function seg(act, key, opts, cur, cls = 'seg') {
  return `<div class="${cls}">${opts.map(([v, l, c = '']) => `<button data-act="${act}" data-k="${key}" data-v="${v}" class="${c} ${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}
export const optRow = (title, control) => `<div class="optrow"><span>${title}</span>${control}</div>`;

/** Name einer Seite als HTML (Teams mit TEAM-Marke). */
export const sideLabel = (side) => (isTeam(side) ? `<span class="tt">TEAM</span>${side.map((id) => esc(nameOf(id))).join(' · ')}` : esc(nameOf(side[0])));
export function matchSummary(m) {
  const name = m.game === 'x01' ? String(m.opts.start) : GAMES[m.game].title;
  return `${name} · ${m.sides.map((s) => esc(sideName(s))).join(' vs. ')}`;
}
