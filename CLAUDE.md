# Darts Scorer – Architektur & Regeln

PWA für iPhone/iPad. Vanilla JS als ES-Module, kein Build-Step, keine Frameworks, keine CDNs.
Alles offline, Daten in `localStorage`. Veröffentlicht über GitHub Pages (`stickerklebt/darts-scorer`, Branch `main`).

## Regeln für die Arbeit
- Kein Build-Tool, keine externen Libraries. Diagramme, Ornamente, Wappen, Dartscheiben, Animationen: eigene SVG/CSS/Canvas im Code. Keine Sounds.
- Schriften lokal als `.woff2` (nur OFL): **Barlow Condensed** (Zahlen, Fließtext), **Metal Mania** (kantige Display-Schrift für große Überschriften).
- Design: eigene Bildsprache aus Stilmitteln – verwitterter, rissiger Stein mit kühlem Grünstich (Grundmaterial), Zebra-Streifen
  (Leisten, Trenner), bunte Comic-Magie mit Blitzen/Funken/Leuchten (Momente, Sieger, Hero), kantige Display-Lettern.
  **Keine** Cover-Motive, Figuren, Kompositionen, Logos oder Bandnamen nachbauen. Flächen mit Körnung statt sterilen Einfarbflächen,
  keine weichen Verläufe auf Flächen (Licht in Animationen ausgenommen). Hinter Zahlen bleibt es ruhig.
- Bei jeder Dateiänderung: `CACHE` in `sw.js` hochzählen, neue Dateien in `ASSETS` aufnehmen.
- Logik-Tests: `node tests/run.mjs` (ohne Abhängigkeiten). Vor jedem Commit grün. Neue Logik bekommt eigene Tests.
- App-Icon: Wappen aus `js/ui/svg.js` → `node tools/mkicon.mjs icon.svg`, dann `qlmanage -t -s 1024 icon.svg`
  und mit `sips -Z 512/180` zu `icon-512.png` / `icon-180.png` verkleinern.
- Service Worker nur unter HTTPS (nicht auf localhost), damit lokale Tests frische Dateien sehen.
- Statistik wird **immer aus gespeicherten Matches berechnet**, nie als Zähler mitgeführt. Keine Statistik/Funktion entfernen.
- Animationen in der Konsole prüfen: `(await import('/js/ui/fx.js')).fxPlay('lootbox', {score:180, name:'Test'})`,
  `__fxFreeze()` hält das Bild an (Seite im Hintergrund: Animationen per `document.getAnimations()` auf eine Zeit setzen).

## Dateistruktur
```
index.html              Gerüst, lädt css/ und js/main.js (type="module")
css/
  tokens.css            Farben, Schriften, Texturen (Körnung, Stein, Risse, Zebra, Raster)
  base.css              Reset, Typo, Buttons, Tabs, Dialoge
  screens.css           Screens (Play, Setup, Spiel, Ausbullen, Leg-Info, Ergebnis, Statistik, Vergleich, Bots)
  fx.css                Vollbild-Animationen
fonts/                  bc-*.woff2 (Barlow Condensed), metalmania.woff2, OFL-*.txt
bots/                   Optionale Bot-Bilder + bilder.json (Liste) + README.md
js/
  main.js               Boot, Rendering, Aktionen, Match-Ablauf, Ausbullen-Steuerung, Bot-Steuerung, Sprüche, Undo
  store.js              Laden/Speichern (Key `darts.v3`), Profile, Prefs, UI-Zustand
  match.js              Match-Objekt, Werfer-Reihenfolge
  checkout.js           Feste Checkout-Tabelle (1/2/3 Darts), Setup-Würfe, Doppelversuch
  x01.js                X01-Engine (Legs/Sets, Summe/Einzeldart, Undo, Matchstatistik)
  party.js              Highscore, Shanghai, Halbieren, Around the Clock
  bulloff.js            Echte Scheibengeometrie (mm), Feld an Position, Ausbullen-Logik
  fx.js                 Welche Animation zu welchem Wurf (Töpfe, Zufall ohne Wiederholung)
  bots.js               Bots: Name, Farbe, Ziel-Average, Streuung (sigma), Sprüche  ← zum Selbst-Ändern
  botsim.js             Bot-Wurfmodell: zielen + 2D-Normalstreuung, X01 und Partyspiele
  stats.js              Kennzahlen, Heatmap-Daten, relative Doppel-Bewertung (Stufen + Top 3)
  games.js              Spielmodi (Titel, Regeln)
  ui/ svg.js · board.js (Eingabe-, Heatmap- und Echt-Scheibe) · charts.js · play.js · setup.js · game.js ·
      bulloff-view.js · moments.js (Leg-Info) · result.js · stats-view.js (Unter-Reiter) · stats-extra.js ·
      compare.js · sheets.js · avatar.js (Bot-Bilder/Platzhalter) · common.js ·
      fx.js · fx-core.js (Ebene, Partikel, Wackeln) · fx-anims.js (17 Animationen) · fx-art.js (Comic-SVGs)
sw.js, manifest.webmanifest, icon-180.png, icon-512.png
tools/  mkicon.mjs (Icon), calibrate-bots.mjs (sigma per Simulation)
tests/  run.mjs + checkout · x01 · party · stats · bulloff · fx · bots
```

## Datenmodell (`localStorage['darts.v3']`)
```js
{
  version: 3, mainId, profiles: [{ id, name, createdAt }],   // nur Menschen; Bots stehen in js/bots.js
  matches: [Match], current: Match | null,
  lineup: [{ id, team }],                                     // id = Profil- oder Bot-id ('sensei-wu' …)
  teamMode, anwurf: 'list' | 'bull',
  opts: { x01: { start, out, mode, target }, highscore: { rounds }, shanghai: { rounds }, halveit: {}, atc: { bull } },
  prefs: { voice: false, hints: true, dartInput: 'keys' | 'board', anim: true },
  screen, tab, statsPid, statsPeriod, statsSub, cmpA, cmpB, game,
}
Match = { id, game, opts, first, startedAt, endedAt?, done, winners?, sides: [[id…]], playerIds, legs | turns, pending,
          bull?: { contenders, throws: [{ s, x, y }], rounds: [{ throws, group, winner }], winner, done } }  // x,y in mm
Leg  = { set, starter, winner?, turns: [Turn] }
Turn = { s, pid, startRem, input: 'sum' | 'darts', score, darts, bust?, out?, throws?: [{ n, m, before, target }] }
Party-Turn = { s, pid, v, throws? }   // throws nur bei Bots: [{ n, m, before: null, target: null }]
```
- Einzeldart-Eingabe für Menschen ab Rest ≤ 170. **Bots werfen immer Dart für Dart** (`throwDart(m, n, mult, { any: true })`).
- Doppelversuch (Double Out): Dart mit `before` gerade 2–40 oder 50.
- Teams: Werfer = `side[(Aufnahmen der Seite im Match) % Teamgröße]`. Ausbullen wirft der Erste der Teamliste.

## Regeln der neuen Funktionen
- **Aktiver Spieler**: Karte komplett in Spielerfarbe + großer Name, Rest abgedunkelt, Leuchtbalken oben (`.turnbar`), Wechsel ≤ 300 ms.
- **Setup**: ein Screen – Modus · Spieler & Bots · Startpunkte/Runden · First to · Anwurf · Start; „Mehr Optionen“ (Out, Legs/Sets, Mischen, Regeln).
- **Ausbullen** (nur Matchbeginn, alle Modi, ab 2 Seiten): Finger halten → Lupe, loslassen setzt, dann Rückgängig/Bestätigen.
  Nächster am Mittelpunkt gewinnt; mehrere im Bull bzw. (ohne Bull) mehrere im 25er oder exakt gleich weit → nur diese nochmal.
- **Animationen** (`js/fx.js`): 26, 60, 100–120 (Topf), 121–179 (Topf), 180 (Lootbox); Finish 2–60, 61–99, 100–167, 170 (nur Checkout).
  Nur X01 + Highscore, keine Busts, keine für Bots (nur kleine Andeutung in der Bot-Karte). Zufällig, nie zweimal dieselbe hintereinander.
  Antippen überspringt; nach Finish-Animation die Leg-/Set-Info. Abschaltbar im Zahnrad (`prefs.anim`).
- **Bots**: Sensei Wu Ø 45 (σ 17,74 mm), Super Mario Ø 42 (σ 18,87), Shrek Ø 40 (σ 19,8). Zielen T20, im Finish nach Checkout-Tabelle,
  im Partyspiel aufs jeweilige Ziel. 3 Darts ≈ 2 s. Mindestens ein Mensch pro Spiel. Bots nicht in Statistik/Profilwahl.
  Sprüche: max. 3 pro Spiel und Bot (Start · ein Moment · Ende). Undo nimmt die letzte menschliche Eingabe zurück, Bot-Würfe danach mit.
  Bilder optional: Datei in `bots/` + Eintrag in `bots/bilder.json`.
- **Statistik**: Unter-Reiter Überblick · Scoring · Checkout · Doppel · Verlauf (nur 501). Doppelfarben relativ zur eigenen
  Gesamtquote: ≥1,5× grün · ≥1,15× hellgrün · ≥0,85× gold · ≥0,5× orange · darunter rot; unter 5 Versuchen neutral; Top 3 markiert.
  Gleiche Logik im Vergleich (jede Scheibe relativ zum eigenen Spieler).

## Stand
Update 1 (Meilensteine 1–4) und Update 2 (Design, Setup, Ausbullen, Animationen, Bots, Statistik) erledigt, Stand 16.11.2026.
