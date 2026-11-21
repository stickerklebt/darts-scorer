# Darts Scorer – Design-Regeln

Verbindlich für jede Oberfläche. Neue Bausteine erst hier nachsehen, Abweichungen hier begründen und eintragen.
Werte stehen als Variablen in `css/tokens.css`; die Bausteine in `css/base.css` und `css/screens.css`.

## Grundidee
Queen-Look als **Stilmittel**: heraldisch, Gold/Creme auf Schwarz, Siebziger-Plakat (Strahlenkranz in Rosa/Himmelblau/Creme),
Pop-Art-Farbblöcke, Kupferstich. **Keine** Cover-Motive, Figuren, Wappen oder Logos der Band.
Hintergründe der Seiten bleiben schlicht schwarz – Details sitzen auf den Elementen. „Handgemacht statt perfekt“:
leicht wackelige Linien (`#rough`), gedruckte Kanten (`#ink`), kleine Schieflagen.

## Farben
| Rolle | Variable | Wert |
|---|---|---|
| Grund | `--ink` / `--coal` / `--panel` / `--panel2` | #0b0a08 / #12100d / #1a1713 / #231f19 |
| Text | `--cream` (Haupt), `--cream2`, `--muted` (Neben), `--dim` (leise) | |
| Akzent Gold | `--gold`, `--gold-l` | Rahmen, Beschriftungen, Drähte, Medaille 1 |
| Aktion | `--red` (+ `--red-d` als Kante) | Hauptknöpfe, aktiver Reiter, Plakat-Schatten |
| Treffer | `--green` = Double, `--red` = Triple | Scheiben, Kacheln, Lupe |
| Medaillen | Gold #ffd45c · Silber #dfe4ea · Bronze #d9925a | Top 3 (Doppel) |
| Spielerfarben | `--p0`…`--p5` | Karten im Spiel, Diagramme |

Doppel-Stufen (relativ zur eigenen Quote): grün #3f9a52 · hellgrün #93b04a · gold #c9a34e · orange #d27a3a · rot #c4452f;
unter 5 Versuchen #5b5140.

## Schrift
Nur ein Schnitt je Schrift, `font-synthesis: none`. Ziffern kommen immer aus League Gothic (auch in Fell-Texten).

| Rolle | Schrift | Schreibung | Beispiel |
|---|---|---|---|
| Überschriften, Titel | Cinzel (`--f-display`) | Versalien/Kapitälchen | „WILLKOMMEN“, „SPIEL LÖSCHEN?“ |
| **Spielernamen auf Karten** (außerhalb des Spiels) | Cinzel | **normal** (Lasse → großes L + Kapitälchen), 25–27 px | Spielen, Statistik-Kopf, Freunde, Freundesprofil |
| Spielernamen im Spiel | League Gothic, Versalien; aktiver Spieler IM Fell SC groß | | Score-Karten |
| Beschriftungen, Knöpfe, Reiter | League Gothic (`--f-num`), Versalien, Sperrung .12–.2em | | „Ø 501“, „SPIELEN“ |
| Fließtext, Hinweise | IM Fell English (`--f-text`) | normal | Erklärungen, Leere Zustände |
| Zahlen | League Gothic | | siehe unten |

## Zahlen
- **Breite:** große Zahlen außerhalb des Spiels mit `transform: scaleX(var(--num-w))` (1,16) – wirkt weniger „hochgezogen“.
  Im laufenden Spiel nie (Lesbarkeit, Kartenlayout).
- **Plakat-Stil `.pop`:** roter, versetzter Schatten + gedruckte Kante. Nur für **die eine wichtigste Zahl** eines Bereichs:
  Ø auf der Spielerkarte, Overall-Average, Rekord-Karten, Ø in der Freundesliste, gewählte Zahl im Caller. Nicht für Tabellen,
  Kachel-Raster oder das Spiel.
- Tabellen und Listen: `font-variant-numeric: tabular-nums`.

## Flächen & Rahmen
- **Ränder immer ringsum oder gar nicht – nie nur an einer Seite** (kein Goldstrich nur oben/links, keine einseitigen
  Inset-Schatten). Gilt für jedes Fenster (`.sheet`), Felder (`.field`), Umschalter (`.seg`), Hinweise (`.toast`) und Karten.
  Ausnahmen sind nur durchgehende Leisten über die ganze Breite (Reiterleiste oben, Dock unten, Tabellenlinien).
- **Karten** (`.kv-c`, Rekorder, Anmeldung): dunkle Fläche, **Goldrand ringsum** (nie nur oben), Radius 10–14 px.
- **Papierkarten** (Creme mit Kupferstich + `--paper-age`): nur für Rekorde/Regeln/Leere Zustände.
- Hero-Karte: Doppelrahmen in Gold, Eck-Ornamente; Hintergrund = ruhiger goldener Strahlenkranz mit Punktkreis, Lorbeer
  und Sternen (`heroArt()`), keine Bildmotive.
- Ecken: Knöpfe `--r-btn` 6 px, Flächen `--r-panel` 10 px, große Karten 14 px.

## Licht & Bewegung
- `.glint`: Lichtpunkt wandert am Rand entlang (5 s je Runde), je Karte versetzt (`--gd`). Lichtlinie `fuse()` ebenfalls zügig.
- **Average oben** (Spielerkarte, Overall-Average): kräftiges goldenes Glühen (pulsiert), Lichtstreif über die Ziffern (`.shimmer`,
  braucht `data-t` mit der Zahl) und Glitzer-Sterne (`sparkles()` in `svg.js`). Rekord-Karten: nur der Lichtstreif.
- Statistik-Karten glimmen zeitversetzt kurz von innen auf, die Zahl wird dabei heller. Diagramme: Linien zeichnen sich ein,
  Punkte und Balken wachsen nacheinander.
- Startseite: Average rattert beim App-Start einmal wie ein Spielautomat von 0 hoch und rastet mit Blitz ein (`rollAvg` in
  `main.js`); am Namen laufen ab und zu goldene Lichtspuren die Buchstabenkanten entlang (SVG-Text-Kontur). Hero: Sterne
  funkeln, Strahlen drehen sich langsam, Punktkreis blinkt, 501 glimmt mit Glitzer, Spielen-Knopf atmet.
- Overall-Average (Statistik/Freund): goldener Rauch im Hintergrund (`goldSmoke()`, feTurbulence, scharfe Schwaden,
  links und rechts der Zahl eigene Schichten, die in verschiedene Richtungen wehen), kräftiger Goldschein direkt hinter der Zahl, ab und zu ein Lichtstrich rund um die Zahl (`numRing()`).
- Partyspiel-Logos stehen meist still und hüpfen/kippen ab und zu leicht (jedes zu seiner Zeit), der Stern daneben funkelt.
- Reiter „Spielen“: gezeichneter Dartpfeil (Spitze, Barrel mit Rillen, Schaft, Flights), fliegt beim Aktivieren ein und wippt ab und zu.
- `fuse()`: Lichtlinie auf Goldrahmen (Hero, Rekorde, Overall-Average, Sieger).
- Karten erscheinen nacheinander (`--i` × 45 ms), aktiver Reiter glimmt, große rote Knöpfe mit gelegentlichem Lichtstreif.
- **Im laufenden Spiel kein Leuchten** – einzige Ausnahme: getroffene Felder der Aufnahme auf der Eingabe-Scheibe.
- `prefers-reduced-motion` schaltet Licht und Drehungen ab.

## Scheiben
Eingabe-Scheibe und Doppel-Heatmap teilen einen Stil: warm-dunkle Felder (#1d1913/#28221a), leicht getönte Ringe
(Rot #8a3326, Grün #2a6b45), Golddrähte (35–45 % Deckkraft), Zahlen in `--gold-l`. Treffer/Zeiger/Lupe zeigen einen
kleinen Dartpfeil (`dartGlyph()` in `ui/aimboard.js`: Creme-Barrel, rote Flights, Spitze = Treffpunkt). Nachbau einer echten Scheibe nur beim Ausbullen.

## Bausteine
- Hauptaktion: `.btn.red.big` (eine pro Bildschirm). Zweitrangig: `.btn.dark`. Abbrechen/Gefährlich: `.btn.line` (rot bei Löschen).
- Umschalter: `.seg` (aktiv = Creme mit Goldkante). Listen: `.slist` + `.srow`, Schalter `.tog`.
- **Keine Monogramme/Initial-Logos** bei Spielernamen. Spielerkarte auf „Spielen“: flache Fläche (`--panel`, kein Verlauf), Goldrand,
  mittig **nur Name und Zahl** (kein Trennstrich, kein „Ø 501“-Label): Name groß in IM Fell SC mit rotem Versatz-Schatten,
  daneben der Ø 501 breit gezogen (`scaleX 1,32`), glühend mit Glitzer.
- Medaillen: Ring in Gold/Silber/Bronze (`.medal.m1–m3`), keine Zahlen-Kreise.
- Abschnittstitel: `.label` (Gold, Versalien, handgezogene Linie dahinter).
- Diagramme: y-Achse passt sich den Werten an (`axisRange`), Quoten nie über 100 %.
- Unter-Reiter (Statistik): höchstens drei; aktiver vergrößert, inaktive blass/kleiner, gleitender roter Strich.
  Seltenes eingeklappt (`.fold` mit Kurzinfo). Filter wie der Zeitraum hinter einem Symbol-Knopf (Uhr), aktiver Filter als Chip mit ✕.
- Doppel-Reiter ab 900 px Breite zweispaltig: Scheibe links (bleibt beim Scrollen stehen), Detail + Tabelle rechts; schmaler untereinander.

## Icon
App-Icon bewusst schlicht: Zielscheibe (Goldring, Rot, Schwarz, Creme, rotes Bull) auf dunklem Grund – `tools/mkicon.mjs`.
Browser-Tab-Symbol: `favicon.svg` = einfacher Dartpfeil (Creme, rote Flights) auf dunklem Grund. Das Wappen bleibt in der App (Splash, Anmeldung).

## Spieler-Banner
Spiel-Banner ohne Figuren: Band links gerade, rechts Kerbe (Schwalbenschwanz), 3 px Goldrand (Verlauf hell → dunkel), darunter eine dunkle
Kopie als Materialdicke und ein weicher Schlagschatten (hebt sich ab). Innen Samt-Rot mit Tiefe: Lichtkante oben, Schatten unten und
an den Rändern, feine Stoff-Rippen, Damast-Muster aus Goldrauten, Goldpunkten und geprägten Sternen. Auf dem Band links der Name (Cinzel, Gold mit
Glanz und Leuchten, Glitzer), daneben der Ø wie die große 501 (Creme, Versatz Rot/Schwarz/Gold). Schmuck im Queen-Stil: links ein Rosenstrauß (zwei Rosen, Knospen, gezackte Blätter,
Dornenstiele, Gold-Schnörkel, Sterne), an der Kerbe ein kleiner Strauß, unten eine Dornenranke mit Röschen.
Darunter drei Pokale an Medaillenbändern (Rot mit Goldstreifen, Goldring), die leicht schwingen (Metallverlauf je Stufe: Bronze, Silber, Gold, Königsrot, Legendär; nicht erreicht = grau).
