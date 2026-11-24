/* Reiter „Freunde“: eigener Name, Suche nach eindeutigen Namen, Anfragen, Freundesliste.
   Freundesprofil: wichtigste 501-Kennzahlen (vom Server aus den Matches des Freundes berechnet). */
import { S, ui, profile } from '../store.js';
import { rv } from './reveal.js';
import { auth } from '../sync.js';
import { movingAvg, overview } from '../stats.js';
import { playerBanner } from './banner.js';
import { camBlock } from './play.js';
import { resultText } from '../history.js';
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

/** Banner-Daten des Hauptspielers (Name, Ø) – fürs VS-Intro im Match */
export function myBannerData() {
  return { name: nameOfMain(), avg: S.mainId ? overview(S.matches, S.mainId).avg : null };
}
const nameOfMain = () => auth.user?.username || S.profiles.find((p) => p.id === S.mainId)?.name || '';

/** Backstage ganz unten: Spiele, die auf dem Gerät eines Freundes gespielt wurden – Haken = zählt in meiner Statistik */
function confirmBlock() {
  const list = ui.confirms || [];
  if (!list.length) return '';
  return `<h2 class="label">Hast du diese Spiele gespielt? <span class="badge-n">${list.length}</span></h2>
    <p class="foot">Gespielt auf dem Gerät eines Freundes. Erst mit deinem Haken zählen sie für deine Statistik.</p>
    <div class="slist cf-list">${list.map((x) => {
      const m = x.match, me = S.mainId, s = m.sides.findIndex((sd) => sd.includes(me));
      const res = m.sides.length > 1 ? (m.winners?.includes(s) ? 'Sieg' : 'Niederlage') : 'Training';
      const what = m.game === 'x01' ? `${m.opts.start}` : (GAMES[m.game]?.title || m.game);
      return `<div class="srow cf-row"><span class="lbl">${esc(what)} gegen ${esc(x.sender)}<small>${dateStr(m.endedAt ?? x.at)} · ${res} · ${esc(resultText(m))}</small></span>
        <button class="cf-btn no" data-act="confirmAns" data-v="${esc(x.id)}" data-ok="0" aria-label="Nicht gespielt">✕</button>
        <button class="cf-btn yes" data-act="confirmAns" data-v="${esc(x.id)}" data-ok="1" aria-label="Ja, gespielt">✓</button></div>`;
    }).join('')}</div>`;
}

/** VIP oben: Name mit Stift direkt daneben, darunter waagerecht der eigene Dart (Foto, im App-Stil nachgezeichnet) oder ein schlichter Platzhalter */
function myBanner(name) {
  const mine = S.prefs.myDart;
  return `<div class="vip-head">
    <button class="bs-namebox" data-act="profileOpen" aria-label="Profil bearbeiten"><span class="bs-name">${esc(name)}</span><span class="bs-pen">${icon('pen', 1.8, 20)}</span></button>
    <div class="vip-dart ${mine ? 'mine' : 'plain'}">${mine ? `<img src="${mine}" alt="Dein Dart">` : plainDart()}</div>
  </div>`;
}
/** Schlichter Dart (Flight links, Spitze rechts) – bewusst etwas leer, bis man seinen eigenen fotografiert */
const plainDart = () => `<svg viewBox="0 0 600 70" aria-label="Dart (Platzhalter)">
  <path d="M6 10 L118 30 L118 40 L6 60 L30 35 Z" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M118 35 H250" stroke="currentColor" stroke-width="4"/>
  <rect x="250" y="27" width="170" height="16" rx="8" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M420 35 H594" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

export function friendsView() {
  const me = auth.user, f = ui.friends?.data, err = ui.friends?.error;
  const friends = f?.friends || [], inc = f?.incoming || [], out = f?.outgoing || [];
  const list = !f
    ? `<p class="foot">${err ? esc(err) : 'Lade Freunde …'}</p>${err ? '<button class="btn dark" data-act="friendsReload">Erneut versuchen</button>' : ''}`
    : friends.length
      ? `<div class="slist flist ${friends.length > 3 ? 'fl-scroll' : ''}">${friends.map((x) => `<button class="srow" data-act="friendOpen" data-v="${esc(x.id)}">${chip(x.username)}
          <span class="lbl">${esc(x.username)}<small>${x.matches ? `${x.matches} ${x.matches === 1 ? 'Spiel' : 'Spiele'}${x.lastPlayed ? ` · zuletzt ${ago(x.lastPlayed)}` : ''}` : 'Noch keine Spiele'}</small></span>
          <span class="favg"><small>Ø 501</small><b class="pop">${fmt(x.avg)}</b></span>${icon('chevR', 2.4, 18)}</button>`).join('')}</div>`
      : `<div class="empty-card"><div>${stars(3, '#060c17', 14)}<h2 class="display">Noch allein am Oche</h2>
          <p>Such oben nach dem Namen deiner Freunde und schick eine Anfrage. Sobald sie annehmen, siehst du ihre Statistik.</p></div></div>`;
  // Backstage: oben das eigene Banner, in der Mitte die Freunde, unten die Kacheln (Spielhistorie, eigener Caller, Einstellungen, Kamera)
  const tiles = [['history', 'clock', 'Spielhistorie', 'Alle Spiele · löschen'], ['callerOpen', 'mic', 'Eigener Caller', 'Zahlen einsprechen'], ['settings', 'gear', 'Einstellungen', 'Konto · Ansage · Eingabe'], ['camAsDevice', 'cam', 'Kamera', 'Dieses Handy filmt das Board']];
  return `<main class="page friends backstage">
    ${myBanner(me?.username || '')}
    ${(ui.invites || []).length ? `<h2 class="label">Einladungen zum Spiel</h2><div class="slist">${ui.invites.map((v) => `<div class="srow">${chip(v.host)}
      <span class="lbl">${esc(v.host)} möchte gegen dich spielen<small>${v.game === 'x01' ? `${v.opts?.start} · First to ${v.opts?.target}` : esc(GAMES[v.game]?.title || '')}</small></span>
      <button class="btn line sm-btn" data-act="inviteNo" data-v="${esc(v.id)}">Ablehnen</button><button class="btn red sm-btn" data-act="inviteYes" data-v="${esc(v.id)}">Spielen</button></div>`).join('')}</div>` : ''}
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
    ${confirmBlock()}
    <h2 class="label">Mehr</h2>
    ${camBlock()}
    <div class="bs-tiles">${tiles.map(([act, ic, t, sub], k) => `<button class="bs-tile glint" data-act="${act}" style="--gd:-${k * 1.7}s">${icon(ic, 1.9, 26)}<b>${t}</b></button>`).join('')}</div>
  </main>`;
}

/* ---------------- Profil eines Freundes ---------------- */
const cards = (items) => `<div class="kv">${items.map(([k, v, sub], i) => `<div class="kv-c glint ${String(sub).includes('class="rv"') ? 'has-rv' : ''}" style="--gd:-${(i * 2.3 + 1.1) % 11}s;--i:${i}"><small>${k}</small>${String(sub).includes('class="rv"') ? `<span class="kv-row"><b>${v}</b><em>${sub}</em></span>` : `<b>${v}</b>${sub ? `<em>${sub}</em>` : ''}`}</div>`).join('')}</div>`;

export function friendView() {
  const fr = ui.friend, d = fr?.data, name = d?.user?.username || fr?.name || '';
  const head = `<header class="bar"><button class="sq" data-act="backFriends" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Freund</span><span class="sq ghost"></span></header>`;
  const top = `${playerBanner({ name, avg: d?.stats?.x501?.avg ?? null })}
    ${d?.user?.friendsSince ? `<p class="foot pb-since">Freunde seit ${dateStr(d.user.friendsSince)}</p>` : ''}`;
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
        ['Doppelquote', pct(x.doubles.rate), rv(`${x.doubles.hits} / ${x.doubles.attempts}`)], ['Siegquote', pct(x.winRate), `${x.wins} Siege`],
        ['180er', x.counts.t180, `140+: ${x.counts.t140} · 100+: ${x.counts.t100}`], ['Bestes Leg', x.bestLeg ? `${x.bestLeg} D` : '–', x.avgLegDarts ? `Ø ${fmt(x.avgLegDarts)} Darts` : ''],
      ])}
      <div class="minirow"><span><small>Matches</small><b>${x.matches}</b></span><span><small>Längste Serie</small><b>${x.bestStreak}</b></span><span><small>Lieblingsdoppel</small><b>${x.favourite ? esc(x.favourite.field) : '–'}</b></span></div>
      <h2 class="label">Form · letzte ${x.form.length} Matches</h2>
      <div class="has-tg">${lineChart(avgs, movingAvg(avgs), { labelL: x.form[0] ? dateStr(x.form[0].date) : '', labelR: x.form.length ? dateStr(x.form[x.form.length - 1].date) : '' })}</div>
      <div class="form-row">${x.form.map((s) => `<span class="${s.solo ? 't' : s.won ? 'w' : 'l'}" title="${dateStr(s.date)}">${s.solo ? 'T' : s.won ? 'S' : 'N'}</span>`).join('')}</div>`;
  } else {
    body = `<div class="empty-card"><div>${stars(3, '#060c17', 14)}<h2 class="display">Noch kein 501</h2>
      <p>${esc(name)} hat noch kein 501-Match gespielt. Sobald das passiert, stehen hier Average, Doppelquote und Rekorde.</p></div></div>`;
  }
  return `${head}<main class="page friend">
    ${top}
    ${body}
    <h2 class="label">Gespielt</h2>
    <div class="minirow games" style="grid-template-columns:repeat(${Math.max(1, Math.min(3, games.length))},1fr)">${games.length ? games.slice(0, 3).map(([g, n]) => `<span><small>${esc(GAMES[g]?.title || g)}</small><b>${n}</b></span>`).join('') : '<span><small>Spiele</small><b>0</b></span>'}</div>
    <p class="foot">${st.total} ${st.total === 1 ? 'Spiel' : 'Spiele'} insgesamt${st.lastPlayed ? ` · zuletzt ${ago(st.lastPlayed)}` : ''}.</p>
    <p class="foot">Gegen ${esc(name)} spielen: Spielen › Modus wählen › Plus › Freunde.</p>
    <button class="btn line remove-friend" data-act="friendRemove">Freund entfernen</button>
  </main>`;
}
