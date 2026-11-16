'use strict';
/* Darts Scorer – X01 (301/501/701). Alles lokal, Spielstand in localStorage. */

const STORE = 'dartscorer.v1';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ================= Darts & Checkout-Tabelle ================= */
const ALL = [];
for (let n = 1; n <= 20; n++) for (let m = 1; m <= 3; m++) ALL.push({ n, m });
ALL.push({ n: 25, m: 1 }, { n: 25, m: 2 });
const DOUBLES = ALL.filter((d) => d.m === 2);
const val = (d) => d.n * d.m;
const label = (d) => (d.n === 0 ? '0' : d.n === 25 ? (d.m === 2 ? 'Bull' : '25') : (d.m === 3 ? 'T' : d.m === 2 ? 'D' : '') + d.n);

// Bevorzugte Doppel (beliebte Profi-Doppel zuerst)
const DPREF = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 25, 1];
const dCost = (d) => DPREF.indexOf(d.n) * 2;
const sCost = (d) => (d.n === 25 ? (d.m === 2 ? 9 : 6) : d.m === 3 ? (20 - d.n) * 2 : d.m === 1 ? 3 + (20 - d.n) * 0.3 : 15 + (20 - d.n) * 0.3);

// CO[k] = beste Finish-Route mit höchstens k Darts (Double-Out)
const CO = [null, new Map(), new Map(), new Map()];
// SUMK[k] = alle Summen, die mit höchstens k Darts erreichbar sind (Single-Out)
const SUMK = [null, new Set(), new Set(), new Set()];
const POSS = new Set(); // alle möglichen Aufnahme-Werte (0–180)
(function build() {
  const consider = (k, route, cost) => {
    const s = route.reduce((a, d) => a + val(d), 0);
    for (let j = k; j <= 3; j++) {
      const cur = CO[j].get(s);
      if (!cur || cost < cur.cost) CO[j].set(s, { route, cost });
    }
  };
  for (const d of DOUBLES) consider(1, [d], 1000 + dCost(d));
  for (const a of ALL) for (const d of DOUBLES) consider(2, [a, d], 2000 + sCost(a) + dCost(d));
  for (const a of ALL) for (const b of ALL) {
    if (val(b) > val(a)) continue;
    const c0 = 3000 + sCost(a) + sCost(b);
    for (const d of DOUBLES) consider(3, [a, b, d], c0 + dCost(d));
  }
  const vals = [...new Set(ALL.map(val))];
  for (const a of vals) { for (let j = 1; j <= 3; j++) SUMK[j].add(a); }
  for (const a of vals) for (const b of vals) { SUMK[2].add(a + b); SUMK[3].add(a + b); }
  for (const a of SUMK[2]) for (const b of vals) SUMK[3].add(a + b);
  POSS.add(0);
  for (const v of SUMK[3]) POSS.add(v);
})();

const checkoutRoute = (rem, dartsLeft) => (rem > 0 && rem <= 170 && dartsLeft > 0 ? CO[dartsLeft].get(rem)?.route : null);
function minOut(rem, dbl) {
  for (let k = 1; k <= 3; k++) if (dbl ? CO[k].has(rem) : SUMK[k].has(rem)) return k;
  return 0;
}

/* ================= Zustand ================= */
const DEFAULTS = {
  screen: 'setup',
  setup: { players: ['Spieler 1', 'Spieler 2'], start: 501, doubleOut: true, legs: 2, input: 'sum', voice: true },
  match: null,
};
let S;
try { S = JSON.parse(localStorage.getItem(STORE)); } catch (e) { S = null; }
if (!S || !S.setup) S = JSON.parse(JSON.stringify(DEFAULTS));
const ui = { entry: '', mult: 1, modal: null, toast: null };
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* privater Modus */ } };

/* ================= Match-Logik ================= */
function newMatch(starter, players, cfg) {
  return {
    players, start: cfg.start, doubleOut: cfg.doubleOut, legsToWin: cfg.legsToWin,
    legs: [{ starter: starter % players.length, turns: [] }],
    pending: [], winner: null, matchStarter: starter % players.length,
  };
}
const curLeg = (m) => m.legs[m.legs.length - 1];
const curPlayer = (m) => { const l = curLeg(m); return (l.starter + l.turns.length) % m.players.length; };
const remaining = (m, leg, p) => leg.turns.reduce((r, t) => (t.p === p ? r - t.score : r), m.start);
const legsWon = (m, p) => m.legs.filter((l) => l.winner === p).length;
const pendingSum = (m) => m.pending.reduce((a, d) => a + val(d), 0);

function recordTurn(t) {
  const m = S.match, leg = curLeg(m);
  t.p = curPlayer(m);
  leg.turns.push(t);
  m.pending = [];
  ui.mult = 1;
  speak(t);
  if (t.out) {
    leg.winner = t.p;
    if (legsWon(m, t.p) >= m.legsToWin) {
      m.winner = t.p;
      S.screen = 'result';
      releaseWakeLock();
    } else {
      m.legs.push({ starter: (leg.starter + 1) % m.players.length, turns: [] });
      ui.modal = { type: 'leg', p: t.p, score: t.score, darts: t.darts };
    }
  } else if (t.bust) {
    toast('Überworfen!');
  }
  render();
}

function undo() {
  const m = S.match;
  if (!m) return;
  ui.modal = null;
  if (m.pending.length) { m.pending.pop(); return render(); }
  let leg = curLeg(m);
  if (!leg.turns.length) {
    if (m.legs.length === 1) return render();
    m.legs.pop();
    leg = curLeg(m);
  }
  const t = leg.turns.pop();
  if (!t) return render();
  if (t.out) { delete leg.winner; m.winner = null; }
  if (S.setup.input === 'darts' && t.list && t.list.length > 1) m.pending = t.list.slice(0, -1);
  if (S.screen === 'result') { S.screen = 'game'; requestWakeLock(); }
  render();
}

function submitScore(score) {
  const m = S.match;
  ui.entry = '';
  if (!(score >= 0 && score <= 180) || !POSS.has(score)) { toast(`${score} ist nicht möglich`); return render(); }
  const p = curPlayer(m), rem = remaining(m, curLeg(m), p), nr = rem - score;
  if (nr < 0 || (m.doubleOut && nr === 1)) return recordTurn({ score: 0, darts: 3, bust: true, entered: score });
  if (nr === 0) {
    const k = minOut(rem, m.doubleOut);
    if (!k) { toast(`${rem} ist kein mögliches Finish`); return render(); }
    if (k === 3) return recordTurn({ score, darts: 3, out: true });
    ui.modal = { type: 'darts', score, min: k };
    return render();
  }
  recordTurn({ score, darts: 3 });
}

function throwDart(n, mult) {
  const m = S.match;
  const d = { n, m: mult };
  m.pending.push(d);
  ui.mult = 1;
  const rem = remaining(m, curLeg(m), curPlayer(m));
  const sum = pendingSum(m), nr = rem - sum, list = m.pending.slice();
  if (nr < 0 || (m.doubleOut && nr === 1) || (nr === 0 && m.doubleOut && d.m !== 2))
    return recordTurn({ score: 0, darts: 3, bust: true, list });
  if (nr === 0) return recordTurn({ score: sum, darts: list.length, out: true, list });
  if (list.length === 3) return recordTurn({ score: sum, darts: 3, list });
  render();
}

function stats(m, p) {
  let pts = 0, darts = 0, f9p = 0, f9d = 0, high = 0, t100 = 0, t140 = 0, t180 = 0, co = 0, hco = 0, best = null;
  for (const leg of m.legs) {
    let n = 0, legDarts = 0;
    for (const t of leg.turns) {
      if (t.p !== p) continue;
      pts += t.score; darts += t.darts; legDarts += t.darts;
      if (n < 3) { f9p += t.score; f9d += t.darts; }
      n++;
      high = Math.max(high, t.score);
      if (t.score === 180) t180++; else if (t.score >= 140) t140++; else if (t.score >= 100) t100++;
      if (t.out) { co++; hco = Math.max(hco, t.score); if (best === null || legDarts < best) best = legDarts; }
    }
  }
  return { avg: darts ? (pts / darts) * 3 : 0, f9: f9d ? (f9p / f9d) * 3 : 0, high, t100, t140, t180, co, hco, best, darts };
}

/* ================= Sprachausgabe & Display an ================= */
function speak(t) {
  if (!S.setup.voice || !('speechSynthesis' in window)) return;
  const m = S.match;
  let txt;
  if (t.out) txt = legsWon(m, t.p) >= m.legsToWin ? `Spiel, ${m.players[t.p]}!` : `Leg, ${m.players[t.p]}!`;
  else if (t.bust) txt = 'Überworfen';
  else if (t.score === 0) txt = 'Kein Score';
  else if (t.score === 180) txt = 'Einhundertachtzig!';
  else txt = String(t.score);
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt);
    u.lang = 'de-DE'; u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}

let wakeLock = null;
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.screen === 'game') requestWakeLock(); });

let toastTimer = null;
function toast(msg) {
  ui.toast = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { ui.toast = null; render(); }, 1700);
}

/* ================= Views ================= */
function seg(key, opts, cur) {
  return `<div class="seg">${opts.map(([v, l]) =>
    `<button data-act="set" data-k="${key}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}

function setupView() {
  const st = S.setup;
  const running = S.match && S.screen !== 'result' && S.match.winner === null;
  const modes = [
    ['X01', '301 / 501 / 701', true],
    ['Cricket', 'bald', false],
    ['Around the Clock', 'bald', false],
    ['Killer', 'bald', false],
    ['Shanghai', 'bald', false],
  ];
  return `<div class="setup">
    <h1>🎯 Darts <span>Scorer</span></h1>
    ${running ? `<button class="big" data-act="resume">Laufendes Spiel fortsetzen</button><div style="height:14px"></div>` : ''}
    <div class="sec"><h2>Spiel</h2>
      <div class="modes">${modes.map(([n, s, on]) => `<button class="mode ${on ? 'on' : ''}" ${on ? '' : 'disabled'}><b>${n}</b><small>${s}</small></button>`).join('')}</div>
    </div>
    <div class="sec"><h2>Einstellungen</h2>
      <div class="opt"><span>Start</span>${seg('start', [[301, '301'], [501, '501'], [701, '701']], st.start)}</div>
      <div class="opt"><span>Finish</span>${seg('doubleOut', [[1, 'Double Out'], [0, 'Single Out']], st.doubleOut ? 1 : 0)}</div>
      <div class="opt"><span>Legs (First to)</span>${seg('legs', [[1, '1'], [2, '2'], [3, '3'], [5, '5'], [7, '7']], st.legs)}</div>
      <div class="opt"><span>Eingabe</span>${seg('input', [['sum', 'Aufnahme'], ['darts', 'Einzeldarts']], st.input)}</div>
      <div class="opt"><span>Ansage</span>${seg('voice', [[1, 'An'], [0, 'Aus']], st.voice ? 1 : 0)}</div>
    </div>
    <div class="sec"><h2>Spieler (erster wirft zuerst)</h2>
      ${st.players.map((n, i) => `<div class="prow">
        <span class="pnum">${i + 1}</span>
        <input data-i="${i}" value="${esc(n)}" maxlength="16" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done">
        <button data-act="pup" data-v="${i}" ${i ? '' : 'disabled'} aria-label="nach oben">↑</button>
        <button data-act="pdel" data-v="${i}" ${st.players.length > 1 ? '' : 'disabled'} aria-label="entfernen">✕</button>
      </div>`).join('')}
      <div class="row">
        <button data-act="padd" ${st.players.length >= 8 ? 'disabled' : ''}>+ Spieler</button>
        <button data-act="pshuffle" ${st.players.length < 2 ? 'disabled' : ''}>🔀 Reihenfolge mischen</button>
      </div>
    </div>
    <button class="big" data-act="start">${running ? 'Neues Spiel starten' : 'Spiel starten'}</button>
  </div>`;
}

function gameView() {
  const m = S.match, leg = curLeg(m), cp = curPlayer(m), n = m.players.length;
  const ps = pendingSum(m);
  const cls = n === 1 ? 'n1' : n <= 2 ? 'n2' : n <= 4 ? 'n' + n : 'many';
  const cards = m.players.map((name, p) => {
    const st = stats(m, p);
    let rem = remaining(m, leg, p);
    if (p === cp) rem -= ps;
    const mine = leg.turns.filter((t) => t.p === p);
    const last = mine[mine.length - 1];
    const legDarts = mine.reduce((a, t) => a + t.darts, 0);
    const won = legsWon(m, p);
    const legs = m.legsToWin > 1 ? '●'.repeat(won) + '○'.repeat(Math.max(0, m.legsToWin - won)) : '';
    return `<div class="pcard ${p === cp ? 'active' : ''}">
      <div><div class="pname">${p === leg.starter ? '<span class="throw" title="Anwurf"></span>' : ''}${esc(name)}</div>
      <div class="legs">${legs}</div></div>
      <div class="rem num">${rem}</div>
      <div class="pmeta num"><span>Ø <b>${st.avg.toFixed(1)}</b></span><span>Letzte <b>${last ? (last.bust ? 'Bust' : last.score) : '–'}</b></span><span><b>${legDarts}</b> Darts</span></div>
    </div>`;
  }).join('');

  // Checkout-Hinweis
  const rem = remaining(m, leg, cp) - ps;
  const left = 3 - m.pending.length;
  let co = '';
  if (m.doubleOut) {
    const r = checkoutRoute(rem, left);
    if (r) co = `<div class="checkout"><span class="lbl">Checkout</span>${r.map((d) => `<span class="chip">${label(d)}</span>`).join('')}</div>`;
    else if (rem <= 170 && rem > 1) co = `<div class="checkout none">Kein Finish mit ${left} Dart${left > 1 ? 's' : ''} – stellen</div>`;
  }
  if (!co) co = `<div class="checkout none">Leg ${m.legs.length} · ${esc(m.players[cp])} ist dran</div>`;

  const pad = S.setup.input === 'darts' ? dartPad(m) : sumPad(m, cp);
  return `<div class="game">
    <div class="top">
      <button data-act="menu">‹ Menü</button>
      <div class="info"><b>${m.start}</b> · ${m.doubleOut ? 'Double Out' : 'Single Out'}<br>First to ${m.legsToWin} Leg${m.legsToWin > 1 ? 's' : ''} · Leg ${m.legs.length}</div>
      <button data-act="toggleInput">${S.setup.input === 'darts' ? '🔢 Summe' : '🎯 Darts'}</button>
    </div>
    <div class="main">
      <div class="boardwrap"><div class="board ${cls}">${cards}</div>${co}</div>
      <div class="pad">${pad}</div>
    </div>
  </div>`;
}

function sumPad(m, cp) {
  const quick = [26, 41, 45, 60, 81, 85, 100, 140, 180];
  const k = (v) => `<button data-act="key" data-v="${v}">${v}</button>`;
  return `<div class="entry"><span class="who">${esc(m.players[cp])}</span><span class="val num ${ui.entry ? '' : 'empty'}">${ui.entry || '0'}</span></div>
    <div class="quick">${quick.map((v) => `<button data-act="quick" data-v="${v}">${v}</button>`).join('')}</div>
    <div class="keys num">
      ${k(1)}${k(2)}${k(3)}${k(4)}${k(5)}${k(6)}${k(7)}${k(8)}${k(9)}
      <button class="back" data-act="back">${ui.entry ? '⌫' : '↶'}</button>
      ${k(0)}
      <button class="ok" data-act="ok">OK</button>
    </div>`;
}

function dartPad(m) {
  const slots = [0, 1, 2].map((i) => {
    const d = m.pending[i];
    return `<div class="slot ${d ? 'filled' : ''}">${d ? label(d) : '–'}</div>`;
  }).join('');
  let nums = '';
  for (let i = 1; i <= 20; i++) nums += `<button data-act="dart" data-v="${i}">${i}</button>`;
  return `<div class="slots num">${slots}<div class="slot sum">${pendingSum(m)}</div></div>
    <div class="mults">
      <button class="d ${ui.mult === 2 ? 'on' : ''}" data-act="mult" data-v="2">Double</button>
      <button class="t ${ui.mult === 3 ? 'on' : ''}" data-act="mult" data-v="3">Triple</button>
    </div>
    <div class="dgrid num">${nums}
      <button class="bull" data-act="bull" data-v="1">25</button>
      <button class="bull" data-act="bull" data-v="2">Bull</button>
      <button class="miss" data-act="dart" data-v="0">0</button>
      <button class="back" data-act="back">↶ Zurück</button>
    </div>`;
}

function resultView() {
  const m = S.match, w = m.winner;
  const st = m.players.map((_, p) => stats(m, p));
  const rows = [
    ['Legs', (p) => legsWon(m, p)],
    ['Ø (3 Darts)', (p) => st[p].avg.toFixed(2)],
    ['First 9 Ø', (p) => st[p].f9.toFixed(2)],
    ['Höchste Aufnahme', (p) => st[p].high],
    ['100+', (p) => st[p].t100],
    ['140+', (p) => st[p].t140],
    ['180', (p) => st[p].t180],
    ['Höchstes Finish', (p) => st[p].hco || '–'],
    ['Bestes Leg', (p) => (st[p].best ? st[p].best + ' Darts' : '–')],
    ['Darts gesamt', (p) => st[p].darts],
  ];
  const sub = m.players.length > 1 ? m.players.map((_, p) => legsWon(m, p)).join(' : ') : `${st[0].darts} Darts`;
  return `<div class="result">
    <div class="trophy"><div class="t">🏆</div><h1>${esc(m.players[w])} gewinnt!</h1><p class="num">${sub}</p></div>
    <div class="tablewrap"><table class="num">
      <tr><th></th>${m.players.map((n, p) => `<th class="${p === w ? 'win' : ''}">${esc(n)}</th>`).join('')}</tr>
      ${rows.map(([l, f]) => `<tr><td>${l}</td>${m.players.map((_, p) => `<td>${f(p)}</td>`).join('')}</tr>`).join('')}
    </table></div>
    <button class="big" data-act="rematch">Revanche</button>
    <button class="ghost" data-act="newgame">Neues Spiel</button>
    <button class="ghost" data-act="undo">↶ Letzten Wurf zurücknehmen</button>
  </div>`;
}

function modalView() {
  const md = ui.modal;
  if (!md) return '';
  if (md.type === 'darts') {
    const btns = [];
    for (let k = md.min; k <= 3; k++) btns.push(`<button class="${k === md.min ? 'primary' : ''}" data-act="codarts" data-v="${k}">${k}</button>`);
    return `<div class="overlay"><div class="modal"><h3>Checkout ${md.score}! 🎯</h3><p>Mit wie vielen Darts?</p>
      <div class="row">${btns.join('')}</div><button class="link" data-act="closeModal">Abbrechen</button></div></div>`;
  }
  if (md.type === 'leg') {
    const m = S.match;
    return `<div class="overlay" data-act="closeModal"><div class="modal"><h3>Leg an ${esc(m.players[md.p])}! 🎯</h3>
      <p class="num">Finish ${md.score} mit ${md.darts} Dart${md.darts > 1 ? 's' : ''} · Stand ${m.players.map((_, p) => legsWon(m, p)).join(' : ')}</p>
      <button class="big" data-act="closeModal">Nächstes Leg</button>
      <button class="link" data-act="undo">↶ Rückgängig</button></div></div>`;
  }
  if (md.type === 'confirmNew') {
    return `<div class="overlay"><div class="modal"><h3>Neues Spiel?</h3><p>Das laufende Spiel wird beendet.</p>
      <div class="row"><button data-act="closeModal">Abbrechen</button><button class="primary" data-act="startForce">Starten</button></div></div></div>`;
  }
  return '';
}

function render() {
  save();
  let html;
  if (S.screen === 'game' && S.match) html = gameView();
  else if (S.screen === 'result' && S.match && S.match.winner !== null) html = resultView();
  else { S.screen = 'setup'; html = setupView(); }
  html += modalView();
  if (ui.toast) html += `<div class="toast">${esc(ui.toast)}</div>`;
  $('#app').innerHTML = html;
}

/* ================= Aktionen ================= */
function startGame() {
  const st = S.setup;
  st.players = st.players.map((n, i) => n.trim() || `Spieler ${i + 1}`);
  S.match = newMatch(0, st.players.slice(), { start: st.start, doubleOut: st.doubleOut, legsToWin: st.legs });
  S.screen = 'game';
  ui.entry = ''; ui.modal = null; ui.mult = 1;
  requestWakeLock();
  render();
}

const actions = {
  set(el) {
    const k = el.dataset.k, v = el.dataset.v;
    if (k === 'start' || k === 'legs') S.setup[k] = Number(v);
    else if (k === 'doubleOut' || k === 'voice') S.setup[k] = v === '1';
    else S.setup[k] = v;
    render();
  },
  padd() { if (S.setup.players.length < 8) S.setup.players.push(`Spieler ${S.setup.players.length + 1}`); render(); },
  pdel(el) { S.setup.players.splice(Number(el.dataset.v), 1); render(); },
  pup(el) { const i = Number(el.dataset.v), p = S.setup.players; [p[i - 1], p[i]] = [p[i], p[i - 1]]; render(); },
  pshuffle() {
    const p = S.setup.players;
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    render();
  },
  start() { if (S.match && S.match.winner === null) { ui.modal = { type: 'confirmNew' }; render(); } else startGame(); },
  startForce() { startGame(); },
  resume() { S.screen = 'game'; requestWakeLock(); render(); },
  menu() { S.screen = 'setup'; releaseWakeLock(); render(); },
  toggleInput() { S.setup.input = S.setup.input === 'darts' ? 'sum' : 'darts'; S.match.pending = []; ui.entry = ''; ui.mult = 1; render(); },
  key(el) {
    const next = (ui.entry + el.dataset.v).replace(/^0+(?=\d)/, '');
    if (Number(next) > 180) { toast('Maximal 180'); return render(); }
    ui.entry = next; render();
  },
  back() {
    if (S.setup.input === 'sum' && ui.entry) { ui.entry = ui.entry.slice(0, -1); render(); } else undo();
  },
  ok() { submitScore(ui.entry === '' ? 0 : parseInt(ui.entry, 10)); },
  quick(el) { submitScore(Number(el.dataset.v)); },
  codarts(el) { const md = ui.modal; ui.modal = null; recordTurn({ score: md.score, darts: Number(el.dataset.v), out: true }); },
  mult(el) { const v = Number(el.dataset.v); ui.mult = ui.mult === v ? 1 : v; render(); },
  dart(el) { const n = Number(el.dataset.v); throwDart(n, n === 0 ? 1 : ui.mult); },
  bull(el) { throwDart(25, Number(el.dataset.v)); },
  undo() { undo(); },
  closeModal() { ui.modal = null; render(); },
  rematch() {
    const m = S.match;
    S.match = newMatch(m.matchStarter + 1, m.players.slice(), { start: m.start, doubleOut: m.doubleOut, legsToWin: m.legsToWin });
    S.screen = 'game'; ui.entry = ''; ui.modal = null;
    requestWakeLock(); render();
  },
  newgame() { S.match = null; S.screen = 'setup'; render(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  // Klick auf den Hintergrund eines Overlays nur, wenn direkt getroffen
  if (el.classList.contains('overlay') && e.target !== el) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el);
});
document.addEventListener('input', (e) => {
  if (e.target.matches('.prow input')) { S.setup.players[Number(e.target.dataset.i)] = e.target.value; save(); }
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input')) { if (e.key === 'Enter') e.target.blur(); return; }
  if (S.screen !== 'game' || ui.modal) return;
  if (S.setup.input === 'sum') {
    if (/^\d$/.test(e.key)) actions.key({ dataset: { v: e.key } });
    else if (e.key === 'Enter') actions.ok();
    else if (e.key === 'Backspace') actions.back();
  }
});

render();
if (S.screen === 'game') requestWakeLock();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
