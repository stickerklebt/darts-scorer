/* Tab „Statistiken“: Spielerwahl, Zeitfilter, Vergleichen – darunter Unter-Reiter
   Überblick · Scoring · Checkout · Doppel · Verlauf. Eine große Zahl pro Karte, Beschriftung klein. */
import { S, ui, nameOf, profile } from '../store.js';
import { fullStats, matchesOf, doubleRating, doubleSides, spotsIn, TIERS, MIN_ATTEMPTS, statsModes, modeLabel, finishOdds, finishExtras, doubleTriesToHit } from '../stats.js';
import { esc, fmt, pcVars } from './common.js';
import { icon, stars, fuse, sparkles, numRing } from './svg.js';
import { heatBoard, ratingColor } from './board.js';
import { spotSVG } from './dblspot.js';
import { historyCharts, distChart, doubleChart, pickTitle } from './stats-extra.js';
import { recAttrs } from './legdetail.js';
import { rv } from './reveal.js';
import { legCurve } from '../situations.js';
import { insights } from '../insights.js';
import { legCurveChart, chartBox } from './charts.js';

export const PERIOD_OPTS = [['7d', '7 Tage'], ['30d', '30 Tage'], ['1y', '1 Jahr'], ['all', 'Gesamt']];
/** Symbole statt Text in der Unter-Reiter-Leiste (hier direkt gezeichnet): Zahlen 123 · Doppelfeld · Kurve */
const SUB_ICONS = {
  // Überblick: es geht um Zahlen – „1 2 3“, steigend wie ein Aufwärtstrend
  overview: '<text x="5.6" y="21" font-size="12" font-family="League Gothic, Arial Narrow, sans-serif" fill="currentColor" stroke="none" text-anchor="middle">1</text><text x="12" y="17.5" font-size="13.5" font-family="League Gothic, Arial Narrow, sans-serif" fill="currentColor" stroke="none" text-anchor="middle">2</text><text x="18.6" y="14" font-size="15" font-family="League Gothic, Arial Narrow, sans-serif" fill="currentColor" stroke="none" text-anchor="middle">3</text>',
  // Doppel (nach Skizze): zwei Bögen des Doppelrings über die ganze Breite, zwei Segmentlinien, dazwischen das Doppelfeld hell weiß
  doubles: '<defs><linearGradient id="dblFadeX" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset=".28" stop-color="currentColor"/><stop offset=".72" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient><linearGradient id="dblFade" gradientUnits="userSpaceOnUse" x1="0" y1="9" x2="0" y2="22.5"><stop offset="0" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><g transform="translate(0 -3)"><path d="M4.8 8.83A32 32 0 0 1 19.2 8.83L18.41 12.23A28.5 28.5 0 0 0 5.59 12.23Z" fill="#ffffff" stroke="none" class="dbl-fill"/><path d="M-1 10.77A32 32 0 0 1 25 10.77M0.4 13.97A28.5 28.5 0 0 1 23.6 13.97" stroke="url(#dblFadeX)"/><path d="M4.8 8.83L7.95 22.47M19.2 8.83L16.05 22.47" stroke="url(#dblFade)"/></g>',
  more: '<path d="M4 18l5-5 4 3 7-7"/><path d="M15 9h5v5"/>', // nur der Pfeil, ohne Grundlinie
};
const subIcon = (k) => `<svg class="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SUB_ICONS[k]}</svg>`;
export const SUBTABS = [['overview', 'Überblick'], ['doubles', 'Doppel'], ['more', 'Scoring']];
/** Frühere Unter-Reiter landen in „Scoring“ */
const subOf = (k) => (k === 'scoring' || k === 'checkout' || k === 'history' ? 'more' : SUBTABS.some(([x]) => x === k) ? k : 'overview');
export const PERIOD_LONG = { '7d': 'Letzte 7 Tage', '30d': 'Letzte 30 Tage', '1y': 'Letztes Jahr', all: 'Gesamt' };
export const pct = (x) => (x === null || x === undefined ? '–' : `${fmt(x * 100)} %`);
export const dateStr = (t) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
const oppStr = (ids) => ids.map(nameOf).join(' · ');

export const statsPid = () => S.mainId; // Statistik immer vom Hauptspieler

const block = (title, body) => `<section class="sblock">${title ? `<h2 class="label">${title}</h2>` : ''}${body}</section>`;
/** Karten: [Beschriftung, große Zahl, kleine Zusatzzeile] */
const cards = (items, cls = '', pid = '') => `<div class="kv ${cls}">${items.map(([k, v, sub, ref], i) => {
  const tap = ref && v !== '–';
  return `<${tap ? 'button' : 'div'} class="kv-c glint ${hot(k)} ${tap ? 'tap' : ''} ${String(sub).includes('class="rv"') ? 'has-rv' : ''}" ${tap ? recAttrs(ref, pid) : ''} style="--gd:-${(i * 2.3 + 1.1) % 11}s;--i:${i}"><small>${k}</small>${tap ? '<i class="kv-go" aria-hidden="true">›</i>' : ''}${String(sub).includes('class="rv"') ? `<span class="kv-row"><b>${v}</b><em>${sub}</em></span>` : `<b>${v}</b>${sub ? `<em>${sub}</em>` : ''}`}</${tap ? 'button' : 'div'}>`;
}).join('')}</div>`;
/** Rekord-Karte. hidden: Zusatz, der erst nach Antippen erscheint (z. B. wie das Checkout gespielt wurde) */
const record = (title, value, sub, hidden = '') => `<div class="record ${hidden ? 'has-rv' : ''}">${fuse(4, 10)}<div><small>${title}</small><b class="pop shimmer" data-t="${value}">${value}</b>${sub ? `<em>${sub}</em>` : ''}${hidden ? `<em class="rec-how">${rv(hidden)}</em>` : ''}</div></div>`;
/** Wie wurde ein Checkout geworfen? → „Single 3 · Doppel 11“ (ohne Einzeldarts: Hinweis) */
const DART_WORD = { 1: 'Single', 2: 'Doppel', 3: 'Triple' };
function checkoutHow(ref) {
  const t = ref && S.matches.find((m) => m.id === ref.mid)?.legs?.[ref.li]?.turns?.[ref.ti];
  if (!t) return '';
  if (!t.throws?.length) return t.input === 'voice' ? 'angesagt, ohne einzelne Darts' : 'als Summe eingegeben';
  return t.throws.map((d) => (d.n === 0 ? 'daneben' : d.n === 25 ? (d.m === 2 ? 'Bull' : 'Single Bull') : `${DART_WORD[d.m]} ${d.n}`)).join(' · ');
}
const rankList = (title, rows, pid = '', scroll = false) => `<div class="rlist ${scroll && rows.length > 5 ? 'rl-scroll' : ''}"><h3>${title}</h3>${rows.length ? rows.map((r, i) => `<${r.mid ? 'button' : 'div'} class="rl ${r.mid ? 'tap' : ''}" ${r.mid ? recAttrs(r, pid) : ''}><span class="rl-i">${i + 1}</span><span class="rl-v">${r.score}</span><span class="rl-s">${dateStr(r.date)}${r.opp.length ? ` · gegen ${esc(oppStr(r.opp))}` : ''}</span></${r.mid ? 'button' : 'div'}>`).join('') : '<p class="rl-empty">Noch nichts eingetragen</p>'}</div>`;

export function statsHeader(pid) {
  const name = nameOf(pid);
  const pi = S.profiles.findIndex((p) => p.id === pid);
  // Der Zeitraum-Knopf steht jetzt in der oberen Symbol-Leiste (statsView); hier nur noch der Chip bei anderem Zeitraum
  return `${S.profiles.length > 1 ? `<div class="st-head"><button class="btn line st-cmp" data-act="compare">Vergleichen</button></div>` : ''}
  ${statsModes().join() !== '501' ? `<button class="period-chip" data-act="statsModesReset">${icon('chart', 2, 15)}<span>${statsModes().map(modeLabel).join(' + ')}</span><b aria-label="Nur 501">×</b></button>` : ''}
  ${S.statsPeriod !== 'all' ? `<button class="period-chip" data-act="period" data-v="all">${icon('clock', 2, 15)}<span>${PERIOD_LONG[S.statsPeriod]}</span><b aria-label="Zurück auf Gesamt">×</b></button>` : ''}`;
}

/* Kleine Karten im Überblick: nur ein paar Zahlen bekommen den roten Druck/Schein (dafür kräftiger) – welche, wird bei jedem
   Öffnen des Reiters neu gelost (ui.ovSeed, gesetzt in main.js › tab/statsSub) */
const hot = (k) => { ui.ovSeed ??= Math.random(); let h = Math.floor(ui.ovSeed * 2147483647) ^ 0x9e3779b9; for (const c of String(k)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 100) < 28 ? 'hot' : ''; };
/* ---------------- Unter-Reiter ---------------- */
/** Die zwei wichtigsten Zahlen (Average, Doppelquote): Chrom-Ring mit wanderndem Licht, roter Schein hinter der Zahl, Lichtstrahlen */
const HS_STAR = '<svg viewBox="0 0 24 24"><defs><linearGradient id="hsStarG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#c9ced5"/><stop offset=".55" stop-color="#ffffff"/><stop offset="1" stop-color="#8d939b"/></linearGradient></defs><path d="M12 0C12.8 7.6 16.4 11.2 24 12 16.4 12.8 12.8 16.4 12 24 11.2 16.4 7.6 12.8 0 12 7.6 11.2 11.2 7.6 12 0Z" fill="url(#hsStarG)"/></svg>';
const HS_FX = '<i class="hs-star l" aria-hidden="true">' + HS_STAR + '</i><i class="hs-star r" aria-hidden="true">' + HS_STAR + '</i><i class="hs-ring" aria-hidden="true"></i><i class="hs-aura" aria-hidden="true"></i><i class="hs-flash" aria-hidden="true"></i>';
function overviewTab(st, pid) {
  const c = st.counts;
  // Lieblingsdoppel = Doppel mit der besten Trefferquote (erst ab MIN_ATTEMPTS Versuchen, mindestens ein Treffer)
  const rating = doubleRating(st.doubles);
  const favK = Object.keys(rating).find((k) => rating[k].top === 1);
  const favDbl = favK ? { k: favK, ...st.doubles.fields[favK], rate: st.doubles.fields[favK].hits / st.doubles.fields[favK].attempts } : null;
  // Alle kleinen Karten in EINER Box zum Wischen (je 6 = 3 × 2), Punkte darunter: erst die Kennzahlen, dann die aus dem Checkout-Bereich
  const fx = finishFx(pid);
  const small = [
    ['Lieblingsdoppel', favDbl ? favDbl.k : '–', favDbl ? rv(`${pct(favDbl.rate)} · ${favDbl.hits} / ${favDbl.attempts}`) : `ab ${MIN_ATTEMPTS} Versuchen`], ['First 9', fmt(st.f9, 2)],
    ['Darts geworfen', st.darts, rv(`${st.points} Punkte`)], ['Ø Darts aufs Doppel', fmt(st.dartsPerCheckout), 'pro Checkout'],
    ['180er', c.t180, '', st.t180Ref], ['Bestes Leg', st.bestLeg ? `${st.bestLeg} D` : '–', '', st.bestLegRef],
    // Antippen: gecheckt und – ab 41 Rest – wie oft nach Dart 1 oder 2 ein Doppel stand (gestellt)
    ...st.ranges.map((r) => [`Quote Rest ${r.name}`, pct(r.rate), rv(`${r.hits}/${r.chances} gecheckt`) + (r.setTries ? `<br>${rv(`${r.setHits}/${r.setTries} gestellt`)}` : '')]),
    ['Break', pct(fx.brk.rate), rv(`${fx.brk.hits}/${fx.brk.tries} gebreakt`)],
    ['Zuerst im Finish', pct(fx.first.rate), rv(`${fx.first.hits}/${fx.first.tries} Legs geholt`)],
    ['Comeback', pct(fx.comeback.rate), rv(`${fx.comeback.hits}/${fx.comeback.tries} Legs geholt`)],
    ['Triple im Finish', fx.triple ? fx.triple.k : '–', rv(fx.triple ? `${fx.triple.n}× getroffen` : 'noch keins')],
  ];
  const pages = []; for (let i = 0; i < small.length; i += 6) pages.push(small.slice(i, i + 6));
  const pg = Math.min(pages.length - 1, ui.kvPage || 0);
  return `<div class="hero-stat hs-epic has-rv">${HS_FX}${fuse(5, 12)}<small>Average</small><span class="glitter">${numRing()}<b class="shimmer" data-t="${fmt(st.avg, 2)}">${fmt(st.avg, 2)}</b>${sparkles(9, 7)}</span><em>${rv('Modus 501')}</em></div>
    <div class="ov-duo">
      <div class="hero-stat dbl-hero hs-epic has-rv">${HS_FX}${fuse(5, 12)}<small>Doppelquote</small><span class="glitter">${numRing()}<b class="shimmer" data-t="${pct(st.doubles.rate)}">${pct(st.doubles.rate)}</b>${sparkles(7, 6)}</span><em>${rv(`${st.doubles.hits} / ${st.doubles.attempts}`)}</em></div>
      ${record('Höchstes Checkout', st.highestCo ?? '–', '', checkoutHow(st.topCo[0]))}
    </div>
    <div class="kv-carousel">
      <div class="hf-pages kv-pages" data-k="kvPage">${pages.map((list) => `<div class="hf-page kv-page">${cards(list, 'three', pid)}</div>`).join('')}</div>
      ${pages.length > 1 ? `<span class="hf-dots kv-dots">${pages.map((_, k) => `<button class="${pg === k ? 'on' : ''}" data-act="hfPage" data-k="kvPage" data-v="${k}" aria-label="Seite ${k + 1}"></button>`).join('')}</span>` : ''}
    </div>
    <button class="ov-more-btn ${ui.ovMore ? 'on' : ''}" data-act="ovMore">${ui.ovMore ? 'Weniger' : 'Mehr'} ${icon('chevR', 2.4, 16)}</button>
    ${ui.ovMore ? `<div class="ov-more">${rankList('Top 10 Checkouts', st.topCo, pid, true)}
    ${insightsBlock(cachedInsights(pid))}
    ${hfCard(pid)}</div>` : ''}`;
}

/** Unter „Quote nach Bereich“: Break · zuerst im Finish ⇄ Comeback (wischen oder Punkt antippen) · meistgetroffenes Triple im Finish */
let fxCache = { key: '', r: null };
function finishFx(pid) {
  const last = S.matches[S.matches.length - 1];
  const key = `${pid}|${S.statsPeriod}|${statsModes().join(',')}|${S.matches.length}|${last?.id ?? ''}|${last?.endedAt ?? ''}`;
  if (fxCache.key !== key) fxCache = { key, r: finishExtras(matchesOf(S.matches, pid, S.statsPeriod), pid) };
  return fxCache.r;
}
/** Doppel groß mit einem Punkt je Treffer – erscheint an Stelle der Heatmap-Scheibe (fertige Matches + laufendes Spiel) */
function spotOverlay(st, key) {
  const dn = /^D(\d+)$/.exec(key || ''), n = dn ? Number(dn[1]) : key === 'Bull' ? 25 : null;
  if (!n || !st.doubles.fields[key]) return '';
  const live = S.current && !S.current.done && !S.matches.some((x) => x.id === S.current.id) ? spotsIn([S.current], statsPid())[key] || [] : [];
  // Farbe wie in Heatmap und Liste: wie gut du dieses Doppel im Vergleich zu deiner Gesamtquote triffst
  const color = ratingColor(doubleRating(st.doubles)[key]);
  // Doppel + Info-Fenster liegen beide genau über der Scheibe – darunter wird nichts länger
  return `<div class="hb-spot ${n === 25 ? 'is-bull' : ''}"><div class="hb-fld" data-act="heat" data-v="${key}"><span class="hb-glow">${spotSVG(n, [...(st.spots?.[key] || []), ...live], { color })}</span></div>${dblInfo(st, key)}</div>`;
}

/** Beim wievielten Versuch im Leg sitzt das Doppel? Erst nach Antippen der Prozentzahl. x: Versuche (Länge = Ø × 1,4, Rest in der letzten Säule), y: Anteil der Treffer. */
function triesCurve(key) {
  if (ui.dblCurve !== key) return '';
  const list = doubleTriesToHit(matchesOf(S.matches, statsPid(), S.statsPeriod), statsPid(), key);
  if (!list.length) return '<div class="di-curve"><p class="di-none">Noch kein Treffer – dann steht hier, beim wievielten Versuch er sitzt.</p></div>';
  const avg = list.reduce((a, x) => a + x, 0) / list.length, n = Math.max(2, Math.ceil(avg * 1.4));
  const bins = Array(n).fill(0); for (const x of list) bins[Math.min(n, x) - 1]++;
  const p = bins.map((c) => c / list.length), mx = Math.max(...p), W = 300, H = 120, bw = W / n;
  const bars = p.map((v, i) => { const h = mx ? (v / mx) * (H - 40) : 0; return `<rect x="${(i * bw + bw * 0.3).toFixed(1)}" y="${(H - 16 - h).toFixed(1)}" width="${(bw * 0.4).toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>
    <text class="cv-v" x="${(i * bw + bw / 2).toFixed(1)}" y="${(H - 20 - h).toFixed(1)}">${Math.round(v * 100)}%</text>
    <text class="cv-x" x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 3}">${i + 1}${i === n - 1 ? '+' : ''}</text>`; }).join('');
  return `<div class="di-curve"><h4>Treffer beim wievielten Versuch im Leg · Ø ${fmt(avg, 1)}</h4><svg viewBox="0 0 ${W} ${H}" class="cv">${bars}</svg></div>`;
}

/** Fenster unter der Scheibe für das angetippte Doppel: Quote und – bei Fehlwürfen – inside/outside in Prozent */
function dblInfo(st, key) {
  const f = st.doubles.fields[key];
  const open = ui.dblCurve === key;
  // Kopf: Doppel und Quote mittig nebeneinander – sonst nichts (schließen: irgendwo daneben tippen)
  const head = `<div class="di-head"><b>${key}</b>${f ? `<strong class="di-pct ${open ? 'on' : ''}" data-act="dblCurve" data-v="${key}">${pct(f.hits / f.attempts)}</strong>` : ''}</div>`;
  if (!f) return `<div class="dbl-info">${head}<p class="di-none">Noch kein Versuch auf ${key}.</p></div>`;
  // Wenn du nicht triffst: inside (ins Board, nicht das Doppel) gegen outside (daneben, 0) – als geteilte Linie in Prozent
  const sd = doubleSides(st.doubles, key);
  // Doppel groß mit einem Punkt für jeden Treffer an der Stelle, wo er saß (wird nach dem Checkout abgefragt)
  // fertige Matches + das laufende Spiel (sonst sähe man einen eben eingetragenen Treffer erst nach Spielende)
  if (key === 'Bull') return `<div class="dbl-info"><span class="di-arrow"></span>${head}${triesCurve(key)}</div>`; // beim Bull gibt es kein inside/outside
  if (!sd.misses) return `<div class="dbl-info"><span class="di-arrow"></span>${head}${triesCurve(key)}<p class="di-none">Jeder Versuch auf ${key} war ein Treffer.</p></div>`;
  const ip = Math.round(sd.insideRate * 100), op = 100 - ip;
  // Seiten mit 0 % werden gar nicht gezeichnet – die andere Seite füllt dann die ganze Linie
  return `<div class="dbl-info"><span class="di-arrow"></span>${head}${triesCurve(key)}
    <h4>Daneben</h4>
    <div class="io-wrap has-rv" data-keep title="Antippen für Details">
    <div class="io-line">
      ${ip > 0 ? `<span class="io-side in ${op === 0 ? 'full' : ''}" style="flex:${ip}"><b>${ip} %</b><small>Inside</small></span>` : ''}
      ${op > 0 ? `<span class="io-side out ${ip === 0 ? 'full' : ''}" style="flex:${op}"><small>Outside</small><b>${op} %</b></span>` : ''}
    </div>
    <div class="io-key"><span>← ins Board (alles außer ${key})</span><span>daneben (0) →</span></div>
    <p class="di-n">${sd.misses} Fehlwürfe · ${sd.inside}× inside · ${sd.outside}× outside</p></div></div>`;
}

/** Heatmap + Doppelliste. Farben relativ zur eigenen Gesamtquote, Top 3 mit Gold-/Silber-/Bronze-Rand.
    Liste: immer beste Quote zuerst; keine Farb-Erklärung. */
export function doublesBlock(st, sel, withList = true) {
  const fields = st.doubles.fields, rating = doubleRating(st.doubles);
  const rows = Object.entries(fields).map(([k, v]) => ({ k, ...v, rate: v.hits / v.attempts }));
  const rated = (r) => (r.attempts >= MIN_ATTEMPTS ? 1 : 0);
  rows.sort((a, b) => rated(b) - rated(a) || b.rate - a.rate || b.attempts - a.attempts); // immer: beste zuerst
  const dot = (k) => { const c = ratingColor(rating[k]); return `<i class="dot ${c ? '' : 'none'}" ${c ? `style="background:${c}"` : ''}></i>`; };
  return `<div class="${withList ? 'dbl-layout' : ''}">${withList ? DBL_SCALE : ''}<div class="heat">
      <div class="heat-board ${withList && spotOverlay(st, sel) ? 'has-spot' : ''} ${withList && sel && !spotOverlay(st, sel) && !fields[sel] ? 'has-none' : ''}">${heatBoard(fields, sel || null, rating)}${withList ? spotOverlay(st, sel) : ''}${withList && sel && !spotOverlay(st, sel) && !fields[sel] ? `<div class="hb-none">${dblInfo(st, sel)}</div>` : ''}</div>
      ${withList && sel && !spotOverlay(st, sel) && fields[sel] ? dblInfo(st, sel) : ''}
    </div>
    ${withList ? `<div class="dbl-right">
` : ''}
    ${withList && rows.length ? `<div class="dbl-head"><h2 class="label">Deine Doppel</h2></div>
      <div class="sbtable-wrap dbl-scroll"><table class="sbtable dbl"><tr><th><div>Feld</div></th><th><div>Versuche</div></th><th><div>Treffer</div></th><th><div>Quote</div></th></tr>
      ${rows.map((r, i) => `<tr class="${r.k === sel ? 'sel' : ''}" data-act="heat" data-v="${r.k}" style="--k:${i}"><td>${dot(r.k)}${r.k}</td><td>${r.attempts}</td><td>${r.hits}</td><td>${pct(r.rate)}</td></tr>`).join('')}</table></div>` : ''}
    ${withList ? '</div>' : ''}</div>`;
}
/** Dünne Farbskala unter der Scheibe: links das dunkelste Rot (schlechtestes Doppel) bis rechts glänzend Weiß (bestes) –
    mit weichem Leuchten und Lichtern, die durch die Linie wandern (gleicher Verlauf wie ratioColor in board.js) */
const DBL_SCALE = '<div class="dbl-scale" role="img" aria-label="Farbskala: links schwach, rechts stark"><i class="ds-glow"></i><i class="ds-line"></i><i class="ds-run"></i><i class="ds-run r2"></i></div>';

/** „Scoring“: zuerst die Verläufe, darunter alles Weitere eingeklappt */
function moreTab(st, pid) {
  // Average-Verlauf, Aufnahmen im Leg, Doppelquote-Verlauf, Verteilung der Aufnahmen. Checkout steht im Reiter Doppel.
  const lc = legCurve(matchesOf(S.matches, pid, S.statsPeriod), pid);
  // Verteilung der Aufnahmen (Standard) und Aufnahmen im Leg teilen sich einen Kasten – lange auf den Titel drücken schaltet um
  const DIST_KINDS = [['dist', 'Verteilung der Aufnahmen'], ['leg', 'Aufnahmen im Leg']];
  const dk = ui.distKind === 'leg' ? 'leg' : 'dist';
  const title = pickTitle('dist', DIST_KINDS, dk, DIST_KINDS.find(([k]) => k === dk)[1]);
  const distBox = dk === 'leg'
    ? chartBox(title, `Ø Punkte je Aufnahme von 501 bis 170${lc.avgTurns ? ` · im Schnitt ${fmt(lc.avgTurns, 1)} Aufnahmen` : ''}`, legCurveChart(lc.points))
    : distChart(st, title);
  return block('', historyCharts(st, pid) + distBox + doubleChart(st, pid));
}

export function emptyState(pid, any) {
  return `<div class="empty">
    <div class="empty-card"><div>
      ${stars(3, '#08080a', 14)}
      <h2 class="display">${any ? 'Ruhige Zeiten' : 'Die Bühne ist frei'}</h2>
      <p>${any ? 'In diesem Zeitraum wurde kein 501-Match gespielt.' : `${esc(nameOf(pid))} hat noch kein 501-Match gespielt. Nach dem ersten Match steht hier alles: Average, Doppelquote, Rekorde und mehr.`}</p>
    </div></div>
    <button class="btn red big" data-act="play501">501 spielen</button>
  </div>`;
}

/** Statistik nur neu rechnen, wenn sich Matches/Zeitraum geändert haben (sonst ruckelt jedes Antippen in der Statistik) */
let stCache = { key: '', st: null };
function cachedStats(pid) {
  const last = S.matches[S.matches.length - 1];
  const key = `${pid}|${S.statsPeriod}|${statsModes().join(',')}|${S.matches.length}|${last?.id ?? ''}|${last?.endedAt ?? ''}`;
  if (stCache.key !== key) stCache = { key, st: fullStats(S.matches, pid, S.statsPeriod) };
  return stCache.st;
}
export function statsView() {
  const pid = statsPid();
  const st = cachedStats(pid);
  const head = `<main class="page stats">${statsHeader(pid)}`;
  if (!st.matches) return `${head}${emptyState(pid, matchesOf(S.matches, pid).length > 0)}</main>`;
  const sub = subOf(S.statsSub);
  // Unter-Reiter als kleine Symbol-Pille, die über dem Haupt-Reiter „Statistik“ unten auftaucht; Wechsel auch per Wischen (main.js)
  const nav = `<div class="subpop"><nav class="subtabs three" style="--n:${SUBTABS.findIndex(([k]) => k === sub)}">${SUBTABS.map(([k, l]) => `<button class="${k === sub ? 'on' : ''}" data-act="statsSub" data-v="${k}" aria-label="${l}" title="${l}">${subIcon(k)}</button>`).join('')}<i class="sub-line"></i></nav></div>`; // Zeitraum: lange auf den Reiter „Statistik“ drücken (main.js)
  const body = sub === 'doubles' ? doublesBlock(st, ui.heatSel) : sub === 'more' ? moreTab(st, pid) : overviewTab(st, pid);
  return `${head}
    <div class="subbody sub-${sub}">${body}</div>
  </main>${nav}`;
}

export function profilePicker() {
  const cur = statsPid();
  return `<h3>Spieler wählen</h3><p>Wessen Statistik möchtest du sehen?</p>
    <div class="slist plist-pick">${S.profiles.map((p, i) => `<button class="srow" data-act="statsPick" data-v="${p.id}">
      <span class="pc sm" style="${pcVars(i)}">${esc(p.name.slice(0, 1).toUpperCase())}</span><span class="lbl">${esc(p.name)}</span>
      ${p.id === cur ? '<span class="val">✓</span>' : ''}</button>`).join('')}</div>
    <div class="sbtns"><button class="btn line" data-act="closeModal">Schließen</button></div>`;
}

/* High Finish: zwei Seiten zum Wischen – 3-Dart-Finishes (ab 101) und 2-Dart-Finishes (ab 61). Je Dart die Quote (getroffen = Finish danach
   noch möglich). Unten zwei Punkte: der hellere zeigt die Seite. Antippen: statt der Punkte steht 3 s lang die Erklärung. */
let hfCache = { key: '', r3: null, r2: null };
export function hfCard(pid) {
  const last = S.matches[S.matches.length - 1];
  const key = `${pid}|${S.statsPeriod}|${statsModes().join(',')}|${S.matches.length}|${last?.id ?? ''}|${last?.endedAt ?? ''}`;
  if (hfCache.key !== key) { const ms = matchesOf(S.matches, pid, S.statsPeriod); hfCache = { key, r3: finishOdds(ms, pid, 3), r2: finishOdds(ms, pid, 2) }; }
  const bar = (d, i) => {
    const p = d.rate === null ? null : Math.round(d.rate * 100);
    return `<div class="hf-col"><b>${p === null ? '–' : `${p} %`}</b><span class="hf-bar"><i style="height:${p === null ? 0 : Math.max(3, p)}%"></i></span><small>${['1.', '2.', '3.'][i]} Dart</small></div>`;
  };
  const page = (title, r, n) => `<div class="hf-page"><small class="hf-t">${title}</small><div class="hf-cols c${n}">${r.map(bar).join('')}</div></div>`;
  const pg = ui.hfPage === 1 ? 1 : 0;
  // Keine Erklärung: Seite wechselt per Wischen oder Tipp auf den anderen (dunkleren) Punkt
  return `<div class="hf-card">
    <div class="hf-pages" data-k="hfPage">${page('High Finish · 3 Darts', hfCache.r3, 3)}${page('High Finish · 2 Darts', hfCache.r2, 2)}</div>
    <div class="hf-foot"><span class="hf-dots">${[0, 1].map((k) => `<button class="${pg === k ? 'on' : ''}" data-act="hfPage" data-k="hfPage" data-v="${k}" aria-label="${k ? '2 Darts' : '3 Darts'}"></button>`).join('')}</span></div></div>`;
}

/* „Auffällig“: kleine Auswertungen mit einem Satz dazu (js/insights.js) */
let inCache = { key: '', r: null };
function cachedInsights(pid) {
  const last = S.matches[S.matches.length - 1];
  const key = `${pid}|${S.statsPeriod}|${statsModes().join(',')}|${S.matches.length}|${last?.id ?? ''}|${last?.endedAt ?? ''}`;
  if (inCache.key !== key) inCache = { key, r: insights(matchesOf(S.matches, pid, S.statsPeriod), pid) };
  return inCache.r;
}
const sgn = (d) => `${d >= 0 ? '+' : '−'}${fmt(Math.abs(d), 1)}`;
function insightsBlock(r) {
  const few = 'Noch zu wenig Daten';
  const items = [];
  const md = r.matchdart;
  items.push(['Matchdart-Nerven', md ? pct(md.md) : '–', md
    ? `bei Matchdarts · sonst ${pct(md.other)}. ${md.md < md.other * 0.8 ? 'Die Hand zittert ein wenig.' : md.md > md.other * 1.2 ? 'Eiskalt, wenn es zählt.' : 'Nerven wie Drahtseile.'}`
    : few]);
  const dc = r.decider;
  items.push(['Entscheidungsleg', dc ? sgn(dc.delta) : '–', dc
    ? `Ø ${fmt(dc.avg, 1)} im letzten möglichen Leg. ${dc.delta >= 2 ? 'Du lebst für den Showdown.' : dc.delta <= -2 ? 'Da wird es eng in der Brust.' : 'Ganz normal weiter.'}`
    : few]);
  const b = null && r.bust;
  if (b) items.push(['Bust-Schock', b ? sgn(b.delta) : '–', b
    ? `Nach einem Bust wirfst du im Schnitt ${fmt(Math.abs(b.delta), 0)} Punkte ${b.delta < 0 ? 'schlechter. Tief durchatmen.' : 'besser. Jetzt erst recht!'}`
    : few]);
  const ft = r.firstTry;
  items.push(['Erster Versuch', ft ? pct(ft.first) : '–', ft
    ? `beim ersten Dart aufs Doppel · Nachwerfen ${pct(ft.retry)}. ${ft.first >= ft.retry ? 'Der erste sitzt.' : 'Du brauchst Anlauf.'}`
    : few]);
  const hf = r.highFinish;
  items.push(['High Finish', hf ? pct(hf.hi) : '–', hf
    ? `aufs Doppel nach Rest ab 100 · sonst ${pct(hf.lo)}. ${hf.hi < hf.lo * 0.8 ? 'Nach dem langen Weg wackelt das Doppel.' : hf.hi > hf.lo * 1.2 ? 'Wenn du schon mal da bist, sitzt er.' : 'Egal wie du hinkommst.'}`
    : few]);
  const wd = null && r.weekday;
  if (wd) items.push(['Wochentag', wd ? wd.best.k.slice(0, 2) : '–', wd
    ? `Bester Tag ${wd.best.k} (Ø ${fmt(wd.best.avg, 1)}) · schwächster ${wd.worst.k} (Ø ${fmt(wd.worst.avg, 1)}).`
    : few]);
  return block('Auffällig', `<div class="kv three ins">${items.map(([k, v, t], i) => `<div class="kv-c glint ins-c" style="--gd:-${(i * 2.3 + 1.1) % 11}s;--i:${i}"><small>${k}</small><b>${v}</b><em>${t}</em></div>`).join('')}</div>`);
}
