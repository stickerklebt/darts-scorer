/* Intro + 501-Kachel „Seide & Titan“: ALLE Stellschrauben an einer Stelle.
   Zeiten in Sekunden (bei ?intro=slow werden sie mit 4 multipliziert). Verzerrung in Bild-UV-Einheiten (0,1 = 10 % der Bildbreite).
   Das Bild austauschen: Datei nach assets/intro/ legen, `silkUrl` ändern, Version in sw.js hochzählen. */
export const TUNE = {
  silkUrl: './assets/intro/silk.webp',
  fontCheck: '500 100px "Bodoni Moda"',
  waitMax: 1.5,                     // höchstens so lange schwarz auf Bild + Schrift warten

  full: {                           // erstes Öffnen
    black: 0.2,                     // Phase 0
    flyIn: [0.2, 1.5],              // Phase 1: Layer fliegen aus den Ecken rein
    distortPeak: 1.0,               // Verzerrung am stärksten
    gather: [1.5, 2.2],             // Phase 2: Maske schrumpft aufs Kachel-Rechteck
    digits: 2.25, digitStep: 0.09, digitDur: 0.55,   // Phase 3 (startet nach der Übergabe, siehe Doku)
    sweep: [2.95, 0.6],             // Phase 4: Start, Dauer
    ui: 3.0, uiStep: 0.06, uiDur: 0.5,               // Phase 5
    tabs: 3.15, tabsDur: 0.55,
  },
  short: {                          // jedes weitere Öffnen (~1,5 s)
    black: 0, flyIn: [0, 0], distortPeak: 0.15,
    gather: [0.0, 0.65],
    digits: 0.62, digitStep: 0.05, digitDur: 0.4,
    sweep: [1.0, 0.45],
    ui: 0.8, uiStep: 0.05, uiDur: 0.4,
    tabs: 0.95, tabsDur: 0.5,
  },

  distort: { peak: 0.11, short: 0.035, rest: 0.0, blur: 0.022 },
  layers: 4,                        // Bild-Layer im Intro (1 Hauptlayer + 3 gespiegelte/gedrehte)
  maxDpr: 2,

  leave: { dur: 0.6, distort: 0.06, fade: 0.25 },   // Tippen auf 501: Stoff dehnt sich auf Vollbild

  light: {                          // Licht auf dem Titan
    loop: 10,                       // Sekunden je Runde der langsamen Bahn
    z: 150, spec: 1.0, exp: 24,     // Höhe, Grundhelligkeit, Schärfe des Glanzes
    sweepSpec: 2.6, pressSpec: 2.0, // Taschenlampe / Finger drauf
    sweepEvery: [6, 8],             // automatischer Sweep alle 6–8 s
    follow: 0.18,                   // wie weich das Licht dem Finger folgt (0–1 je Frame)
  },
  tileDrift: { loop: 20, scale: 0.03, move: 1.2 },  // Stoff in der Kachel: Skalierung (3 %) und Versatz (%)
  vignette: { inner: 0.35, alpha: 0.72 },           // muss zu .silk-vig in screens.css passen
};

/** Zeitplan je Variante, mit Tempo-Faktor (slow = 4) */
export function introPlan(kind = 'full', slow = 1) {
  const p = TUNE[kind] || TUNE.full, k = (v) => (Array.isArray(v) ? v.map((x) => x * slow) : typeof v === 'number' ? v * slow : v);
  const out = Object.fromEntries(Object.entries(p).map(([key, v]) => [key, k(v)]));
  out.total = Math.max(out.tabs + out.tabsDur, out.sweep[0] + out.sweep[1], out.ui + out.uiDur + 6 * out.uiStep);
  return out;
}

/** Ease-Funktionen (0–1) */
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
};
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** Fortschritt von t im Intervall [a, b] (0–1) */
export const span = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp01((t - a) / (b - a)));
/** Rechteck-Interpolation { x, y, w, h, r } */
export const lerpRect = (A, B, k) => ({ x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k, w: A.w + (B.w - A.w) * k, h: A.h + (B.h - A.h) * k, r: A.r + (B.r - A.r) * k });
