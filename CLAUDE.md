# Darts Scorer – Architektur & Plan

PWA für iPhone/iPad. Vanilla JS als ES-Module, kein Build-Step, keine Frameworks, keine CDNs.
Alles offline, Daten in `localStorage`. Veröffentlicht über GitHub Pages (`stickerklebt/darts-scorer`, Branch `main`).

## Regeln für die Arbeit
- Kein Build-Tool, keine externen Libraries. Diagramme, Ornamente, Wappen, Dartscheibe: eigene SVGs im Code.
- Schriften lokal als `.woff2` (nur OFL): **Barlow Condensed** (Zahlen/Scoreboard), **Cinzel** (theatralische Versalien).
- Design: eigene Motive im Stil 70er/80er-Rockalbum. **Keine** Cover-Motive, Wappen, Logos oder Namen von Bands nachbauen.
- Bei jeder Dateiänderung: `CACHE` in `sw.js` hochzählen, neue Dateien in `ASSETS` aufnehmen.
- Logik-Tests: `node tests/run.mjs` (ohne Abhängigkeiten). Vor jedem Commit grün.
- App-Icon: Wappen aus `js/ui/svg.js` → `node tools/mkicon.mjs icon.svg`, dann `qlmanage -t -s 1024 icon.svg`
  und mit `sips -Z 512/180` zu `icon-512.png` / `icon-180.png` verkleinern.
- Beim Testen im Browser: Service Worker abmelden, sonst liefert der Offline-Cache alte Dateien.
- Statistik wird **immer aus gespeicherten Matches berechnet**, nie als Zähler mitgeführt.

## Dateistruktur (Ziel)
```
index.html              Gerüst, lädt css/ und js/main.js (type="module")
css/
  tokens.css            Farben, Schriften (@font-face), Abstände, Ecken
  base.css              Reset, Typo, Buttons, Tabs, Panels, Texturen
  screens.css           Screen-spezifisches (Play, Setup, Game, Result, Stats, Compare)
fonts/                  barlow-condensed-*.woff2, cinzel-*.woff2, OFL.txt
js/
  main.js               Boot, Router (screen/tab), Event-Delegation, Render-Loop
  store.js              Laden/Speichern (Key `darts.v3`), Profile, Prefs, Match-Archiv
  checkout.js           Feste Checkout-Tabelle (1/2/3 Darts), Setup-Würfe, Hilfsfunktionen
  x01.js                X01-Engine: Legs/Sets, Summen- + Einzeldart-Eingabe, Ziel/Doppelversuch, Undo
  party.js              Highscore, Shanghai, Halbieren, Around the Clock
  stats.js              Reine Funktionen: Matches → Kennzahlen, Heatmap, Verläufe, Verteilung
  ui/
    svg.js              Wappen, Ornamente, Badges, Muster (Halftone/Schraffur), Icons
    board.js            Antippbare Dartscheibe + Kupferstich-Heatmap-Scheibe
    charts.js           Linien- und Balkendiagramme
    play.js             Tab „Spielen“ (Profilkarte, Hero X01, Modus-Grid)
    setup.js            Setup-Seite (Plakat, Profilauswahl, Optionen)
    game.js             Scoreboard + Eingabe (Summe / Einzeldart-Tastatur / Scheibe)
    moments.js          Comic-Vollbild bei 180, High-Finish, Leg/Set gewonnen
    result.js           Ergebnis-/Sieger-Screen
    stats-view.js       Tab „Statistiken“ (Spielerwahl, Zeitfilter, Sektionen, Matchliste)
    compare.js          Vergleichsansicht
    sheets.js           Dialoge: Zahnrad, Profilwahl, Bestätigungen, Daten löschen
sw.js, manifest.webmanifest, icon-180.png, icon-512.png (neues Wappen-Icon)
tests/
  run.mjs               Mini-Testrunner
  checkout.test.mjs     Pflicht-Testfälle + Vollprüfung 2–170 × 1/2/3 Darts
  x01.test.mjs          Bust, Checkout, Summe→Einzeldart-Wechsel, Ziel/Doppelversuch, Sets
  stats.test.mjs        Kennzahlen gegen handgerechnete Beispiel-Matches, Zeitfilter
```

## Datenmodell (`localStorage['darts.v3']`, alte Daten werden verworfen)
```js
{
  version: 3,
  mainId: 'p_…',                       // Hauptspieler (Onboarding)
  profiles: [{ id, name, createdAt }], // Name eindeutig, Vergleich ohne Groß/Klein
  matches: [MatchRecord],              // nur abgeschlossene Matches, alle Spielarten
  current: Match | null,               // laufendes Match (Fortsetzen nach Neustart)
  lineup: [profileId],                 // zuletzt gewählte Spieler
  opts: { x01: { start, out, mode, target }, highscore: { rounds }, … },
  prefs: { voice: false, hints: true, dartInput: 'keys' | 'board' },
}

Match = {
  id, game, opts, first, startedAt, endedAt?, winners?: [sideIndex],
  sides: [[profileId, …]],             // Seite = Einzelspieler oder Team (mehrere Profile)
  playerIds: [profileId],              // alle Profile flach (für Filter)
  legs: [Leg],                         // X01
  turns: [{ s, pid, v }],              // Partyspiele (v = Punkte bzw. Treffer)
  pending: [Throw],                    // angefangene Einzeldart-Aufnahme
}
Leg  = { set, starter, winner?, turns: [Turn] }   // starter/winner = Seiten-Index
Turn = {
  s, pid,                              // Seite + Profil, das tatsächlich geworfen hat
  startRem,                            // Rest vor der Aufnahme
  input: 'sum' | 'darts',
  score, darts, bust?, out?,
  throws?: [{ n, m, before, target }]  // n 0–20/25, m 1–3; before = Rest vor dem Dart;
}                                      // target = empfohlener erster Dart bei (before, übrige Darts)
```
- **Einzeldart-Eingabe** gilt für jede Aufnahme mit `startRem ≤ 170`. Beginnt sie darüber, bleibt sie Summe.
  Da 171+ nicht in einer Aufnahme checkbar ist, gibt es kein Checkout ohne Einzeldarts.
- **Doppelversuch** (nur bei Double Out): Dart mit `before` gerade 2–40 oder 50. Ziel = `D(before/2)` bzw. Bull.
  Treffer = genau dieses Feld. Daraus: Doppelquote gesamt, pro Feld, Ø Darts aufs Doppel.
- **Teams:** Eine Seite mit mehreren Profilen spielt mit gemeinsamem Rest/Legs/Sets. Werfer der Seite =
  `side[(Anzahl Aufnahmen dieser Seite im ganzen Match) % Teamgröße]` – die Reihenfolge läuft über Legs weiter.
  Anzeige „TEAM Tim · Ben · Andi“, aktiver Werfer „Andis Wurf“. Statistik je Profil aus `turn.pid`,
  Siege/Legs zählen für jedes Mitglied der Gewinnerseite. Max. 6 Spieler insgesamt.
- Das `throws`-Format (Feld + Multiplikator + Ziel) ist so gewählt, dass Cricket es später wiederverwenden kann.

## Checkout-Tabelle
- Fest hinterlegt nach gängigem PDC-Chart: `CHECKOUT[3]` für 2–170, `CHECKOUT[2]` für 2–110, `CHECKOUT[1]` für die Doppel und Bull.
- Bevorzugte Doppel: D20, D16, D8, D18, D12, D10 …; D1–D3 nur ohne sinnvolle Alternative.
- Bogeys (169, 168, 166, 165, 163, 162, 159) und nicht checkbare Reste mit den übrigen Darts:
  Setup-Wurf aus eigener Tabelle (z. B. „T19 → 112 Rest“).

## Statistik (nur 501-Matches, Zeitfilter 7 T / 30 T / 1 J / Gesamt)
Überblick · Scoring · Checkout (inkl. Quote nach Bereich 2–40 / 41–100 / 101–170) · Legs ·
Doppel-Heatmap · Diagramme (Average-Verlauf mit gleitendem Schnitt, Doppelquote-Verlauf,
Verteilung der Aufnahmen) · Matchliste (aufklappbar) · Leerzustand · Vergleich zweier Spieler.

## Meilensteine
1. **Fundament** – Module, Store v3, Profile (Auswahl/Neuanlage, Hauptspieler vorausgewählt), Checkout-Tabelle + Tests,
   Einzeldart-Tastatur ab Rest ≤ 170, Ziel/Doppelversuch, Undo pro Dart, Matcharchiv, „Alle Daten löschen“. Optik noch alt.
2. **Redesign** – Schriften, Design-Tokens, Ornamente/Muster/Wappen, Tabs mit gleitendem Strich, Startseite (Hero + Grid),
   Setup-Plakat, Scoreboard, Comic-Momente, Ergebnis-Screen, Dartscheiben-Eingabe (umschaltbar im Zahnrad), neues App-Icon.
3. **Statistiken** – Tab mit Spielerwahl, Zeitfilter, allen Kennzahlen, Heatmap + Doppelliste, Leerzustand.
4. **Vergleich, Diagramme, Matchliste, Feinschliff** – Animationen, iPhone/iPad hoch & quer prüfen.

Nach jedem Meilenstein: Tests grün, im Browser auf iPhone- und iPad-Größe geprüft, auf GitHub Pages veröffentlicht.
