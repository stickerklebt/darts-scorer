/* Views (Meilenstein 1: alte Optik, neue Logik). Jede Funktion liefert HTML. */
import { S, ui, nameOf, sideName, isTeam, possessive } from '../store.js';
import * as X from '../x01.js';
import * as G from '../party.js';
import { route, setupFor, label } from '../checkout.js';
import { overview } from '../stats.js';
import { GAMES, MAX_PLAYERS } from '../games.js';

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',');

const P = {
  chevR: '<path d="M9 5l7 7-7 7"/>', chevL: '<path d="M15 5l-7 7 7 7"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M6 12h12"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
};
export const icon = (k, w = 2.2) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k]}</svg>`;

const sideTitle = (side) => (isTeam(side) ? `<span class="teamtag">TEAM</span> ${side.map((id) => esc(nameOf(id))).join(' · ')}` : esc(nameOf(side[0])));
export function matchSummary(m) {
  const name = m.game === 'x01' ? String(m.opts.start) : GAMES[m.game].title;
  return `${name} · ${m.sides.map((s) => esc(sideName(s))).join(' vs. ')}`;
}

/* ---------------- Onboarding & Startseite ---------------- */
export function onboardView() {
  return `<div class="onboard">
    <img class="appicon" src="icon-512.png" alt="">
    <h1>Willkommen bei Darts</h1>
    <p>Wie heißt du? Du bist der Hauptspieler dieser App.</p>
    <input id="nameField" class="field" placeholder="Dein Name" maxlength="16" autocomplete="given-name" autocapitalize="words" spellcheck="false" enterkeyhint="done">
    <button class="cta glass-accent" data-act="onboard">Weiter</button>
  </div>`;
}

export function homeView() {
  const ov = overview(S.matches, S.mainId), m = S.current;
  const name = nameOf(S.mainId);
  return `<div class="topnav"><span></span><button class="navbtn glass" data-act="settings" aria-label="Einstellungen">${icon('gear', 1.9)}</button></div>
  <div class="page" style="padding-top:0">
    <h1 class="lt">Darts</h1>
    <button class="profile" data-act="rename">
      <div class="avatar">${esc(name.slice(0, 1).toUpperCase())}</div>
      <div style="min-width:0"><div class="pn">${esc(name)}</div><div class="ps">${ov.matches} ${ov.matches === 1 ? 'Match' : 'Matches'} 501</div></div>
      <div class="pavg num"><span>Ø 501</span><b>${ov.avg === null ? '–' : fmt(ov.avg)}</b></div>
    </button>
    ${m && !m.done ? `<button class="resume glass" data-act="resume"><span class="dotlive"></span><span class="ct"><b>Laufendes Spiel fortsetzen</b><small>${matchSummary(m)}</small></span><span class="chev">${icon('chevR')}</span></button>` : ''}
    <h2 class="sh">Spiele</h2>
    <div class="list games">
      ${Object.entries(GAMES).map(([id, g]) => `<button class="cell" data-act="pick" data-v="${id}">
        <span class="tile">${g.tile}</span><span class="ct"><b>${g.title}</b></span><span class="chev">${icon('chevR')}</span></button>`).join('')}
    </div>
  </div>`;
}

/* ---------------- Setup ---------------- */
function seg(act, key, opts, cur) {
  return `<div class="seg">${opts.map(([v, l]) => `<button data-act="${act}" data-k="${key}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}
const optRow = (title, control) => `<div class="optrow"><span>${title}</span>${control}</div>`;

function gameOptions(id) {
  const o = S.opts[id];
  if (id === 'x01') {
    const tOpts = o.mode === 'sets' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 7];
    return `<div class="list">
      ${optRow('Startpunkte', seg('opt', 'start', [[301, '301'], [501, '501'], [701, '701']], o.start))}
      ${optRow('Check-Out', seg('opt', 'out', [['double', 'Double Out'], ['single', 'Single Out']], o.out))}
      ${optRow('Modus', seg('opt', 'mode', [['legs', 'Legs'], ['sets', 'Sets']], o.mode))}
      ${optRow(o.mode === 'sets' ? 'First to … Sets' : 'First to … Legs', seg('opt', 'target', tOpts.map((v) => [v, String(v)]), o.target))}
    </div>
    <p class="foot">${o.mode === 'sets' ? `Ein Set gewinnt, wer zuerst ${X.LEGS_PER_SET} Legs holt. ` : ''}Nur 501-Matches zählen für die Statistik.</p>`;
  }
  if (id === 'highscore') return `<div class="list">${optRow('Runden', seg('opt', 'rounds', [[5, '5'], [10, '10'], [15, '15'], [20, '20']], o.rounds))}</div>`;
  if (id === 'shanghai') return `<div class="list">${optRow('Ziele', seg('opt', 'rounds', [[7, '1 bis 7'], [10, '1 bis 10'], [20, '1 bis 20']], o.rounds))}</div>`;
  if (id === 'atc') return `<div class="list">${optRow('Ende', seg('opt', 'bull', [[1, 'Mit Bull'], [0, 'Bis 20']], o.bull))}</div>`;
  return `<div class="list"><div class="optrow"><span>Ziele</span><div style="font-size:17px">${G.HALF.map(G.halfLabel).join(' · ')}</div></div></div>`;
}

const TEAM_LETTERS = 'ABCDEF';
export function setupView() {
  const id = S.game, g = GAMES[id], L = S.lineup;
  const inLineup = new Set(L.map((e) => e.id));
  const saved = S.profiles.filter((p) => !inLineup.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const rows = L.map((e, i) => `<div class="cell prow">
      <span class="ord">${i + 1}</span>
      <span class="mainname">${esc(nameOf(e.id))}</span>
      ${e.id === S.mainId ? '<span class="badge">Du</span>' : ''}
      ${S.teamMode ? `<button class="teamchip tc${TEAM_LETTERS.indexOf(e.team)}" data-act="team" data-v="${i}">Team ${e.team}</button>` : ''}
      <button class="iconbtn" data-act="pup" data-v="${i}" ${i ? '' : 'disabled'} aria-label="Nach oben">${icon('up')}</button>
      <button class="iconbtn del" data-act="pdel" data-v="${i}" aria-label="Entfernen">${icon('minus', 2.6)}</button>
    </div>`).join('');
  const full = L.length >= MAX_PLAYERS;
  return `<div class="topnav"><button class="navbtn glass" data-act="home" aria-label="Zurück">${icon('chevL', 2.4)}</button></div>
  <div class="page withbar" style="padding-top:0">
    <h1 class="lt">${g.title}</h1>
    <p class="desc">${g.desc}</p>
    <h2 class="sh">Spieler</h2>
    <div class="list" style="margin-bottom:10px">${optRow('Spielweise', seg('teamMode', 'v', [[0, 'Jeder für sich'], [1, 'Teams']], S.teamMode ? 1 : 0))}</div>
    ${L.length ? `<div class="list" style="--inset:50px">${rows}</div>` : '<p class="foot">Noch keine Spieler ausgewählt.</p>'}
    <div class="addrow">
      <input id="newPlayer" placeholder="Neuer Spieler" maxlength="16" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" ${full ? 'disabled' : ''}>
      <button data-act="addNew" ${full ? 'disabled' : ''}>${icon('plus', 2.4)}</button>
    </div>
    ${saved.length ? `<div class="pchips">${saved.map((p) => `<button data-act="addProfile" data-v="${p.id}" ${full ? 'disabled' : ''}>${esc(p.name)}</button>`).join('')}</div>` : ''}
    <div class="linkrow"><button data-act="pshuffle" ${L.length < 2 ? 'disabled' : ''}>${icon('shuffle', 2.2)} Reihenfolge mischen</button></div>
    <p class="foot">Bis zu ${MAX_PLAYERS} Spieler. ${S.teamMode ? 'Tippe auf „Team“, um Spieler einem Team zuzuordnen. Im Team wird reihum geworfen, in der Reihenfolge dieser Liste.' : 'Wer oben steht, wirft zuerst.'}</p>
    <h2 class="sh">Einstellungen</h2>
    ${gameOptions(id)}
  </div>
  <div class="bottombar"><button class="cta glass-accent" data-act="start">Spiel starten</button></div>`;
}

/* ---------------- Spiel ---------------- */
function boardView(items, cur) {
  const n = items.length;
  if (n <= 2) {
    return `<div class="duo ${n === 1 ? 'solo' : ''}">${items.map((it, s) => `<div class="card ${s === cur ? 'on' : ''}">
      <div><div class="cname ${it.team ? 'team' : ''}">${it.starter ? '<span class="throw"></span>' : ''}<span>${it.title}</span></div>
      ${it.who ? `<div class="who-now">${esc(it.who)}</div>` : ''}${it.score ? `<div class="sl num">${it.score}</div>` : ''}</div>
      <div class="big num">${it.big}</div>
      <div class="cmeta num">${it.meta.map((x) => `<span>${x}</span>`).join('')}</div>
    </div>`).join('')}</div>`;
  }
  return `<div class="rows">${items.map((it, s) => `<div class="row ${s === cur ? 'on' : ''}">
    <div class="nm"><div class="rn ${it.team ? 'team' : ''}">${it.starter ? '<span class="throw"></span>' : ''}<span>${it.title}</span></div>
    <small class="num">${[it.who ? `<b class="whob">${esc(it.who)}</b>` : '', it.score, ...it.meta.slice(0, 2)].filter(Boolean).join(' · ')}</small></div>
    <div class="sc num">${it.big}</div>
  </div>`).join('')}</div>`;
}

export function gameView() {
  const m = S.current;
  let title, sub, cur, board, hint, pad, thrower;
  if (m.game === 'x01') {
    const l = X.leg(m); cur = X.curSide(m); thrower = X.curThrower(m);
    const ps = X.pendingSum(m);
    title = `${m.opts.start} · ${m.opts.out === 'double' ? 'Double Out' : 'Single Out'}`;
    sub = X.isSets(m) ? `Set ${l.set} · Leg ${m.legs.filter((x) => x.set === l.set).length} · First to ${m.opts.target} Sets` : `Leg ${m.legs.length} · First to ${m.opts.target} Legs`;
    const items = m.sides.map((side, s) => {
      const st = X.matchStats(m, { s });
      const mine = l.turns.filter((t) => t.s === s), last = mine[mine.length - 1];
      return {
        title: sideTitle(side), team: isTeam(side), starter: s === l.starter,
        who: isTeam(side) && s === cur ? `${possessive(nameOf(thrower))} Wurf` : '',
        big: X.rem(m, l, s) - (s === cur ? ps : 0),
        score: X.isSets(m) ? `Sets <b>${X.setsWon(m, s)}</b> · Legs <b>${X.legsInSet(m, s, l.set)}</b>` : `Legs <b>${X.legsWon(m, s)}</b>`,
        meta: [`Ø <b>${fmt(st.avg)}</b>`, `Letzte <b>${last ? (last.bust ? 'Bust' : last.score) : '–'}</b>`, `<b>${mine.reduce((a, t) => a + t.darts, 0)}</b> Darts`],
      };
    });
    board = boardView(items, cur);
    const mode = X.inputMode(m), before = X.curRem(m) - ps, left = 3 - m.pending.length;
    const dbl = m.opts.out === 'double';
    let h = '';
    if (mode === 'darts' && dbl && S.prefs.hints) {
      const r = route(before, left);
      if (r) h = `<span>Checkout</span>${r.map((d) => `<span class="chip">${label(d)}</span>`).join('')}`;
      else { const su = setupFor(before, left); if (su) h = `<span>Setup</span><span class="chip">${label(su.dart)}</span><span>→ ${su.leave} Rest</span>`; }
    }
    hint = `<div class="hint">${h || `<span><b>${esc(isTeam(m.sides[cur]) ? `${possessive(nameOf(thrower))} Wurf` : `${nameOf(thrower)} ist dran`)}</b></span>`}</div>`;
    pad = mode === 'darts' ? dartPad(m, thrower) : sumPad(m, thrower);
  } else {
    cur = G.curSide(m); thrower = G.curThrower(m);
    const round = G.round(m);
    title = GAMES[m.game].title;
    sub = m.game === 'atc' ? `Runde ${round + 1}` : `Runde ${round + 1} von ${G.rounds(m)}`;
    const items = m.sides.map((side, s) => {
      const turns = m.turns.filter((t) => t.s === s), last = turns[turns.length - 1];
      const meta = m.game === 'atc'
        ? [G.atcPos(m, s) >= G.atcTotal(m) ? 'Fertig' : `Ziel <b>${G.atcLabel(G.atcPos(m, s))}</b>`, `Letzte <b>${last ? last.v : '–'}</b>`]
        : [`Letzte <b>${last ? last.v : '–'}</b>`, `<b>${turns.length}</b> Runden`];
      return { title: sideTitle(side), team: isTeam(side), starter: s === m.first, score: '', meta,
        who: isTeam(side) && s === cur ? `${possessive(nameOf(thrower))} Wurf` : '',
        big: m.game === 'atc' ? `${G.atcPos(m, s)}/${G.atcTotal(m)}` : G.score(m, s) };
    });
    board = boardView(items, cur);
    let tgt = '';
    if (m.game === 'shanghai') tgt = `Ziel <b>${round + 1}</b>`;
    else if (m.game === 'halveit') tgt = `Ziel <b>${G.halfLabel(G.HALF[round])}</b>`;
    else if (m.game === 'atc') tgt = `Ziel <b>${G.atcLabel(G.atcPos(m, cur))}</b>`;
    const whoTxt = isTeam(m.sides[cur]) ? `${possessive(nameOf(thrower))} Wurf` : `${nameOf(thrower)} ist dran`;
    hint = `<div class="hint">${tgt ? `<span class="target">${tgt}</span><span>·</span>` : ''}<span><b>${esc(whoTxt)}</b></span></div>`;
    pad = m.game === 'atc' ? hitsPad(m, thrower, cur) : sumPad(m, thrower);
  }
  return `<div class="game">
    <div class="gtop">
      <button class="navbtn glass" data-act="home" aria-label="Übersicht">${icon('chevL', 2.4)}</button>
      <div class="gtitle"><b>${title}</b><span>${sub}</span></div>
      <button class="navbtn glass" data-act="gear" aria-label="Einstellungen">${icon('gear', 1.9)}</button>
    </div>
    <div class="gmain"><div class="gleft">${board}${hint}</div><div class="pad">${pad}</div></div>
  </div>`;
}

function sumPad(m, thrower) {
  let quick = [];
  if (m.game === 'x01' || m.game === 'highscore') quick = [26, 41, 45, 60, 81, 85, 100, 140, 180];
  else if (m.game === 'shanghai') { const t = G.round(m) + 1; quick = [1, 2, 3, 4, 5, 6].map((k) => k * t); }
  else if (m.game === 'halveit') {
    const t = G.HALF[G.round(m)];
    quick = typeof t === 'number' ? [1, 2, 3, 4, 5, 6].map((k) => k * t) : t === 'B' ? [25, 50, 75, 100] : [];
  }
  const k = (v) => `<button class="key" data-act="key" data-v="${v}">${v}</button>`;
  const okLabel = m.game === 'halveit' && !ui.entry ? 'Verfehlt' : 'OK';
  return `<div class="entry"><span class="who">${esc(nameOf(thrower))}</span><span class="v num ${ui.entry ? '' : 'empty'}">${ui.entry || '0'}</span></div>
    ${quick.length ? `<div class="quick num">${quick.map((v) => `<button data-act="quick" data-v="${v}">${v}</button>`).join('')}</div>` : ''}
    <div class="keys num">${k(1)}${k(2)}${k(3)}${k(4)}${k(5)}${k(6)}${k(7)}${k(8)}${k(9)}
      <button class="key" data-act="back" aria-label="${ui.entry ? 'Löschen' : 'Rückgängig'}">${ui.entry ? '⌫' : icon('undo', 2)}</button>
      ${k(0)}<button class="key ok" data-act="ok">${okLabel}</button></div>`;
}

function dartPad(m, thrower) {
  const p = m.pending;
  const slots = [0, 1, 2].map((i) => `<div class="slot ${p[i] ? 'filled' : ''}">${p[i] ? label(p[i]) : '_'}</div>`).join('');
  let nums = '';
  for (let i = 1; i <= 20; i++) nums += `<button class="dk" data-act="dart" data-v="${i}">${i}</button>`;
  return `<div class="entry"><span class="who">${esc(nameOf(thrower))}</span><span class="v num" style="font-size:28px">${X.curRem(m) - X.pendingSum(m)}<small class="restlbl"> Rest</small></span></div>
    <div class="slots num">${slots}<div class="slot sum">${X.pendingSum(m)}</div></div>
    ${seg('mult', 'v', [[1, 'Single'], [2, 'Double'], [3, 'Triple']], ui.mult)}
    <div class="dgrid num">${nums}
      <button class="dk bull" data-act="bull" data-v="1">25</button>
      <button class="dk bull" data-act="bull" data-v="2">Bull</button>
      <button class="dk miss" data-act="dart" data-v="0">Miss</button>
      <button class="dk back" data-act="back" aria-label="Rückgängig">${icon('undo', 2)}</button>
    </div>`;
}

function hitsPad(m, thrower, cur) {
  const left = Math.min(3, G.atcTotal(m) - G.atcPos(m, cur));
  return `<div class="entry"><span class="who">${esc(nameOf(thrower))}</span><span class="v" style="font-size:20px;color:var(--label2)">Wie viele Ziele getroffen?</span></div>
    <div class="keys four num">
      ${[0, 1, 2, 3].map((h) => `<button class="key" data-act="hits" data-v="${h}" ${h > left ? 'disabled' : ''}>${h}</button>`).join('')}
      <button class="key wide" data-act="back">${icon('undo', 2)}</button>
    </div>`;
}

/* ---------------- Ergebnis ---------------- */
export function resultView() {
  const m = S.current, w = m.winners;
  const head = w.length > 1 ? 'Unentschieden' : `${esc(sideName(m.sides[w[0]]))} gewinnt`;
  let body;
  if (m.game === 'x01') {
    const st = m.sides.map((_, s) => X.matchStats(m, { s }));
    const sub = m.sides.length > 1 ? (X.isSets(m) ? m.sides.map((_, s) => X.setsWon(m, s)).join(' : ') + ' Sets' : m.sides.map((_, s) => X.legsWon(m, s)).join(' : ') + ' Legs') : `${st[0].darts} Darts · Ø ${fmt(st[0].avg)}`;
    const rows = [
      ['Ø 3 Darts', (s) => fmt(st[s].avg, 2)], ['First 9 Ø', (s) => fmt(st[s].f9, 2)],
      ...(X.isSets(m) ? [['Sets', (s) => X.setsWon(m, s)]] : []), ['Legs', (s) => X.legsWon(m, s)],
      ['Höchste Aufnahme', (s) => st[s].high], ['100+', (s) => st[s].t100], ['140+', (s) => st[s].t140], ['180', (s) => st[s].t180],
      ['Höchstes Finish', (s) => st[s].hco || '–'], ['Bestes Leg', (s) => (st[s].best ? `${st[s].best} Darts` : '–')], ['Darts', (s) => st[s].darts],
    ];
    const anyTeam = m.sides.some(isTeam);
    body = `<div class="trophy"><div class="t glass">${icon('trophy', 1.8)}</div><h1>${head}</h1><p class="num">${sub}</p></div>
      <h2 class="sh">Statistik</h2>
      <div class="tablewrap"><table class="num">
        <tr><th></th>${m.sides.map((side, s) => `<th class="${w.includes(s) ? 'win' : ''}">${esc(isTeam(side) ? `Team ${side.map(nameOf).join(' · ')}` : nameOf(side[0]))}</th>`).join('')}</tr>
        ${rows.map(([l, f]) => `<tr><td>${l}</td>${m.sides.map((_, s) => `<td>${f(s)}</td>`).join('')}</tr>`).join('')}
      </table></div>
      ${anyTeam ? `<h2 class="sh">Pro Spieler</h2><div class="list">${m.playerIds.map((pid) => { const ps = X.matchStats(m, { pid }); return `<div class="cell"><span class="ct"><b>${esc(nameOf(pid))}</b><small class="num">${ps.darts} Darts · Höchste ${ps.high}</small></span><span class="val num" style="font-size:20px;font-weight:600">Ø ${fmt(ps.avg)}</span></div>`; }).join('')}</div>` : ''}`;
  } else {
    const order = m.sides.map((side, s) => ({ side, s, v: G.score(m, s) })).sort((a, b) => b.v - a.v);
    const unit = m.game === 'atc' ? ` / ${G.atcTotal(m)}` : '';
    body = `<div class="trophy"><div class="t glass">${icon('trophy', 1.8)}</div><h1>${head}</h1><p>${GAMES[m.game].title}</p></div>
      <h2 class="sh">Ergebnis</h2>
      <div class="list rank">${order.map((o, i) => `<div class="cell"><span class="pos ${w.includes(o.s) ? 'first' : ''}">${i + 1}</span><span class="ct"><b>${sideTitle(o.side)}</b></span><span class="val num">${o.v}${unit}</span></div>`).join('')}</div>`;
  }
  return `<div class="page">${body}
    <div class="stack">
      <button class="cta glass-accent" data-act="rematch">Revanche</button>
      <button class="cta glass plain" data-act="home">Zur Übersicht</button>
      <button class="textbtn" data-act="undo">Letzte Eingabe zurücknehmen</button>
    </div></div>`;
}

/* ---------------- Dialoge ---------------- */
const sw = (k) => `<button class="cell" data-act="pref" data-k="${k}"><span class="lbl">${k === 'voice' ? 'Ansage' : 'Checkout-Hilfe'}</span><span class="switch ${S.prefs[k] ? 'on' : ''}"></span></button>`;
export function modalView() {
  const md = ui.modal, m = S.current;
  if (!md) return '';
  let inner = '';
  if (md.type === 'leg') {
    const prevSet = m.legs[m.legs.length - 2].set;
    const stand = X.isSets(m)
      ? m.sides.map((_, s) => X.setsWon(m, s)).join(' : ') + ' Sets' + (md.set ? '' : ` · ${m.sides.map((_, s) => X.legsInSet(m, s, prevSet)).join(' : ')} Legs`)
      : m.sides.map((_, s) => X.legsWon(m, s)).join(' : ') + ' Legs';
    inner = `<h3>${md.set ? 'Set' : 'Leg'} an ${esc(sideName(m.sides[md.s]))}</h3>
      <p class="num">${esc(nameOf(md.pid))} checkt ${md.score} mit ${md.darts} Dart${md.darts > 1 ? 's' : ''}<br>Stand ${stand}</p>
      <div class="btns"><button class="glass-accent" data-act="closeModal">Weiter</button></div>
      <button class="textbtn" data-act="undo" style="margin-top:8px">Rückgängig</button>`;
  } else if (md.type === 'gear') {
    const o = m.opts;
    const info = m.game === 'x01'
      ? [['Startpunkte', o.start], ['Check-Out', o.out === 'double' ? 'Double Out' : 'Single Out'], ['Modus', `First to ${o.target} ${o.mode === 'sets' ? 'Sets' : 'Legs'}`]]
      : [['Spiel', GAMES[m.game].title], ...(m.game === 'atc' ? [] : [['Runden', G.rounds(m)]])];
    inner = `<h3>Einstellungen</h3><p>${matchSummary(m)}</p>
      <div class="list">${sw('voice')}${m.game === 'x01' ? sw('hints') : ''}</div>
      <div class="list">${info.map(([a, b]) => `<div class="cell"><span class="lbl">${a}</span><span class="val">${b}</span></div>`).join('')}</div>
      <div class="btns"><button class="danger" data-act="abort">Spiel beenden</button><button class="neutral" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'settings') {
    inner = `<h3>Einstellungen</h3><p>${S.profiles.length} Spieler · ${S.matches.length} gespeicherte Spiele</p>
      <div class="list">${sw('voice')}${sw('hints')}</div>
      <div class="btns"><button class="danger" data-act="wipe">Alle Daten löschen</button><button class="neutral" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'wipe') {
    inner = `<h3>Alle Daten löschen?</h3><p>Alle Spieler, Spiele und Statistiken werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.</p>
      <div class="btns"><button class="neutral" data-act="settings">Abbrechen</button><button class="danger" data-act="wipeForce">Löschen</button></div>`;
  } else if (md.type === 'rename') {
    inner = `<h3>Dein Name</h3><p>Der Hauptspieler dieser App.</p>
      <input id="nameField" class="field" value="${esc(nameOf(S.mainId))}" maxlength="16" autocapitalize="words" spellcheck="false" enterkeyhint="done">
      <div class="btns"><button class="neutral" data-act="closeModal">Abbrechen</button><button class="glass-accent" data-act="saveName">Sichern</button></div>`;
  } else if (md.type === 'confirmNew') {
    inner = `<h3>Neues Spiel starten?</h3><p>Das laufende Spiel (${matchSummary(m)}) wird beendet und nicht gespeichert.</p>
      <div class="btns"><button class="neutral" data-act="closeModal">Abbrechen</button><button class="glass-accent" data-act="startForce">Starten</button></div>`;
  } else if (md.type === 'abort') {
    inner = `<h3>Spiel beenden?</h3><p>Der Spielstand geht verloren und zählt nicht für die Statistik.</p>
      <div class="btns"><button class="neutral" data-act="gear">Abbrechen</button><button class="danger" data-act="abortForce">Beenden</button></div>`;
  }
  return `<div class="scrim" data-act="scrim"><div class="sheet">${inner}</div></div>`;
}
