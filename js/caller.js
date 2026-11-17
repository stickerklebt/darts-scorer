/* Eigener Caller: selbst eingesprochene Ansagen je Punktzahl. Wirft der Hauptspieler genau diese Zahl, spielt die App
   seine Aufnahme statt der Computerstimme.
   - Aufnahme per Mikrofon als Rohdaten (Web Audio), danach Stille vorn/hinten abschneiden, auf Spitze normalisieren und als
     WAV (mono, 22 kHz) speichern – WAV läuft auf jedem Gerät, egal wo aufgenommen wurde.
   - Ablage im Konto (Server, /api/calls), Kopie in IndexedDB fürs Offline-Spielen.
   - Abspielen über Web Audio: einmal beim ersten Antippen freigeschaltet, danach auch ohne Tippen (z. B. nach der
     automatischen Übernahme der Summen-Eingabe) – wichtig für iPhone/iPad. */
import { api } from './api.js';

const RATE = 22050, MAX_SEC = 5;
let ctx = null;
const clips = new Map();   // score → { updatedAt, wav: ArrayBuffer, buffer?: AudioBuffer }
let uid = null;

/* ---------------- Audio freischalten ---------------- */
function audio() {
  if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
if (typeof document !== 'undefined') document.addEventListener('pointerdown', () => audio(), { capture: true, passive: true });

/* ---------------- IndexedDB (Offline-Kopie) ---------------- */
function idb() {
  return new Promise((ok, fail) => {
    if (!('indexedDB' in window)) { fail(new Error('no idb')); return; }
    const r = indexedDB.open('darts-calls', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('clips', { keyPath: 'k' });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}
async function idbAll(user) {
  try {
    const db = await idb();
    return await new Promise((ok) => {
      const out = [];
      const req = db.transaction('clips').objectStore('clips').openCursor();
      req.onsuccess = () => { const c = req.result; if (!c) { ok(out); return; } if (c.value.uid === user) out.push(c.value); c.continue(); };
      req.onerror = () => ok(out);
    });
  } catch (e) { return []; }
}
async function idbPut(v) { try { const db = await idb(); db.transaction('clips', 'readwrite').objectStore('clips').put(v); } catch (e) { /* */ } }
async function idbDel(k) { try { const db = await idb(); db.transaction('clips', 'readwrite').objectStore('clips').delete(k); } catch (e) { /* */ } }
/** Alle Aufnahmen vom Gerät entfernen (Abmelden, Konto löschen) */
export async function clearCalls() {
  clips.clear(); uid = null;
  try { const db = await idb(); db.transaction('clips', 'readwrite').objectStore('clips').clear(); } catch (e) { /* */ }
}

/* ---------------- Laden ---------------- */
/** Aufnahmen des Kontos laden: Liste vom Server, fehlende/neuere Dateien holen, sonst Offline-Kopie. */
export async function loadCalls(userId) {
  uid = userId;
  const local = await idbAll(userId);
  for (const v of local) clips.set(v.score, { updatedAt: v.updatedAt, wav: v.wav });
  let list;
  try { list = (await api('GET', 'api/calls')).calls; } catch (e) { return; } // offline: lokale Kopie reicht
  const want = new Set(list.map((c) => c.score));
  for (const s of [...clips.keys()]) if (!want.has(s)) { clips.delete(s); idbDel(`${userId}:${s}`); }
  for (const c of list) {
    const have = clips.get(c.score);
    if (have && have.updatedAt === c.updatedAt) continue;
    try {
      const res = await fetch(`api/calls/${c.score}`, { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) continue;
      const wav = await res.arrayBuffer();
      clips.set(c.score, { updatedAt: c.updatedAt, wav });
      idbPut({ k: `${userId}:${c.score}`, uid: userId, score: c.score, updatedAt: c.updatedAt, wav });
    } catch (e) { /* nächstes Mal */ }
  }
}

export const hasCall = (score) => clips.has(score);
export const callScores = () => [...clips.keys()].sort((a, b) => a - b);
export const callInfo = (score) => clips.get(score) || null;

async function bufferOf(score) {
  const c = clips.get(score);
  if (!c) return null;
  if (!c.buffer) { const a = audio(); if (!a) return null; c.buffer = await a.decodeAudioData(c.wav.slice(0)); }
  return c.buffer;
}
/** Kurz vor dem Spiel dekodieren, damit die Ansage ohne Verzögerung kommt */
export function warmCalls() { for (const s of clips.keys()) bufferOf(s).catch(() => {}); }

/** Eigene Ansage abspielen. Gibt die Dauer in Sekunden zurück – oder 0, wenn es keine gibt. */
export function playCall(score) {
  const c = clips.get(score);
  if (!c) return 0;
  const a = audio();
  if (!a) return 0;
  const go = (buf) => { const src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination); src.start(); };
  if (c.buffer) { go(c.buffer); return c.buffer.duration; }
  bufferOf(score).then((b) => b && go(b)).catch(() => {});
  return wavDuration(c.wav);
}
/** Beliebigen Puffer abspielen (Vorschau im Rekorder) */
export function playBuffer(buf) {
  const a = audio();
  if (!a || !buf) return null;
  const src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination); src.start();
  return src;
}

/* ---------------- Speichern / Löschen ---------------- */
export async function saveCall(score, wav, buffer) {
  const res = await fetch(`api/calls/${score}`, { method: 'PUT', headers: { 'Content-Type': 'audio/wav' }, body: wav, credentials: 'same-origin' });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Fehler ${res.status}`);
  clips.set(score, { updatedAt: data.updatedAt, wav, buffer });
  if (uid) idbPut({ k: `${uid}:${score}`, uid, score, updatedAt: data.updatedAt, wav });
}
export async function deleteCall(score) {
  await api('DELETE', `api/calls/${score}`);
  clips.delete(score);
  if (uid) idbDel(`${uid}:${score}`);
}

/* ---------------- Aufnahme ---------------- */
/* Direkt als Rohdaten mitschneiden (Web Audio), nicht über MediaRecorder: Safari kann seine eigenen MediaRecorder-Dateien
   oft nicht wieder dekodieren („Decoding failed“), Firefox scheitert an unterschiedlichen Abtastraten. Hier läuft ein eigener
   AudioContext mit der Abtastrate des Mikrofons, ein ScriptProcessor sammelt die Samples (überall verfügbar, auch Safari). */
let rec = null;
/** Mikrofon an, Aufnahme starten. onLevel(0..1) bekommt laufend den Pegel (für die Anzeige). */
export async function startRecording(onLevel) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!navigator.mediaDevices?.getUserMedia || !AC) throw new Error('Aufnehmen wird von diesem Browser nicht unterstützt.');
  if (!window.isSecureContext) throw new Error('Aufnehmen geht nur über HTTPS.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  let rc = null;
  try {
    const sr = stream.getAudioTracks()[0]?.getSettings?.().sampleRate;
    try { rc = sr ? new AC({ sampleRate: sr }) : new AC(); } catch (e) { rc = new AC(); }
    if (rc.state === 'suspended') await rc.resume().catch(() => {});
    const src = rc.createMediaStreamSource(stream);
    const proc = rc.createScriptProcessor(4096, 1, 1);
    const mute = rc.createGain(); mute.gain.value = 0; // Prozessor muss angeschlossen sein, damit er läuft – aber stumm
    const chunks = [], max = rc.sampleRate * MAX_SEC;
    let n = 0;
    proc.onaudioprocess = (e) => {
      const d = e.inputBuffer.getChannelData(0);
      if (n < max) { chunks.push(new Float32Array(d)); n += d.length; }
      if (onLevel) { let m = 0; for (let i = 0; i < d.length; i += 4) m = Math.max(m, Math.abs(d[i])); onLevel(Math.min(1, m * 1.6)); }
    };
    src.connect(proc); proc.connect(mute); mute.connect(rc.destination);
    rec = { stream, rc, src, proc, chunks, rate: rc.sampleRate };
    return rec;
  } catch (e) {
    // Mikrofon nie angeschaltet lassen, wenn der Start scheitert
    stream.getTracks().forEach((t) => t.stop());
    try { rc?.close(); } catch (err) { /* */ }
    throw e;
  }
}
function release(r) {
  try { r.proc.onaudioprocess = null; r.src.disconnect(); r.proc.disconnect(); } catch (e) { /* */ }
  r.stream.getTracks().forEach((t) => t.stop());
  try { r.rc.close(); } catch (e) { /* */ }
}
/** Aufnahme beenden → { wav, buffer, peaks, duration } */
export async function stopRecording() {
  if (!rec) return null;
  const r = rec;
  rec = null;
  release(r);
  const len = r.chunks.reduce((a, c) => a + c.length, 0);
  if (len < r.rate * 0.15) throw new Error('Zu kurz – bitte etwas länger sprechen.');
  const all = new Float32Array(len);
  let o = 0;
  for (const c of r.chunks) { all.set(c, o); o += c.length; }
  return processPcm(resample(all, r.rate, RATE));
}
export const isRecording = () => !!rec;
/** Aufnahme abbrechen, ohne zu verarbeiten */
export function cancelRecording() {
  if (!rec) return;
  const r = rec;
  rec = null;
  release(r);
}

/* ---------------- Verarbeitung (rein rechnerisch, testbar) ---------------- */
/** Mono-Daten: Stille vorn/hinten abschneiden (mit kurzem Polster), auf Spitze 0,9 normalisieren. */
export function trimNormalize(data, rate, threshold = 0.04) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  if (peak < 1e-4) return new Float32Array(0);
  const th = Math.max(threshold * peak, 0.004);
  let s = 0, e = data.length - 1;
  while (s < data.length && Math.abs(data[s]) < th) s++;
  while (e > s && Math.abs(data[e]) < th) e--;
  const pad = Math.round(rate * 0.06);
  s = Math.max(0, s - pad); e = Math.min(data.length - 1, e + pad);
  const out = data.slice(s, e + 1), g = 0.9 / peak;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  const fade = Math.min(out.length >> 1, Math.round(rate * 0.01)); // kurze Blenden gegen Knacken
  for (let i = 0; i < fade; i++) { out[i] *= i / fade; out[out.length - 1 - i] *= i / fade; }
  return out;
}
/** PCM (Float32, mono) → WAV-Datei (16 Bit) */
export function encodeWav(data, rate) {
  const b = new ArrayBuffer(44 + data.length * 2), v = new DataView(b);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + data.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i++) { const x = Math.max(-1, Math.min(1, data[i])); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return b;
}
export const wavDuration = (wav) => { const v = new DataView(wav); return v.getUint32(40, true) / 2 / v.getUint32(24, true); };
/** Spitzen für die Wellenform-Anzeige (n Balken, 0..1) */
export function peaksOf(data, n = 48) {
  const out = [], step = Math.max(1, Math.floor(data.length / n));
  for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j++) m = Math.max(m, Math.abs(data[j])); out.push(m); }
  return out;
}

/** Lineares Umrechnen auf eine andere Abtastrate (für Sprache völlig ausreichend) */
export function resample(data, from, to) {
  if (from === to) return data;
  const out = new Float32Array(Math.max(1, Math.round(data.length * to / from))), k = from / to;
  for (let i = 0; i < out.length; i++) {
    const x = i * k, j = Math.floor(x), f = x - j;
    out[i] = (data[j] ?? 0) * (1 - f) + (data[j + 1] ?? data[j] ?? 0) * f;
  }
  return out;
}

function processPcm(mono) {
  const pcm = trimNormalize(mono, RATE);
  if (!pcm.length) throw new Error('Nichts zu hören – bitte näher ans Mikrofon.');
  const a = audio(), buffer = a.createBuffer(1, pcm.length, RATE);
  buffer.copyToChannel(pcm, 0);
  return { wav: encodeWav(pcm, RATE), buffer, peaks: peaksOf(pcm), duration: pcm.length / RATE };
}
