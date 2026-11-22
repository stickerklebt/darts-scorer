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
import { fieldAt, fieldName, aimBoard, ROMAN } from './aimboard.js';
import { labelOf } from '../board-geometry.js';
import { camThumb } from './camview.js';
import { realBoard } from './board.js';
import { isBot, bot } from '../bots.js';
import { avatar } from './avatar.js';
import { PLAYER_COLORS } from './svg.js';

const whoText = (m, s, thrower) => (isBot(thrower) ? `${nameOf(thrower)} wirft` : isTeam(m.sides[s]) ? `${possessive(nameOf(thrower))} Wurf` : `${nameOf(thrower)} ist dran`);
const chipCls = (d) => (d.n === 25 && d.m === 2 ? 'b' : d.m === 2 ? 'd' : '');

/** Ø-Angaben im Spiel ausblendbar (Einstellung „Average anzeigen“) */
/** Ø und Darts im Leg sind in den Einstellungen abschaltbar */
const statsShown = (stats) => stats.filter(([k]) => !(k === 'Ø' && S.prefs.showAvg === false) && !(k === 'Darts' && S.prefs.showDarts === false));

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

/** Kamera-Erkennung: 3 Dart-Slots (antippen = korrigieren), kleines Board mit den Treffern, Miss, Aufnahme beenden,
    Darts gezogen; nach 3 Darts 2 s Countdown (oder OK, wenn „automatisch übernehmen“ aus ist). */
function camBar(m, thrower) {
  if (!ui.camLive) return '';
  if (isBot(thrower) || (m.online && thrower !== S.mainId)) return `<div class="cambar idle"><span class="cb-wait">${icon('cam', 1.9, 16)} Kamera wartet – ${esc(nameOf(thrower))} ist dran</span></div>`;
  const d = ui.ct?.darts || [];
  const slot = (i) => {
    const x = d[i];
    if (!x) return `<span class="cb-slot empty">${ROMAN[i]}</span>`;
    return `<button class="cb-slot ${x.conf < 0.7 ? 'check' : ''}" data-act="camSlot" data-v="${i}"><b>${x.n === 0 ? '0' : esc(x.label)}</b><small>${x.conf < 0.7 ? 'Bitte prüfen' : x.fixed ? 'korrigiert' : `${x.n * x.m}`}</small></button>`;
  };
  const marks = d.filter((x) => Number.isFinite(x.x)).map((x, i) => ({ x: x.x, y: x.y, color: x.conf < 0.7 ? '#ffd23f' : '#f3e9d2', fly: false, n: i }));
  const auto = S.prefs.camAuto !== false;
  const end = d.length === 3
    ? (auto && ui.ct?.deadline ? `<span class="cb-count">Wertung in <b>${Math.max(0, Math.ceil((ui.ct.deadline - Date.now()) / 1000))}</b> s</span>` : '<button class="btn red" data-act="camOk">OK</button>')
    : `<button class="btn line" data-act="camEnd" ${d.length ? '' : 'disabled'}>Aufnahme beenden</button>`;
  return `<div class="cambar"><div class="cb-slots">${slot(0)}${slot(1)}${slot(2)}</div><div class="cb-mini">${realBoard(marks, 11)}</div>
    <div class="cb-acts"><button class="btn line" data-act="camMiss" ${d.length >= 3 ? 'disabled' : ''}>Miss / 0</button>${end}<button class="btn line" data-act="camPulled">Darts gezogen</button></div>
    ${m.game === 'x01' && ui.camManual ? '<button class="btn line cb-back" data-act="camKeys">Zur Kamera-Scheibe</button>' : ''}</div>`;
}

/** Kamera-Spiel: große Scheibe mit Punkten, wo die Darts stecken; darunter 3 Kästen. Kasten antippen → aufs richtige Feld tippen. */
function camPad(m, thrower) {
  const d = ui.ct?.darts || [], sel = Number.isInteger(ui.camSel) ? ui.camSel : null;
  const hits = d.map((x) => ({ n: x.n, m: x.m, z: x.z, x: x.ax, y: x.ay }));
  const slot = (i) => {
    const x = d[i];
    if (!x) return `<span class="cp-slot empty">${ROMAN[i]}. Dart</span>`;
    return `<button class="cp-slot ${x.conf < 0.7 ? 'check' : ''} ${sel === i ? 'sel' : ''}" data-act="camSel" data-v="${i}"><b>${x.n === 0 ? '0' : esc(labelOf(x).replace('BULL', 'Bull'))}</b>
      <small>${sel === i ? 'jetzt aufs Feld tippen' : x.conf < 0.7 ? 'bitte prüfen' : x.fixed ? 'korrigiert' : 'antippen zum Ändern'}</small></button>`;
  };
  const auto = S.prefs.camAuto !== false;
  const end = d.length === 3
    ? (auto && ui.ct?.deadline ? `<span class="cb-count">Wertung in <b>${Math.max(0, Math.ceil((ui.ct.deadline - Date.now()) / 1000))}</b> s</span>` : '<button class="btn red" data-act="camOk">OK</button>')
    : `<button class="btn line" data-act="camEnd" ${d.length ? '' : 'disabled'}>Aufnahme beenden</button>`;
  const unsure = d.some((x) => x.conf < 0.7);
  const hint = d.length === 3 && unsure && sel === null ? 'Die Kamera ist sich nicht sicher – gelbe Kästen prüfen, dann OK' : sel !== null ? 'Tippe auf das Feld, das wirklich getroffen wurde' : d.length < 3 ? `${esc(nameOf(thrower))} wirft – die Kamera trägt jeden Dart ein` : 'Alles richtig? Sonst Kasten antippen';
  return `<div class="campad"><div class="cp-head"><span>${hint}</span><b>Rest ${X.curRem(m) - X.pendingSum(m) - d.reduce((a, x) => a + x.n * x.m, 0)}</b></div>
    <div class="cp-board"><div class="aimbox" id="dartBoard">${aimBoard(hits)}</div></div>
    <div class="cp-slots">${slot(0)}${slot(1)}${slot(2)}</div>
    <div class="cp-acts"><button class="btn line" data-act="camMiss">${sel !== null ? 'War daneben' : 'Miss / 0'}</button>${end}<button class="btn line" data-act="camPulled">Darts gezogen</button><button class="btn line" data-act="camKeys">Tastatur</button></div></div>`;
}

/** Wer hat die letzte fertige Aufnahme geworfen? */
function lastTurnPid(m) {
  if (m.game === 'x01') { for (let i = m.legs.length - 1; i >= 0; i--) { const ts = m.legs[i].turns; if (ts.length) return ts[ts.length - 1].pid; } return null; }
  return m.turns.length ? m.turns[m.turns.length - 1].pid : null;
}

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
    pad = isBot(thrower) ? botPad(m, thrower, m.pending, cur) : mode === 'darts' ? (isBoard ? boardPad(m, thrower) : dartPad(m, thrower)) : sumPad(m, thrower);
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
    board = scoreboard(items, cur, swap);
    hint = `<div class="ticker"><span class="tk-w">${esc(whoText(m, cur, thrower))}</span></div>`;
    pad = ckBoard(m, st, cur, isBot(thrower)); // auch wenn der Bot wirft: Tafel bleibt (gesperrt), kein großes Dartboard
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
    pad = isBot(thrower) ? botPad(m, thrower, ui.botTurn?.s === cur ? ui.botTurn.darts : [], cur) : m.game === 'atc' ? hitsPad(m, thrower, cur) : sumPad(m, thrower);
  }
  // Kamera (X01): statt Tastatur die Kamera-Scheibe mit den Treffern; Tastatur nur auf Wunsch (Notfall)
  ui.camPadOn = false;
  if (m.game === 'x01' && ui.camLive && !ui.camManual && !isBot(thrower) && !(m.online && thrower !== S.mainId)) { pad = camPad(m, thrower); isBoard = true; ui.camPadOn = true; }
  // Online: ist der Freund dran, wartet dieses Gerät – statt Eingabe ein Hinweis
  if (m.online && thrower !== S.mainId) {
    // Solange der Freund noch nichts eingegeben hat, kann ich meine letzte Aufnahme zurücknehmen
    const mineLast = !m.pending?.length && lastTurnPid(m) === S.mainId;
    pad = `<div class="onl-turn"><span class="ot-dot"></span><b>${esc(nameOf(thrower))} wirft</b><small>auf seinem Gerät – du siehst jeden Dart hier</small>
      ${mineLast ? `<button class="btn line ot-undo" data-act="undo">${icon('undo', 2.4, 18)} Meine letzte Aufnahme zurücknehmen</button>` : ''}</div>`;
  }
  const botTurn = isBot(thrower);
  return `<div class="game ${isBoard ? 'boardmode' : ''} ${m.game === 'cricket' ? 'cricket' : ''} ${botTurn ? 'botturn' : ''}" style="${pcVars(cur)}">
    <div class="turnbar ${swap ? 'swap' : ''}"></div>
    <header class="gbar">
      <button class="sq" data-act="home" aria-label="Übersicht">${icon('chevL', 2.6)}</button>
      <div class="gtitle"><b>${title}</b><span>${sub}</span></div>
      <div class="gbar-r"><button class="sq cam-btn ${ui.camLive ? 'on' : ''}" data-act="cam" aria-label="Kamera">${icon('cam', 1.9)}</button>
      <button class="sq" data-act="gear" aria-label="Einstellungen">${icon('gear', 1.8)}</button></div>
    </header>
    <div class="gmain"><div class="gleft">${board}${ui.camPadOn ? `<div class="cam-under">${camThumb()}</div>` : ''}${hint}</div><div class="pad ${isBoard ? 'board' : ''}">${ui.camPadOn ? '' : camBar(m, thrower)}${pad}</div></div>
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
  return `<div class="entry"><span class="who">${esc(nameOf(thrower))}</span><span class="val ${ui.entry ? '' : 'is-empty'} ${ui.quickFlash ? 'flash' : ''}">${ui.entry || '0'}</span></div>
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
    if (!d) return `<div class="ahit ${now ? 'now' : ''}"><i>${ROMAN[i]}</i><b>${now ? 'Jetzt' : '–'}</b></div>`;
    return `<div class="ahit done m${d.n === 0 ? 0 : d.m}"><i>${ROMAN[i]}</i><b>${fieldName(d)}</b>${m.game === 'cricket' || d.n === 0 ? '' : `<small>${d.n * d.m}</small>`}</div>`;
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
function botPad(m, thrower, darts, s) {
  // Bot wirft: nur die Scheibe (groß, im Platz der Tastatur) mit seinen Darts und dem Feld daneben, darunter Rückgängig.
  const marks = (ui.botMarks?.[s] || []).map((d) => ({ x: d.x, y: d.y, color: PLAYER_COLORS[s % 6], fly: Date.now() - d.at < 450 }));
  const labels = marks.map((d, i) => (darts[i] ? `<g class="bp-lbl"><text x="${d.x + 16}" y="${d.y - 14}">${label(darts[i])}</text></g>` : '')).join('');
  const board = realBoard(marks, 9).replace('</svg>', `${labels}</svg>`);
  return `<div class="botpad"><div class="bp-board">${board}</div>
    <button class="btn dark" data-act="undo">${icon('undo', 2.4, 18)} Letzte eigene Eingabe zurück</button>
  </div>`;
}

/* ---------- Cricket: Tafel = Eingabe ----------
   Mitte: die Zahlen als Knöpfe (Single · Double · Triple, Punkte darunter), links/rechts die Treffer der Spieler:
   1 = Schrägstrich, 2 = X, 3 = X im Kreis. Haben alle ein Feld zu, wird die ganze Zeile durchgestrichen. */
/* Treffer-Zeichen von Hand: Pinselstriche mit spitzen Enden (nicht ganz gerade), beim dritten Treffer ein goldener,
   doppelter Ring wie mit der Feder gezogen (Anfang und Ende überlappen leicht), das Kreuz sitzt kleiner darin. */
const CK_S1 = 'M5.4 19.1 C8.6 15.6 12.9 10.3 18.3 5.1 C18.9 4.7 19.4 5.2 19 5.8 C14.4 11.1 10.3 16.1 6.7 19.8 C6.1 20.3 5.1 19.7 5.4 19.1Z';
const CK_S2 = 'M5.9 5.3 C6.3 4.8 7 4.9 7.4 5.4 C10.9 9.4 14.8 13.9 18.9 18.4 C19.3 19 18.6 19.6 18 19.2 C13.7 15.3 9.6 10.6 5.9 5.3Z';
const CK_RING = 'M12.6 2.5 C18 2.6 21.7 6.9 21.4 12.3 C21.1 17.7 16.9 21.6 11.6 21.4 C6.2 21.2 2.5 17 2.7 11.6 C2.9 6.8 6.4 3.1 11 2.7 C12.4 2.6 13.9 2.9 15.2 3.5';
const ckMark = (k) => {
  if (k <= 0) return '<i class="ckm"></i>';
  const cross = `<path d="${CK_S1}"/>${k >= 2 ? `<path d="${CK_S2}"/>` : ''}`;
  return `<svg class="ckm k${Math.min(k, 3)}" viewBox="0 0 24 24" aria-hidden="true">${k >= 3
    ? `<path class="ring" d="${CK_RING}"/><path class="ring2" d="M12 4.3 C16.6 4.2 19.8 7.7 19.6 12.2 C19.4 16.7 15.9 19.8 11.7 19.6 C7.3 19.4 4.4 16 4.5 11.7 C4.6 7.6 7.6 4.5 11.4 4.3"/><g class="x" transform="translate(12 12) scale(.6) translate(-12 -12)">${cross}</g>`
    : `<g class="x">${cross}</g>`}</svg>`;
};
/** Zahl mit kleinen Ringen drum herum: 1 Ring = Single, 2 = Double, 3 = Triple (Bull: 1 = 25, 2 = Bull) */
const ringed = (txt, k) => `<span class="ckring">${Array.from({ length: k }, (_, i) => `<i style="--r:${i}"></i>`).join('')}<b>${txt}</b></span>`;
function ckBoard(m, st, cur, locked = false) {
  const left = m.sides.map((_, s) => s).filter((s) => s % 2 === 0), right = m.sides.map((_, s) => s).filter((s) => s % 2 === 1);
  const markCells = (list, t) => list.map((s) => `<span class="ckc ${s === cur ? 'cur' : ''}" style="${pcVars(s)}">${ckMark(st.marks[s][t])}</span>`).join('');
  const head = (list) => list.map((s) => `<span class="ckh ${s === cur ? 'cur' : ''}" style="${pcVars(s)}">${esc(nameOf(m.sides[s][0]))}</span>`).join('');
  const rows = C.TARGETS.map((t) => {
    const dead = st.marks.every((mk) => mk[t] >= 3);
    const btn = (mult) => `<button class="ckn m${mult}" data-act="ckHit" data-n="${t}" data-m="${mult}" ${dead || locked ? 'disabled' : ''}>${ringed(t === 25 ? (mult === 2 ? 'Bull' : '25') : t, mult)}</button>`;
    const mid = t === 25 ? `${btn(1)}${btn(2)}` : `${btn(1)}${btn(2)}${btn(3)}`;
    return `<div class="ckr ${dead ? 'dead' : ''}"><span class="cks l">${markCells(left, t)}</span><span class="ckmid ${t === 25 ? 'bull' : ''}">${mid}</span><span class="cks r">${markCells(right, t)}</span></div>`;
  }).join('');
  const p = m.pending;
  const slotsHtml = [0, 1, 2].map((i) => `<span class="ckd ${p[i] ? 'on' : ''}">${p[i] ? (p[i].n === 0 ? '–' : label(p[i])) : ''}</span>`).join('');
  return `<div class="ckb ${locked ? 'locked' : ''}">
    <div class="ckb-bar">${slotsHtml}
      <button class="ckb-btn" data-act="back" aria-label="Rückgängig">${icon('undo', 2.4, 20)}</button>
      <button class="ckb-btn miss" data-act="ckMiss" ${locked ? 'disabled' : ''}>Daneben</button></div>
    <div class="ckb-grid"><div class="ckr ckhead"><span class="cks l">${head(left)}</span><span class="ckmid"></span><span class="cks r">${head(right)}</span></div>${rows}</div>
  </div>`;
}
