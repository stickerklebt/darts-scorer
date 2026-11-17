/* Einstieg: Rendering, Aktionen, Events. */
import { S, ui, save, resetAll, ensureProfile, findProfile, profile, nameOf, sideName, nameTaken, uid } from './store.js';
import { createMatch } from './match.js';
import * as X from './x01.js';
import * as G from './party.js';
import * as C from './cricket.js';
import { GAMES, MAX_PLAYERS } from './games.js';
import { esc } from './ui/common.js';
import { tabsBar, playView, tabIndex } from './ui/play.js';
import { authView } from './ui/auth.js';
import { friendsView, friendView } from './ui/friends.js';
import { historyView } from './ui/history.js';
import { historyRows, deleteMatch } from './history.js';
import { api } from './api.js';
import { auth, bootAuth, login, logout, forget, setUser, setOnChange, ensureMainProfile, syncNow } from './sync.js';
import { statsView } from './ui/stats-view.js';
import { compareView, comparePair } from './ui/compare.js';
import { setupView } from './ui/setup.js';
import { gameView } from './ui/game.js';
import { resultView } from './ui/result.js';
import { momentView } from './ui/moments.js';
import { fxForTurn, fxRunning, stopFx } from './ui/fx.js';
import { isBot, bot, BOTS, planLines } from './bots.js';
import { x01BotDart, partyBotDart, partyValue, partyTurnDone, throwBull, throwAt, sigmaFor } from './botsim.js';
import { probeBotImages } from './ui/avatar.js';
import { seedDemo, removeDemo } from './demo.js';
import { sheetView } from './ui/sheets.js';
import { crest } from './ui/svg.js';
import { entryDone, entryPossible } from './checkout.js';
import { createBulloff, bullThrow, bullUndo, bullNext, MM } from './bulloff.js';
import { bulloffView, loupeShow, loupeHide } from './ui/bulloff-view.js';

const $ = (s) => document.querySelector(s);

/* ---------------- Rendering ---------------- */
/* Statt den ganzen Bildschirm neu zu setzen (flackert, Animationen starten neu), wird nur angepasst,
   was sich wirklich geändert hat: gleiche Elemente bleiben stehen, nur Text/Attribute/Kinder werden aktualisiert. */
function morph(parent, html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  patchChildren(parent, t.content);
}
function patchChildren(a, b) {
  const an = [...a.childNodes], bn = [...b.childNodes];
  for (let i = 0; i < bn.length; i++) {
    if (i < an.length) patchNode(an[i], bn[i]);
    else a.appendChild(bn[i]);
  }
  for (let i = an.length - 1; i >= bn.length; i--) an[i].remove();
}
function patchNode(x, y) {
  if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName || (x.nodeType === 1 && (x.namespaceURI !== y.namespaceURI || x.getAttribute('data-key') !== y.getAttribute('data-key')))) { x.replaceWith(y); return; }
  if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
  for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
  for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
  if (x.tagName === 'INPUT' && y.hasAttribute('value') && x !== document.activeElement) x.value = y.getAttribute('value');
  patchChildren(x, y);
}
function render() {
  if (auth.user) ensureMainProfile();
  save();
  const m = S.current;
  let html;
  if (!auth.user) html = authView();
  else if (S.screen === 'game' && m && !m.done) html = inBulloff() ? bulloffView() : gameView() + momentView();
  else if (S.screen === 'result' && m && m.done) html = tabsBar() + resultView();
  else if (S.screen === 'setup' && GAMES[S.game]) html = setupView();
  else if (S.screen === 'compare' && S.profiles.length) html = compareView();
  else if (S.screen === 'friend' && ui.friend) html = friendView();
  else if (S.screen === 'history') html = historyView();
  else { S.screen = 'home'; html = tabsBar() + (S.tab === 'stats' ? statsView() : S.tab === 'friends' ? friendsView() : playView()); }
  html += sheetView();
  if (ui.toast) html += `<div class="toast">${esc(ui.toast)}</div>`;
  const app = $('#app');
  morph(app, html);
  const key = `${S.screen}:${S.tab}`;
  if (ui.lastKey && ui.lastKey !== key) { app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); }
  ui.lastKey = key;
  // Tab-Strich gleitet von der alten zur neuen Position
  const tl = $('.tabline');
  if (tl) {
    const to = S.screen === 'home' ? tabIndex() : 0;
    if (ui.tabFrom !== null && ui.tabFrom !== to) requestAnimationFrame(() => requestAnimationFrame(() => tl.style.setProperty('--i', to)));
    else tl.style.setProperty('--i', to);
    ui.tabFrom = to;
  }
  scheduleBot();
}

let toastTimer = null, autoTimer = null;
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
  ui.endLines = botsInMatch(m).filter((id) => !bot(id).random).map((id) => ({ id, text: line(m, id, m.winners.includes(sideOfId(m, id)) ? 'win' : 'lose', 'end') })).filter((x) => x.text);
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
  if (t && isBot(t.pid)) { botHint(m, t); if (bot(t.pid).random) randomLine(m, t.pid); else if (good(m, t)) speak(m, t.pid, 'good', 0.7); }
  if (t && !isBot(t.pid)) {
    const opp = botsInMatch(m).filter((id) => sideOfId(m, id) !== t.s && !bot(id).random);
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
  if (m.game === 'cricket') return m.pending.length ? C.curThrower(m) : m.turns.length ? m.turns[m.turns.length - 1].pid : null;
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
    const ok = m.game === 'x01' ? X.undo(m) : m.game === 'cricket' ? C.undo(m) : G.undo(m);
    if (!ok || !isBot(pid)) break;
  }
  ui.botMarks = {};
  render();
}

/* ---------------- Bots: werfen selbst, Dart für Dart ---------------- */
const curThrowerOf = (m) => (m.game === 'x01' ? X.curThrower(m) : m.game === 'cricket' ? C.curThrower(m) : G.curThrower(m));
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
  const fresh = m.game === 'x01' || m.game === 'cricket' ? !m.pending.length : !(ui.botTurn?.darts?.length);
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
  if (m.game === 'cricket') {
    const s = C.curSide(m);
    if (!m.pending.length) ui.botMarks[s] = [];
    const aim = C.aim(m), d = throwAt(aim, sigmaFor(aim, b.sigma, b.dsigma));
    ui.botMarks[s] = [...(ui.botMarks[s] || []), { x: d.x, y: d.y, at: Date.now() }];
    handle(C.throwDart(m, d.n, d.m));
    return;
  }
  if (m.game === 'x01') {
    const s = X.curSide(m);
    if (!m.pending.length) ui.botMarks[s] = [];
    const d = x01BotDart(m, b.sigma, Math.random, b.dsigma);
    ui.botMarks[s] = [...(ui.botMarks[s] || []), { x: d.x, y: d.y, at: Date.now() }];
    handle(X.throwDart(m, d.n, d.m, { any: true }));
  } else {
    const s = G.curSide(m);
    if (!ui.botTurn || ui.botTurn.s !== s || ui.botTurn.mid !== m.id || ui.botTurn.n !== m.turns.length) { ui.botTurn = { s, mid: m.id, n: m.turns.length, darts: [] }; ui.botMarks[s] = []; }
    const d = partyBotDart(m, s, ui.botTurn.darts, b.sigma, Math.random, b.dsigma);
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
function greet(m) {
  botsInMatch(m).forEach((id, i) => setTimeout(() => {
    if (S.current !== m) return;
    const b = bot(id);
    if (!b.random) speak(m, id, 'start');
    else if (b.startLine) say1(id, b.startLine);
    render();
  }, 400 + i * 700));
}
/** Spruch direkt anzeigen (gleiche Sprechblase und Dauer wie bei den anderen Bots) */
function say1(id, text) {
  ui.speech ??= {};
  ui.speech[id] = { text, until: Date.now() + 3800 };
  setTimeout(() => { if (S.screen === 'game') render(); }, 3900);
}
/** Zufallssprüche: zu Spielbeginn ausgelost (Sprüche + Aufnahmen 2–8), hier nach der passenden eigenen Aufnahme gesagt */
function planBots(m) {
  ui.botPlans ??= {};
  ui.botPlans[m.id] = Object.fromEntries(botsInMatch(m).filter((id) => bot(id).random).map((id) => [id, { ...planLines(bot(id)), said: [] }]));
}
function randomLine(m, id) {
  const plan = ui.botPlans?.[m.id]?.[id];
  if (!plan) return;
  const n = m.game === 'x01' ? m.legs.reduce((a, l) => a + l.turns.filter((t) => t.pid === id).length, 0) : m.turns.filter((t) => t.pid === id).length;
  const k = plan.turns.indexOf(n);
  if (k < 0 || plan.said.includes(n)) return;
  plan.said.push(n);
  say1(id, plan.lines[k]);
}

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
  planBots(m);
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

/* ---------------- Spieler hinzufügen: Live-Prüfung des Namens, Suche ---------------- */
function focusSheet() { if (ui.addTab === 'new') setTimeout(() => $('#newPlayer')?.focus(), 60); }
function checkName() {
  const inp = $('#newPlayer'), hint = $('#nameHint'), btn = $('#addNewBtn');
  if (!inp) return;
  const n = inp.value.trim(), taken = nameTaken(n);
  if (hint) hint.textContent = taken ? `„${n}“ gibt es schon – bitte einen anderen Namen wählen.` : '';
  inp.classList.toggle('bad', taken);
  if (btn) btn.disabled = !n || taken;
}
/* ---------------- Konto & Freunde (Server) ---------------- */
const errMsg = (e) => e?.message || 'Unbekannter Fehler';
async function loadFriends() {
  if (!auth.user) return;
  ui.friends ??= {};
  try { ui.friends.data = await api('GET', 'api/friends'); ui.friends.error = null; }
  catch (e) { ui.friends.error = errMsg(e); }
  render();
}
let searchTimer = null, nameTimer = null;
function searchFriends(q) {
  ui.fsearch = { ...(ui.fsearch || {}), q, busy: true, error: null };
  clearTimeout(searchTimer);
  if (q.length < 2) { ui.fsearch.users = null; render(); return; }
  searchTimer = setTimeout(async () => {
    try { const r = await api('GET', `api/users/search?q=${encodeURIComponent(q)}`); if (ui.fsearch?.q === q) ui.fsearch = { q, users: r.users }; }
    catch (e) { if (ui.fsearch?.q === q) ui.fsearch = { q, error: errMsg(e) }; }
    render();
  }, 250);
}
/** Live-Prüfung des Namens bei der Registrierung */
function checkAuthName(v) {
  const a = ui.auth, hint = $('#authNameHint');
  clearTimeout(nameTimer);
  if (!a || !hint) return;
  const n = v.trim();
  if (!n) { a.nameOk = false; a.nameHint = ''; hint.textContent = 'Freunde finden dich über diesen Namen. 3–20 Zeichen, ohne Leerzeichen.'; hint.className = 'name-hint'; return; }
  nameTimer = setTimeout(async () => {
    try {
      const r = await api('GET', `api/auth/username?name=${encodeURIComponent(n)}`);
      if ($('#authName')?.value.trim() !== n) return;
      a.nameOk = r.available; a.nameHint = r.available ? `„${r.name}“ ist frei.` : r.reason;
    } catch (e) { a.nameOk = false; a.nameHint = errMsg(e); }
    const h = $('#authNameHint'); if (h) { h.textContent = a.nameHint; h.className = `name-hint ${a.nameOk ? 'ok' : 'bad'}`; }
  }, 300);
}
async function authCall(fn) {
  const a = ui.auth;
  a.busy = true; a.error = null; render();
  try { await fn(); } catch (e) { a.error = errMsg(e); }
  a.busy = false; render();
}
async function friendCall(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(typeof okMsg === 'function' ? okMsg(r) : okMsg); }
  catch (e) { toast(errMsg(e)); }
  if (ui.fsearch?.q) searchFriends(ui.fsearch.q);
  await loadFriends();
}
async function openFriend(id) {
  const f = ui.friends?.data?.friends?.find((x) => x.id === id);
  ui.friend = { id, name: f?.username, data: null };
  S.screen = 'friend'; render(); window.scrollTo(0, 0);
  try { const d = await api('GET', `api/friends/${encodeURIComponent(id)}`); if (ui.friend?.id === id) ui.friend.data = d; }
  catch (e) { if (ui.friend?.id === id) ui.friend.error = errMsg(e); }
  render();
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'authName') checkAuthName(e.target.value);
  if (e.target.id === 'friendSearch') searchFriends(e.target.value.trim().replace(/^@/, ''));
  if (e.target.id === 'newPlayer') checkName();
  if (e.target.id === 'pSearch') {
    const q = e.target.value.trim().toLowerCase();
    let n = 0;
    document.querySelectorAll('.plist-pick .srow[data-name]').forEach((r) => { const ok = r.dataset.name.includes(q); r.hidden = !ok; if (ok) n++; });
    const nr = document.querySelector('.nores'); if (nr) nr.hidden = n > 0;
  }
});

const throwOne = (m, n, mult) => (m.game === 'cricket' ? C.throwDart(m, n, mult) : X.throwDart(m, n, mult));

/* ---------------- Aktionen ---------------- */
const field = (id) => ($(`#${id}`)?.value || '').trim();
const actions = {
  /* Anmeldung: E-Mail → Passwort bzw. Registrierung */
  authEmail() {
    const email = field('authEmail');
    if (!email) return $('#authEmail')?.focus();
    ui.auth.email = email;
    authCall(async () => {
      const r = await api('POST', 'api/auth/email', { email });
      ui.auth.step = r.exists ? 'login' : 'register';
      ui.auth.nameHint = ''; ui.auth.nameOk = false;
      setTimeout(() => $(r.exists ? '#authPw' : '#authName')?.focus(), 60);
    });
  },
  authBack() { ui.auth = { step: 'email', email: ui.auth?.email || '' }; render(); setTimeout(() => $('#authEmail')?.focus(), 60); },
  authLogin() {
    const password = $('#authPw')?.value || '';
    if (!password) return $('#authPw')?.focus();
    authCall(async () => {
      const r = await api('POST', 'api/auth/login', { email: ui.auth.email, password });
      ui.auth = null; S.screen = 'home'; S.tab = 'play';
      await login(r.user);
      loadFriends();
    });
  },
  authRegister() {
    const username = field('authName'), password = $('#authPw')?.value || '', pw2 = $('#authPw2')?.value || '';
    if (!username) return $('#authName')?.focus();
    if (password !== pw2) { ui.auth.error = 'Die beiden Passwörter sind nicht gleich.'; return render(); }
    authCall(async () => {
      const r = await api('POST', 'api/auth/register', { email: ui.auth.email, password, username });
      ui.auth = null; S.screen = 'home'; S.tab = 'play';
      await login(r.user);
      loadFriends();
    });
  },
  async logout() {
    ui.modal = null; toast('Wird gesichert …'); render();
    if (!(await logout())) { ui.modal = { type: 'logoutUnsynced' }; render(); return; }
    ui.friends = null; ui.fsearch = null; ui.friend = null; ui.toast = null; render();
  },
  async logoutForce() { ui.modal = null; await logout(true); ui.friends = null; ui.fsearch = null; ui.friend = null; render(); },
  pwOpen() { ui.modal = { type: 'password' }; render(); setTimeout(() => $('#pwOld')?.focus(), 60); },
  async pwSave() {
    const current = $('#pwOld')?.value || '', next = $('#pwNew')?.value || '';
    ui.modal = { type: 'password', busy: true }; render();
    try { await api('POST', 'api/me/password', { current, next }); ui.modal = null; toast('Passwort geändert'); }
    catch (e) { ui.modal = { type: 'password', error: errMsg(e) }; }
    render();
  },
  delAcct() { ui.modal = { type: 'delAcct' }; render(); setTimeout(() => $('#delPw')?.focus(), 60); },
  async delAcctForce() {
    const password = $('#delPw')?.value || '';
    ui.modal = { type: 'delAcct', busy: true }; render();
    try { await api('DELETE', 'api/me', { password }); forget(); ui.modal = null; ui.friends = null; ui.fsearch = null; ui.auth = null; toast('Konto gelöscht'); }
    catch (e) { ui.modal = { type: 'delAcct', error: errMsg(e) }; }
    render();
  },
  /* Spielhistorie */
  history() { ui.histFrom = S.tab; ui.openHist = null; ui.modal = null; S.screen = 'history'; render(); window.scrollTo(0, 0); },
  histBack() { S.screen = 'home'; S.tab = ui.histFrom || 'play'; ui.openHist = null; render(); window.scrollTo(0, 0); },
  histOpen(el) { ui.openHist = ui.openHist === el.dataset.v ? null : el.dataset.v; render(); },
  histFilter(el) { ui.histFilter = el.dataset.v; ui.openHist = null; render(); },
  histDel(el) {
    const r = historyRows(S.matches, S.mainId).find((x) => x.id === el.dataset.v);
    if (!r) return;
    const label = `${r.game === 'x01' && r.start ? r.start : GAMES[r.game]?.title || r.game} · ${new Date(r.date).toLocaleDateString('de-DE')} · ${r.result}`;
    ui.modal = { type: 'histDel', id: r.id, label }; render();
  },
  histDelForce() {
    const id = ui.modal?.id;
    ui.modal = null; ui.openHist = null;
    if (id && deleteMatch(S, id)) toast('Spiel gelöscht');
    render();
  },
  /* Freunde */
  friendsReload() { ui.friends = null; render(); loadFriends(); },
  friendAdd(el) { friendCall(() => api('POST', 'api/friends', { username: el.dataset.v }), (r) => (r.status === 'friend' ? `Ihr seid jetzt Freunde` : `Anfrage an ${r.user.username} gesendet`)); },
  friendAccept(el) { friendCall(() => api('POST', `api/friends/${encodeURIComponent(el.dataset.v)}/accept`, {}), 'Freund hinzugefügt'); },
  friendDecline(el) { friendCall(() => api('DELETE', `api/friends/${encodeURIComponent(el.dataset.v)}`), 'Anfrage abgelehnt'); },
  friendCancel(el) { friendCall(() => api('DELETE', `api/friends/${encodeURIComponent(el.dataset.v)}`), 'Anfrage zurückgezogen'); },
  friendOpen(el) { openFriend(el.dataset.v); },
  friendRemove() { ui.modal = { type: 'friendRemove', name: ui.friend?.data?.user?.username || ui.friend?.name || '' }; render(); },
  async friendRemoveForce() {
    const id = ui.friend?.id;
    ui.modal = null;
    S.screen = 'home'; S.tab = 'friends'; ui.friend = null;
    await friendCall(() => api('DELETE', `api/friends/${encodeURIComponent(id)}`), 'Freund entfernt');
  },
  backFriends() { S.screen = 'home'; S.tab = 'friends'; ui.friend = null; render(); window.scrollTo(0, 0); loadFriends(); },
  tab(el) {
    S.tab = el.dataset.v; S.screen = 'home'; if (S.current && S.current.done) S.current = null;
    render(); window.scrollTo(0, 0);
    if (S.tab === 'friends') loadFriends();
  },
  rename() { ui.modal = { type: 'rename' }; render(); setTimeout(() => $('#nameField')?.focus(), 50); },
  async saveName() {
    const n = field('nameField');
    if (!n) return;
    if (n === auth.user?.username) { ui.modal = null; return render(); }
    const other = findProfile(n);
    if (other && other.id !== S.mainId) { ui.modal = { type: 'rename', error: `„${other.name}“ ist schon einer deiner Mitspieler.` }; return render(); }
    try { const r = await api('PATCH', 'api/me', { username: n }); setUser(r.user); ui.modal = null; toast('Name geändert'); }
    catch (e) { ui.modal = { type: 'rename', error: errMsg(e) }; }
    render();
  },
  settings() { ui.modal = { type: 'settings' }; render(); },
  statsWho() { ui.modal = { type: 'pickStats' }; render(); },
  statsPick(el) { S.statsPid = el.dataset.v; ui.modal = null; ui.heatSel = null; render(); },
  period(el) { S.statsPeriod = el.dataset.v; render(); },
  statsSub(el) { S.statsSub = el.dataset.v; ui.heatSel = null; render(); window.scrollTo(0, 0); },
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
  demoWipe() { ui.modal = { type: 'demoWipe' }; render(); },
  demoWipeForce() { removeDemo(S); ui.modal = null; toast('Testdaten entfernt'); render(); },
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
    if (k === 'mode' && S.game === 'x01') o.target = Math.min(o.target, o.mode === 'sets' ? 5 : 7);
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
  addPlayer() { ui.modal = { type: 'addPlayer' }; ui.addTab = ui.addTab || (S.profiles.some((p) => !S.lineup.some((e) => e.id === p.id)) ? 'known' : 'new'); render(); focusSheet(); },
  addTab(el) { ui.addTab = el.dataset.v; render(); focusSheet(); },
  addNew() {
    const n = field('newPlayer');
    if (!n) return $('#newPlayer')?.focus();
    if (nameTaken(n)) { checkName(); return $('#newPlayer')?.focus(); }
    const p = { id: uid('p'), name: n, createdAt: Date.now() };
    S.profiles.push(p);
    ui.modal = null;
    addToLineup(p.id);
  },
  addProfile(el) { if (ui.modal?.type === 'addPlayer') ui.modal = null; addToLineup(el.dataset.v); },
  pdel(el) { S.lineup.splice(Number(el.dataset.v), 1); render(); },
  pup(el) { const i = Number(el.dataset.v), L = S.lineup; [L[i - 1], L[i]] = [L[i], L[i - 1]]; render(); },
  pshuffle() { const L = S.lineup; for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } render(); },
  start() { if (S.current && !S.current.done) { ui.modal = { type: 'confirmNew' }; render(); } else startGame(); },
  startForce() { startGame(); },
  key(el) {
    const next = (ui.entry + el.dataset.v).replace(/^0+(?=\d)/, '');
    if (Number(next) > 180) { toast('Maximal 180'); return render(); }
    if (!entryPossible(next)) { toast(`${next} ist nicht möglich`); return render(); }
    ui.entry = next; render();
    // Keine Ziffer kann mehr folgen (z. B. 43 → 430+ gibt es nicht) → ohne OK übernehmen, kurz sichtbar lassen
    clearTimeout(autoTimer);
    if (entryDone(next)) autoTimer = setTimeout(() => { if (ui.entry === next && S.screen === 'game' && !ui.modal) actions.ok(); }, 220);
  },
  back() { clearTimeout(autoTimer); if (ui.entry) { ui.entry = ui.entry.slice(0, -1); render(); } else undo(); },
  ok() { actions.submit(ui.entry === '' ? 0 : parseInt(ui.entry, 10)); },
  quick(el) { actions.submit(Number(el.dataset.v)); },
  submit(v) { ui.entry = ''; const m = S.current; handle(m.game === 'x01' ? X.submitSum(m, v) : G.submit(m, v)); },
  hits(el) { handle(G.submit(S.current, Number(el.dataset.v))); },
  mult(el) { ui.mult = Number(el.dataset.v); render(); },
  dart(el) { const n = Number(el.dataset.v), mult = n === 0 ? 1 : ui.mult; ui.mult = 1; handle(throwOne(S.current, n, mult)); },
  bull(el) { ui.mult = 1; handle(throwOne(S.current, 25, Number(el.dataset.v))); },
  board(el) { ui.mult = 1; handle(throwOne(S.current, Number(el.dataset.n), Number(el.dataset.m))); },
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
    else if (e.target.id === 'nameField') actions.saveName();
    else if (e.target.id === 'authEmail') actions.authEmail();
    else if (e.target.id === 'authPw' && ui.auth?.step === 'login') actions.authLogin();
    else if (e.target.id === 'authName' || (e.target.id === 'authPw' && ui.auth?.step === 'register')) (e.target.id === 'authName' ? $('#authPw') : $('#authPw2'))?.focus();
    else if (e.target.id === 'authPw2') actions.authRegister();
    else if (e.target.id === 'pwNew') actions.pwSave();
    else if (e.target.id === 'delPw') actions.delAcctForce();
    return;
  }
  const m = S.current;
  if (fxRunning()) { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') stopFx(); return; }
  if (S.screen !== 'game' || ui.modal || !m || m.done || m.game === 'atc' || inBulloff() || isBot(curThrowerOf(m))) return;
  if (ui.moment) { if (e.key === 'Enter' || e.key === 'Escape') actions.momentClose(); return; }
  if (m.game === 'cricket' || (m.game === 'x01' && X.inputMode(m) === 'darts')) { if (e.key === 'Backspace') undo(); return; }
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
/* Einmaliger Neustart der Daten (Wunsch nach Update 3): alle Matches/Statistiken und alle Spieler außer dem
   Hauptspieler löschen, keine Testdaten mehr einfügen. Läuft genau einmal (S.cleanV). */
if (!S.cleanV) {
  S.matches = []; S.current = null;
  S.profiles = S.profiles.filter((p) => p.id === S.mainId);
  S.lineup = S.mainId ? [{ id: S.mainId, team: 'A' }] : [];
  S.statsPid = null; S.cmpA = null; S.cmpB = null; S.teamMode = false;
  if (S.screen !== 'home') { S.screen = 'home'; S.tab = 'play'; }
  S.demoSeeded = true; S.cleanV = 1;
  save();
}
seedDemo(S);   // Testdaten einmalig (Kennzeichen demo: true, in den Einstellungen entfernbar)
setOnChange(() => render());
if (S.screen === 'friend') S.screen = 'home';
render();
bootAuth().then(() => { if (auth.user) loadFriends(); });
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
