/* Screen „Eigener Caller“: Zahl wählen, einsprechen, anhören, speichern. Nur die Zahlen, die man will.
   Oben der Rekorder für die gewählte Zahl, darunter beliebte Zahlen und alle möglichen Aufnahmen 0–180. */
import { S, ui } from '../store.js';
import { POSS } from '../checkout.js';
import { hasCall, callScores, callInfo, wavDuration } from '../caller.js';
import { esc, fmt } from './common.js';
import { icon } from './svg.js';

export const POPULAR = [180, 140, 100, 60, 26, 45, 41, 81, 85, 95, 121, 125, 135, 0];
const ALL = [...POSS].filter((v) => v >= 0 && v <= 180).sort((a, b) => a - b);

/** Wellenform als Balken (0..1) */
const wave = (peaks, cls = '') => `<svg class="cw ${cls}" viewBox="0 0 ${peaks.length * 6} 40" preserveAspectRatio="none" aria-hidden="true">${peaks
  .map((p, i) => { const h = Math.max(2, p * 38); return `<rect x="${i * 6 + 1}" y="${20 - h / 2}" width="4" height="${h}" rx="2"/>`; }).join('')}</svg>`;

function recorder() {
  const c = ui.caller, sel = c.sel, saved = callInfo(sel), r = c.rec;
  let body, btns;
  if (r?.state === 'wait') {
    body = `<p class="cr-hint">Mikrofon wird freigegeben … Bitte den Zugriff erlauben.</p>`;
    btns = `<button class="btn red big" disabled>Warte auf Mikrofon …</button>`;
  } else if (r?.state === 'rec') {
    body = `<div class="cr-live"><span class="cr-dot"></span><b id="crTime">0,0 s</b><span class="cr-meter"><i id="crLevel"></i></span></div>
      <p class="cr-hint">Sprich jetzt – höchstens 5 Sekunden.</p>`;
    btns = `<button class="btn red big cr-stop" data-act="crStop">${icon('minus', 3, 18)} Stopp</button>`;
  } else if (r?.state === 'done') {
    body = `${wave(r.peaks, 'new')}<p class="cr-hint">Neue Aufnahme · ${fmt(r.duration)} s – gefällt sie dir?</p>`;
    btns = `<div class="cr-btns"><button class="btn dark" data-act="crPlayNew">▶ Anhören</button><button class="btn dark" data-act="crRec">Nochmal</button>
      <button class="btn red" data-act="crSave" ${c.busy ? 'disabled' : ''}>${c.busy ? 'Speichert …' : 'Speichern'}</button></div>`;
  } else if (saved) {
    body = `<div class="cr-saved">${icon('chart', 2, 16)}<span>Gespeichert · ${fmt(wavDuration(saved.wav))} s</span></div>`;
    btns = `<div class="cr-btns"><button class="btn dark" data-act="crPlay">▶ Anhören</button><button class="btn dark" data-act="crRec">● Neu</button>
      <button class="btn line cr-del" data-act="crDel">Löschen</button></div>`;
  } else {
    body = `<p class="cr-hint">Noch keine Aufnahme. Tippe auf Aufnehmen und sag die Zahl so, wie du sie hören willst.</p>`;
    btns = `<button class="btn red big cr-rec" data-act="crRec"><span class="cr-recdot"></span> Aufnehmen</button>`;
  }
  return `<section class="crec glint" style="--gd:-4s">
    <div class="cr-top"><small>Ansage für</small><b class="pop">${sel}</b></div>
    ${body}
    ${c.err ? `<p class="auth-err">${esc(c.err)}</p>` : ''}
    ${btns}
  </section>`;
}

export function callerView() {
  const c = ui.caller || (ui.caller = { sel: 180 });
  const n = callScores().length, on = S.prefs.ownCalls !== false;
  const chip = (v) => `<button class="cnum ${hasCall(v) ? 'has' : ''} ${v === c.sel ? 'on' : ''}" data-act="crSel" data-v="${v}">${v}</button>`;
  return `<header class="bar"><button class="sq" data-act="crBack" aria-label="Zurück">${icon('chevL', 2.6)}</button><span class="bar-title">Eigener Caller</span><span class="sq ghost"></span></header>
  <main class="page caller">
    <p class="foot cr-intro">Sprich deine Lieblingszahlen selbst ein. Wirfst du im Spiel genau diese Zahl, hörst du deine Stimme statt der Computer-Ansage. Gilt für deine eigenen Aufnahmen in X01 und Highscore.</p>
    <button class="srow cr-toggle" data-act="pref" data-k="ownCalls"><span class="lbl">Eigene Ansagen abspielen<small>${n} ${n === 1 ? 'Zahl' : 'Zahlen'} eingesprochen</small></span><span class="tog ${on ? 'on' : ''}"></span></button>
    ${recorder()}
    <h2 class="label">Beliebt</h2>
    <div class="cgrid pop-row">${POPULAR.map(chip).join('')}</div>
    <h2 class="label">Alle Zahlen</h2>
    <div class="cgrid">${ALL.map(chip).join('')}</div>
    <p class="foot">Gold umrandet = eingesprochen. Die Aufnahmen liegen in deinem Konto und sind auf all deinen Geräten da.</p>
  </main>`;
}
