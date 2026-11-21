/* Gegen Freunde spielen.
   Online (jeder an seinem Gerät): Gastgeber lädt ein, Freund nimmt an. Das laufende Match steht auf dem Server (games, rev);
   wer dran ist, gibt ein und schickt den neuen Stand, das andere Gerät fragt jede ~1,2 s nach. S.current.online hält
   { gid, role: 'host' | 'guest', rev, status, other }.
   Auf meinem Gerät: am Ende geht das Match an den Freund zur Bestätigung (Backstage › „Hast du diese Spiele gespielt?“). */
import { S, ui } from './store.js';
import { api } from './api.js';

const POLL_MS = 1200, INBOX_MS = 6000;
let hooks = { render() {}, finished() {}, ended() {}, toast() {} };
let pushing = false, again = false, lastSent = '';

export const initOnline = (h) => { hooks = { ...hooks, ...h }; };
export const isOnline = (m) => !!m?.online;
/** Match ohne den lokalen online-Teil (so steht es auf dem Server) */
const plain = (m) => { const { online, ...rest } = m; return rest; };
const snap = (m) => JSON.stringify(plain(m));

/* ---------- Online-Spiel ---------- */
export async function invite(m, friend) {
  const r = await api('POST', 'api/games', { to: friend.uid, match: plain(m) });
  m.online = { gid: m.id, role: 'host', rev: r.rev, status: 'invited', other: friend.name };
  lastSent = snap(m);
}

function adopt(g, role) {
  const prev = S.current;
  const m = { ...g.match, online: { gid: g.id, role, rev: g.rev, status: g.status, other: role === 'host' ? g.guest : g.host } };
  S.current = m;
  lastSent = snap(m);
  return prev;
}

/** Nach jeder eigenen Eingabe (aus render): hat sich das Match geändert, neuen Stand schicken */
export function syncIfChanged() {
  const m = S.current;
  if (!m?.online || m.online.status !== 'active') return;
  if (snap(m) === lastSent) return;
  if (pushing) { again = true; return; }
  push();
}
async function push() {
  const m = S.current;
  if (!m?.online) return;
  pushing = true; again = false;
  const body = snap(m);
  try {
    const r = await api('PUT', `api/games/${encodeURIComponent(m.online.gid)}`, { rev: m.online.rev, match: plain(m) });
    if (S.current === m) { m.online.rev = r.rev; m.online.status = r.status; }
    lastSent = body;
  } catch (e) {
    const g = e?.data?.game;
    if (g && S.current === m) { apply(g); hooks.toast(e.message); }
    else hooks.toast('Verbindung wackelt – nochmal versuchen');
  } finally {
    pushing = false;
    if (again) syncIfChanged();
  }
}

function apply(g) {
  const m = S.current;
  if (!m?.online || m.online.gid !== g.id) return;
  if (g.status === 'aborted' || g.status === 'declined') { m.online.status = g.status; hooks.ended(g.status); return; }
  if (g.rev <= m.online.rev && g.status === m.online.status) return;
  const wasInvited = m.online.status === 'invited';
  const prev = adopt(g, m.online.role);
  if (S.current.done && !prev.done) { hooks.finished(); return; }
  hooks.updated?.(prev, S.current, wasInvited && g.status === 'active');
  hooks.render();
}

async function poll() {
  const m = S.current;
  if (!m?.online || m.done || !['invited', 'active'].includes(m.online.status) || pushing || document.hidden) return;
  if (snap(m) !== lastSent) return; // eigene Eingabe noch unterwegs
  try {
    const g = await api('GET', `api/games/${encodeURIComponent(m.online.gid)}?rev=${m.online.rev}`);
    if (!g.same) apply(g);
  } catch (e) {
    if (e?.status === 404 && S.current === m) { m.online.status = 'aborted'; hooks.ended('aborted'); }
  }
}

export async function abortOnline() {
  const m = S.current;
  if (!m?.online) return;
  try { await api('POST', `api/games/${encodeURIComponent(m.online.gid)}/abort`, {}); } catch { /* */ }
}

/* ---------- Einladungen an mich ---------- */
export async function pollInbox() {
  if (!hooks.loggedIn?.() || document.hidden) return;
  if (S.current?.online && !S.current.done && ['invited', 'active'].includes(S.current.online.status)) return;
  try {
    const r = await api('GET', 'api/games/inbox');
    const fresh = (r.invites || []).filter((x) => !ui.inviteSeen?.has(x.id));
    ui.invites = r.invites || [];
    if (fresh.length && !ui.modal) { (ui.inviteSeen ??= new Set()).add(fresh[0].id); ui.modal = { type: 'invite', inv: fresh[0] }; }
    hooks.render();
  } catch { /* offline */ }
}
export async function acceptInvite(id) {
  const g = await api('POST', `api/games/${encodeURIComponent(id)}/accept`, {});
  adopt(g, 'guest');
}
export async function declineInvite(id) {
  (ui.inviteSeen ??= new Set()).add(id);
  ui.invites = (ui.invites || []).filter((x) => x.id !== id);
  try { await api('POST', `api/games/${encodeURIComponent(id)}/decline`, {}); } catch { /* */ }
}

/* ---------- Bestätigungen (Spiel lief auf fremdem Gerät) ---------- */
/** Fertiges Match an die mitspielenden Freunde schicken; offline in S.outbox merken und später senden */
export function queueConfirms(m) {
  const friends = (m.friends || []).filter((f) => f.mode === 'local');
  if (!friends.length) return;
  S.outbox = [...(S.outbox || []), ...friends.map((f) => ({ to: f.uid, mid: m.id }))];
  flushOutbox();
}
export async function flushOutbox() {
  const box = S.outbox || [];
  if (!box.length || !hooks.loggedIn?.()) return;
  const left = [];
  for (const x of box) {
    const match = S.matches.find((mm) => mm.id === x.mid);
    if (!match) continue;
    try { await api('POST', 'api/confirms', { to: x.to, match }); }
    catch (e) { if (!e?.status || e.status >= 500 || e.status === 429) left.push(x); }
  }
  S.outbox = left;
}
export async function loadConfirms() {
  try { ui.confirms = (await api('GET', 'api/confirms')).confirms || []; } catch { /* */ }
  hooks.render();
}
export async function answerConfirm(id, accept) {
  const r = await api('POST', `api/confirms/${encodeURIComponent(id)}`, { accept });
  ui.confirms = (ui.confirms || []).filter((x) => x.id !== id);
  if (accept && r.match && !S.matches.some((x) => x.id === r.match.id)) S.matches.push(r.match);
}

export function startOnlineLoops() {
  setInterval(poll, POLL_MS);
  setInterval(pollInbox, INBOX_MS);
  setTimeout(pollInbox, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { poll(); pollInbox(); } });
}
