/* Einstieg: Rendering, Aktionen, Events. */
import { S, ui, save, resetAll, ensureProfile, findProfile, profile, nameOf, sideName } from './store.js';
import { createMatch } from './match.js';
import * as X from './x01.js';
import * as G from './party.js';
import { GAMES, MAX_PLAYERS } from './games.js';
import { esc } from './ui/common.js';
import { onboardView, tabsBar, playView } from './ui/play.js';
import { statsView } from './ui/stats-view.js';
import { statsExtras } from './ui/stats-extra.js';
import { compareView, comparePair } from './ui/compare.js';
import { setupView } from './ui/setup.js';
import { gameView } from './ui/game.js';
import { resultView } from './ui/result.js';
import { momentView } from './ui/moments.js';
import { fxForTurn, fxRunning, stopFx } from './ui/fx.js';
import { isBot, bot, BOTS } from './bots.js';
import { x01BotDart, partyBotDart, partyValue, partyTurnDone, throwBull } from './botsim.js';
import { probeBotImages } from './ui/avatar.js';
import { sheetView } from './ui/sheets.js';
import { crest } from './ui/svg.js';
import { createBulloff, bullThrow, bullUndo, bullNext, MM } from './bulloff.js';
import { bulloffView, loupeShow, loupeHide } from './ui/bulloff-view.js';

const $ = (s) => document.querySelector(s);

/* ---------------- Rendering ---------------- */
function render() {
  save();
  const m = S.current;
  let html;
  if (!S.mainId || !profile(S.mainId)) html = onboardView();
  else if (S.screen === 'game' && m && !m.done) html = inBulloff() ? bulloffView() : gameView() + momentView();
  else if (S.screen === 'result' && m && m.done) html = tabsBar() + resultView();
  else if (S.screen === 'setup' && GAMES[S.game]) html = setupView();
  else if (S.screen === 'compare' && S.profiles.length) html = compareView();
  else { S.screen = 'home'; html = tabsBar() + (S.tab === 'stats' ? statsView(statsExtras) : playView()); }
  html += sheetView();
  if (ui.toast) html += `<div class="toast">${esc(ui.toast)}</div>`;
  const app = $('#app');
  app.innerHTML = html;
  const key = `${S.screen}:${S.tab}`;
  if (ui.lastKey && ui.lastKey !== key) { app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); }
  ui.lastKey = key;
  // Tab-Strich gleitet von der alten zur neuen Position
  const tl = $('.tabline');
  if (tl) {
    const to = S.tab === 'stats' && S.screen === 'home' ? 1 : 0;
    if (ui.tabFrom !== null && ui.tabFrom !== to) requestAnimationFrame(() => requestAnimationFrame(() => tl.style.setProperty('--i', to)));
    else tl.style.setProperty('--i', to);
    ui.tabFrom = to;
  }
  scheduleBot();
}

let toastTimer = null;
function toast(msg) { ui.toast = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { ui.toast = null; render(); }, 1800); }
let momentTimer = null;
function moment(mo, autoClose = 0) {
  ui.moment = mo;
  clearTimeout(momentTimer);
  if (autoClose) momentTimer = setTimeout(() => { if (ui.moment === mo) { ui.moment = null; render(); } }, autoClose);
}

/* ---------------- Ansage & Display an ---------------- */
function say(txt) {
  if (!S.prefs.voice || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'de-DE'; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) { /* */ }
}
let wakeLock = null;
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch (e) { /* */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.screen === 'game') requestWakeLock(); });

/* ---------------- Match-Ablauf ---------------- */
const archive = (m) => { S.matches.push(JSON.parse(JSON.stringify({ ...m, pending: [], endedAt: Date.now() }))); };
const unarchive = (m) => { const i = S.matches.findIndex((x) => x.id === m.id); if (i >= 0) S.matches.splice(i, 1); };

function finish() {
  const m = S.current;
  m.endedAt = Date.now();
  archive(m);
  say(`${sideName(m.sides[m.winners[0]])} gewinnt`);
  ui.endLines = botsInMatch(m).map((id) => ({ id, text: line(m, id, m.winners.includes(sideOfId(m, id)) ? 'win' : 'lose', 'end') })).filter((x) => x.text);
  ui.modal = null; ui.moment = null; ui.entry = ''; ui.mult = 1;
  S.screen = 'result';
  releaseWakeLock();
  render();
  window.scrollTo(0, 0);
}

function handle(res) {
  const m = S.current;
  if (res.type === 'error') { toast(res.msg); return render(); }
  const t = res.turn;
  // Animation (nur Menschen, nur wenn eingeschaltet). Bots bekommen nur eine kleine Andeutung in ihrer Karte.
  let anim = null;
  if (t && S.prefs.anim && !isBot(t.pid)) anim = fxForTurn(m.game, t, { score: m.game === 'x01' ? t.score : t.v, name: nameOf(t.pid) });
  if (t && isBot(t.pid)) { botHint(m, t); if (good(m, t)) speak(m, t.pid, 'good', 0.7); }
  if (t && !isBot(t.pid)) {
    const opp = botsInMatch(m).filter((id) => sideOfId(m, id) !== t.s);
    if (t.bust) opp.forEach((id) => speak(m, id, 'oppBust', 0.6));
    else if ((m.game === 'x01' ? t.score : m.game === 'highscore' ? t.v : 0) >= 140) opp.forEach((id) => speak(m, id, 'oppGood', 0.5));
  }
  if (res.type === 'match') { if (anim) { render(); anim.then(finish); } else finish(); return; }
  if (m.game === 'x01') {
    if (res.type === 'bust') { toast('Überworfen'); say('Überworfen'); }
    else if (res.type === 'turn') say(t.score === 0 ? 'Kein Score' : t.score === 180 ? 'Einhundertachtzig!' : String(t.score));
    else if (res.type === 'leg' || res.type === 'set') {
      const mo = { kind: 'leg', s: t.s, pid: t.pid, score: t.score, darts: t.darts, set: res.type === 'set' };
      say(`${res.type === 'set' ? 'Set' : 'Leg'}, ${sideName(m.sides[t.s])}`);
      if (anim) anim.then(() => { if (S.current === m) { moment(mo); render(); } });
      else moment(mo);
    }
  } else if (res.type === 'halved') { toast(`Halbiert: ${res.before} → ${res.after}`); say('Halbiert'); }
  else if (res.type === 'turn') say(String(t.v));
  if (anim && res.type !== 'leg' && res.type !== 'set') anim.then(() => { if (S.current === m && !m.done) render(); });
  render();
}

/** Bot: kleine Andeutung in der eigenen Karte bei starken Würfen (keine Vollbild-Animation). */
function botHint(m, t) {
  const v = m.game === 'x01' ? t.score : t.v;
  if (t.bust || !(v >= 100 || (t.out && v >= 60))) return;
  ui.botHint = { s: t.s, text: t.out ? `${v}!` : v === 180 ? '180!' : `${v}!`, at: Date.now() };
}

/** Wer hat die letzte Eingabe gemacht? (für Undo mit Bots) */
function lastEntryPid(m) {
  if (m.game === 'x01') {
    if (m.pending.length) return X.curThrower(m);
    for (let i = m.legs.length - 1; i >= 0; i--) { const ts = m.legs[i].turns; if (ts.length) return ts[ts.length - 1].pid; }
    return null;
  }
  return m.turns.length ? m.turns[m.turns.length - 1].pid : null;
}
/** Rückgängig: nimmt die letzte menschliche Eingabe zurück – Bot-Würfe danach werden mit zurückgenommen. */
function undo() {
  const m = S.current;
  if (!m) return;
  clearTimeout(botTimer); botTimer = null;
  ui.modal = null; ui.moment = null; ui.entry = ''; ui.botTurn = null;
  if (m.done) { unarchive(m); m.endedAt = undefined; S.screen = 'game'; ui.endLines = null; requestWakeLock(); }
  for (let guard = 0; guard < 400; guard++) {
    const pid = lastEntryPid(m);
    if (pid === null) break;
    const ok = m.game === 'x01' ? X.undo(m) : G.undo(m);
    if (!ok || !isBot(pid)) break;
  }
  ui.botMarks = {};
  render();
}

/* ---------------- Bots: werfen selbst, Dart für Dart ---------------- */
const curThrowerOf = (m) => (m.game === 'x01' ? X.curThrower(m) : G.curThrower(m));
const botsInMatch = (m) => m.playerIds.filter(isBot);
const sideOfId = (m, id) => m.sides.findIndex((side) => side.includes(id));
const good = (m, t) => !t.bust && ((m.game === 'x01' ? t.score : t.v) >= 100 || (t.out && t.score >= 60));
let botTimer = null;
function scheduleBot() {
  const m = S.current;
  let who = null;
  if (S.screen === 'game' && m && !m.done && !ui.modal && !ui.moment && !fxRunning()) {
    if (inBulloff()) { const s = bullNext(m.bull); if (!ui.boResult && s !== null && isBot(m.sides[s][0]) && !ui.boPending) who = 'bull'; }
    else if (isBot(curThrowerOf(m))) who = 'turn';
  }
  if (!who) { if (!ui.boPending || !inBulloff()) { clearTimeout(botTimer); botTimer = null; } return; }
  if (botTimer) return;
  const fresh = m.game === 'x01' ? !m.pending.length : !(ui.botTurn?.darts?.length);
  botTimer = setTimeout(() => { botTimer = null; botStep(); }, who === 'bull' ? 900 : fresh ? 850 : 620);
}
function botStep() {
  const m = S.current;
  if (!m || m.done || S.screen !== 'game') return;
  if (inBulloff()) {
    const s = bullNext(m.bull);
    if (s === null || !isBot(m.sides[s][0])) return;
    ui.boPending = { ...throwBull(bot(m.sides[s][0]).sigma), fly: true };
    botTimer = setTimeout(() => { botTimer = null; if (ui.boPending && inBulloff()) bullPlace(ui.boPending.x, ui.boPending.y); }, 1100);
    render();
    return;
  }
  const pid = curThrowerOf(m);
  if (!isBot(pid)) return;
  const b = bot(pid);
  ui.botMarks ??= {};
  if (m.game === 'x01') {
    const s = X.curSide(m);
    if (!m.pending.length) ui.botMarks[s] = [];
    const d = x01BotDart(m, b.sigma);
    ui.botMarks[s] = [...(ui.botMarks[s] || []), { x: d.x, y: d.y, at: Date.now() }];
    handle(X.throwDart(m, d.n, d.m, { any: true }));
  } else {
    const s = G.curSide(m);
    if (!ui.botTurn || ui.botTurn.s !== s || ui.botTurn.mid !== m.id || ui.botTurn.n !== m.turns.length) { ui.botTurn = { s, mid: m.id, n: m.turns.length, darts: [] }; ui.botMarks[s] = []; }
    const d = partyBotDart(m, s, ui.botTurn.darts, b.sigma);
    ui.botTurn.darts.push(d);
    ui.botMarks[s] = [...ui.botMarks[s], { x: d.x, y: d.y, at: Date.now() }];
    if (partyTurnDone(m, s, ui.botTurn.darts)) {
      const darts = ui.botTurn.darts;
      ui.botTurn = null;
      handle(G.submit(m, partyValue(m, s, darts), darts.map((x) => ({ n: x.n, m: x.m, before: null, target: null }))));
    } else render();
  }
}

/* ---------------- Bot-Sprüche: max. 3 pro Spiel und Bot (Start · ein Moment · Ende) ---------------- */
function line(m, id, kind, slot) {
  const b = bot(id);
  ui.lines ??= {};
  const k = `${m.id}:${id}`, used = (ui.lines[k] ??= { slots: [], said: [] });
  if (used.slots.includes(slot) || used.slots.length >= 3) return null;
  const pool = (b.lines[kind] || []).filter((x) => !used.said.includes(x));
  if (!pool.length) return null;
  const text = pool[Math.floor(Math.random() * pool.length)];
  used.slots.push(slot); used.said.push(text);
  return text;
}
function speak(m, id, kind, chance = 1, slot = kind === 'start' ? 'start' : 'mid') {
  if (Math.random() > chance) return;
  const text = line(m, id, kind, slot);
  if (!text) return;
  ui.speech ??= {};
  ui.speech[id] = { text, until: Date.now() + 3800 };
  setTimeout(() => { if (S.screen === 'game') render(); }, 3900);
}
function greet(m) { botsInMatch(m).forEach((id, i) => setTimeout(() => { if (S.current === m) { speak(m, id, 'start'); render(); } }, 400 + i * 700)); }

/* ---------------- Ausbullen ---------------- */
const inBulloff = () => !!(S.current?.bull && !S.current.bull.done);
let boTimer = null;
function finishBulloff() {
  const m = S.current, b = m?.bull;
  clearTimeout(boTimer);
  if (!b || b.winner === null) return;
  b.done = true;
  m.first = b.winner;
  if (m.game === 'x01') m.legs[0].starter = b.winner;
  ui.boResult = null;
  greet(m);
  render();
}
function bullPlace(x, y) {
  const m = S.current, res = bullThrow(m.bull, x, y);
  ui.boPending = null;
  if (!res) return render();
  clearTimeout(boTimer);
  if (res.type === 'winner') { ui.boResult = res; boTimer = setTimeout(finishBulloff, 2800); }
  else if (res.type === 'tie') { ui.boResult = res; boTimer = setTimeout(() => { ui.boResult = null; render(); }, 2600); }
  render();
}
/** Neues Match anlegen (inkl. Ausbullen, wenn gewählt und mehr als eine Seite). */
function newMatch(game, sides, opts, first, bull) {
  const m = createMatch(game, sides, opts, first);
  if (bull && sides.length > 1) m.bull = createBulloff(sides.length);
  ui.boPending = null; ui.boResult = null; ui.swapKey = undefined; ui.botMarks = {}; ui.botTurn = null; ui.speech = {}; ui.endLines = null;
  if (!m.bull) greet(m);
  return m;
}

function buildSides() {
  const L = S.lineup;
  if (!S.teamMode) return L.map((e) => [e.id]);
  const groups = new Map();
  for (const e of L) { if (!groups.has(e.team)) groups.set(e.team, []); groups.get(e.team).push(e.id); }
  return [...groups.keys()].sort().map((k) => groups.get(k));
}

function startGame() {
  if (!S.lineup.length) { toast('Mindestens ein Spieler'); return render(); }
  const sides = buildSides();
  if (S.teamMode && sides.length < 2) { toast('Mindestens zwei Teams nötig'); return render(); }
  if (!S.lineup.some((e) => !isBot(e.id))) { toast('Mindestens ein Mensch muss mitspielen'); return render(); }
  S.current = newMatch(S.game, sides, S.opts[S.game], 0, S.anwurf === 'bull');
  S.screen = 'game';
  ui.entry = ''; ui.modal = null; ui.moment = null; ui.mult = 1;
  requestWakeLock();
  render();
}

function addToLineup(id) {
  if (!id) return;
  if (S.lineup.some((e) => e.id === id)) { toast(`${nameOf(id)} ist schon dabei`); return render(); }
  if (S.lineup.length >= MAX_PLAYERS) { toast(`Maximal ${MAX_PLAYERS} Spieler`); return render(); }
  const teams = S.lineup.map((e) => e.team);
  const team = teams.filter((t) => t === 'A').length <= teams.filter((t) => t === 'B').length ? 'A' : 'B';
  S.lineup.push({ id, team });
  render();
}

/* ---------------- Aktionen ---------------- */
const field = (id) => ($(`#${id}`)?.value || '').trim();
const actions = {
  onboard() {
    const n = field('nameField');
    if (!n) return $('#nameField').focus();
    S.mainId = ensureProfile(n);
    S.lineup = [{ id: S.mainId, team: 'A' }];
    S.screen = 'home'; S.tab = 'play'; render();
  },
  tab(el) { S.tab = el.dataset.v; S.screen = 'home'; if (S.current && S.current.done) S.current = null; render(); window.scrollTo(0, 0); },
  rename() { ui.modal = { type: 'rename' }; render(); setTimeout(() => $('#nameField')?.focus(), 50); },
  saveName() {
    const n = field('nameField'), other = findProfile(n);
    if (!n) return;
    if (other && other.id !== S.mainId) { toast(`„${other.name}“ gibt es schon`); return render(); }
    profile(S.mainId).name = n; ui.modal = null; render();
  },
  settings() { ui.modal = { type: 'settings' }; render(); },
  statsWho() { ui.modal = { type: 'pickStats' }; render(); },
  statsPick(el) { S.statsPid = el.dataset.v; ui.modal = null; ui.heatSel = null; render(); },
  period(el) { S.statsPeriod = el.dataset.v; render(); },
  heat(el) { ui.heatSel = ui.heatSel === el.dataset.v ? null : el.dataset.v; render(); },
  heatSort(el) { ui.heatSort = el.dataset.v; render(); },
  openMatch(el) { ui.openMatch = ui.openMatch === el.dataset.v ? null : el.dataset.v; render(); },
  compare() { const [a, b] = comparePair(); S.cmpA = a; S.cmpB = b; S.screen = 'compare'; render(); window.scrollTo(0, 0); },
  backStats() { S.screen = 'home'; S.tab = 'stats'; render(); window.scrollTo(0, 0); },
  cmpWho(el) { ui.modal = { type: 'pickCmp', k: el.dataset.k }; render(); },
  cmpPick(el) { if (el.dataset.k === 'a') S.cmpA = el.dataset.v; else S.cmpB = el.dataset.v; ui.modal = null; render(); },
  play501() {
    const pid = S.statsPid && profile(S.statsPid) ? S.statsPid : S.mainId;
    S.game = 'x01'; S.opts.x01.start = 501;
    if (!S.lineup.some((e) => e.id === pid)) S.lineup.unshift({ id: pid, team: 'A' });
    S.lineup = S.lineup.slice(0, MAX_PLAYERS);
    S.screen = 'setup'; render(); window.scrollTo(0, 0);
  },
  wipe() { ui.modal = { type: 'wipe' }; render(); },
  wipeForce() { resetAll(); ui.modal = null; releaseWakeLock(); render(); },
  home() {
    ui.modal = null; ui.moment = null; ui.entry = '';
    if (S.current && S.current.done) S.current = null;
    S.screen = 'home'; S.tab = 'play'; releaseWakeLock(); render();
  },
  pick(el) { S.game = el.dataset.v; S.screen = 'setup'; ui.moreOpen = false; render(); window.scrollTo(0, 0); },
  more() { ui.moreOpen = !ui.moreOpen; render(); },
  anwurf(el) { S.anwurf = el.dataset.v; render(); },
  resume() { S.screen = 'game'; requestWakeLock(); render(); },
  opt(el) {
    const o = S.opts[S.game], k = el.dataset.k, v = el.dataset.v;
    o[k] = /^\d+$/.test(v) ? Number(v) : v;
    if (k === 'mode') o.target = Math.min(o.target, o.mode === 'sets' ? 5 : 7);
    render();
  },
  teamMode(el) {
    S.teamMode = el.dataset.v === '1';
    if (S.teamMode) S.lineup.forEach((e, i) => { e.team = i === 0 ? 'A' : 'B'; });
    render();
  },
  team(el) {
    const e = S.lineup[Number(el.dataset.v)], letters = 'ABCDEF'.slice(0, Math.max(2, Math.min(6, S.lineup.length)));
    e.team = letters[(letters.indexOf(e.team) + 1) % letters.length];
    render();
  },
  addNew() { const n = field('newPlayer'); if (!n) return $('#newPlayer')?.focus(); addToLineup(ensureProfile(n)); },
  addProfile(el) { addToLineup(el.dataset.v); },
  pdel(el) { S.lineup.splice(Number(el.dataset.v), 1); render(); },
  pup(el) { const i = Number(el.dataset.v), L = S.lineup; [L[i - 1], L[i]] = [L[i], L[i - 1]]; render(); },
  pshuffle() { const L = S.lineup; for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } render(); },
  start() { if (S.current && !S.current.done) { ui.modal = { type: 'confirmNew' }; render(); } else startGame(); },
  startForce() { startGame(); },
  key(el) {
    const next = (ui.entry + el.dataset.v).replace(/^0+(?=\d)/, '');
    if (Number(next) > 180) { toast('Maximal 180'); return render(); }
    ui.entry = next; render();
  },
  back() { if (ui.entry) { ui.entry = ui.entry.slice(0, -1); render(); } else undo(); },
  ok() { actions.submit(ui.entry === '' ? 0 : parseInt(ui.entry, 10)); },
  quick(el) { actions.submit(Number(el.dataset.v)); },
  submit(v) { ui.entry = ''; const m = S.current; handle(m.game === 'x01' ? X.submitSum(m, v) : G.submit(m, v)); },
  hits(el) { handle(G.submit(S.current, Number(el.dataset.v))); },
  mult(el) { ui.mult = Number(el.dataset.v); render(); },
  dart(el) { const n = Number(el.dataset.v), mult = n === 0 ? 1 : ui.mult; ui.mult = 1; handle(X.throwDart(S.current, n, mult)); },
  bull(el) { ui.mult = 1; handle(X.throwDart(S.current, 25, Number(el.dataset.v))); },
  board(el) { ui.mult = 1; handle(X.throwDart(S.current, Number(el.dataset.n), Number(el.dataset.m))); },
  dartInput(el) { S.prefs.dartInput = el.dataset.v; render(); },
  boOk() { if (ui.boPending) bullPlace(ui.boPending.x, ui.boPending.y); },
  boUndo() { if (ui.boPending) ui.boPending = null; else bullUndo(S.current.bull); render(); },
  boDone() { finishBulloff(); },
  boTie() { clearTimeout(boTimer); ui.boResult = null; render(); },
  momentClose() { ui.moment = null; clearTimeout(momentTimer); render(); },
  undo() { undo(); },
  gear() { ui.modal = { type: 'gear' }; render(); },
  pref(el) { const k = el.dataset.k; S.prefs[k] = !S.prefs[k]; if (k === 'voice' && !S.prefs.voice) try { speechSynthesis.cancel(); } catch (e) { /* */ } render(); },
  abort() { ui.modal = { type: 'abort' }; render(); },
  abortForce() { S.current = null; ui.modal = null; ui.moment = null; S.screen = 'home'; releaseWakeLock(); render(); },
  closeModal() { ui.modal = null; render(); },
  scrim() { ui.modal = null; render(); },
  rematch() {
    const m = S.current;
    S.current = newMatch(m.game, m.sides, m.opts, m.first + 1, !!m.bull);
    S.screen = 'game'; ui.entry = ''; ui.modal = null; ui.moment = null; ui.mult = 1;
    requestWakeLock(); render();
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (el.dataset.act === 'scrim' && e.target !== el) return;
  actions[el.dataset.act]?.(el);
});
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input')) {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'newPlayer') actions.addNew();
    else if (e.target.id === 'nameField') (ui.modal ? actions.saveName : actions.onboard)();
    return;
  }
  const m = S.current;
  if (fxRunning()) { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') stopFx(); return; }
  if (S.screen !== 'game' || ui.modal || !m || m.done || m.game === 'atc' || inBulloff() || isBot(curThrowerOf(m))) return;
  if (ui.moment) { if (e.key === 'Enter' || e.key === 'Escape') actions.momentClose(); return; }
  if (m.game === 'x01' && X.inputMode(m) === 'darts') { if (e.key === 'Backspace') undo(); return; }
  if (/^\d$/.test(e.key)) actions.key({ dataset: { v: e.key } });
  else if (e.key === 'Enter') actions.ok();
  else if (e.key === 'Backspace') actions.back();
});

/* ---------------- Ausbullen: Finger halten, Lupe, loslassen setzt ---------------- */
let drag = null;
function boardPoint(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  const r = Math.hypot(q.x, q.y), k = r > MM.edge ? MM.edge / r : 1; // nicht außerhalb der Scheibe
  return { x: q.x * k, y: q.y * k };
}
document.addEventListener('pointerdown', (e) => {
  const svg = e.target.closest?.('#boBoard .realboard');
  if (!svg || !inBulloff() || ui.boResult || ui.modal) return;
  const bs = bullNext(S.current.bull);
  if (bs === null || isBot(S.current.sides[bs][0])) return;
  e.preventDefault();
  drag = { svg, id: e.pointerId };
  try { svg.setPointerCapture(e.pointerId); } catch (err) { /* */ }
  const p = boardPoint(svg, e);
  loupeShow(svg, p.x, p.y, e.clientX, e.clientY);
});
document.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  e.preventDefault();
  const p = boardPoint(drag.svg, e);
  loupeShow(drag.svg, p.x, p.y, e.clientX, e.clientY);
}, { passive: false });
function endDrag(e, place) {
  if (!drag || e.pointerId !== drag.id) return;
  const p = boardPoint(drag.svg, e);
  drag = null; loupeHide();
  if (place) { ui.boPending = p; render(); }
}
document.addEventListener('pointerup', (e) => endDrag(e, true));
document.addEventListener('pointercancel', (e) => endDrag(e, false));

/* ---------------- Start ---------------- */
render();
probeBotImages(() => render());
const splash = document.createElement('div');
splash.className = 'splash';
splash.innerHTML = crest({ size: 220 });
document.body.appendChild(splash);
setTimeout(() => { splash.classList.add('out'); setTimeout(() => splash.remove(), 500); }, 900);
if (S.screen === 'game') requestWakeLock();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
