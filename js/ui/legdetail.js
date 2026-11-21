/* Leg-Detail (Fenster): öffnet sich beim Antippen einer Rekord-Karte in der Statistik.
   Zeigt alle Kennzahlen des Legs und jede Aufnahme mit den geworfenen Darts. Ohne ti: ganzes Match (alle Legs). */
import { S, nameOf, sideName } from '../store.js';
import { legDetail } from '../stats.js';
import { esc, fmt, pcVars } from './common.js';
import { x01Table } from './result.js';

const date = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Verweis auf ein Leg/Match als data-Attribute (für Karten und Listenzeilen in der Statistik) */
export const recAttrs = (ref, pid) => (ref ? `data-act="rec" data-m="${esc(ref.mid)}" data-l="${ref.li ?? ''}" data-t="${ref.ti ?? ''}" data-p="${esc(pid)}"` : '');

const kv = (items) => `<div class="kv three ld-kv">${items.map(([k, v]) => `<div class="kv-c"><small>${k}</small><b>${v}</b></div>`).join('')}</div>`;

function turnRows(side, m, hl) {
  const team = m.sides[side.s].length > 1;
  return side.turns.map((t, n) => `<tr class="${t.out ? 'co' : ''} ${t.bust ? 'bust' : ''} ${t.i === hl ? 'hl' : ''}">
    <td>${n + 1}</td><td>${t.startRem}</td>
    <td>${t.bust ? 'Bust' : t.score}${team ? `<small>${esc(nameOf(t.pid))}</small>` : ''}</td>
    <td class="darts">${t.throws ? t.throws.map((d) => `<i class="${d === 'Miss' ? 'miss' : ''}">${d === 'Miss' ? '–' : d}</i>`).join('') : '<em>Summe</em>'}</td>
    <td>${t.out ? '✓' : t.rest}</td></tr>`).join('');
}

function legBlock(m, li, pid, hl) {
  const d = legDetail(m, li, pid);
  if (!d) return '';
  const meSide = d.sides[0];
  const sets = m.opts.mode === 'sets';
  const title = `Leg ${d.no}${sets ? ` · Set ${d.set}` : ''}`;
  const verdict = !d.finished ? 'nicht beendet' : d.winner === meSide.s ? 'gewonnen' : `${esc(sideName(m.sides[d.winner]))} gewinnt`;
  const side = (sd, big) => `<div class="ld-side" style="${pcVars(sd.s)}">
    <h3 class="ld-who">${esc(sideName(m.sides[sd.s]))}${sd.won ? ' <span class="tag">Leg</span>' : ''}</h3>
    ${big ? kv([
      ['Ø 3 Darts', fmt(sd.avg, 2)], ['Darts', sd.darts], ['Aufnahmen', sd.turns.length],
      ['Höchste', sd.high], ['First 9 Ø', fmt(sd.f9, 2)], ['Checkout', sd.checkout ?? '–'],
      ['100+', sd.t100], ['140+', sd.t140], ['180', sd.t180],
    ]) : `<p class="ld-line">Ø ${fmt(sd.avg, 2)} · ${sd.darts} Darts · höchste ${sd.high}${sd.t180 ? ` · ${sd.t180}× 180` : ''}</p>`}
    <div class="sbtable-wrap"><table class="sbtable ld-tbl"><tr><th><div>#</div></th><th><div>Rest</div></th><th><div>Punkte</div></th><th class="l"><div>Darts</div></th><th><div>Danach</div></th></tr>${turnRows(sd, m, hl)}</table></div>
  </div>`;
  return `<section class="ld-leg"><h2 class="label">${title} · ${verdict}</h2>${d.sides.map((sd, i) => side(sd, i === 0)).join('')}</section>`;
}

/** Inhalt des Fensters. md = { mid, li (Zahl oder null = ganzes Match), ti (Aufnahme-Index zum Hervorheben), pid } */
export function legSheet(md) {
  const m = S.matches.find((x) => x.id === md.mid);
  if (!m) return `<h3>Nicht gefunden</h3><p>Dieses Spiel gibt es nicht mehr.</p><div class="sbtns"><button class="btn line" data-act="closeModal">Schließen</button></div>`;
  const opp = m.sides.filter((side) => !side.includes(md.pid)).map(sideName);
  const sub = `${date(m.endedAt ?? m.startedAt)} · ${m.opts.start} ${m.opts.out === 'double' ? 'Double Out' : 'Straight Out'}${opp.length ? ` · gegen ${esc(opp.join(' · '))}` : ' · Training'}`;
  const whole = md.li === null || md.li === undefined;
  const body = whole ? `${x01Table(m)}${m.legs.map((_, i) => legBlock(m, i, md.pid, null)).join('')}` : legBlock(m, md.li, md.pid, md.ti);
  return `<h3>${whole ? 'Match' : 'Leg'}</h3><p class="ld-sub">${sub}</p><div class="ld">${body}</div>
    <div class="sbtns"><button class="btn red" data-act="closeModal">Schließen</button></div>`;
}
