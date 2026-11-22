/* Mikrofon: Punktzahlen ansagen („37“, „hundertvierzig“, „Bust“, „nichts“, „null“). Spracherkennung des Browsers (Web Speech API,
   Deutsch, keine Bibliothek). Es zählen nur Zahlen 0–180 und die Wörter für „keine Punkte“ – alles andere wird ignoriert. */

const ZERO = new Set(['bust', 'büst', 'bast', 'nichts', 'null', 'überworfen', 'ueberworfen', 'zero']);
const UNITS = { ein: 1, eins: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9 };
const TEENS = { zehn: 10, elf: 11, zwölf: 12, zwoelf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, fuenfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19 };
const TENS = { zwanzig: 20, dreißig: 30, dreissig: 30, vierzig: 40, fünfzig: 50, fuenfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90 };

/** „siebenunddreißig“ → 37, „hundertvierzig“ → 140 (0–199), sonst null */
export function wordNumber(w) {
  w = w.toLowerCase();
  let base = 0;
  const h = w.indexOf('hundert');
  if (h >= 0) { const pre = w.slice(0, h); if (pre && pre !== 'ein' && pre !== 'eins') return null; base = 100; w = w.slice(h + 7).replace(/^und/, ''); if (!w) return base; }
  if (w in UNITS) return base + UNITS[w];
  if (w in TEENS) return base + TEENS[w];
  if (w in TENS) return base + TENS[w];
  const m = w.match(/^([a-zäöüß]+?)und([a-zäöüß]+)$/);
  if (m && m[1] in UNITS && m[2] in TENS) return base + UNITS[m[1]] + TENS[m[2]];
  return null;
}

/** Text der Spracherkennung → Liste von Punktzahlen (0 für Bust/nichts/null) in der gesagten Reihenfolge */
export function parseScores(text) {
  const out = [];
  const t = String(text || '').toLowerCase().replace(/[.,!?;:]/g, ' ');
  for (const tok of t.split(/\s+/).filter(Boolean)) {
    if (ZERO.has(tok)) { out.push(0); continue; }
    if (/^\d{1,3}$/.test(tok)) { const n = Number(tok); if (n <= 180) out.push(n); continue; }
    const n = wordNumber(tok); if (n !== null && n <= 180) out.push(n);
  }
  // „kein score“ besteht aus zwei Wörtern
  if (!out.length && /kein(e)? (score|punkte)/.test(t)) out.push(0);
  return out;
}

/* ---------- Spracherkennung (Browser) ---------- */
let rec = null, want = false, onText = () => {}, onState = () => {};
export const voiceSupported = () => !!(window.SpeechRecognition || window.webkitSpeechRecognition);
export const voiceOn = () => want;

export function startVoice({ text, state }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  onText = text; onState = state || onState; want = true;
  if (rec) return true;
  rec = new SR();
  rec.lang = 'de-DE'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
  // Sofort eintragen: eine Zahl zählt, sobald sie 0,7 s unverändert erkannt wird (nicht erst nach einer langen Pause).
  // Jedes Ergebnis wird nur einmal verarbeitet – auch wenn das Endergebnis später noch einmal kommt.
  const done = new Set(), timers = new Map();
  const take = (i, t) => { if (done.has(i)) return; done.add(i); clearTimeout(timers.get(i)); onText(t); };
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i], t = r[0].transcript;
      if (r.isFinal) { take(i, t); continue; }
      if (!parseScores(t).length) continue;
      clearTimeout(timers.get(i));
      timers.set(i, setTimeout(() => take(i, t), 700));
    }
  };
  rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { want = false; onState('denied'); } };
  rec.onend = () => { rec = null; if (want) setTimeout(() => want && startVoice({ text: onText, state: onState }), 300); else onState('off'); }; // Safari hört nach einer Weile auf → neu starten
  try { rec.start(); onState('on'); } catch { rec = null; return false; }
  return true;
}
export function stopVoice() { want = false; try { rec?.stop(); } catch { /* */ } rec = null; onState('off'); }

/* ---------- Checkout-Modus: Dart für Dart ansagen ---------- */
const MULT = { single: 1, einfach: 1, einzel: 1, einzelne: 1, s: 1, double: 2, doppel: 2, doppelt: 2, doppelte: 2, d: 2, dabble: 2, dobble: 2, triple: 3, tripel: 3, trippel: 3, dreifach: 3, treble: 3, t: 3 };
const ZERO_DART = new Set(['null', 'daneben', 'miss', 'nichts', 'vorbei', 'zero', 'bust']);
const num = (tok) => (/^\d{1,2}$/.test(tok) ? Number(tok) : wordNumber(tok));

/**
 * „Triple 20, Single 5, Double 16“ → [{ n: 20, m: 3 }, { n: 5, m: 1 }, { n: 16, m: 2 }]. Auch „D16“, „T 20“, „Doppel sechzehn“,
 * „Bull“/„Bullseye“ (= 50), „25“/„Single Bull“ (= 25), „daneben/null/miss“ (= 0). Zahl ohne Vorsatz = Single. Max. 3 Darts.
 */
export function parseDarts(text) {
  const toks = String(text || '').toLowerCase().replace(/[.,!?;:]/g, ' ').replace(/\b([sdt])(\d{1,2})\b/g, '$1 $2').replace(/bulls\s*eye/g, 'bullseye').split(/\s+/).filter(Boolean);
  const out = [];
  let mult = null;
  for (const tok of toks) {
    if (out.length >= 3) break;
    if (tok in MULT) { mult = MULT[tok]; continue; }
    if (tok === 'bull' || tok === 'bullseye' || tok === 'bulle') { out.push(mult === 1 ? { n: 25, m: 1 } : { n: 25, m: 2 }); mult = null; continue; }
    if (ZERO_DART.has(tok)) { out.push({ n: 0, m: 1 }); mult = null; continue; }
    const n = num(tok);
    if (n === null) continue;
    if (n === 25) out.push({ n: 25, m: mult === 2 ? 2 : 1 });
    else if (n === 50) out.push({ n: 25, m: 2 });
    else if (n >= 1 && n <= 20) out.push({ n, m: mult || 1 });
    else if (n === 0) out.push({ n: 0, m: 1 });
    mult = null;
  }
  return out;
}
