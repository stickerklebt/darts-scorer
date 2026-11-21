/* Reiter „Freunde“: eigener Name, Suche nach eindeutigen Namen, Anfragen, Freundesliste.
   Freundesprofil: wichtigste 501-Kennzahlen (vom Server aus den Matches des Freundes berechnet). */
import { S, ui } from '../store.js';
import { auth } from '../sync.js';
import { movingAvg, overview } from '../stats.js';
import { playerBanner } from './banner.js';
import { GAMES } from '../games.js';
import { esc, fmt, pcVars } from './common.js';
import { icon, fuse, stars, sparkles, goldSmoke, numRing, COLORS } from './svg.js';
import { lineChart } from './charts.js';
import { pct, dateStr } from './stats-view.js';

/** Farbe je Freund stabil aus dem Namen (gleiche Palette wie Spieler) */
const colorIdx = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.codePointAt(0)) >>> 0; return h % 5; };
const chip = (name, cls = 'sm') => `<span class="pc ${cls}" style="${pcVars(colorIdx(name))}">${esc(name.slice(0, 1).toUpperCase())}</span>`;
const ago = (t) => {
  if (!t) return null;
  const d = Math.floor((Date.now() - t) / 864e5);
  return d <= 0 ? 'heute' : d === 1 ? 'gestern' : d < 30 ? `vor ${d} Tagen` : dateStr(t);
};

export const incomingCount = () => ui.friends?.data?.incoming?.length || 0;

function soonCard(text) {
  return `<div class="soon"><span class="soon-tag">Kommt bald</span>${stars(3, COLORS.gold, 11)}<b>Zusammen spielen</b><p>${text}</p></div>`;
}

function searchRows() {
  const fs = ui.fsearch;
  if (!fs || fs.q.length < 2) return '';
  if (fs.busy && !fs.users) return '<p class="foot">Suche …</p>';
  if (fs.error) return `<p class="foot">${esc(fs.error)}</p>`;
  if (!fs.users?.length) return `<p class="foot">Niemand gefunden, dessen Name mit „${esc(fs.q)}“ beginnt.</p>`;
  return `<div class="slist fsearch">${fs.users.map((u) => {
    const btn = u.relation === 'friend' ? `<button class="btn line sm-btn" data-act="friendOpen" data-v="${esc(u.id)}">Profil</button>`
      : u.relation === 'outgoing' ? '<span class="val">Angefragt</span>'
      : u.relation === 'incoming' ? `<button class="btn red sm-btn" data-act="friendAccept" data-v="${esc(u.id)}">Annehmen</button>`
      : `<button class="btn red sm-btn" data-act="friendAdd" data-v="${esc(u.username)}">${icon('plus', 2.6, 16)}Anfragen</button>`;
    return `<div class="srow">${chip(u.username)}<span class="lbl">${esc(u.username)}</span>${btn}</div>`;
  }).join('')}</div>`;
}

export function friendsView() {
  const me = auth.user, f = ui.friends?.data, err = ui.friends?.error;
  const friends = f?.friends || [], inc = f?.incoming || [], out = f?.outgoing || [];
  const list = !f
    ? `<p class="foot">${err ? esc(err) : 'Lade Freunde …'}</p>${err ? '<button class="btn dark" data-act="friendsReload">Erneut versuchen</button>' : ''}`
    : friends.length
      ? `<div class="slist flist">${friends.map((x) => `<button class="srow" data-act="friendOpen" data-v="${esc(x.id)}">${chip(x.username)}
          <span class="lbl">${esc(x.username)}<small>${x.matches ? `${x.matches} ${x.matches === 1 ? 'Spiel' : 'Spiele'}${x.lastPlayed ? ` · zuletzt ${ago(x.lastPlayed)}` : ''}` : 'Noch keine Spiele'}</small></span>
          <span class="favg"><small>Ø 501</small><b class="pop">${fmt(x.avg)}</b></span>${icon('chevR', 2.4, 18)}</button>`).join('')}</div>`
      : `<div class="empty-card"><div>${stars(3, '#0b0a08', 14)}<h2 class="display">Noch allein am Oche</h2>
          <p>Such oben nach dem Namen deiner Freunde und schick eine Anfrage. Sobald sie annehmen, siehst du ihre Statistik.</p></div></div>`;
  // Backstage: alles rund ums Spiel außer Spielen und Statistik – Spielhistorie, eigener Caller, Einstellungen, Freunde
  const tiles = [['history', 'clock', 'Spielhistorie', 'Alle Spiele · löschen'], ['callerOpen', 'mic', 'Eigener Caller', 'Zahlen einsprechen'], ['settings', 'gear', 'Einstellungen', 'Konto · Ansage · Eingabe']];
  return `<main class="page friends backstage">
    <div class="bs-tiles">${tiles.map(([act, ic, t, sub], k) => `<button class="bs-tile glint" data-act="${act}" style="--gd:-${k * 1.7}s">${icon(ic, 1.9, 26)}<b>${t}</b><small>${sub}</small></button>`).join('')}</div>
    <h2 class="label">Freunde${inc.length ? ` <span class="badge-n">${inc.length}</span>` : ''}</h2>
    ${playerBanner({ name: me?.username || '', avg: S.mainId ? overview(S.matches, S.mainId).avg : null, sub: 'Dein Name für Freunde' })}
    <h2 class="label">Freund hinzufügen</h2>
    <input id="friendSearch" class="field search" value="${esc(ui.fsearch?.q || '')}" placeholder="Namen suchen …" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="search">
    ${searchRows()}
    ${inc.length ? `<h2 class="label">Anfragen <span class="badge-n">${inc.length}</span></h2>
      <div class="slist">${inc.map((x) => `<div class="srow">${chip(x.username)}<span class="lbl">${esc(x.username)}<small>möchte dein Freund sein</small></span>
        <button class="btn line sm-btn" data-act="friendDecline" data-v="${esc(x.id)}">Ablehnen</button><button class="btn red sm-btn" data-act="friendAccept" data-v="${esc(x.id)}">Annehmen</button></div>`).join('')}</div>` : ''}
    <h2 class="label">Deine Freunde${friends.length ? ` · ${friends.length}` : ''}</h2>
    ${list}
    ${out.length ? `<h2 class="label">Gesendete Anfragen</h2>
      <div class="slist">${out.map((x) => `<div class="srow">${chip(x.username)}<span class="lbl">${esc(x.username)}<small>wartet auf Antwort</small></span>
        <button class="btn line sm-btn" data-act="friendCancel" data-v="${esc(x.id)}">Zurückziehen</button></div>`).join('')}</div>` : ''}
    ${soonCard('Bald könnt ihr online gegeneinander werfen – jeder an seinem Board, live auf zwei Geräten.')}
  </main>`;
}

/* ---------------- Profil eines Freundes ---------------- */
const cards = (items) => `<div class="kv">${items.map(([k, v, sub], i) => `<div class="kv-c glint" style="--gd:-${(i * 2.3 + 1.1) % 11}s;--i:${i}"><small>${k}</small><b>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`).join('')}</div>`;

export function friendView() {
  const fr = ui.friend, d = fr?.data, name = d?.user?.username || fr?.name || '';
  const head = `<header class="bar"><button class="sq" data-act="backFriends" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Freund</span><span class="sq ghost"></span></header>`;
  const top = playerBanner({ name, avg: d?.stats?.x501?.avg ?? null, sub: d?.user?.friendsSince ? `Freunde seit ${dateStr(d.user.friendsSince)}` : 'Freund' });
  if (!d) return `${head}<main class="page">${top}<p class="foot">${fr?.error ? esc(fr.error) : 'Lade Statistik …'}</p></main>`;
  const st = d.stats || { total: 0, games: {} }, x = st.x501;
  const games = Object.entries(st.games || {}).sort((a, b) => b[1] - a[1]);
  let body;
  if (x) {
    const avgs = x.form.map((s) => s.avg);
    body = `<div class="hero-stat">${goldSmoke('gsF')}${fuse(5, 12)}<small>Overall-Average · 501</small><span class="glitter">${numRing()}<b class="shimmer" data-t="${fmt(x.avg, 2)}">${fmt(x.avg, 2)}</b>${sparkles(9, 5)}</span><em>${x.matches} ${x.matches === 1 ? 'Match' : 'Matches'} · ${x.legsWon}/${x.legsTotal} Legs</em></div>
      ${cards([
        ['Bester Average', fmt(x.bestMatchAvg, 2)], ['First 9', fmt(x.f9, 2)],
        ['Höchste Aufnahme', x.highestTurn ?? '–'], ['Höchstes Checkout', x.highestCo ?? '–'],
        ['Doppelquote', pct(x.doubles.rate), `${x.doubles.hits} / ${x.doubles.attempts}`], ['Siegquote', pct(x.winRate), `${x.wins} Siege`],
        ['180er', x.counts.t180, `140+: ${x.counts.t140} · 100+: ${x.counts.t100}`], ['Bestes Leg', x.bestLeg ? `${x.bestLeg} D` : '–', x.avgLegDarts ? `Ø ${fmt(x.avgLegDarts)} Darts` : ''],
      ])}
      <div class="minirow"><span><small>Matches</small><b>${x.matches}</b></span><span><small>Längste Serie</small><b>${x.bestStreak}</b></span><span><small>Lieblingsdoppel</small><b>${x.favourite ? esc(x.favourite.field) : '–'}</b></span></div>
      <h2 class="label">Form · letzte ${x.form.length} Matches</h2>
      ${lineChart(avgs, movingAvg(avgs), { labelL: x.form[0] ? dateStr(x.form[0].date) : '', labelR: x.form.length ? dateStr(x.form[x.form.length - 1].date) : '' })}
      <div class="form-row">${x.form.map((s) => `<span class="${s.solo ? 't' : s.won ? 'w' : 'l'}" title="${dateStr(s.date)}">${s.solo ? 'T' : s.won ? 'S' : 'N'}</span>`).join('')}</div>`;
  } else {
    body = `<div class="empty-card"><div>${stars(3, '#0b0a08', 14)}<h2 class="display">Noch kein 501</h2>
      <p>${esc(name)} hat noch kein 501-Match gespielt. Sobald das passiert, stehen hier Average, Doppelquote und Rekorde.</p></div></div>`;
  }
  return `${head}<main class="page friend">
    ${top}
    ${body}
    <h2 class="label">Gespielt</h2>
    <div class="minirow games" style="grid-template-columns:repeat(${Math.max(1, Math.min(3, games.length))},1fr)">${games.length ? games.slice(0, 3).map(([g, n]) => `<span><small>${esc(GAMES[g]?.title || g)}</small><b>${n}</b></span>`).join('') : '<span><small>Spiele</small><b>0</b></span>'}</div>
    <p class="foot">${st.total} ${st.total === 1 ? 'Spiel' : 'Spiele'} insgesamt${st.lastPlayed ? ` · zuletzt ${ago(st.lastPlayed)}` : ''}.</p>
    ${soonCard(`Gegen ${esc(name)} spielen – online, jeder an seinem Board. Kommt in einem der nächsten Updates.`)}
    <button class="btn line remove-friend" data-act="friendRemove">Freund entfernen</button>
  </main>`;
}
