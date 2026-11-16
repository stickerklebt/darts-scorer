'use strict';
/* Darts – Scorer für iPhone & iPad. Alles lokal, gespeichert in localStorage. */

const STORE = 'dartscorer.v2';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (x, d = 1) => x.toFixed(d).replace('.', ',');

/* ================= Icons ================= */
const P = {
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 010 11H11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M6 12h12"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  shuffle: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
};
const icon = (k, w = 2.2) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k]}</svg>`;

/* ================= Darts & Checkout-Tabelle ================= */
const ALL = [];
for (let n = 1; n <= 20; n++) for (let m = 1; m <= 3; m++) ALL.push({ n, m });
ALL.push({ n: 25, m: 1 }, { n: 25, m: 2 });
const DOUBLES = ALL.filter((d) => d.m === 2);
const val = (d) => d.n * d.m;
const label = (d) => (d.n === 25 ? (d.m === 2 ? 'Bull' : '25') : (d.m === 3 ? 'T' : d.m === 2 ? 'D' : '') + d.n);
const DPREF = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 25, 1];
const dCost = (d) => DPREF.indexOf(d.n) * 2;
const sCost = (d) => (d.n === 25 ? (d.m === 2 ? 9 : 6) : d.m === 3 ? (20 - d.n) * 2 : d.m === 1 ? 3 + (20 - d.n) * 0.3 : 15 + (20 - d.n) * 0.3);

const CO = [null, new Map(), new Map(), new Map()];
const SUMK = [null, new Set(), new Set(), new Set()];
const POSS = new Set([0]);
const upTo3 = (vals) => { const s = new Set([0]); for (let i = 0; i < 3; i++) for (const a of [...s]) for (const v of vals) s.add(a + v); return s; };
(function build() {
  const consider = (k, route, cost) => {
    const s = route.reduce((a, d) => a + val(d), 0);
    for (let j = k; j <= 3; j++) { const cur = CO[j].get(s); if (!cur || cost < cur.cost) CO[j].set(s, { route, cost }); }
  };
  for (const d of DOUBLES) consider(1, [d], 1000 + dCost(d));
  for (const a of ALL) for (const d of DOUBLES) consider(2, [a, d], 2000 + sCost(a) + dCost(d));
  for (const a of ALL) for (const b of ALL) {
    if (val(b) > val(a)) continue;
    const c0 = 3000 + sCost(a) + sCost(b);
    for (const d of DOUBLES) consider(3, [a, b, d], c0 + dCost(d));
  }
  const vals = [...new Set(ALL.map(val))];
  for (const a of vals) for (let j = 1; j <= 3; j++) SUMK[j].add(a);
  for (const a of vals) for (const b of vals) { SUMK[2].add(a + b); SUMK[3].add(a + b); }
  for (const a of SUMK[2]) for (const b of vals) SUMK[3].add(a + b);
  for (const v of SUMK[3]) POSS.add(v);
})();
const checkoutRoute = (rem, left) => (rem > 1 && rem <= 170 && left > 0 ? CO[left].get(rem)?.route : null);
const minOut = (rem, dbl) => { for (let k = 1; k <= 3; k++) if (dbl ? CO[k].has(rem) : SUMK[k].has(rem)) return k; return 0; };

/* Halbieren: Zielreihenfolge und mögliche Punkte pro Ziel */
const HALF = [15, 16, 'D', 17, 18, 'T', 19, 20, 'B'];
const HALF_START = 40;
const HALF_OK = {
  D: upTo3(DOUBLES.map(val)),
  T: upTo3(ALL.filter((d) => d.m === 3).map(val)),
  B: upTo3([25, 50]),
};
const halfLabel = (t) => (t === 'D' ? 'Double' : t === 'T' ? 'Triple' : t === 'B' ? 'Bull' : String(t));
const halfValid = (t, v) => (typeof t === 'number' ? v % t === 0 && v / t <= 9 : HALF_OK[t].has(v));

/* ================= Spiele ================= */
const GAMES = {
  x01: { title: 'X01', sub: '301, 501 oder 701 – runter auf null', tile: '501',
    desc: 'Der Klassiker. Jeder startet mit derselben Punktzahl und spielt sie auf genau null herunter.' },
  highscore: { title: 'Highscore', sub: 'Die meisten Punkte in festen Runden', tile: '180',
    desc: 'Jeder wirft eine feste Anzahl Runden. Wer am Ende die meisten Punkte hat, gewinnt.' },
  shanghai: { title: 'Shanghai', sub: 'Jede Runde ein neues Ziel', tile: '1–7',
    desc: 'Runde 1 zählt nur die 1, Runde 2 nur die 2 und so weiter. Eingegeben werden die Punkte auf das Ziel.' },
  halveit: { title: 'Halbieren', sub: 'Ziel verfehlt? Punkte halbiert', tile: '½',
    desc: `Start mit ${HALF_START} Punkten. Jede Runde hat ein Ziel (15, 16, Double, 17, 18, Triple, 19, 20, Bull). Wer es nicht trifft, verliert die Hälfte.` },
  atc: { title: 'Around the Clock', sub: 'Von 1 bis 20 – wer ist zuerst rum?', tile: '1→20',
    desc: 'Die Zahlen der Reihe nach treffen. Pro Aufnahme gibst du ein, wie viele Ziele du geschafft hast.' },
};
const LEGS_PER_SET = 3;
const MAX_PLAYERS = 6;

/* ================= Zustand ================= */
const DEF = () => ({
  profile: { name: '', x01: { points: 0, darts: 0, matches: 0 } },
  lineup: [{ main: true }, { name: 'Gast' }],
  opts: {
    x01: { start: 501, out: 'double', mode: 'legs', target: 2 },
    highscore: { rounds: 10 },
    shanghai: { rounds: 7 },
    halveit: {},
    atc: { bull: 1 },
  },
  prefs: { voice: false, hints: true },
  screen: 'onboard', game: 'x01', match: null,
});
let S;
try { S = JSON.parse(localStorage.getItem(STORE)); } catch (e) { S = null; }
if (!S || !S.profile) S = DEF();
{ const d = DEF(); for (const k in d.opts) S.opts[k] = { ...d.opts[k], ...(S.opts[k] || {}) }; S.prefs = { ...d.prefs, ...S.prefs }; }
if (!S.profile.name) S.screen = 'onboard';
const ui = { entry: '', modal: null, toast: null };
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* privater Modus */ } };

const profileAvg = () => { const x = S.profile.x01; return x.darts ? (x.points / x.darts) * 3 : null; };

/* ================= X01 ================= */
const X = {
  leg: (m) => m.legs[m.legs.length - 1],
  cur: (m) => { const l = X.leg(m); return (l.starter + l.turns.length) % m.players.length; },
  rem: (m, l, p) => l.turns.reduce((r, t) => (t.p === p ? r - t.score : r), m.opts.start),
  legsInSet: (m, p, set) => m.legs.filter((l) => l.set === set && l.winner === p).length,
  legsTotal: (m, p) => m.legs.filter((l) => l.winner === p).length,
  sets: (m, p) => { let c = 0; const last = X.leg(m).set; for (let s = 1; s <= last; s++) if (X.legsInSet(m, p, s) >= LEGS_PER_SET) c++; return c; },
  isSets: (m) => m.opts.mode === 'sets',
};

function x01Stats(m, p) {
  let pts = 0, darts = 0, f9p = 0, f9d = 0, high = 0, t100 = 0, t140 = 0, t180 = 0, hco = 0, best = null;
  for (const leg of m.legs) {
    let n = 0, ld = 0;
    for (const t of leg.turns) {
      if (t.p !== p) continue;
      pts += t.score; darts += t.darts; ld += t.darts;
      if (n < 3) { f9p += t.score; f9d += t.darts; }
      n++;
      high = Math.max(high, t.score);
      if (t.score === 180) t180++; else if (t.score >= 140) t140++; else if (t.score >= 100) t100++;
      if (t.out) { hco = Math.max(hco, t.score); if (best === null || ld < best) best = ld; }
    }
  }
  return { pts, darts, avg: darts ? (pts / darts) * 3 : 0, f9: f9d ? (f9p / f9d) * 3 : 0, high, t100, t140, t180, hco, best };
}

function x01Submit(score) {
  const m = S.match;
  if (!POSS.has(score)) { toast(`${score} ist nicht möglich`); return render(); }
  const p = X.cur(m), rem = X.rem(m, X.leg(m), p), nr = rem - score, dbl = m.opts.out === 'double';
  if (nr < 0 || (dbl && nr === 1)) return x01Record({ score: 0, darts: 3, bust: true });
  if (nr === 0) {
    const k = minOut(rem, dbl);
    if (!k) { toast(`${rem} ist kein mögliches Finish`); return render(); }
    if (k === 3) return x01Record({ score, darts: 3, out: true });
    ui.modal = { type: 'darts', score, min: k };
    return render();
  }
  x01Record({ score, darts: 3 });
}

function x01Record(t) {
  const m = S.match, leg = X.leg(m), n = m.players.length;
  t.p = X.cur(m);
  leg.turns.push(t);
  if (t.bust) { toast('Überworfen'); say('Überworfen'); }
  else if (!t.out) say(t.score === 0 ? 'Kein Score' : t.score === 180 ? 'Einhundertachtzig!' : String(t.score));
  if (t.out) {
    leg.winner = t.p;
    let setWon = false, matchWon;
    if (X.isSets(m)) {
      setWon = X.legsInSet(m, t.p, leg.set) >= LEGS_PER_SET;
      matchWon = setWon && X.sets(m, t.p) >= m.opts.target;
    } else matchWon = X.legsTotal(m, t.p) >= m.opts.target;
    if (matchWon) return finish([t.p]);
    m.legs.push({ starter: (leg.starter + 1) % n, set: leg.set + (setWon ? 1 : 0), turns: [] });
    ui.modal = { type: 'leg', p: t.p, score: t.score, darts: t.darts, set: setWon };
    say(`${setWon ? 'Set' : 'Leg'}, ${m.players[t.p].name}`);
  }
  render();
}

function x01Undo(m) {
  let leg = X.leg(m);
  if (!leg.turns.length) { if (m.legs.length === 1) return; m.legs.pop(); leg = X.leg(m); }
  const t = leg.turns.pop();
  if (t && t.out) delete leg.winner;
}

/* ================= Partyspiele ================= */
const G = {
  cur: (m) => (m.first + m.turns.length) % m.players.length,
  round: (m) => Math.floor(m.turns.length / m.players.length),
  rounds: (m) => (m.game === 'halveit' ? HALF.length : m.game === 'atc' ? Infinity : m.opts.rounds),
  atcTotal: (m) => (m.opts.bull ? 21 : 20),
  atcPos: (m, p) => Math.min(G.atcTotal(m), m.turns.reduce((a, t) => (t.p === p ? a + t.v : a), 0)),
  atcLabel: (pos) => (pos >= 20 ? 'Bull' : String(pos + 1)),
  score(m, p) {
    if (m.game === 'atc') return G.atcPos(m, p);
    if (m.game === 'halveit') return m.turns.reduce((s, t) => (t.p !== p ? s : t.v ? s + t.v : Math.ceil(s / 2)), HALF_START);
    return m.turns.reduce((a, t) => (t.p === p ? a + t.v : a), 0);
  },
  validate(m, v) {
    const r = G.round(m);
    if (m.game === 'highscore') return POSS.has(v) ? null : `${v} ist nicht möglich`;
    if (m.game === 'shanghai') { const t = r + 1; return v % t === 0 && v <= 9 * t ? null : `Auf die ${t} geht nur 0, ${t}, ${2 * t} … ${9 * t}`; }
    if (m.game === 'halveit') { const t = HALF[r]; return halfValid(t, v) ? null : `${v} ist auf ${halfLabel(t)} nicht möglich`; }
    return null;
  },
  done(m) {
    if (m.game === 'atc') return m.players.some((_, p) => G.atcPos(m, p) >= G.atcTotal(m));
    return m.turns.length >= G.rounds(m) * m.players.length;
  },
  winners(m) {
    const sc = m.players.map((_, p) => G.score(m, p)), best = Math.max(...sc);
    return sc.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
  },
};

function gSubmit(v) {
  const m = S.match, err = G.validate(m, v);
  if (err) { toast(err); return render(); }
  const p = G.cur(m);
  const before = G.score(m, p);
  m.turns.push({ p, v });
  if (m.game === 'halveit' && v === 0) { toast(`Halbiert: ${before} → ${G.score(m, p)}`); say('Halbiert'); }
  else say(String(v));
  if (G.done(m)) return finish(G.winners(m));
  render();
}

/* ================= Gemeinsam ================= */
function finish(winners) {
  const m = S.match;
  m.done = true; m.winners = winners;
  if (m.game === 'x01' && m.opts.start === 501) {
    const i = m.players.findIndex((p) => p.main);
    if (i >= 0) {
      const st = x01Stats(m, i);
      S.profile.x01.points += st.pts; S.profile.x01.darts += st.darts; S.profile.x01.matches++;
      m.recorded = { points: st.pts, darts: st.darts };
    }
  }
  say(`${m.players[winners[0]].name} gewinnt`);
  ui.modal = null;
  S.screen = 'result';
  releaseWakeLock();
  render();
}

function undo() {
  const m = S.match;
  if (!m) return;
  ui.modal = null; ui.entry = '';
  if (m.done) {
    m.done = false; m.winners = null;
    if (m.recorded) {
      S.profile.x01.points -= m.recorded.points; S.profile.x01.darts -= m.recorded.darts; S.profile.x01.matches--;
      m.recorded = null;
    }
    S.screen = 'game'; requestWakeLock();
  }
  if (m.game === 'x01') x01Undo(m); else m.turns.pop();
  render();
}

function submit(v) {
  ui.entry = '';
  if (S.match.game === 'x01') x01Submit(v); else gSubmit(v);
}

function newMatch(game, players, opts, first) {
  const m = { game, players, opts: { ...opts }, first: first % players.length, done: false, winners: null, recorded: null };
  if (game === 'x01') m.legs = [{ starter: m.first, set: 1, turns: [] }];
  else m.turns = [];
  return m;
}

function startGame() {
  const players = S.lineup.map((e, i) => (e.main ? { name: S.profile.name, main: true } : { name: (e.name || '').trim() || `Gast ${i}` }));
  S.match = newMatch(S.game, players, S.opts[S.game], 0);
  S.screen = 'game';
  ui.entry = ''; ui.modal = null;
  requestWakeLock();
  render();
}

/* ================= Ansage, Display an, Toast ================= */
function say(txt) {
  if (!S.prefs.voice || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'de-DE'; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) { /* ignore */ }
}
let wakeLock = null;
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.screen === 'game') requestWakeLock(); });
let toastTimer = null;
function toast(msg) { ui.toast = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { ui.toast = null; render(); }, 1800); }

/* ================= Views ================= */
function matchSummary(m) {
  const g = GAMES[m.game];
  const name = m.game === 'x01' ? String(m.opts.start) : g.title;
  return `${name} · ${m.players.map((p) => esc(p.name)).join(' vs. ')}`;
}

function onboardView() {
  return `<div class="onboard">
    <img class="appicon" src="icon-512.png" alt="">
    <h1>Willkommen bei Darts</h1>
    <p>Wie heißt du? Du bist der Hauptspieler dieser App – dein 501-Average wird über alle Spiele gespeichert.</p>
    <input id="nameField" class="field" placeholder="Dein Name" maxlength="16" autocomplete="given-name" autocapitalize="words" spellcheck="false" enterkeyhint="done">
    <button class="cta glass-accent" data-act="onboard">Weiter</button>
  </div>`;
}

function homeView() {
  const pr = S.profile, avg = profileAvg(), m = S.match;
  const running = m && !m.done;
  return `<div class="page">
    <h1 class="lt" style="margin-top:14px">Darts</h1>
    <button class="profile" data-act="rename">
      <div class="avatar">${esc(pr.name.slice(0, 1).toUpperCase())}</div>
      <div style="min-width:0"><div class="pn">${esc(pr.name)}</div><div class="ps">${pr.x01.matches} ${pr.x01.matches === 1 ? 'Match' : 'Matches'} 501</div></div>
      <div class="pavg num"><span>Ø 501</span><b>${avg === null ? '–' : fmt(avg)}</b></div>
    </button>
    ${running ? `<button class="resume glass" data-act="resume"><span class="dotlive"></span><span class="ct"><b>Laufendes Spiel fortsetzen</b><small>${matchSummary(m)}</small></span><span class="chev">${icon('chevR')}</span></button>` : ''}
    <h2 class="sh">Spiele</h2>
    <div class="list games">
      ${Object.entries(GAMES).map(([id, g]) => `<button class="cell" data-act="pick" data-v="${id}">
        <span class="tile">${g.tile}</span>
        <span class="ct"><b>${g.title}</b><small>${g.sub}</small></span>
        <span class="chev">${icon('chevR')}</span></button>`).join('')}
    </div>
  </div>`;
}

function seg(key, opts, cur) {
  return `<div class="seg">${opts.map(([v, l]) => `<button data-act="opt" data-k="${key}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}
const optRow = (title, control) => `<div class="optrow"><span>${title}</span>${control}</div>`;

function gameOptions(id) {
  const o = S.opts[id];
  if (id === 'x01') {
    const tOpts = o.mode === 'sets' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 7];
    return `<div class="list">
      ${optRow('Startpunkte', seg('start', [[301, '301'], [501, '501'], [701, '701']], o.start))}
      ${optRow('Check-Out', seg('out', [['double', 'Double Out'], ['single', 'Single Out']], o.out))}
      ${optRow('Modus', seg('mode', [['legs', 'Legs'], ['sets', 'Sets']], o.mode))}
      ${optRow(o.mode === 'sets' ? 'First to … Sets' : 'First to … Legs', seg('target', tOpts.map((v) => [v, String(v)]), o.target))}
    </div>
    <p class="foot">${o.mode === 'sets' ? `Ein Set gewinnt, wer zuerst ${LEGS_PER_SET} Legs holt. ` : ''}Nur 501-Matches zählen für deinen Average.</p>`;
  }
  if (id === 'highscore') return `<div class="list">${optRow('Runden', seg('rounds', [[5, '5'], [10, '10'], [15, '15'], [20, '20']], o.rounds))}</div>`;
  if (id === 'shanghai') return `<div class="list">${optRow('Ziele', seg('rounds', [[7, '1 bis 7'], [10, '1 bis 10'], [20, '1 bis 20']], o.rounds))}</div>`;
  if (id === 'atc') return `<div class="list">${optRow('Ende', seg('bull', [[1, 'Mit Bull'], [0, 'Bis 20']], o.bull))}</div>`;
  return `<div class="list"><div class="optrow"><span>Ziele</span><div style="font-size:17px">${HALF.map(halfLabel).join(' · ')}</div></div></div>`;
}

function setupView() {
  const id = S.game, g = GAMES[id], L = S.lineup;
  const rows = L.map((e, i) => `<div class="cell prow">
      <span class="ord">${i + 1}</span>
      ${e.main ? `<span class="mainname">${esc(S.profile.name)}</span><span class="badge">Du</span>`
        : `<input data-i="${i}" value="${esc(e.name || '')}" placeholder="Name" maxlength="16" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done">`}
      <button class="iconbtn" data-act="pup" data-v="${i}" ${i ? '' : 'disabled'} aria-label="Nach oben">${icon('up')}</button>
      ${e.main ? '<span style="width:38px"></span>' : `<button class="iconbtn del" data-act="pdel" data-v="${i}" aria-label="Entfernen">${icon('minus', 2.6)}</button>`}
    </div>`).join('');
  return `<div class="topnav"><button class="navbtn glass" data-act="home" aria-label="Zurück">${icon('chevL', 2.4)}</button></div>
  <div class="page withbar" style="padding-top:0">
    <h1 class="lt">${g.title}</h1>
    <p class="desc">${g.desc}</p>
    <h2 class="sh">Spieler</h2>
    <div class="list" style="--inset:50px">${rows}</div>
    <div class="linkrow">
      <button data-act="padd" ${L.length >= MAX_PLAYERS ? 'disabled' : ''}>${icon('plus', 2.4)} Spieler</button>
      <button data-act="pshuffle" ${L.length < 2 ? 'disabled' : ''}>${icon('shuffle', 2.2)} Mischen</button>
    </div>
    <p class="foot">Bis zu ${MAX_PLAYERS} Spieler. Wer oben steht, wirft zuerst.</p>
    <h2 class="sh">Einstellungen</h2>
    ${gameOptions(id)}
  </div>
  <div class="bottombar"><button class="cta glass-accent" data-act="start">Spiel starten</button></div>`;
}

function gameView() {
  const m = S.match, n = m.players.length;
  let title, sub, cur, board, hint;
  if (m.game === 'x01') {
    const leg = X.leg(m); cur = X.cur(m);
    title = `${m.opts.start} · ${m.opts.out === 'double' ? 'Double Out' : 'Single Out'}`;
    sub = X.isSets(m) ? `Set ${leg.set} · Leg ${m.legs.filter((l) => l.set === leg.set).length} · First to ${m.opts.target} Sets` : `Leg ${m.legs.length} · First to ${m.opts.target} Legs`;
    const items = m.players.map((pl, p) => {
      const st = x01Stats(m, p);
      const mine = leg.turns.filter((t) => t.p === p);
      const last = mine[mine.length - 1];
      const score = X.isSets(m) ? `Sets <b>${X.sets(m, p)}</b> · Legs <b>${X.legsInSet(m, p, leg.set)}</b>` : `Legs <b>${X.legsTotal(m, p)}</b>`;
      return { name: pl.name, starter: p === leg.starter, big: X.rem(m, leg, p), score,
        meta: [`Ø <b>${fmt(st.avg)}</b>`, `Letzte <b>${last ? (last.bust ? 'Bust' : last.score) : '–'}</b>`, `<b>${mine.reduce((a, t) => a + t.darts, 0)}</b> Darts`] };
    });
    board = boardView(items, cur);
    const rem = X.rem(m, leg, cur), r = S.prefs.hints && m.opts.out === 'double' ? checkoutRoute(rem, 3) : null;
    hint = r ? `<div class="hint"><span>Checkout</span>${r.map((d) => `<span class="chip">${label(d)}</span>`).join('')}</div>`
      : `<div class="hint"><span><b>${esc(m.players[cur].name)}</b> ist dran</span></div>`;
  } else {
    cur = G.cur(m);
    const g = GAMES[m.game], round = G.round(m);
    title = g.title;
    sub = m.game === 'atc' ? `Runde ${round + 1}` : `Runde ${round + 1} von ${G.rounds(m)}`;
    const items = m.players.map((pl, p) => {
      const turns = m.turns.filter((t) => t.p === p), last = turns[turns.length - 1];
      const meta = m.game === 'atc'
        ? [G.atcPos(m, p) >= G.atcTotal(m) ? 'Fertig' : `Ziel <b>${G.atcLabel(G.atcPos(m, p))}</b>`, `Letzte <b>${last ? last.v : '–'}</b>`]
        : [`Letzte <b>${last ? last.v : '–'}</b>`, `<b>${turns.length}</b> Runden`];
      return { name: pl.name, starter: p === m.first, big: m.game === 'atc' ? `${G.atcPos(m, p)}/${G.atcTotal(m)}` : G.score(m, p), score: '', meta };
    });
    board = boardView(items, cur);
    let tgt = '';
    if (m.game === 'shanghai') tgt = `Ziel <b>${round + 1}</b>`;
    else if (m.game === 'halveit') tgt = `Ziel <b>${halfLabel(HALF[round])}</b>`;
    else if (m.game === 'atc') tgt = `Ziel <b>${G.atcLabel(G.atcPos(m, cur))}</b>`;
    hint = `<div class="hint">${tgt ? `<span class="target">${tgt}</span><span>·</span>` : ''}<span><b>${esc(m.players[cur].name)}</b> ist dran</span></div>`;
  }
  return `<div class="game">
    <div class="gtop">
      <button class="navbtn glass" data-act="home" aria-label="Übersicht">${icon('chevL', 2.4)}</button>
      <div class="gtitle"><b>${title}</b><span>${sub}</span></div>
      <button class="navbtn glass" data-act="gear" aria-label="Einstellungen">${icon('gear', 1.9)}</button>
    </div>
    <div class="gmain">
      <div class="gleft">${board}${hint}</div>
      <div class="pad">${m.game === 'atc' ? hitsPad(m, cur) : sumPad(m, cur)}</div>
    </div>
  </div>`;
}

function boardView(items, cur) {
  const n = items.length;
  if (n <= 2) {
    return `<div class="duo ${n === 1 ? 'solo' : ''}">${items.map((it, p) => `<div class="card ${p === cur ? 'on' : ''}">
      <div><div class="cname">${it.starter ? '<span class="throw"></span>' : ''}${esc(it.name)}</div>${it.score ? `<div class="sl num">${it.score}</div>` : ''}</div>
      <div class="big num">${it.big}</div>
      <div class="cmeta num">${it.meta.map((x) => `<span>${x}</span>`).join('')}</div>
    </div>`).join('')}</div>`;
  }
  return `<div class="rows">${items.map((it, p) => `<div class="row ${p === cur ? 'on' : ''}">
    <div class="nm"><div class="rn">${it.starter ? '<span class="throw"></span>' : ''}${esc(it.name)}</div><small class="num">${[it.score, ...it.meta.slice(0, 2)].filter(Boolean).join(' · ')}</small></div>
    <div class="sc num">${it.big}</div>
  </div>`).join('')}</div>`;
}

function sumPad(m, cur) {
  let quick = [];
  if (m.game === 'x01' || m.game === 'highscore') quick = [26, 41, 45, 60, 81, 85, 100, 140, 180];
  else if (m.game === 'shanghai') { const t = G.round(m) + 1; quick = [1, 2, 3, 4, 5, 6].map((k) => k * t); }
  else if (m.game === 'halveit') {
    const t = HALF[G.round(m)];
    quick = typeof t === 'number' ? [1, 2, 3, 4, 5, 6].map((k) => k * t) : t === 'B' ? [25, 50, 75, 100] : [];
  }
  const k = (v) => `<button class="key" data-act="key" data-v="${v}">${v}</button>`;
  const okLabel = m.game === 'halveit' && !ui.entry ? 'Verfehlt' : 'OK';
  return `<div class="entry"><span class="who">${esc(m.players[cur].name)}</span><span class="v num ${ui.entry ? '' : 'empty'}">${ui.entry || '0'}</span></div>
    ${quick.length ? `<div class="quick num">${quick.map((v) => `<button data-act="quick" data-v="${v}">${v}</button>`).join('')}</div>` : ''}
    <div class="keys num">
      ${k(1)}${k(2)}${k(3)}${k(4)}${k(5)}${k(6)}${k(7)}${k(8)}${k(9)}
      <button class="key" data-act="back" aria-label="${ui.entry ? 'Löschen' : 'Rückgängig'}">${ui.entry ? '⌫' : icon('undo', 2)}</button>
      ${k(0)}
      <button class="key ok glass-accent" data-act="ok">${okLabel}</button>
    </div>`;
}

function hitsPad(m, cur) {
  const left = Math.min(3, G.atcTotal(m) - G.atcPos(m, cur));
  return `<div class="entry"><span class="who">${esc(m.players[cur].name)}</span><span class="v" style="font-size:20px;color:var(--label2)">Wie viele Ziele getroffen?</span></div>
    <div class="keys four num">
      ${[0, 1, 2, 3].map((h) => `<button class="key ${h ? '' : ''}" data-act="hits" data-v="${h}" ${h > left ? 'disabled' : ''}>${h}</button>`).join('')}
      <button class="key wide" data-act="back">${icon('undo', 2)}</button>
    </div>`;
}

function resultView() {
  const m = S.match, w = m.winners;
  const head = w.length > 1 ? 'Unentschieden' : `${esc(m.players[w[0]].name)} gewinnt`;
  let body = '';
  if (m.game === 'x01') {
    const st = m.players.map((_, p) => x01Stats(m, p));
    const sub = X.isSets(m) ? m.players.map((_, p) => X.sets(m, p)).join(' : ') + ' Sets' : m.players.map((_, p) => X.legsTotal(m, p)).join(' : ') + ' Legs';
    const rows = [
      ['Ø 3 Darts', (p) => fmt(st[p].avg, 2)], ['First 9 Ø', (p) => fmt(st[p].f9, 2)],
      ...(X.isSets(m) ? [['Sets', (p) => X.sets(m, p)]] : []), ['Legs', (p) => X.legsTotal(m, p)],
      ['Höchste Aufnahme', (p) => st[p].high], ['100+', (p) => st[p].t100], ['140+', (p) => st[p].t140], ['180', (p) => st[p].t180],
      ['Höchstes Finish', (p) => st[p].hco || '–'], ['Bestes Leg', (p) => (st[p].best ? `${st[p].best} Darts` : '–')], ['Darts', (p) => st[p].darts],
    ];
    body = `<div class="trophy"><div class="t glass">${icon('trophy', 1.8)}</div><h1>${head}</h1><p class="num">${m.players.length > 1 ? sub : `${st[0].darts} Darts · Ø ${fmt(st[0].avg)}`}</p></div>
      <h2 class="sh">Statistik</h2>
      <div class="tablewrap"><table class="num">
        <tr><th></th>${m.players.map((pl, p) => `<th class="${w.includes(p) ? 'win' : ''}">${esc(pl.name)}</th>`).join('')}</tr>
        ${rows.map(([l, f]) => `<tr><td>${l}</td>${m.players.map((_, p) => `<td>${f(p)}</td>`).join('')}</tr>`).join('')}
      </table></div>`;
  } else {
    const order = m.players.map((pl, p) => ({ pl, p, s: G.score(m, p) })).sort((a, b) => b.s - a.s);
    const unit = m.game === 'atc' ? ` / ${G.atcTotal(m)}` : '';
    body = `<div class="trophy"><div class="t glass">${icon('trophy', 1.8)}</div><h1>${head}</h1><p>${GAMES[m.game].title}</p></div>
      <h2 class="sh">Ergebnis</h2>
      <div class="list rank">${order.map((o, i) => `<div class="cell"><span class="pos ${w.includes(o.p) ? 'first' : ''}">${i + 1}</span><span class="ct"><b>${esc(o.pl.name)}</b></span><span class="val num">${o.s}${unit}</span></div>`).join('')}</div>`;
  }
  return `<div class="page">${body}
    <div class="stack">
      <button class="cta glass-accent" data-act="rematch">Revanche</button>
      <button class="cta glass plain" data-act="home">Zur Übersicht</button>
      <button class="textbtn" data-act="undo">Letzte Eingabe zurücknehmen</button>
    </div></div>`;
}

function modalView() {
  const md = ui.modal, m = S.match;
  if (!md) return '';
  let inner = '';
  if (md.type === 'darts') {
    const b = []; for (let k = md.min; k <= 3; k++) b.push(`<button class="${k === md.min ? 'glass-accent' : ''}" data-act="codarts" data-v="${k}">${k}</button>`);
    inner = `<h3>Checkout ${md.score}</h3><p>Mit wie vielen Darts?</p><div class="darts3 num" style="grid-template-columns:repeat(${b.length},1fr)">${b.join('')}</div>
      <button class="textbtn" data-act="closeModal">Abbrechen</button>`;
  } else if (md.type === 'leg') {
    const isS = X.isSets(m);
    const prevSet = m.legs[m.legs.length - 2].set;
    const stand = isS ? m.players.map((_, p) => X.sets(m, p)).join(' : ') + ' Sets' + (md.set ? '' : ` · ${m.players.map((_, p) => X.legsInSet(m, p, prevSet)).join(' : ')} Legs`) : m.players.map((_, p) => X.legsTotal(m, p)).join(' : ') + ' Legs';
    inner = `<h3>${md.set ? 'Set' : 'Leg'} an ${esc(m.players[md.p].name)}</h3>
      <p class="num">Finish ${md.score} mit ${md.darts} Dart${md.darts > 1 ? 's' : ''}<br>Stand ${stand}</p>
      <div class="btns"><button class="glass-accent" data-act="closeModal">Weiter</button></div>
      <button class="textbtn" data-act="undo" style="margin-top:8px">Rückgängig</button>`;
  } else if (md.type === 'gear') {
    const o = m.opts;
    const info = m.game === 'x01'
      ? [['Startpunkte', o.start], ['Check-Out', o.out === 'double' ? 'Double Out' : 'Single Out'], ['Modus', `First to ${o.target} ${o.mode === 'sets' ? 'Sets' : 'Legs'}`]]
      : [['Spiel', GAMES[m.game].title], ...(m.game === 'atc' ? [] : [['Runden', G.rounds(m)]])];
    inner = `<h3>Einstellungen</h3><p>${matchSummary(m)}</p>
      <div class="list">
        <button class="cell" data-act="pref" data-k="voice"><span class="lbl">Ansage</span><span class="switch ${S.prefs.voice ? 'on' : ''}"></span></button>
        ${m.game === 'x01' ? `<button class="cell" data-act="pref" data-k="hints"><span class="lbl">Checkout-Hilfe</span><span class="switch ${S.prefs.hints ? 'on' : ''}"></span></button>` : ''}
      </div>
      <div class="list">${info.map(([a, b]) => `<div class="cell"><span class="lbl">${a}</span><span class="val">${b}</span></div>`).join('')}</div>
      <div class="btns"><button class="danger" data-act="abort">Spiel beenden</button><button class="neutral" data-act="closeModal">Fertig</button></div>`;
  } else if (md.type === 'rename') {
    inner = `<h3>Dein Name</h3><p>Der Hauptspieler dieser App.</p>
      <input id="nameField" class="field" value="${esc(S.profile.name)}" maxlength="16" autocapitalize="words" spellcheck="false" enterkeyhint="done">
      <div class="btns"><button class="neutral" data-act="closeModal">Abbrechen</button><button class="glass-accent" data-act="saveName">Sichern</button></div>`;
  } else if (md.type === 'confirmNew') {
    inner = `<h3>Neues Spiel starten?</h3><p>Das laufende Spiel (${matchSummary(m)}) wird beendet.</p>
      <div class="btns"><button class="neutral" data-act="closeModal">Abbrechen</button><button class="glass-accent" data-act="startForce">Starten</button></div>`;
  } else if (md.type === 'abort') {
    inner = `<h3>Spiel beenden?</h3><p>Der Spielstand geht verloren und zählt nicht für deinen Average.</p>
      <div class="btns"><button class="neutral" data-act="gear">Abbrechen</button><button class="danger" data-act="abortForce">Beenden</button></div>`;
  }
  return `<div class="scrim" data-act="scrim"><div class="sheet">${inner}</div></div>`;
}

function render() {
  save();
  let html;
  const m = S.match;
  if (!S.profile.name) html = onboardView();
  else if (S.screen === 'game' && m && !m.done) html = gameView();
  else if (S.screen === 'result' && m && m.done) html = resultView();
  else if (S.screen === 'setup' && GAMES[S.game]) html = setupView();
  else { S.screen = 'home'; html = homeView(); }
  html += modalView();
  if (ui.toast) html += `<div class="toast glass"><i></i>${esc(ui.toast)}</div>`;
  $('#app').innerHTML = html;
}

/* ================= Aktionen ================= */
const nameFromField = () => ($('#nameField')?.value || '').trim();
const actions = {
  onboard() { const n = nameFromField(); if (!n) { $('#nameField').focus(); return; } S.profile.name = n; S.screen = 'home'; render(); },
  rename() { ui.modal = { type: 'rename' }; render(); setTimeout(() => $('#nameField')?.focus(), 50); },
  saveName() { const n = nameFromField(); if (n) S.profile.name = n; ui.modal = null; render(); },
  home() { ui.modal = null; ui.entry = ''; S.screen = 'home'; if (S.match && S.match.done) S.match = null; releaseWakeLock(); render(); },
  pick(el) { S.game = el.dataset.v; S.screen = 'setup'; render(); window.scrollTo(0, 0); },
  resume() { S.screen = 'game'; requestWakeLock(); render(); },
  opt(el) {
    const o = S.opts[S.game], k = el.dataset.k, v = el.dataset.v;
    o[k] = /^\d+$/.test(v) ? Number(v) : v;
    if (k === 'mode') o.target = Math.min(o.target, o.mode === 'sets' ? 5 : 7);
    render();
  },
  padd() {
    if (S.lineup.length >= MAX_PLAYERS) return;
    const used = new Set(S.lineup.map((e) => e.name));
    let i = 1; while (used.has(i === 1 ? 'Gast' : `Gast ${i}`)) i++;
    S.lineup.push({ name: i === 1 ? 'Gast' : `Gast ${i}` }); render();
  },
  pdel(el) { const i = Number(el.dataset.v); if (!S.lineup[i].main) S.lineup.splice(i, 1); render(); },
  pup(el) { const i = Number(el.dataset.v), L = S.lineup; [L[i - 1], L[i]] = [L[i], L[i - 1]]; render(); },
  pshuffle() { const L = S.lineup; for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } render(); },
  start() { if (S.match && !S.match.done) { ui.modal = { type: 'confirmNew' }; render(); } else startGame(); },
  startForce() { startGame(); },
  key(el) {
    const next = (ui.entry + el.dataset.v).replace(/^0+(?=\d)/, '');
    if (Number(next) > 180) { toast('Maximal 180'); return render(); }
    ui.entry = next; render();
  },
  back() { if (ui.entry) { ui.entry = ui.entry.slice(0, -1); render(); } else undo(); },
  ok() { submit(ui.entry === '' ? 0 : parseInt(ui.entry, 10)); },
  quick(el) { submit(Number(el.dataset.v)); },
  hits(el) { gSubmit(Number(el.dataset.v)); },
  codarts(el) { const md = ui.modal; ui.modal = null; x01Record({ score: md.score, darts: Number(el.dataset.v), out: true }); },
  undo() { undo(); },
  gear() { ui.modal = { type: 'gear' }; render(); },
  pref(el) { const k = el.dataset.k; S.prefs[k] = !S.prefs[k]; if (k === 'voice' && !S.prefs.voice) try { speechSynthesis.cancel(); } catch (e) { /* */ } render(); },
  abort() { ui.modal = { type: 'abort' }; render(); },
  abortForce() { S.match = null; ui.modal = null; S.screen = 'home'; releaseWakeLock(); render(); },
  closeModal() { ui.modal = null; render(); },
  scrim() { if (ui.modal && ui.modal.type !== 'darts') { ui.modal = null; render(); } },
  rematch() {
    const m = S.match;
    S.match = newMatch(m.game, m.players.map((p) => ({ ...p, name: p.main ? S.profile.name : p.name })), m.opts, m.first + 1);
    S.screen = 'game'; ui.entry = ''; ui.modal = null; requestWakeLock(); render();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'scrim' && e.target !== el) return;
  const fn = actions[el.dataset.act];
  if (fn) fn(el);
});
document.addEventListener('input', (e) => {
  if (e.target.matches('.prow input')) { S.lineup[Number(e.target.dataset.i)].name = e.target.value; save(); }
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input')) {
    if (e.key === 'Enter') { if (e.target.id === 'nameField') (S.profile.name && ui.modal ? actions.saveName : actions.onboard)(); else e.target.blur(); }
    return;
  }
  if (S.screen !== 'game' || ui.modal || !S.match || S.match.game === 'atc') return;
  if (/^\d$/.test(e.key)) actions.key({ dataset: { v: e.key } });
  else if (e.key === 'Enter') actions.ok();
  else if (e.key === 'Backspace') actions.back();
});

render();
if (S.screen === 'game') requestWakeLock();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
