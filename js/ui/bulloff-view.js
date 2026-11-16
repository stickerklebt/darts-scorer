/* Ausbullen-Screen: ganze Scheibe, Finger halten → Lupe, loslassen setzt den Dart. */
import { S, ui, nameOf, isTeam } from '../store.js';
import { bullNext, segmentAt, MM } from '../bulloff.js';
import { label } from '../checkout.js';
import { esc, fmt, pcVars } from './common.js';
import { PLAYER_COLORS, icon } from './svg.js';
import { realBoard } from './board.js';

export const bullThrower = (m, s) => m.sides[s][0];
const zone = (x, y) => { const d = segmentAt(x, y); return d.n === 25 ? (d.m === 2 ? 'Bull' : '25') : d.n === 0 ? 'daneben' : label(d); };
export const distTxt = (x, y) => `${fmt(Math.hypot(x, y))} mm · ${zone(x, y)}`;

export function bulloffView() {
  const m = S.current, b = m.bull, res = ui.boResult;
  const next = bullNext(b);
  // Welche Darts zeigen? Während einer Auswertung die abgeschlossene Runde, sonst die laufende.
  const shown = res ? b.rounds[b.rounds.length - 1].throws : b.throws;
  const darts = shown.map((t) => ({ x: t.x, y: t.y, color: PLAYER_COLORS[t.s % 6], win: res?.type === 'winner' && t.s === b.winner, fly: t.fresh }));
  if (!res && ui.boPending) darts.push({ ...ui.boPending, color: PLAYER_COLORS[next % 6], pending: true });
  const cur = res ? (res.type === 'winner' ? b.winner : null) : next;
  const round = b.rounds.length + (res ? 0 : 1);
  let banner = '';
  if (res?.type === 'winner') {
    banner = `<button class="bo-banner win" style="${pcVars(b.winner)}" data-act="boDone"><small>Anwurf</small><b class="display">${esc(isTeam(m.sides[b.winner]) ? `Team ${nameOf(m.sides[b.winner][0])}` : nameOf(m.sides[b.winner][0]))}</b><span>fängt an</span></button>`;
  } else if (res?.type === 'tie') {
    banner = `<button class="bo-banner tie" data-act="boTie"><small>Gleichstand</small><b class="display">Nochmal!</b><span>${res.group.map((s) => esc(nameOf(bullThrower(m, s)))).join(' & ')} werfen erneut</span></button>`;
  }
  const chips = m.sides.map((side, s) => {
    const t = shown.find((x) => x.s === s), out = !res && !b.contenders.includes(s);
    return `<div class="bo-chip ${s === cur ? 'on' : ''} ${out ? 'out' : ''}" style="${pcVars(s)}"><span class="pc">${s + 1}</span>
      <span class="bo-n">${esc(nameOf(bullThrower(m, s)))}${isTeam(side) ? '<small>für das Team</small>' : ''}</span>
      <span class="bo-d">${t ? distTxt(t.x, t.y) : out ? 'raus' : s === next && ui.boPending ? distTxt(ui.boPending.x, ui.boPending.y) : '–'}</span></div>`;
  }).join('');
  const whoName = cur !== null ? nameOf(bullThrower(m, cur)) : '';
  return `<div class="game bulloff" style="${cur !== null ? pcVars(cur) : ''}">
    <div class="turnbar"></div>
    <header class="gbar">
      <button class="sq" data-act="home" aria-label="Übersicht">${icon('chevL', 2.6)}</button>
      <div class="gtitle"><b>Ausbullen</b><span>Runde ${round} · Wer am nächsten am Bull ist, fängt an</span></div>
      <button class="sq" data-act="gear" aria-label="Einstellungen">${icon('gear', 1.8)}</button>
    </header>
    <div class="bo-main">
      <div class="bo-left">
        ${res ? '' : `<div class="bo-who" style="${pcVars(cur)}"><b>${esc(whoName)}</b><span>wirft aufs Bull</span></div>`}
        <div class="bo-board" id="boBoard">${realBoard(darts)}${banner}</div>
      </div>
      <div class="bo-side">
        <div class="bo-chips">${chips}</div>
        ${res ? '' : `<p class="foot bo-hint">Finger auf die Scheibe halten, wo der Dart steckt – die Lupe zeigt die genaue Stelle. Loslassen setzt den Dart.</p>
        <div class="bo-btns">
          <button class="btn dark" data-act="boUndo" ${ui.boPending || b.throws.length ? '' : 'disabled'}>${icon('undo', 2.4, 18)} Rückgängig</button>
          <button class="btn red" data-act="boOk" ${ui.boPending ? '' : 'disabled'}>Bestätigen</button>
        </div>`}
      </div>
    </div>
  </div>`;
}

/* ---------- Lupe (direkt am DOM, ohne Neuzeichnen) ---------- */
const LOUPE_MM = 46;
export function loupeShow(svg, x, y, clientX, clientY) {
  let lp = document.querySelector('.loupe');
  if (!lp) {
    lp = document.createElement('div');
    lp.className = 'loupe';
    lp.innerHTML = `<svg viewBox="0 0 10 10">${svg.innerHTML}</svg><i class="cross"></i><span class="lp-t"></span>`;
    lp.querySelectorAll('.rbd.pending').forEach((n) => n.remove());
    document.body.appendChild(lp);
  }
  const size = 150, above = clientY - size - 60 > 0;
  lp.style.left = `${Math.min(window.innerWidth - size - 6, Math.max(6, clientX - size / 2))}px`;
  lp.style.top = `${above ? clientY - size - 60 : clientY + 50}px`;
  lp.querySelector('svg').setAttribute('viewBox', `${x - LOUPE_MM / 2} ${y - LOUPE_MM / 2} ${LOUPE_MM} ${LOUPE_MM}`);
  lp.querySelector('.lp-t').textContent = distTxt(x, y);
}
export function loupeHide() { document.querySelector('.loupe')?.remove(); }
export const BOARD_EDGE = MM.edge;
