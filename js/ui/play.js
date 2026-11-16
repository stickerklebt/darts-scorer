/* Onboarding, Tabs, Tab „Spielen“, Tab „Statistiken“ (Platzhalter bis Meilenstein 3) */
import { S, ui, nameOf } from '../store.js';
import { overview } from '../stats.js';
import { GAMES } from '../games.js';
import { esc, fmt, pcVars, matchSummary } from './common.js';
import { crest, divider, cornerOrnament, badge, stars, icon, heroArt, fuse, MODE_COLORS } from './svg.js';

export function onboardView() {
  return `<div class="stage">
    <div class="stage-crest">${crest({ size: 240 })}</div>
    ${divider()}
    <h1 class="display">Willkommen</h1>
    <p>Wie heißt du? Du bist der Hauptspieler dieser App.</p>
    <input id="nameField" class="field" placeholder="Dein Name" maxlength="16" autocomplete="given-name" autocapitalize="words" spellcheck="false" enterkeyhint="done">
    <button class="btn red big" data-act="onboard">Los geht’s</button>
  </div>`;
}

export function tabsBar() {
  const i = S.tab === 'stats' ? 1 : 0;
  return `<nav class="tabs"><div class="tabs-in">
    <button class="tab ${i === 0 ? 'on' : ''}" data-act="tab" data-v="play">${icon('dart', 2)}<span>Spielen</span></button>
    <button class="tab ${i === 1 ? 'on' : ''}" data-act="tab" data-v="stats">${icon('chart', 2)}<span>Statistiken</span></button>
    <i class="tabline" style="--i:${ui.tabFrom ?? i}"></i>
  </div></nav>`;
}

export function playView() {
  const ov = overview(S.matches, S.mainId), m = S.current, name = nameOf(S.mainId), o = S.opts.x01;
  const corners = ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="corner ${c}">${cornerOrnament()}</span>`).join('');
  const others = Object.keys(GAMES).filter((id) => id !== 'x01');
  return `<main class="page">
    <button class="profile" data-act="rename">
      <span class="pfblock" style="${pcVars(0)}">${esc(name.slice(0, 1).toUpperCase())}</span>
      <span class="pfname"><small>Hauptspieler · ${ov.matches} ${ov.matches === 1 ? 'Match' : 'Matches'}</small><b>${esc(name)}</b></span>
      <span class="pfavg"><small>Ø 501</small><b>${fmt(ov.avg)}</b></span>
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
    <div class="modes">${others.map((id) => `<button class="mode" data-act="pick" data-v="${id}" style="--mc:${MODE_COLORS[id]}">
      <span class="mode-art">${badge(id, 52)}</span><span class="mode-name">${GAMES[id].title}</span></button>`).join('')}</div>
    <button class="btn dark settings-btn" data-act="settings">${icon('gear', 1.8, 18)} Einstellungen</button>
  </main>`;
}
