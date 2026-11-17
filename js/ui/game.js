/* Spiel-Screen: Scoreboard + Eingabe (Summe, Einzeldart-Tastatur, Dartscheibe) */
import { S, ui, nameOf, isTeam, possessive } from '../store.js';
import * as X from '../x01.js';
import * as G from '../party.js';
import * as C from '../cricket.js';
import { route, setupFor, label } from '../checkout.js';
import { GAMES } from '../games.js';
import { esc, fmt, pcVars, seg } from './common.js';
import { throwerOf } from '../match.js';
import { quickScores } from '../stats.js';
import { icon } from './svg.js';
import { fieldAt, fieldName, aimBoard } from './aimboard.js';
import { realBoard } from './board.js';
import { isBot, bot } from '../bots.js';
import { avatar } from './avatar.js';
import { PLAYER_COLORS } from './svg.js';

const whoText = (m, s, thrower) => (isBot(thrower) ? `${nameOf(thrower)} wirft` : isTeam(m.sides[s]) ? `${possessive(nameOf(thrower))} Wurf` : `${nameOf(thrower)} ist dran`);
const chipCls = (d) => (d.n === 25 && d.m === 2 ? 'b' : d.m === 2 ? 'd' : '');

/** Ø-Angaben im Spiel ausblendbar (Einstellung „Average anzeigen“) */
const statsShown = (stats) => (S.prefs.showAvg === false ? stats.filter(([k]) => k !== 'Ø') : stats);

function scoreboard(items, cur, swap) {
  items = items.map((it) => ({ ...it, stats: statsShown(it.stats) }));
  const anim = (s) => (s === cur && swap ? 'swap' : '');
  if (items.length <= 2) {
    return `<div class="duo ${items.length === 1 ? 'solo' : ''}">${items.map((it, s) => `<div class="sbp ${s === cur ? 'on' : 'off'} ${anim(s)}" style="${pcVars(s)}">
      <div class="sbp-head"><span class="sbp-name">${it.starter ? '<i class="throw"></i>' : ''}${esc(it.name)}</span>${it.right}</div>
      ${it.team ? `<div class="sbp-team">${it.team}</div>` : ''}
      ${it.extra || ''}
      <div class="sbp-rem"><span>${it.big}</span>${it.co ? `<div class="sbp-co">${it.co}</div>` : ''}</div>
      <div class="sbp-stats">${it.stats.map(([k, v]) => `<span><small>${k}</small><b>${v}</b></span>`).join('')}</div>
    </div>`).join('')}</div>`;
  }
  return `<div class="rows">${items.map((it, s) => `<div class="sbr ${s === cur ? 'on' : 'off'} ${anim(s)}" style="${pcVars(s)}">
    <span class="sbr-c"></span>
    <span class="sbr-n"><b>${it.starter ? '<i class="throw"></i>' : ''}${esc(it.name)}</b>
      <small>${[it.team ? `<span class="whob">${it.team}</span>` : '', it.rowInfo, ...it.stats.slice(0, 2).map(([k, v]) => `${k} <b>${v}</b>`)].filter(Boolean).join(' · ')}</small></span>
    ${it.extra || ''}
    <span class="sbr-rem">${it.big}${it.co ? `<span class="sbr-co">${it.co}</span>` : ''}</span>
  </div>`).join('')}</div>`;
}

/** Bot-Bereich in der Karte: Bild, kleine Scheibe mit den Darts der Aufnahme, Sprechblase, Andeutung bei starken Würfen. */
function botBox(m, s, next) {
  const side = m.sides[s], botId = isBot(next) ? next : side.find(isBot);
  if (!botId) return '';
  const marks = (ui.botMarks?.[s] || []).map((d) => ({ x: d.x, y: d.y, color: PLAYER_COLORS[s % 6], fly: Date.now() - d.at < 450 }));
  const sp = ui.speech?.[botId];
  const hint = ui.botHint && ui.botHint.s === s && Date.now() - ui.botHint.at < 1600 ? `<b class="bot-pop">${esc(ui.botHint.text)}<i></i><i></i><i></i></b>` : '';
  return `<div class="botbox">${avatar(botId, 46)}<div class="minib">${realBoard(marks, 17)}</div>
    ${sp && sp.until > Date.now() ? `<div class="speech">${esc(sp.text)}</div>` : ''}${hint}</div>`;
}

/** Teamzeile: alle Mitglieder, der nächste Werfer hervorgehoben. */
const teamLine = (side, next) => `<span class="tt">TEAM</span>${side.map((id) => (id === next ? `<b>${esc(nameOf(id))}</b>` : esc(nameOf(id)))).join(' · ')}`;

const pips = (won, total) => (total > 7 ? `<span class="setlbl">${won}</span>` : `<span class="pips">${Array.from({ length: total }, (_, i) => `<i class="${i < won ? 'w' : ''}"></i>`).join('')}</span>`);

export function gameView() {
  const m = S.current;
  let title, sub, cur, board, hint, pad, thrower, isBoard = false;
  const curNow = m.game === 'x01' ? X.curSide(m) : G.curSide(m);
  const swapKey = `${m.id}:${curNow}:${m.game === 'x01' ? m.legs.length : 0}`;
  const swap = ui.swapKey !== undefined && ui.swapKey !== swapKey;
  ui.swapKey = swapKey;
  if (m.game === 'x01') {
    const l = X.leg(m); cur = X.curSide(m); thrower = X.curThrower(m);
    const ps = X.pendingSum(m), sets = X.isSets(m);
    title = `${m.opts.start} · ${m.opts.out === 'double' ? 'Double Out' : 'Single Out'}`;
    sub = sets ? `Set ${l.set} · Leg ${m.legs.filter((x) => x.set === l.set).length} · First to ${m.opts.target} Sets` : `Leg ${m.legs.length} · First to ${m.opts.target} Legs`;
    // Checkout-Weg bzw. Setup steht direkt unter dem Rest des werfenden Spielers
    const mode = X.inputMode(m), before = X.curRem(m) - ps, left = 3 - m.pending.length;
    let co = '';
    if (mode === 'darts' && m.opts.out === 'double' && S.prefs.hints) {
      const r = route(before, left);
      if (r) co = r.map((d) => `<span class="co-c ${chipCls(d)}">${label(d)}</span>`).join('');
      else { const su = setupFor(before, left); if (su) co = `<span class="co-l">Stellen</span><span class="co-c">${label(su.dart)}</span><span class="co-l">→ ${su.leave}</span>`; }
    }
    const items = m.sides.map((side, s) => {
      const st = X.matchStats(m, { s });
      const mine = l.turns.filter((t) => t.s === s), last = mine[mine.length - 1];
      const next = throwerOf(m, s, X.sideTurnCount(m, s));
      return {
        name: nameOf(next), team: isTeam(side) ? teamLine(side, next) : '', starter: s === l.starter, extra: botBox(m, s, next),
        big: X.rem(m, l, s) - (s === cur ? ps : 0), co: s === cur ? co : '',
        right: sets ? `<span class="setlbl">S${X.setsWon(m, s)} · L${X.legsInSet(m, s, l.set)}</span>` : pips(X.legsWon(m, s), m.opts.target),
        rowInfo: sets ? `S <b>${X.setsWon(m, s)}</b> L <b>${X.legsInSet(m, s, l.set)}</b>` : `Legs <b>${X.legsWon(m, s)}</b>`,
        stats: [['Ø', fmt(st.avg)], ['Letzte', last ? (last.bust ? 'Bust' : last.score) : '–'], ['Darts', mine.reduce((a, t) => a + t.darts, 0)]],
      };
    });
    board = scoreboard(items, cur, swap);
    hint = `<div class="ticker"><span class="tk-w">${esc(whoText(m, cur, thrower))}</span></div>`;
    isBoard = mode === 'darts' && S.prefs.dartInput === 'board' && !isBot(thrower);
    pad = isBot(thrower) ? botPad(m, thrower, m.pending) : mode === 'darts' ? (isBoard ? boardPad(m, thrower) : dartPad(m, thrower)) : sumPad(m, thrower);
  } else if (m.game === 'cricket') {
    cur = C.curSide(m); thrower = C.curThrower(m);
    const st = C.state(m), pts = m.opts.mode !== 'close';
    title = `Cricket · ${pts ? 'Mit Punkten' : 'Nur Schließen'}`;
    sub = `Runde ${C.round(m) + 1} von ${C.rounds(m)}`;
    const items = m.sides.map((side, s) => {
      const turns = m.turns.filter((t) => t.s === s), last = turns[turns.length - 1];
      const next = throwerOf(m, s, turns.length);
      const closed = C.TARGETS.filter((t) => st.marks[s][t] >= 3).length;
      return {
        name: nameOf(next), team: isTeam(side) ? teamLine(side, next) : '', starter: s === m.first, right: '', rowInfo: `Zu <b>${closed}/7</b>`, extra: botBox(m, s, next),
        big: pts ? st.pts[s] : `${closed}<small style="font-size:.4em;color:var(--muted)">/7</small>`,
        stats: [['Zu', `${closed}/7`], ['Letzte', last ? (pts ? last.v : `${last.marks}×`) : '–'], ['Treffer', st.hits[s]]],
      };
    });
    board = scoreboard(items, cur, swap) + ckGrid(m, st, cur);
    hint = `<div class="ticker"><span class="tk-w">${esc(whoText(m, cur, thrower))}</span></div>`;
    isBoard = S.prefs.dartInput === 'board' && !isBot(thrower);
    pad = isBot(thrower) ? botPad(m, thrower, m.pending) : isBoard ? boardPad(m, thrower, true) : cricketPad(m, thrower);
  } else {
    cur = G.curSide(m); thrower = G.curThrower(m);
    const round = G.round(m);
    title = GAMES[m.game].title;
    sub = m.game === 'atc' ? `Runde ${round + 1}` : `Runde ${round + 1} von ${G.rounds(m)}`;
    const items = m.sides.map((side, s) => {
      const turns = m.turns.filter((t) => t.s === s), last = turns[turns.length - 1];
      const done = m.game === 'atc' && G.atcPos(m, s) >= G.atcTotal(m);
      const next = throwerOf(m, s, turns.length);
      return {
        name: nameOf(next), team: isTeam(side) ? teamLine(side, next) : '', starter: s === m.first, right: '', rowInfo: '', extra: botBox(m, s, next),
        big: m.game === 'atc' ? `${G.atcPos(m, s)}<small style="font-size:.4em;color:var(--muted)">/${G.atcTotal(m)}</small>` : G.score(m, s),
        stats: m.game === 'atc'
          ? [['Ziel', done ? '✓' : G.atcLabel(G.atcPos(m, s))], ['Letzte', last ? last.v : '–'], ['Runden', turns.length]]
          : [['Letzte', last ? last.v : '–'], ['Runden', turns.length], ['Platz', 1 + m.sides.filter((_, o) => G.score(m, o) > G.score(m, s)).length]],
      };
    });
    board = scoreboard(items, cur, swap);
    let tgt = '';
    if (m.game === 'shanghai') tgt = String(round + 1);
    else if (m.game === 'halveit') tgt = G.halfLabel(G.HALF[round]);
    else if (m.game === 'atc') tgt = G.atcLabel(G.atcPos(m, cur));
    hint = `<div class="ticker">${tgt ? `<span class="tk-l">Ziel</span><span class="tk-target"><b>${tgt}</b></span><span class="tk-w">·</span>` : ''}<span class="tk-w">${esc(whoText(m, cur, thrower))}</span></div>`;
    pad = isBot(thrower) ? botPad(m, thrower, ui.botTurn?.s === cur ? ui.botTurn.darts : []) : m.game === 'atc' ? hitsPad(m, thrower, cur) : sumPad(m, thrower);
  }
  const botTurn = isBot(thrower);
  return `<div class="game ${isBoard ? 'boardmode' : ''} ${m.game === 'cricket' ? 'cricket' : ''} ${botTurn ? 'botturn' : ''}" style="${pcVars(cur)}">
    <div class="turnbar ${swap ? 'swap' : ''}"></div>
    <header class="gbar">
      <button class="sq" data-act="home" aria-label="Übersicht">${icon('chevL', 2.6)}</button>
      <div class="gtitle"><b>${title}</b><span>${sub}</span></div>
      <button class="sq" data-act="gear" aria-label="Einstellungen">${icon('gear', 1.8)}</button>
    </header>
    <div class="gmain"><div class="gleft">${board}${hint}</div><div class="pad ${isBoard ? 'board' : ''}">${pad}</div></div>
  </div>`;
}

function sumPad(m, thrower) {
  let quick = [];
  if (m.game === 'x01' || m.game === 'highscore') quick = quickScores(S.matches, thrower, m);
  else if (m.game === 'shanghai') { const t = G.round(m) + 1; quick = [1, 2, 3, 4, 5, 6].map((k) => k * t); }
  else if (m.game === 'halveit') {
    const t = G.HALF[G.round(m)];
    quick = typeof t === 'number' ? [1, 2, 3, 4, 5, 6].map((k) => k * t) : t === 'B' ? [25, 50, 75, 100] : [];
  }
  const k = (v) => `<button class="key" data-act="key" data-v="${v}">${v}</button>`;
  const okLabel = m.game === 'halveit' && !ui.entry ? 'Verfehlt' : 'OK';
  return `<div class="entry"><span class="who">${esc(nameOf(thrower))}</span><span class="val ${ui.entry ? '' : 'empty'}">${ui.entry || '0'}</span></div>
    ${quick.length ? `<div class="quick" style="grid-template-columns:repeat(${quick.length},1fr)">${quick.map((v) => `<button data-act="quick" data-v="${v}">${v}</button>`).join('')}</div>` : ''}
    <div class="keys">${k(1)}${k(2)}${k(3)}${k(4)}${k(5)}${k(6)}${k(7)}${k(8)}${k(9)}
      <button class="key back" data-act="back" aria-label="${ui.entry ? 'Löschen' : 'Rückgängig'}">${ui.entry ? '⌫' : icon('undo', 2.4, 26)}</button>
      ${k(0)}<button class="key ok" data-act="ok">${okLabel}</button></div>`;
}

function slots(m) {
  const p = m.pending;
  return `<div class="slots">${[0, 1, 2].map((i) => `<div class="slot ${p[i] ? 'filled' : ''}">${p[i] ? label(p[i]) : '–'}</div>`).join('')}<div class="slot sum">${m.game === 'cricket' ? `+${C.state(m).pendingPts}` : X.pendingSum(m)}</div></div>`;
}
const restEntry = (m, thrower) => (m.game === 'cricket'
  ? `<div class="entry"><span class="who">${esc(nameOf(thrower))}</span><span class="val">${m.pending.length}<small>/ 3 Darts</small></span></div>`
  : `<div class="entry"><span class="who">${esc(nameOf(thrower))}</span><span class="val">${X.curRem(m) - X.pendingSum(m)}<small>Rest</small></span></div>`);

function dartPad(m, thrower) {
  let nums = '';
  for (let i = 1; i <= 20; i++) nums += `<button class="dk" data-act="dart" data-v="${i}">${i}</button>`;
  return `${restEntry(m, thrower)}${slots(m)}
    ${seg('mult', 'v', [[1, 'Single', 'm1'], [2, 'Double', 'm2'], [3, 'Triple', 'm3']], ui.mult, 'mults')}
    <div class="dgrid">${nums}
      <button class="dk bull" data-act="bull" data-v="1">25</button>
      <button class="dk b50" data-act="bull" data-v="2">Bull</button>
      <button class="dk miss" data-act="dart" data-v="0">Miss</button>
      <button class="dk back" data-act="back" aria-label="Rückgängig">${icon('undo', 2.4, 24)}</button>
    </div>`;
}

/** Eingabe per Scheibe: Finger halten → Lupe, loslassen setzt den Dart. Getroffene Felder leuchten. */
function boardPad(m, thrower) {
  const hits = m.pending.map((d, i) => {
    const p = ui.aimPos?.[i];
    return p ? { ...d, x: p.x, y: p.y, z: fieldAt(p.x, p.y).z } : { ...d, z: 'o' };
  });
  const chip = (i) => {
    const d = hits[i], now = i === hits.length;
    if (!d) return `<div class="ahit ${now ? 'now' : ''}"><i>${i + 1}</i><b>${now ? 'Jetzt' : '–'}</b></div>`;
    return `<div class="ahit done m${d.n === 0 ? 0 : d.m}"><i>${i + 1}</i><b>${fieldName(d)}</b>${m.game === 'cricket' || d.n === 0 ? '' : `<small>${d.n * d.m}</small>`}</div>`;
  };
  return `${restEntry(m, thrower)}
    <div class="ahits">${[0, 1, 2].map(chip).join('')}</div>
    <div class="aimbox" id="dartBoard">${aimBoard(hits)}</div>
    <div class="boardrow"><button class="dk miss" data-act="dart" data-v="0">Daneben</button>
      <button class="dk" style="color:var(--muted);display:flex;align-items:center;justify-content:center;gap:8px" data-act="back" aria-label="Rückgängig">${icon('undo', 2.4, 24)}</button></div>`;
}

function hitsPad(m, thrower, cur) {
  const left = Math.min(3, G.atcTotal(m) - G.atcPos(m, cur));
  return `<div class="entry"><span class="who">${esc(nameOf(thrower))}</span><span class="who" style="color:var(--gold)">Treffer?</span></div>
    <div class="keys four">
      ${[0, 1, 2, 3].map((h) => `<button class="key" data-act="hits" data-v="${h}" ${h > left ? 'disabled' : ''}>${h}</button>`).join('')}
      <button class="key wide back" data-act="back">${icon('undo', 2.4, 26)}</button>
    </div>`;
}

/** Während ein Bot wirft: Bild, Name, die Darts der Aufnahme, Rückgängig (nimmt die letzte eigene Eingabe zurück). */
function botPad(m, thrower, darts) {
  const sum = darts.reduce((a, d) => a + d.n * d.m, 0);
  return `<div class="botpad">
    <div class="bp-top">${avatar(thrower, 64)}<div class="bp-t"><b>${esc(nameOf(thrower))}</b><span>wirft<i>.</i><i>.</i><i>.</i></span><small>Bot${S.prefs.showAvg === false ? '' : ` · Ø ${bot(thrower).avg}`}</small></div></div>
    <div class="slots">${[0, 1, 2].map((i) => `<div class="slot ${darts[i] ? 'filled' : ''}">${darts[i] ? label(darts[i]) : '–'}</div>`).join('')}<div class="slot sum">${sum}</div></div>
    <button class="btn dark" data-act="undo">${icon('undo', 2.4, 18)} Letzte eigene Eingabe zurück</button>
  </div>`;
}

/* ---------- Cricket: Treffer-Tafel und Eingabe ---------- */
const markGlyph = (k) => (k <= 0 ? '' : k === 1 ? '<i class="mk m1"></i>' : k === 2 ? '<i class="mk m2"></i>' : '<i class="mk m3"></i>');
function ckGrid(m, st, cur) {
  const n = m.sides.length;
  const rows = C.TARGETS.map((t) => {
    const allClosed = st.marks.every((mk) => mk[t] >= 3);
    return `<tr class="${allClosed ? 'dead' : ''}"><th>${C.tLabel(t)}</th>${m.sides.map((_, s) => `<td class="${s === cur ? 'cur' : ''}" style="${pcVars(s)}">${markGlyph(st.marks[s][t])}${st.marks[s][t] > 3 ? `<small>+${st.marks[s][t] - 3}</small>` : ''}</td>`).join('')}</tr>`;
  }).join('');
  return `<div class="ckwrap"><table class="ckgrid n${Math.min(n, 6)}"><tr><th></th>${m.sides.map((side, s) => `<td class="hd ${s === cur ? 'cur' : ''}" style="${pcVars(s)}">${esc(nameOf(side[0])).slice(0, 8)}</td>`).join('')}</tr>${rows}</table></div>`;
}
function cricketPad(m, thrower) {
  const st = C.state(m), s = C.curSide(m);
  const key = (n) => `<button class="dk ck ${st.marks[s][n] >= 3 ? 'closed' : ''}" data-act="dart" data-v="${n}">${n}</button>`;
  return `${restEntry(m, thrower)}${slots(m)}
    ${seg('mult', 'v', [[1, 'Single', 'm1'], [2, 'Double', 'm2'], [3, 'Triple', 'm3']], ui.mult, 'mults')}
    <div class="dgrid ckpad">${[20, 19, 18, 17, 16, 15].map(key).join('')}
      <button class="dk bull ${st.marks[s][25] >= 3 ? 'closed' : ''}" data-act="bull" data-v="1">25</button>
      <button class="dk b50 ${st.marks[s][25] >= 3 ? 'closed' : ''}" data-act="bull" data-v="2">Bull</button>
      <button class="dk miss" data-act="dart" data-v="0">Daneben</button>
      <button class="dk back" data-act="back" aria-label="Rückgängig">${icon('undo', 2.4, 24)}</button>
    </div>`;
}
