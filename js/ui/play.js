/* Tabs (Spielen · Statistik · Freunde) und Tab „Spielen“. Die Anmeldung steht in ui/auth.js. */
import { S, ui, nameOf } from '../store.js';
import { overview } from '../stats.js';
import { GAMES } from '../games.js';
import { esc, fmt, pcVars, matchSummary } from './common.js';
import { incomingCount } from './friends.js';
import { cornerOrnament, badge, stars, icon, heroArt, fuse, sparkles, MODE_COLORS } from './svg.js';

export const TABS = ['play', 'stats', 'friends'];
export const tabIndex = () => Math.max(0, TABS.indexOf(S.tab));

export function tabsBar() {
  const i = tabIndex(), n = incomingCount();
  return `<nav class="tabs"><div class="tabs-in">
    <button class="tab ${i === 0 ? 'on' : ''}" data-act="tab" data-v="play">${icon('dart', 2)}<span>Spielen</span></button>
    <button class="tab ${i === 1 ? 'on' : ''}" data-act="tab" data-v="stats">${icon('chart', 2)}<span>Statistik</span></button>
    <button class="tab ${i === 2 ? 'on' : ''}" data-act="tab" data-v="friends">${icon('people', 2)}<span>Freunde</span>${n ? `<i class="tab-badge">${n}</i>` : ''}</button>
    <i class="tabline" style="--i:${ui.tabFrom ?? i}"></i>
  </div></nav>`;
}

export function playView() {
  const ov = overview(S.matches, S.mainId), m = S.current, name = nameOf(S.mainId), o = S.opts.x01;
  const corners = ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="corner ${c}">${cornerOrnament()}</span>`).join('');
  const others = Object.keys(GAMES).filter((id) => id !== 'x01');
  return `<main class="page">
    <button class="me" data-act="rename">
      <span class="me-name">${esc(name)}</span>
      <span class="me-avg"><small>Ø 501</small><span class="glitter"><b class="pop shimmer" data-t="${fmt(ov.avg)}">${fmt(ov.avg)}</b>${sparkles(7, 3)}</span></span>
    </button>
    ${m && !m.done ? `<button class="resume" data-act="resume"><span class="live">Live</span><span class="ct"><b>Spiel fortsetzen</b><small>${matchSummary(m)}</small></span>${icon('chevR')}</button>` : ''}
    <section class="hero">
      <div class="hero-art">${heroArt()}</div>
      ${corners}${fuse(6, 11)}
      <div class="hero-band">${stars(2)}<span>Der Klassiker</span>${stars(2)}</div>
      <div class="hero-main">
        <div class="hero-title">${badge('x01', 46)}<b>X01</b></div>
        <div class="hero-num">${o.start}</div>
      </div>
      <div class="hero-meta">${o.out === 'double' ? 'Double Out' : 'Single Out'} · First to ${o.target} ${o.mode === 'sets' ? 'Sets' : 'Legs'}</div>
      <div class="hero-btns one">
        <button class="btn red big" data-act="pick" data-v="x01">Spielen</button>
      </div>
    </section>
    <h2 class="label">Partyspiele</h2>
    <div class="modes">${others.map((id, i) => `<button class="mode" data-act="pick" data-v="${id}" style="--mc:${MODE_COLORS[id]};--bi:${i}">
      <span class="mode-art">${badge(id, 52)}</span><span class="mode-name">${GAMES[id].title}</span></button>`).join('')}</div>
    <div class="home-btns">
      <button class="btn dark settings-btn" data-act="history">${icon('chart', 1.8, 18)} Spielhistorie</button>
      <button class="btn dark settings-btn" data-act="settings">${icon('gear', 1.8, 18)} Einstellungen</button>
    </div>
  </main>`;
}
