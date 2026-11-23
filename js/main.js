/* Einstieg: Rendering, Aktionen, Events. */
import { S, ui, save, resetAll, ensureProfile, findProfile, profile, nameOf, sideName, nameTaken, uid, markRemoved, unmarkRemoved } from './store.js';
import { initOnline, invite, syncIfChanged, abortOnline, acceptInvite, declineInvite, queueConfirms, flushOutbox, loadConfirms, answerConfirm, startOnlineLoops } from './online.js';
import { myBannerData } from './ui/friends.js';
import { overview } from './stats.js';
import { vsView, onlineWaitView } from './ui/versus.js';
import { bruchView, bruchResult, clock } from './ui/bruch.js';
import * as BR from './bruch.js';
import { link, onLink, joinAsController, disconnect as camUnlink, resumeLink, send as camSend, readyCams } from './camera-link.js';
import { fuseThrows } from './camfuse.js';
import { labelOf } from './board-geometry.js';
import { openRemoteSetup, setupMessage, setupOpen } from './ui/camsetup.js';
import { camFrame, paintCamViews, keepPreview, camBigView } from './ui/camview.js';
import { parseScores, parseDarts, startVoice, stopVoice, voiceOn, voiceSupported } from './voice.js';
import { openStation, closeStation, stationMessage, stationMode, stationTakeout, stationLinkChanged, stationDebug, camReady } from './ui/camstation.js';
import { createMatch } from './match.js';
import * as X from './x01.js';
import * as G from './party.js';
import * as C from './cricket.js';
import * as F from './football.js';
import { GAMES, MAX_PLAYERS } from './games.js';
import { esc } from './ui/common.js';
import { tabsBar, playView, tabIndex } from './ui/play.js';
import { authView } from './ui/auth.js';
import { friendsView, friendView } from './ui/friends.js';
import { historyView } from './ui/history.js';
import { historyRows, deleteMatch } from './history.js';
import { api } from './api.js';
import { auth, bootAuth, login, logout, forget, setUser, setOnChange, ensureMainProfile, syncNow } from './sync.js';
import { statsView, SUBTABS } from './ui/stats-view.js';
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
import { crestLine } from './ui/svg.js';
import { entryDone, entryPossible, label } from './checkout.js';
import { createBulloff, bullThrow, bullUndo, bullNext, MM } from './bulloff.js';
import { bulloffView, loupeShow, loupeHide } from './ui/bulloff-view.js';
import { fieldAt, aimLoupe, aimLoupeHide, aimHover, AR, mmToAim, aimCenter } from './ui/aimboard.js';
import { callerView } from './ui/caller.js';
import { loadCalls, clearCalls, playCall, warmCalls, startRecording, stopRecording, cancelRecording, isRecording, saveCall, deleteCall, playBuffer, callInfo } from './caller.js';

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
  // Vom Nutzer eingeblendete Zahlen (reveal.js) überleben ein Neuzeichnen: Klassen rv-on/end und der gezoomte Diagramm-Ausschnitt bleiben
  if (x.classList.contains('rv-on') && (y.classList.contains('has-tg') || y.classList.contains('has-rv'))) y.classList.add('rv-on');
  if (x.classList.contains('end') && (y.classList.contains('dbl-scroll') || y.classList.contains('fl-scroll'))) y.classList.add('end');
  if (x.dataset?.crop && x.dataset.crop === y.getAttribute('data-crop')) y.setAttribute('viewBox', x.getAttribute('viewBox'));
  for (const at of [...x.attributes]) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
  for (const at of [...y.attributes]) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
  if (x.tagName === 'INPUT' && y.hasAttribute('value') && x !== document.activeElement) x.value = y.getAttribute('value');
  patchChildren(x, y);
}
/** Doppel-Reiter (breit): Liste rechts genau so hoch wie die Scheibe links */
function fitDblList() {
  const dl = document.querySelector('.dbl-layout');
  if (!dl) return;
  const board = dl.querySelector('.heat-board'), list = dl.querySelector('.dbl-scroll'), head = dl.querySelector('.dbl-head');
  if (!board || !list) return;
  if (innerWidth < 900) { list.style.maxHeight = ''; return; }
  const top = (head ? head.getBoundingClientRect().height + 10 : 0);
  list.style.maxHeight = `${Math.max(160, Math.round(board.getBoundingClientRect().height - top))}px`;
}
addEventListener('resize', () => fitDblList());
function render() {
  if (auth.user) ensureMainProfile();
  save();
  const m = S.current;
  let html;
  if (!auth.user) html = authView();
  else if (S.screen === 'game' && m && !m.done) html = m.online && m.online.status !== 'active' ? onlineWaitView(m) : inBulloff() ? bulloffView() : gameView() + momentView();
  else if (S.screen === 'result' && m && m.done) html = tabsBar() + resultView();
  else if (S.screen === 'setup' && GAMES[S.game] && !GAMES[S.game].retired) html = setupView();
  else if (S.screen === 'compare' && S.profiles.length) html = compareView();
  else if (S.screen === 'friend' && ui.friend) html = friendView();
  else if (S.screen === 'history') html = historyView();
  else if (S.screen === 'bruch') html = bruchView();
  else if (S.screen === 'caller' && auth.user) html = callerView();
  else { S.screen = 'home'; html = tabsBar() + (S.tab === 'stats' ? statsView() : S.tab === 'friends' ? friendsView() : playView()); }
  ui.camLive = camLiveFor(m);
  if (ui.vs && m && ui.vs === m.id && S.screen === 'game') html += vsView(m);
  html += sheetView() + camPill();
  if (ui.toast) html += `<div class="toast">${esc(ui.toast)}</div>`;
  const app = $('#app');
  morph(app, html);
  const key = `${S.screen}:${S.tab}`;
  if (ui.lastKey && ui.lastKey !== key) { app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter'); }
  ui.lastKey = key;
  // Bot am Zug: Eingabebereich so hoch wie zuletzt die eigene Tastatur, damit die Karten oben nicht springen
  fitDblList();
  const pad = app.querySelector('.game .pad');
  if (pad) {
    if (!pad.querySelector('.botpad')) { pad.style.minHeight = ''; pad.style.height = ''; ui.padH = pad.offsetHeight || ui.padH; }
    else if (ui.padH) pad.style.height = `${ui.padH}px`;
  }
  // Tab-Strich gleitet von der alten zur neuen Position
  const tl = $('.tabline');
  if (tl) {
    const to = S.screen === 'home' ? tabIndex() : 0;
    if (ui.tabFrom !== null && ui.tabFrom !== to) requestAnimationFrame(() => requestAnimationFrame(() => tl.style.setProperty('--i', to)));
    else tl.style.setProperty('--i', to);
    ui.tabFrom = to;
  }
  scheduleBot();
  syncIfChanged();
  camTurnSync();
  if (voiceOn() && !(S.screen === 'game' && S.current && !S.current.done)) stopVoice(); // Mikrofon nur im laufenden Spiel
  keepPreview(link.role === 'ctl' && S.screen === 'game' && !!ui.camLive);
  requestAnimationFrame(paintCamViews);
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
let sayAfter = 0; // nach einer eigenen Ansage spricht die Computerstimme erst, wenn diese fertig ist
function say(txt) {
  if (!S.prefs.voice || !('speechSynthesis' in window) || voiceOn()) return; // Mikrofon an → App sagt nichts (sonst hört sie sich selbst)
  if (Date.now() < sayAfter) { setTimeout(() => say(txt), sayAfter - Date.now()); return; }
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(txt); u.lang = 'de-DE'; u.rate = 1.05; speechSynthesis.speak(u); } catch (e) { /* */ }
}
let wakeLock = null;
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
}
function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch (e) { /* */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.screen === 'game') requestWakeLock(); });

/* ---------------- Match-Ablauf ---------------- */
const archive = (m) => { unmarkRemoved(m.id); S.matches.push(JSON.parse(JSON.stringify({ ...m, pending: [], endedAt: Date.now() }))); };
const unarchive = (m) => { const i = S.matches.findIndex((x) => x.id === m.id); if (i >= 0) { S.matches.splice(i, 1); markRemoved([m.id]); } };

function finish() {
  const m = S.current;
  m.endedAt = Date.now();
  archive(m);
  queueConfirms(m);
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
  // Eigener Caller: wirft der Hauptspieler eine eingesprochene Zahl, kommt seine Aufnahme statt der Computerstimme
  let own = 0;
  if (t && !t.bust && t.pid === S.mainId && !isBot(t.pid) && S.prefs.ownCalls !== false && !voiceOn() && (m.game === 'x01' || m.game === 'highscore')) {
    own = playCall(m.game === 'x01' ? t.score : t.v);
    if (own) sayAfter = Date.now() + own * 1000 + 250;
  }
  if (res.type === 'match') { if (anim) { render(); anim.then(finish); } else finish(); return; }
  if (m.game === 'x01') {
    if (res.type === 'bust') { toast('Überworfen'); say('Überworfen'); }
    else if (res.type === 'turn' && !own) say(t.score === 0 ? 'Kein Score' : t.score === 180 ? 'Einhundertachtzig!' : String(t.score));
    else if (res.type === 'leg' || res.type === 'set') {
      const mo = { kind: 'leg', s: t.s, pid: t.pid, score: t.score, darts: t.darts, set: res.type === 'set' };
      say(`${res.type === 'set' ? 'Set' : 'Leg'}, ${sideName(m.sides[t.s])}`);
      if (anim) anim.then(() => { if (S.current === m) { moment(mo); render(); } });
      else moment(mo);
    }
  } else if (m.game === 'football') {
    if (res.event === 'goal') { const sc = t ? t.s : F.curSide(m); toast(`Tor! ${sideName(m.sides[sc])} · ${F.state(m, false).goals.join(' : ')}`); say('Tor!'); }
    else if (res.event === 'ball') say('Ball');
  } else if (res.type === 'halved') { toast(`Halbiert: ${res.before} → ${res.after}`); say('Halbiert'); }
  else if (res.type === 'turn' && !own) say(String(t.v));
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
  if (m.game === 'cricket' || m.game === 'football') return m.pending.length ? (m.game === 'football' ? F : C).curThrower(m) : m.turns.length ? m.turns[m.turns.length - 1].pid : null;
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
  if (m.online && (m.done || lastEntryPid(m) !== S.mainId)) { toast('Rückgängig geht nur für deine eigene letzte Eingabe'); return render(); }
  clearTimeout(botTimer); botTimer = null;
  ui.modal = null; ui.moment = null; ui.entry = ''; ui.botTurn = null;
  if (m.done) { unarchive(m); m.endedAt = undefined; S.screen = 'game'; ui.endLines = null; requestWakeLock(); }
  for (let guard = 0; guard < 400; guard++) {
    const pid = lastEntryPid(m);
    if (pid === null) break;
    const ok = m.game === 'x01' ? X.undo(m) : m.game === 'cricket' ? C.undo(m) : m.game === 'football' ? F.undo(m) : G.undo(m);
    if (!ok || !isBot(pid)) break;
  }
  ui.botMarks = {};
  render();
}

/* ---------------- Bots: werfen selbst, Dart für Dart ---------------- */
const curThrowerOf = (m) => (m.game === 'x01' ? X.curThrower(m) : m.game === 'cricket' ? C.curThrower(m) : m.game === 'football' ? F.curThrower(m) : G.curThrower(m));
const botsInMatch = (m) => m.playerIds.filter(isBot);
const sideOfId = (m, id) => m.sides.findIndex((side) => side.includes(id));
const good = (m, t) => !t.bust && ((m.game === 'x01' ? t.score : t.v) >= 100 || (t.out && t.score >= 60));
let botTimer = null;
function scheduleBot() {
  const m = S.current;
  let who = null;
  if (S.screen === 'game' && m && !m.done && !ui.modal && !ui.moment && !ui.vs && !fxRunning()) {
    if (inBulloff()) { const s = bullNext(m.bull); if (!ui.boResult && s !== null && isBot(m.sides[s][0]) && !ui.boPending) who = 'bull'; }
    else if (isBot(curThrowerOf(m))) who = 'turn';
  }
  if (!who) { if (!ui.boPending || !inBulloff()) { clearTimeout(botTimer); botTimer = null; } return; }
  if (botTimer) return;
  const fresh = m.game === 'x01' || m.game === 'cricket' || m.game === 'football' ? !m.pending.length : !(ui.botTurn?.darts?.length);
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
  if (m.game === 'football') {
    const s = F.curSide(m);
    if (!m.pending.length) ui.botMarks[s] = [];
    const aim = F.aim(m), d = throwAt(aim, sigmaFor(aim, b.sigma, b.dsigma));
    ui.botMarks[s] = [...(ui.botMarks[s] || []), { x: d.x, y: d.y, at: Date.now() }];
    handle(F.throwDart(m, d.n, d.m));
    return;
  }
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
  if (S.game === 'football' && (sides.length !== 2 || sides.some((x) => x.length !== 1))) { toast('Fußball spielt man einer gegen einen – genau zwei Spieler'); return render(); }
  const fr = S.lineup.filter((e) => e.friend), remote = fr.filter((e) => e.friend.mode === 'remote'), guests = S.lineup.filter((e) => e.guest);
  if (remote.length && (remote.length > 1 || S.lineup.length !== 2 || S.teamMode || !S.lineup.some((e) => e.id === S.mainId))) {
    toast('Online spielst du allein gegen einen Freund – nur ihr zwei in der Liste'); return render();
  }
  S.current = newMatch(S.game, sides, S.opts[S.game], remote.length ? Math.floor(Math.random() * 2) : 0, S.anwurf === 'bull' && !remote.length);
  if (guests.length) S.current.names = { ...(S.current.names || {}), ...Object.fromEntries(guests.map((e) => [e.id, e.name])) };
  S.lineup = S.lineup.filter((e) => !e.guest); // Gäste gibt es nur für dieses Spiel – beim nächsten Mal neu eingeben
  if (fr.length) {
    const m = S.current, me = myBannerData();
    m.names = { ...(m.names || {}), [S.mainId]: nameOf(S.mainId), ...Object.fromEntries(fr.map((e) => [e.id, e.name])) };
    m.friends = fr.map((e) => ({ pid: e.id, uid: e.friend.uid, name: e.name, mode: e.friend.mode }));
    m.banners = { [S.mainId]: me, ...Object.fromEntries(fr.map((e) => [e.id, { name: e.name, avg: e.banner?.avg ?? null, badges: e.banner?.badges || [null, null, null] }])) };
  }
  if (CAM_GAMES.has(S.game) && S.prefs.camPlay === false) S.current.camera = false;
  addBanners(S.current);
  if (remote.length) {
    const m = S.current, f = remote[0];
    m.online = { gid: m.id, role: 'host', rev: 0, status: 'invited', other: f.name };
    S.screen = 'game'; ui.entry = ''; ui.modal = null; ui.moment = null; ui.mult = 1;
    render();
    invite(m, { uid: f.friend.uid, name: f.name }).then(render).catch((e) => { if (S.current === m) S.current = null; S.screen = 'setup'; toast(errMsg(e)); render(); });
    return;
  }
  showVs(S.current);
  warmCalls();
  S.screen = 'game';
  ui.entry = ''; ui.modal = null; ui.moment = null; ui.mult = 1;
  requestWakeLock();
  render();
}

/** Banner aller Seiten fürs VS-Intro (je Seite der Erste): ich mit Ø und Pokalen, Freunde wie vom Server, Bots mit ihrem Ø */
function addBanners(m) {
  if (m.sides.length < 2) return;
  const b = { ...(m.banners || {}) };
  for (const side of m.sides) {
    const id = side[0];
    if (b[id]) continue;
    b[id] = id === S.mainId ? myBannerData()
      : isBot(id) ? { name: bot(id).name, avg: bot(id).avg, bot: id, badges: (bot(id).badges || []).map(([t, tier]) => ({ id: t, tier })) }
      : profile(id) ? { name: nameOf(id), avg: overview(S.matches, id).avg, badges: [null, null, null] }
      : { name: nameOf(id), avg: null, badges: [null, null, null] };
  }
  m.banners = b;
}

/** VS-Intro mit den Bannern aller Seiten (sobald es einen Gegner gibt). Weiter nur durch Antippen – kein Zeitlimit. */
function showVs(m) {
  if (!m?.banners || m.sides.length < 2) return;
  ui.vs = m.id;
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
function focusSheet() { if (ui.addTab === 'guest') setTimeout(() => $('#newPlayer')?.focus(), 60); }
/** Gast-Name: nicht wie ein Bot, ein Profil oder jemand, der schon mitspielt (Groß/Klein egal) */
const guestTaken = (n) => { const k = n.trim().toLowerCase(); return !!k && (nameTaken(n) || S.lineup.some((e) => nameOf(e.id).toLowerCase() === k)); };
function checkName() {
  const inp = $('#newPlayer'), hint = $('#nameHint'), btn = $('#addNewBtn');
  if (!inp) return;
  const n = inp.value.trim(), taken = guestTaken(n);
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
let searchTimer = null, nameTimer = null, crTimer = null;
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
  if (!n) { a.nameOk = false; a.nameHint = ''; hint.textContent = 'Freunde finden dich darüber · 3–20 Zeichen, ohne Leerzeichen'; hint.className = 'name-hint'; return; }
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
  /* Anmeldung: E-Mail oder Name → Passwort bzw. (nur mit E-Mail) Registrierung */
  authEmail() {
    const email = field('authEmail');
    if (!email) return $('#authEmail')?.focus();
    ui.auth.email = email;
    authCall(async () => {
      const r = await api('POST', 'api/auth/email', { email });
      // Mit Namen nur anmelden – ein neues Konto braucht eine E-Mail
      if (r.byName && !r.exists) { ui.auth.error = `Kein Konto mit dem Namen „${email}“. Neu hier? Dann mit deiner E-Mail registrieren.`; return; }
      ui.auth.step = r.exists ? 'login' : 'register';
      ui.auth.nameHint = ''; ui.auth.nameOk = false;
      setTimeout(() => $(r.exists ? '#authPw' : '#authName')?.focus(), 60);
    });
  },
  pwShow() { if (ui.auth) { ui.auth.show = !ui.auth.show; render(); } },
  authBack() { ui.auth = { step: 'email', email: ui.auth?.email || '' }; render(); setTimeout(() => $('#authEmail')?.focus(), 60); },
  authLogin() {
    const password = $('#authPw')?.value || '';
    if (!password) return $('#authPw')?.focus();
    authCall(async () => {
      const r = await api('POST', 'api/auth/login', { email: ui.auth.email, password });
      ui.auth = null; S.screen = 'home'; S.tab = 'play';
      await login(r.user);
      loadFriends(); loadCalls(r.user.id);
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
      loadFriends(); loadCalls(r.user.id);
    });
  },
  async logout() {
    ui.modal = null; toast('Wird gesichert …'); render();
    if (!(await logout())) { ui.modal = { type: 'logoutUnsynced' }; render(); return; }
    ui.friends = null; ui.fsearch = null; ui.friend = null; ui.toast = null; clearCalls(); render();
  },
  async logoutForce() { ui.modal = null; await logout(true); clearCalls(); ui.friends = null; ui.fsearch = null; ui.friend = null; render(); },
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
    try { await api('DELETE', 'api/me', { password }); forget(); clearCalls(); ui.modal = null; ui.friends = null; ui.fsearch = null; ui.auth = null; toast('Konto gelöscht'); }
    catch (e) { ui.modal = { type: 'delAcct', error: errMsg(e) }; }
    render();
  },
  /* Eigener Caller */
  callerOpen() { ui.modal = null; ui.caller = { sel: ui.caller?.sel ?? 180 }; S.screen = 'caller'; render(); window.scrollTo(0, 0); },
  crBack() { cancelRecording(); clearInterval(crTimer); ui.caller = null; S.screen = 'home'; S.tab = 'friends'; render(); window.scrollTo(0, 0); },
  crSel(el) {
    if (isRecording()) return;
    ui.caller = { sel: Number(el.dataset.v) }; render();
    document.querySelector('.crec')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
  async crRec() {
    const c = ui.caller;
    if (c.rec?.state === 'wait' || isRecording()) return;
    c.err = null; c.rec = { state: 'wait' }; render(); // erst „Mikrofon wird freigegeben …“, Stopp gibt es noch nicht
    try {
      await startRecording((lv) => { const el = $('#crLevel'); if (el) el.style.transform = `scaleX(${lv.toFixed(3)})`; });
    } catch (e) {
      c.rec = null; c.err = e.name === 'NotAllowedError' ? 'Kein Zugriff aufs Mikrofon – bitte in den Einstellungen des Browsers erlauben.' : errMsg(e); render(); return;
    }
    if (ui.caller !== c) { cancelRecording(); return; } // Screen inzwischen verlassen
    const t0 = Date.now(); // die 5 s zählen erst ab jetzt, nicht schon während der Mikrofon-Abfrage
    c.rec = { state: 'rec' }; render();
    clearInterval(crTimer);
    crTimer = setInterval(() => {
      const sec = (Date.now() - t0) / 1000, el = $('#crTime');
      if (el) el.textContent = `${sec.toFixed(1).replace('.', ',')} s`;
      if (sec >= 5) actions.crStop();
    }, 100);
  },
  async crStop() {
    clearInterval(crTimer);
    const c = ui.caller;
    if (!c || c.rec?.state !== 'rec' || !isRecording()) return; // Stopp nur, wenn die Aufnahme wirklich läuft
    try {
      const r = await stopRecording();
      if (!r) { c.rec = null; render(); return; }
      c.rec = { state: 'done', ...r }; playBuffer(r.buffer);
    }
    catch (e) { c.rec = null; c.err = errMsg(e); }
    render();
  },
  crPlayNew() { playBuffer(ui.caller?.rec?.buffer); },
  crPlay() { playCall(ui.caller.sel); },
  async crSave() {
    const c = ui.caller, r = c.rec;
    c.busy = true; render();
    try { await saveCall(c.sel, r.wav, r.buffer); c.rec = null; toast(`Ansage für ${c.sel} gespeichert`); }
    catch (e) { c.err = errMsg(e); }
    c.busy = false; render();
  },
  async crDel() {
    const c = ui.caller;
    try { await deleteCall(c.sel); toast(`Ansage für ${c.sel} gelöscht`); } catch (e) { c.err = errMsg(e); }
    render();
  },
  /* Spielhistorie */
  history() { ui.histFrom = S.tab; ui.openHist = null; ui.modal = null; S.screen = 'history'; render(); window.scrollTo(0, 0); },
  histBack() { S.screen = 'home'; S.tab = ui.histFrom || 'play'; ui.openHist = null; render(); window.scrollTo(0, 0); },
  histOpen(el) { ui.modal = { type: 'hist', id: el.dataset.v }; render(); }, // Details als Fenster in der Mitte
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
    if (el.dataset.v === 'stats' && S.tab !== 'stats') { S.statsPeriod = 'all'; S.statsSub = 'doubles'; } // Statistik startet immer mit „Gesamt“ und im Reiter Doppel
    S.tab = el.dataset.v; S.screen = 'home'; if (S.current && S.current.done) S.current = null;
    render(); window.scrollTo(0, 0);
    if (S.tab === 'friends') { loadFriends(); loadConfirms(); }
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
  /* Rekord-Karte/Zeile in der Statistik → Leg bzw. Match im Detail */
  rec(el) {
    const d = el.dataset, num = (v) => (v === '' || v === undefined ? null : Number(v));
    ui.modal = { type: 'leg', mid: d.m, li: num(d.l), ti: num(d.t), pid: d.p }; render();
    document.querySelector('.sheet')?.scrollTo(0, 0);
  },
  statsWho() { S.statsPid = S.mainId; render(); }, // keine Spielerwahl mehr – immer der Hauptspieler
  statsPick(el) { S.statsPid = el.dataset.v; ui.modal = null; ui.heatSel = null; render(); },
  period(el) { S.statsPeriod = el.dataset.v; if (ui.modal?.type === 'period') ui.modal = null; render(); },
  periodPick() { ui.modal = { type: 'period' }; render(); },
  statsFold(el) { ui.statsOpen ??= new Set(); const k = el.dataset.v; if (ui.statsOpen.has(k)) ui.statsOpen.delete(k); else ui.statsOpen.add(k); render(); },
  statsSub(el) { S.statsSub = el.dataset.v; ui.heatSel = null; render(); window.scrollTo(0, 0); },
  heat(el) { ui.heatSel = ui.heatSel === el.dataset.v ? null : el.dataset.v; render(); },
  /* Banner: Abzeichen-Platz antippen → Auswahl darunter auf/zu; Trophäe wählen → in den Platz (synchronisiert über prefs) */
  badgeSlot(el) { const i = Number(el.dataset.v); ui.badgePick = ui.badgePick === i ? null : i; render(); },
  badgeSet(el) {
    const i = ui.badgePick, id = el.dataset.v || null;
    if (!Number.isInteger(i)) return;
    const b = Array.isArray(S.prefs.badges) ? S.prefs.badges.slice(0, 3) : [];
    while (b.length < 3) b.push(null);
    if (id) for (let k = 0; k < 3; k++) if (b[k] === id) b[k] = null; // keine Trophäe doppelt
    b[i] = id; S.prefs.badges = b; ui.badgePick = null; render();
  },
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
  pick(el) {
    if (el.dataset.v === 'bruch') { S.screen = 'bruch'; render(); window.scrollTo(0, 0); return; }
    S.game = el.dataset.v; S.screen = 'setup'; ui.moreOpen = false; render(); window.scrollTo(0, 0);
  },
  /* Bruchchallenge */
  bruchStart(el) { S.bruch = BR.start(Number(el.dataset.v)); requestWakeLock(); render(); window.scrollTo(0, 0); },
  bruchTick(el) {
    const b = S.bruch; if (!b) return;
    const i = Number(el.dataset.v); b.done[i] = !b.done[i];
    if (BR.allDone(b)) bruchEnd('won'); else render();
  },
  bruchQuit() { if (S.bruch) bruchEnd('quit'); },
  bruchAgain() { ui.modal = null; S.screen = 'bruch'; render(); },
  bruchCancel() { ui.modal = { type: 'bruchCancel' }; render(); },
  bruchCancelForce() { S.bruch = null; ui.modal = null; releaseWakeLock(); toast('Challenge abgebrochen'); render(); }, // nichts gespeichert
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
  addPlayer() { if (!ui.friends?.data) loadFriends(); ui.addFriend = null; ui.modal = { type: 'addPlayer' }; if (!['friend', 'guest', 'bot'].includes(ui.addTab)) ui.addTab = 'friend'; render(); focusSheet(); },
  addTab(el) { ui.addTab = el.dataset.v; ui.addFriend = null; render(); focusSheet(); if (el.dataset.v === 'friend') loadFriends(); },
  addFriendPick(el) { ui.addFriend = el.dataset.v; render(); },
  addFriendBack() { ui.addFriend = null; render(); },
  addFriend(el) {
    const f = (ui.friends?.data?.friends || []).find((x) => x.id === el.dataset.v), mode = el.dataset.mode;
    if (!f?.pid) return;
    if (S.lineup.some((e) => e.id === f.pid)) { toast(`${f.username} ist schon dabei`); return render(); }
    if (S.lineup.length >= MAX_PLAYERS) { toast(`Maximal ${MAX_PLAYERS} Spieler`); return render(); }
    if (mode === 'remote') {
      // Online: nur du gegen diesen Freund – andere Mitspieler fliegen raus, du kommst rein
      S.lineup = S.lineup.filter((e) => e.id === S.mainId);
      if (!S.lineup.length && S.mainId) S.lineup.push({ id: S.mainId, team: 'A' });
      S.teamMode = false;
    } else S.lineup = S.lineup.filter((e) => e.friend?.mode !== 'remote');
    const teams = S.lineup.map((e) => e.team);
    const team = teams.filter((t) => t === 'A').length <= teams.filter((t) => t === 'B').length ? 'A' : 'B';
    S.lineup.push({ id: f.pid, team, name: f.username, friend: { uid: f.id, mode }, banner: { avg: f.avg, badges: f.badges } });
    ui.modal = null; ui.addFriend = null;
    toast(mode === 'remote' ? `${f.username} spielt auf seinem Gerät` : `${f.username} spielt hier mit`);
    render();
  },
  async inviteYes(el) {
    ui.modal = null; (ui.inviteSeen ??= new Set()).add(el.dataset.v);
    try {
      await acceptInvite(el.dataset.v);
      S.screen = 'game'; ui.entry = ''; ui.moment = null; ui.mult = 1;
      warmCalls(); requestWakeLock(); showVs(S.current);
    } catch (e) { toast(errMsg(e)); }
    render();
  },
  inviteNo(el) { ui.modal = null; declineInvite(el.dataset.v); render(); },
  async confirmAns(el) {
    try { await answerConfirm(el.dataset.v, el.dataset.ok === '1'); toast(el.dataset.ok === '1' ? 'Spiel übernommen' : 'Spiel abgelehnt'); }
    catch (e) { toast(errMsg(e)); }
    render();
  },
  vsClose() { ui.vs = null; render(); },
  /* Kamera (Beta): an/aus, Vorschlag übernehmen (Einzeldart/Cricket) oder verwerfen */
  /* Kamera: Menü (Kamera-Gerät · Nur dieses Gerät · Kamera-Gerät verbinden), Korrektur, Aufnahme beenden, Darts gezogen */
  cam() { ui.modal = { type: 'camMenu' }; render(); },
  camAsDevice() { ui.modal = null; render(); openStation('cam', stationHooks); },
  camSingle() { ui.modal = null; render(); openStation('single', stationHooks); },
  camConnect() { ui.modal = { type: 'camConnect' }; render(); setTimeout(() => $('#camCode')?.focus(), 60); },
  async camJoin() {
    const code = $('#camCode')?.value || '';
    ui.modal = { type: 'camConnect', busy: true }; render();
    try { await joinAsController(code); ui.modal = null; toast('Kamera-Gerät verbunden'); }
    catch (e) { ui.modal = { type: 'camConnect', error: errMsg(e) }; }
    render();
  },
  /* Kamera einrichten vom anderen Gerät (gleiches Konto): verbinden und Assistent öffnen */
  async camRemote(el) {
    try {
      const codes = ui.camMine || [];
      if (link.role !== 'ctl') { if (!codes.length) { toast('Keine Kamera gefunden – am Handy in Backstage › Kamera starten'); return; } for (const c of codes) await joinAsController(c); }
      const code = el?.dataset?.v || link.cams.find((c) => !c.calibrated)?.code || link.cams[0]?.code;
      const cam = link.cams.find((c) => c.code === code);
      if (code) openRemoteSetup({ code, n: `${cam?.n || 1}${cam?.device ? ` · ${cam.device}` : ''}`, toast, onDone: () => render() });
    } catch (e) { toast(errMsg(e)); }
    render();
  },
  /* Dieses Gerät wird die Regie: mit allen Kameras im Konto verbinden */
  async camBeMain() {
    try { for (const c of ui.camMine || []) await joinAsController(c); toast('Regie – Kameras verbunden'); } catch (e) { toast(errMsg(e)); }
    render();
  },
  camDrop(el) { camUnlink(el.dataset.v); render(); },
  /* Regie steuert das Handy fern: Objektiv, Pause, Debug, Beenden */
  camCtl(el) { const code = el.dataset.v; ui.modal = { type: 'camCtl', code }; camSend({ type: 'listCams' }, code); render(); },
  camLens(el) { camSend({ type: 'useCam', id: el.dataset.v }, ui.modal?.code); toast('Objektiv wird gewechselt – danach neu einrichten'); },
  camPause() { const c = link.cams.find((x) => x.code === ui.modal?.code); if (c) camSend({ type: c.paused ? 'resume' : 'pause' }, c.code); },
  camDbg() { S.prefs.camDebug = !S.prefs.camDebug; camSend({ type: 'debug', on: S.prefs.camDebug }, ui.modal?.code); render(); },
  camStopRemote() { const code = ui.modal?.code; camSend({ type: 'stop' }, code); setTimeout(() => camUnlink(code), 800); ui.modal = null; toast('Kamera wird beendet'); render(); },
  camResumeYes() { ui.modal = null; render(); openStation('cam', stationHooks); },
  camResumeNo() { ui.modal = null; camUnlink(); render(); },
  camOff() { ui.modal = null; if (stationMode()) closeStation(); if (link.role) camUnlink(); ui.ct = null; render(); },
  camSlot(el) { ui.modal = { type: 'camFix', i: Number(el.dataset.v) }; ui.fixMult = 1; render(); },
  camFixMult(el) { ui.fixMult = Number(el.dataset.v); render(); },
  camFixSet(el) {
    const i = ui.modal?.i, d = ui.ct?.darts?.[i]; if (!d) return;
    const n = Number(el.dataset.n), mult = n === 0 ? 1 : n === 25 ? Number(el.dataset.m || 1) : ui.fixMult;
    Object.assign(d, { n, m: mult, label: labelOf({ n, m: mult }), conf: 1, fixed: true });
    if (link.role === 'ctl') camSend({ type: 'throwCorrected', id: d.id, label: d.label }, d.code || null);
    ui.modal = null; render();
  },
  camMiss() {
    const i = Number.isInteger(ui.camSel) ? ui.camSel : null;
    if (i !== null && ui.ct?.darts?.[i]) { Object.assign(ui.ct.darts[i], { n: 0, m: 1, label: 'MISS', conf: 1, fixed: true, ax: undefined, ay: undefined }); ui.camSel = null; return render(); }
    camAdd({ id: `m${Date.now()}`, n: 0, m: 1, label: 'MISS', conf: 1 });
  },
  camSel(el) { const i = Number(el.dataset.v); ui.camSel = ui.camSel === i ? null : i; if (ui.ct) { clearTimeout(commitTimer); clearInterval(tickTimer); ui.ct.deadline = null; } render(); },
  /* Mikrofon: Punkte ansagen („37“, „Bust“, „nichts“, „null“) */
  mic() {
    if (voiceOn()) { stopVoice(); ui.micHeard = ''; return render(); }
    if (!voiceSupported()) { toast('Spracheingabe geht in diesem Browser nicht'); return; }
    ui.micHeard = '';
    startVoice({ text: onVoice, state: (st) => { if (st === 'denied') toast('Mikrofon nicht erlaubt – in den Einstellungen des Browsers freigeben'); render(); } });
    render();
  },
  camBig() { ui.modal = { type: 'camBig' }; render(); },
  camKeys() { ui.camManual = !ui.camManual; ui.camSel = null; render(); },
  camEnd() { commitCam(true); },
  camOk() { commitCam(true); },
  camPulled() { if (link.role === 'ctl') camSend({ type: 'takeout' }); stationTakeout(); if (ui.ct && !ui.ct.darts.length) ui.ct = null; toast('Darts gezogen'); render(); },
  addNew() {
    // Gast: kein Profil, keine Statistik – nur für dieses Spiel (danach wieder aus der Aufstellung)
    const n = field('newPlayer');
    if (!n) return $('#newPlayer')?.focus();
    if (guestTaken(n)) { checkName(); return $('#newPlayer')?.focus(); }
    if (S.lineup.length >= MAX_PLAYERS) { toast(`Maximal ${MAX_PLAYERS} Spieler`); return render(); }
    if (S.lineup.some((e) => e.friend?.mode === 'remote')) { toast('Online spielst du nur gegen deinen Freund'); return render(); }
    const teams = S.lineup.map((e) => e.team);
    const team = teams.filter((t) => t === 'A').length <= teams.filter((t) => t === 'B').length ? 'A' : 'B';
    S.lineup.push({ id: uid('g'), team, name: n, guest: true });
    ui.modal = null;
    render();
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
  /** Schnellwahl: Zahl erst kurz groß im Eingabefeld zeigen (zur Kontrolle), dann übernehmen */
  quick(el) {
    const v = Number(el.dataset.v), m = S.current;
    clearTimeout(autoTimer);
    ui.entry = String(v); ui.quickFlash = true; render();
    autoTimer = setTimeout(() => {
      ui.quickFlash = false;
      if (S.current === m && ui.entry === String(v) && S.screen === 'game' && !ui.modal) actions.submit(v);
      else render();
    }, 420);
  },
  submit(v) { ui.entry = ''; const m = S.current; handle(m.game === 'x01' ? X.submitSum(m, v) : G.submit(m, v)); },
  hits(el) { handle(G.submit(S.current, Number(el.dataset.v))); },
  mult(el) { ui.mult = Number(el.dataset.v); render(); },
  dart(el) {
    const n = Number(el.dataset.v), mult = n === 0 ? 1 : ui.mult; ui.mult = 1;
    if (ui.aimPos) ui.aimPos = ui.aimPos.slice(0, S.current.pending.length); // Daneben-Knopf: keine Position
    handle(throwOne(S.current, n, mult));
  },
  bull(el) { ui.mult = 1; handle(throwOne(S.current, 25, Number(el.dataset.v))); },
  board(el) { ui.mult = 1; handle(throwOne(S.current, Number(el.dataset.n), Number(el.dataset.m))); },
  /** Dart von der Scheibe (Position in Scheiben-Einheiten) */
  aimDart(x, y) {
    if (notMyTurn()) return;
    // Kamera-Scheibe: ausgewählten Kasten korrigieren – sonst selbst einen Dart eintragen
    if (ui.camPadOn) {
      const f = fieldAt(x, y), d = { n: f.n, m: f.n === 0 ? 1 : f.m, z: f.z, ax: Math.round(x * 10) / 10, ay: Math.round(y * 10) / 10, label: labelOf(f), conf: 1, fixed: true };
      const i = Number.isInteger(ui.camSel) ? ui.camSel : null;
      if (i !== null && ui.ct?.darts?.[i]) {
        const old = ui.ct.darts[i]; Object.assign(old, d, { id: old.id, code: old.code, snapshot: old.snapshot });
        if (link.role === 'ctl') camSend({ type: 'throwCorrected', id: old.id, label: d.label }, old.code || null);
        ui.camSel = null; render();
      } else camAdd({ id: `h${Date.now()}`, ...d, fixed: false });
      return;
    }
    const m = S.current, d = fieldAt(x, y);
    ui.aimPos = (ui.aimPos || []).slice(0, m.pending.length);
    ui.aimPos.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    ui.mult = 1;
    handle(throwOne(m, d.n, d.n === 0 ? 1 : d.m));
  },
  dartInput(el) { S.prefs.dartInput = el.dataset.v; render(); },
  /* Cricket-Tafel: Zahl antippen = Dart (Single/Double/Triple), Daneben, Weiter = restliche Darts als daneben */
  ckHit(el) { handle(C.throwDart(S.current, Number(el.dataset.n), Number(el.dataset.m))); },
  ckMiss() { handle(C.throwDart(S.current, 0, 1)); },
  fbHit(el) { handle(F.throwDart(S.current, Number(el.dataset.n), Number(el.dataset.m))); }, // Fußball: Bull, Bullseye, Tor, daneben
  ckNext() {
    const m = S.current, k = 3 - m.pending.length;
    let res = null;
    for (let i = 0; i < k; i++) { res = C.throwDart(m, 0, 1); if (res.type !== 'dart') break; }
    if (res) handle(res);
  },
  boOk() { if (ui.boPending) bullPlace(ui.boPending.x, ui.boPending.y); },
  boUndo() { if (ui.boPending) ui.boPending = null; else bullUndo(S.current.bull); render(); },
  boDone() { finishBulloff(); },
  boTie() { clearTimeout(boTimer); ui.boResult = null; render(); },
  momentClose() { ui.moment = null; clearTimeout(momentTimer); render(); },
  undo() { undo(); },
  gear() { ui.modal = { type: 'gear' }; render(); },
  pref(el) { const k = el.dataset.k; S.prefs[k] = !S.prefs[k]; if (k === 'camDebug') { stationHooks.debug = S.prefs.camDebug; stationDebug(S.prefs.camDebug); } if (k === 'voice' && !S.prefs.voice) try { speechSynthesis.cancel(); } catch (e) { /* */ } render(); },
  abort() { ui.modal = { type: 'abort' }; render(); },
  abortForce() { if (S.current?.online) abortOnline(); S.current = null; ui.modal = null; ui.moment = null; S.screen = 'home'; releaseWakeLock(); render(); },
  closeModal() { ui.modal = null; render(); },
  scrim() { ui.modal = null; render(); },
  rematch() {
    const m = S.current;
    if (m.online) { toast('Für eine Revanche lade deinen Freund neu ein'); return render(); }
    S.current = newMatch(m.game, m.sides, m.opts, m.first + 1, !!m.bull);
    if (m.names) S.current.names = m.names;
    if (m.friends) S.current.friends = m.friends;
    if (m.banners) { S.current.banners = m.banners; showVs(S.current); }
    S.screen = 'game'; ui.entry = ''; ui.modal = null; ui.moment = null; ui.mult = 1;
    requestWakeLock(); render();
  },
};

const INPUT_ACTS = new Set(['key', 'back', 'ok', 'quick', 'hits', 'mult', 'dart', 'bull', 'board', 'ckHit', 'ckMiss', 'ckNext', 'fbHit', 'camMiss', 'camEnd', 'camOk', 'camFixSet', 'camSel']);
/** Online: nur wer dran ist, darf eingeben */
const notMyTurn = () => { const m = S.current; return !!(m?.online && !m.done && S.screen === 'game' && curThrowerOf(m) !== S.mainId); };
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  if (INPUT_ACTS.has(el.dataset.act) && notMyTurn()) { toast(`${nameOf(curThrowerOf(S.current))} ist dran`); render(); return; }
  if (el.dataset.act === 'scrim' && e.target !== el) return;
  actions[el.dataset.act]?.(el);
});
/* Lange auf den Reiter „Statistik“ drücken (0,5 s) → Zeitraum wählen; der Klick danach wird verschluckt */
let lpTimer = null, lpFired = false;
document.addEventListener('pointerdown', (e) => {
  const t = e.target.closest('.tab[data-v="stats"]');
  if (!t) return;
  lpFired = false; clearTimeout(lpTimer);
  lpTimer = setTimeout(() => { lpFired = true; navigator.vibrate?.(12); actions.tab(t); actions.periodPick(); }, 500);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(ev, () => clearTimeout(lpTimer));
document.addEventListener('click', (e) => { if (lpFired && e.target.closest('.tab[data-v="stats"]')) { lpFired = false; e.stopImmediatePropagation(); e.preventDefault(); } }, true);
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.tab[data-v="stats"]')) e.preventDefault(); });

/* Statistik: zwischen Überblick · Doppel · Scoring wischen (waagerecht, deutlich mehr als senkrecht) */
let swipe0 = null;
document.addEventListener('touchstart', (e) => {
  swipe0 = S.screen === 'home' && S.tab === 'stats' && e.touches.length === 1 && !e.target.closest('.dbl-scroll, .heat-board, .chart, input')
    ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!swipe0) return;
  const t = e.changedTouches[0], dx = t.clientX - swipe0.x, dy = t.clientY - swipe0.y;
  const ok = Math.abs(dx) > 70 && Math.abs(dy) < Math.abs(dx) * 0.5 && Date.now() - swipe0.t < 700;
  swipe0 = null;
  if (!ok || !document.querySelector('.subpop .subtabs')) return;
  const keys = SUBTABS.map(([k]) => k), i = keys.indexOf(document.querySelector('.subpop .subtabs .on')?.dataset.v);
  const next = keys[i + (dx < 0 ? 1 : -1)];
  if (i >= 0 && next) actions.statsSub({ dataset: { v: next } });
}, { passive: true });
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
    else if (e.target.id === 'camCode') actions.camJoin();
    return;
  }
  const m = S.current;
  if (fxRunning()) { if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') stopFx(); return; }
  if (S.screen !== 'game' || ui.modal || !m || m.done || m.game === 'atc' || inBulloff() || isBot(curThrowerOf(m)) || notMyTurn()) return;
  if (ui.moment) { if (e.key === 'Enter' || e.key === 'Escape') actions.momentClose(); return; }
  if (m.game === 'cricket' || m.game === 'football' || (m.game === 'x01' && X.inputMode(m) === 'darts')) { if (e.key === 'Backspace') undo(); return; }
  if (/^\d$/.test(e.key)) actions.key({ dataset: { v: e.key } });
  else if (e.key === 'Enter') actions.ok();
  else if (e.key === 'Backspace') actions.back();
});

/* ---------------- Kamera (Beta): erkannte Darts als Vorschlag ---------------- */
/* Kamera-Erkennung im Spiel: Würfe vom Kamera-Gerät (oder vom eigenen Gerät) landen in ui.ct.darts (3 Slots),
   nach 3 Darts bzw. „Aufnahme beenden“ 2 s Zeit zum Korrigieren, dann gewertet (Dart für Dart über die Engine).
   Bots, fremder Zug online, Ausbullen und VS-Intro: Kamera-Würfe werden ignoriert. Manuelle Eingabe geht immer. */
const CAM_GAMES = new Set(['x01', 'cricket']);
function camLiveFor(m) {
  if (!m || m.done || !CAM_GAMES.has(m.game) || m.camera === false) return false;
  return camReady().ready;
}
function camAdd(d) {
  const m = S.current;
  if (S.screen !== 'game' || !camLiveFor(m) || inBulloff() || ui.vs || isBot(curThrowerOf(m)) || notMyTurn()) return;
  ui.ct ??= { darts: [] };
  if (ui.ct.darts.length >= 3) return;
  ui.ct.darts.push(d);
  // Erst nach 3 s werten – und nur, wenn die Kamera sich sicher ist; sonst wartet sie auf OK
  if (ui.ct.darts.length === 3 && S.prefs.camAuto !== false && ui.ct.darts.every((x) => x.conf >= 0.7)) armCommit();
  render();
}
let commitTimer = null, tickTimer = null;
function armCommit() {
  clearTimeout(commitTimer); clearInterval(tickTimer);
  ui.ct.deadline = Date.now() + 3000;
  commitTimer = setTimeout(() => commitCam(true), 3000);
  tickTimer = setInterval(() => { const el = document.querySelector('.cb-count b'); if (el && ui.ct?.deadline) el.textContent = Math.max(0, Math.ceil((ui.ct.deadline - Date.now()) / 1000)); }, 200);
}
/** Aufnahme werten: erkannte (ggf. korrigierte) Darts in die Engine, fehlende als daneben, wenn die Aufnahme noch offen ist */
function commitCam(fill) {
  clearTimeout(commitTimer); clearInterval(tickTimer);
  const m = S.current, ct = ui.ct; ui.ct = null; ui.camSel = null;
  if (!m || m.done || !ct) return render();
  if (ui.modal?.type === 'camFix') ui.modal = null;
  const one = (n, mult) => (m.game === 'cricket' ? C.throwDart(m, n, mult) : X.throwDart(m, n, mult, { any: true }));
  let res = null, k = 0;
  for (const d of ct.darts) { res = one(d.n, d.n === 0 ? 1 : d.m); k++; if (res.type !== 'dart') break; }
  while (fill && res?.type === 'dart' && k < 3) { res = one(0, 1); k++; }
  if (!res && fill) { for (let i = 0; i < 3; i++) { res = one(0, 1); if (res.type !== 'dart') break; } }
  if (res) handle(res); else render();
}
/** Kamera-Wurf annehmen (Nachricht `throw`). Mehrere Kameras: kurz (1,2 s) auf die anderen warten und zusammenführen. */
let fuse = null;
function camThrowPos(msg) { if (!Number.isFinite(msg.boardX)) return {}; const [ax, ay] = mmToAim(msg.boardX, msg.boardY); return { ax, ay }; }
function camThrow(msg, code = null) {
  if (readyCams() < 2) return addThrow(msg, code);
  if (fuse && !fuse.list.some((x) => x.code === code)) { fuse.list.push({ ...msg, code }); if (fuse.list.length >= readyCams()) flushFuse(); return; }
  if (fuse) flushFuse();
  fuse = { list: [{ ...msg, code }], timer: setTimeout(flushFuse, 1200) };
}
function flushFuse() { if (!fuse) return; clearTimeout(fuse.timer); const list = fuse.list; fuse = null; const f = fuseThrows(list); addThrow(f, f.code); }
function addThrow(msg, code) {
  camAdd({ id: msg.id, code, n: msg.segment, m: msg.multiplier || 1, label: msg.label, conf: msg.confidence ?? 1, snapshot: msg.snapshot || null, x: msg.boardX, y: msg.boardY, ...camThrowPos(msg) });
}
const stationHooks = {
  toast, debug: !!S.prefs.camDebug,
  onThrow: camThrow,
  onTakeout() { if (ui.ct && !ui.ct.darts.length) ui.ct = null; render(); },
  onMoved() { link.moved = true; toast('Kamera verrutscht – bitte neu kalibrieren'); render(); },
  onCalibrated() { link.moved = false; render(); },
  onClose() { ui.ct = null; render(); },
};
onLink({
  change() { stationLinkChanged(); render(); },
  message(m, code) {
    if (link.role === 'cam') { stationMessage(m); return; }
    if (setupMessage(m, code)) return;
    if (m.type === 'frame' && !m.still) { camFrame(m, code); return; }
    if (m.type === 'throw') camThrow(m, code);
    else if (m.type === 'calibrationStatus') { lastTurnKey = ''; render(); }
    else if (m.type === 'takeout') { if (ui.ct && !ui.ct.darts.length) ui.ct = null; render(); }
    else if (m.type === 'cameraMoved') { link.moved = true; toast('Kamera verrutscht – bitte am Kamera-Gerät neu kalibrieren'); render(); }
    else if (m.type === 'hello') { lastTurnKey = ''; camTurnSync(); }
  },
});
/** Wer ist dran? → an das Kamera-Gerät (Anzeige dort, Bot = Kamera wartet) */
let lastTurnKey = '';
function camTurnSync() {
  if (!(link.role === 'ctl' && link.status === 'connected') && stationMode() !== 'single') return;
  const m = S.current, live = S.screen === 'game' && m && !m.done;
  const who = live && !inBulloff() ? curThrowerOf(m) : null;
  const key = `${m?.id}:${who}:${live}`;
  if (key === lastTurnKey) return;
  lastTurnKey = key;
  const msg = { type: 'turnChanged', name: who ? nameOf(who) : '', bot: who ? isBot(who) : false };
  if (link.role === 'ctl') camSend(msg); else stationMessage(msg);
}
/** Kleine Statusanzeige oben (Steuer-Gerät bzw. Ein-Geräte-Modus) */
function camPill() {
  if (link.role === 'ctl') {
    const n = link.cams.length, ready = readyCams();
    const [cls, txt] = link.moved ? ['bad', 'Kamera verrutscht'] : link.status === 'connected' ? (link.calibrated ? ['ok', n > 1 ? `${ready}/${n} Kameras bereit` : 'Kamera verbunden'] : ['wait', 'Kamera: nicht eingerichtet']) : link.status === 'lost' ? ['bad', 'Getrennt'] : ['wait', 'Verbinde …'];
    return `<button class="campill ${cls}" data-act="cam">● ${txt}</button>`;
  }
  if (stationMode() === 'single') return `<button class="campill ${link.moved ? 'bad' : 'ok'}" data-act="cam">● ${link.moved ? 'Kamera verrutscht' : 'Kamera (dieses Gerät)'}</button>`;
  return '';
}


/* Läuft im selben Konto ein Kamera-Gerät? Dann zeigt der Startbildschirm die Kamera zum Einrichten (alle 5 s nachsehen). */
setInterval(async () => {
  if (!auth.user || link.role === 'cam' || document.hidden || S.screen !== 'home') return;
  try {
    const r = await api('GET', 'api/camlink/mine'), codes = r.codes || [];
    // Regie: neue Kamera im Konto gleich mitverbinden
    if (link.role === 'ctl') for (const c of codes) if (!link.cams.some((x) => x.code === c)) { await joinAsController(c).catch(() => {}); toast('Weitere Kamera verbunden – bitte einrichten'); }
    if (codes.join() !== (ui.camMine || []).join()) { ui.camMine = codes; render(); }
  } catch { /* offline */ }
}, 5000);

/* ---------------- Mikrofon: angesagte Punktzahlen eintragen ---------------- */
function onVoice(text) {
  if (window.speechSynthesis?.speaking) return; // nur falls doch gerade etwas gesprochen wird
  const m = S.current;
  // Checkout-Modus (Rest ≤ 170): Dart für Dart ansagen – „Triple 20, Single 5, Double 16“ – jeder Dart landet auf der Scheibe rechts
  if (m && !m.done && m.game === 'x01' && X.inputMode(m) === 'darts' && S.screen === 'game' && !ui.modal && !ui.vs && !inBulloff()) {
    const darts = parseDarts(text);
    ui.micHeard = darts.length ? `Gehört: ${darts.map((d) => (d.n === 0 ? '0' : label(d))).join(' · ')}` : `„${String(text).trim().slice(0, 30)}“`;
    for (const d of darts) {
      if (isBot(curThrowerOf(m)) || notMyTurn() || m.done || X.inputMode(m) !== 'darts') break;
      const p = aimCenter(d);
      actions.aimDart(p.x, p.y);
    }
    return render();
  }
  const scores = parseScores(text);
  ui.micHeard = scores.length ? `Gehört: ${scores.map((v) => (v === 0 ? '0' : v)).join(' · ')}` : `„${String(text).trim().slice(0, 30)}“`;
  if (!scores.length || S.screen !== 'game' || !m || m.done || m.game !== 'x01' || ui.modal || ui.vs || inBulloff()) return render();
  for (const v of scores) {
    const who = curThrowerOf(m);
    if (isBot(who) || notMyTurn() || m.done) break;
    ui.entry = '';
    const res = X.submitSum(m, v, { voice: true });
    handle(res);
    if (res.type === 'error' || res.type === 'match' || res.type === 'leg' || res.type === 'set') break;
  }
  render();
}

/* ---------------- Bruchchallenge: Ende und Countdown ---------------- */
function bruchEnd(reason) {
  const b = S.bruch; if (!b || !S.mainId) return;
  const m = BR.toMatch(b, S.mainId);
  S.matches.push(m); S.bruch = null; releaseWakeLock();
  ui.modal = { type: 'bruchResult', won: reason === 'won', reason, done: b.done.filter(Boolean).length, took: m.endedAt - m.startedAt };
  render();
}
setInterval(() => {
  const b = S.bruch; if (!b) return;
  if (BR.left(b) <= 0) { bruchEnd(BR.allDone(b) ? 'won' : 'time'); return; }
  const el = document.getElementById('brClock');
  if (el) el.textContent = clock(BR.left(b));
}, 1000);

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

/* ---------------- Eingabe-Scheibe: halten → Lupe, loslassen setzt den Dart ---------------- */
let aim = null;
function aimPoint(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  const r = Math.hypot(q.x, q.y), k = r > AR.edge ? AR.edge / r : 1;
  return { x: q.x * k, y: q.y * k };
}
document.addEventListener('pointerdown', (e) => {
  const svg = e.target.closest?.('#dartBoard .aimboard');
  if (!svg || ui.modal || ui.moment || fxRunning() || S.screen !== 'game') return;
  e.preventDefault();
  const p = aimPoint(svg, e);
  aim = { svg, id: e.pointerId, p, cx: e.clientX, cy: e.clientY, shown: false };
  try { svg.setPointerCapture(e.pointerId); } catch (err) { /* */ }
  aimHover(svg, fieldAt(p.x, p.y));
  // Lupe erst nach kurzem Halten – ein schneller Tipp setzt direkt
  aim.timer = setTimeout(() => { if (aim) { aim.shown = true; aimLoupe(svg, aim.p.x, aim.p.y, aim.cx, aim.cy); } }, 140);
});
document.addEventListener('pointermove', (e) => {
  if (!aim || e.pointerId !== aim.id) return;
  e.preventDefault();
  aim.p = aimPoint(aim.svg, e); aim.cx = e.clientX; aim.cy = e.clientY;
  aimHover(aim.svg, fieldAt(aim.p.x, aim.p.y));
  if (!aim.shown) { aim.shown = true; clearTimeout(aim.timer); }
  aimLoupe(aim.svg, aim.p.x, aim.p.y, aim.cx, aim.cy);
}, { passive: false });
function aimEnd(e, place) {
  if (!aim || e.pointerId !== aim.id) return;
  const { p, svg, timer } = aim;
  aim = null; clearTimeout(timer); aimLoupeHide(); aimHover(svg, null);
  if (place) actions.aimDart(p.x, p.y);
}
document.addEventListener('pointerup', (e) => aimEnd(e, true));
document.addEventListener('pointercancel', (e) => aimEnd(e, false));

/* ---------------- Start ---------------- */
/* Einmaliger Neustart der Daten (Wunsch nach Update 3): alle Matches/Statistiken und alle Spieler außer dem
   Hauptspieler löschen, keine Testdaten mehr einfügen. Läuft genau einmal (S.cleanV). */
/* Einmalig: Einzeldarts standardmäßig über die neue Scheibe eingeben (Tastatur bleibt in den Einstellungen wählbar). */
if (!S.aimV) { S.prefs.dartInput = 'board'; S.aimV = 1; }
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
S.statsPeriod = 'all';
S.statsSub = 'doubles'; // beim Start immer der mittlere Reiter (Doppel)
S.tab = 'play'; // beim Öffnen der App immer im Reiter „Spielen“ (ein laufendes Spiel bleibt offen)
render();
initOnline({
  render, toast, loggedIn: () => !!auth.user,
  finished: () => finish(),
  ended: (status) => {
    const other = S.current?.online?.other || 'Dein Freund';
    toast(status === 'declined' ? `${other} hat abgelehnt` : 'Das Online-Spiel wurde beendet');
    S.current = null; S.screen = status === 'declined' ? 'setup' : 'home'; ui.vs = null; releaseWakeLock(); render();
  },
  updated: (prev, cur, started) => {
    if (started) { requestWakeLock(); warmCalls(); showVs(cur); toast(`${cur.online.other} ist dabei – los geht's`); }
  },
});
startOnlineLoops();
bootAuth().then(async () => {
  if (!auth.user) return;
  loadFriends(); loadCalls(auth.user.id); loadConfirms(); flushOutbox();
  // QR/Link vom Kamera-Gerät: ?join=CODE → als Steuer-Gerät verbinden
  const join = new URLSearchParams(location.search).get('join');
  if (join) {
    history.replaceState(null, '', location.pathname);
    try { await joinAsController(join); toast('Kamera-Gerät verbunden'); } catch (e) { toast(errMsg(e)); }
  } else if (resumeLink() === 'cam') { ui.modal = { type: 'camResume' }; }
  render();
});

/* Average auf der Spielerkarte: beim App-Start einmal wie an einem Spielautomaten von 0 hochrattern, dann einrasten */
function rollAvg(tries = 0) {
  const el = document.querySelector('.me-avg b');
  if (!el) { if (tries < 20 && !ui.avgRolled) setTimeout(() => rollAvg(tries + 1), 150); return; }
  const target = parseFloat(String(el.textContent).replace(',', '.'));
  ui.avgRolled = true;
  if (!Number.isFinite(target) || target <= 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fmt1 = (v) => v.toFixed(1).replace('.', ','), t0 = performance.now(), dur = 1300;
  el.classList.add('rolling');
  const step = (now) => {
    const e = document.querySelector('.me-avg b');
    if (!e) return;
    const p = Math.min(1, (now - t0) / dur), ease = 1 - (1 - p) ** 3;
    const jitter = (1 - p) * (Math.random() - 0.5) * target * 0.6; // schnelles Rattern, wird zum Ende ruhiger
    const v = p < 1 ? Math.max(0, target * ease + jitter) : target;
    e.textContent = fmt1(v); e.dataset.t = fmt1(v);
    if (p < 1) requestAnimationFrame(step);
    else { e.classList.remove('rolling'); e.classList.add('landed'); setTimeout(() => e.classList.remove('landed'), 800); }
  };
  requestAnimationFrame(step);
}
setTimeout(() => rollAvg(), 950); // nach dem Splash
probeBotImages(() => render());
const splash = document.createElement('div');
splash.className = 'splash';
splash.innerHTML = crestLine({ size: 220 });
document.body.appendChild(splash);
setTimeout(() => { splash.classList.add('out'); setTimeout(() => splash.remove(), 500); }, 900);
if (S.screen === 'game') requestWakeLock();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // Neue Version übernommen → einmal neu laden, damit nicht der alte Stand weiterläuft. Nie mitten im Spiel:
  // dann erst, sobald man das Spiel verlässt (Prüfung jede Sekunde).
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  const reloadWhenIdle = () => {
    if (reloading) return;
    if (S.screen === 'game' && S.current && !S.current.done) { setTimeout(reloadWhenIdle, 1000); return; }
    reloading = true; save(); location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) reloadWhenIdle(); });
  navigator.serviceWorker.register('sw.js').then((r) => {
    r.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) r.update().catch(() => {}); });
  }).catch(() => {});
}
