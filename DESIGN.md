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
- Overall-Average (Statistik/Freund): goldener Rauch im Hintergrund (`goldSmoke()`, feTurbulence, ganz leicht und stark
  verschwommen, weich auslaufend; links und rechts der Zahl eigene Schichten, die sacht in verschiedene Richtungen treiben), kräftiger Goldschein direkt hinter der Zahl, ab und zu ein Lichtstrich rund um die Zahl (`numRing()`).
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
an den Rändern, feine Stoff-Rippen, Damast-Muster aus Goldrauten, Goldpunkten und geprägten Sternen. Kräftiger Kontrast.
Handgemacht: Band −0,8° schief, Kanten leicht ungleich (wie geschnitten), abgenutzte Druckkörnung, Pokale/Sträuße minimal
unterschiedlich geneigt. Auf dem Band links der Name (Cinzel, Gold mit
Glanz und Leuchten, Glitzer), daneben der Ø wie die große 501 (Creme, Versatz Rot/Schwarz/Gold). Schmuck im Queen-Stil: links ein Rosenstrauß (zwei Rosen, Knospen, gezackte Blätter,
Dornenstiele, Gold-Schnörkel, Sterne), an der Kerbe ein kleiner Strauß.
Darunter drei Pokale an Medaillenbändern (Rot mit Goldstreifen, Goldring), die leicht schwingen (Metallverlauf je Stufe: Bronze, Silber, Gold, Königsrot, Legendär; nicht erreicht = grau).

## Spielmodi (Kacheln und Abzeichen)
Kacheln alle schwarz (einheitlich), Innenrahmen und Stern gold; erkennbar am Muster: Highscore goldene Rasterpunkte ·
Shanghai goldene Schrägstreifen · Halbieren oranges Schachbrett · Cricket oranges Gitter · Around the Clock goldene Ringe.
Abzeichen nur Gold/Schwarz/Orange/Bronze, je Modus anders kombiniert (`MODE_STYLE` in `svg.js`); X01 bleibt rot.

- **Liquid Glass + flüssiges Gold** (seit 25.11.2026, Block „LIQUID GLASS“ am Ende von `screens.css`): Reiter-Leiste und Statistik-Pille aus klarem Glas (stark verwischt, Glanz oben, Lichtkante, warmes Licht von unten, unter dem aktiven Reiter farbiges Licht im Glas), Rand als Ring aus flüssigem Gold (`--gold-metal`, langsam fließend). Überschriften (`.label`), Doppel-Name, Average-Titel, Rekord-Titel in Metall-Gold (`--gold-metal-h`, Text-Clip). Karten mit Glasglanz oben + Lichtkante. VIP: Freundesliste, Suchfeld, Kacheln, Leer-Karten und Knöpfe als dickes Kristallglas (doppelte Kante, helle weiße Lichtkanten, prismatischer Rand `--prism` mit feinen Farbsäumen, Glanzlicht oben links, Lichtsaum unten), eigener Dart mit Lichtreflex wie hinter Glas. Gold soll wie geschmolzenes, spiegelndes Metall wirken (harte Hell/Dunkel-Wechsel), nicht flach.

- **Kristall · Silber · Bordeaux (seit 25.11.2026, ersetzt Gold · Silber · Orange und die gezeichnete Queen-Anmutung):** Alles Glasige in Chrom-Silber
  (`--gold-metal`/`--gold-metal-h`/`--prism` sind jetzt Chrom-Verläufe, `--gold` = Silber #cfd3d9, hell #f2f4f7), Akzent **Bordeaux** (`--red` #b3243f,
  dunkel #6b1226; Knöpfe als getöntes Bordeaux-Glas). Neutrale, kühle Grundtöne (Schwarz #08080a, Text #eef0f3), kein Orange, kein Gold.
  **Weniger gezeichnet, mehr glänzendes Kristall:** Filter `#rough`/`#rough-s`/`#ink` in `index.html` sind wirkungslos, keine Eck-Ornamente/Trenner,
  kein Papier/Kupferstich, Label-Linie als feine Lichtlinie. 501-Karte: Glas-Stern (`chromeStar`, `heroArt` in `svg.js`) auf tiefem Schwarz mit
  Chrom-Schlieren, Rand als Chrom-Ring. Start-Logo/Anmeldung (`crestLine`): nur kleiner Chrom-Stern + „DARTVADER“ clean (Systemschrift, dünn, weit gesperrt).
  Dartscheiben behalten Rot/Grün.
  Mehr Glitzer + Bordeaux (Nachtrag): 501-Karte mit Bordeaux-Nebel, Bordeaux-/Chrom-Schlieren, Bokeh-Lichtpunkten, aufblitzenden Funkel-Sternen (`.tw`),
  Glas-Stern rechts + kleiner Stern oben links, dunkle Mitte (die 501 bleibt lesbar, weiß mit Bordeaux-Glühen). Partyspiel-Kacheln als Bordeaux-Glas mit Chrom-Ring
  und Funkel-✦ (keine Pop-Art-Farben, kein Raster), Lichtstreif zieht ab und zu über Karte und Kacheln. Reiter-Leiste bordeaux getöntes Glas. Modus-Farben (`MODE_STYLE`) nur Bordeaux/Silber/Schwarz.
  Reiter-Leiste: neutrales Rauchglas mit dünnem Ring (1 px), an dem Licht entlangläuft, Helligkeit schwankt (`vipSpin`/`vipGlow`); Bordeaux nur im Strich unter dem aktiven Reiter und im Verlauf dahinter. Keine Gold-/Gelbtöne mehr
  (Lichtlinien, Glanz, Funkeln, Animationen: Silber/Weiß). Doppel-Heatmap und Liste: durchgehender Verlauf statt Stufen – schlecht dunkles Bordeaux → Rot → Rosé →
  glänzend Weiß = am besten (`ratioColor`/`ratingColor` in `board.js`, `ratio` = Quote / eigene Gesamtquote aus `doubleRating`, 0,4 → dunkel, 1,7 → weiß; ab 1,25 zusätzlicher Glanz).
  Statistik mit mehr Bordeaux: roter Nebel in großen Karten (Average, Rekorde) + Bordeaux-Innenlinie, rote Glut unter kleinen Karten, Kartentitel rosé, Ränge rot, Lichtlinie rot → weiß, Label-Linie startet rot.
  App-Hintergrund: fast schwarz (#0a0a0c), einfarbig, ohne Verläufe. Partyspiel-Kacheln: neutrales Rauchglas, kein roter Verlauf, kein Strich; Bordeaux taucht kurz als Glühen im Logo auf (je Kachel versetzt, `badgeRed`). Plus-Kachel bewusst anders: kein Glas, nur gestrichelter Rahmen, Plus als feiner Ring.
  Ganz selten flüssiges Gold (`--liquid-gold`, wie geschmolzenes Metall): auf der 501 fließt etwa alle 23 s kurz Gold über die Zahl (`goldPour`); die Lichtlinien der Karten laufen jede ~4. Runde golden statt rot (`glintGold`). Gold nie dauerhaft. Grundsatz: Bordeaux sparsam als Strich/Text/Schatten, nicht als Flächenverlauf. 501-Karte: alle ~5,5 s zieht ein rotes Licht schnell einmal um die 501 (`.hero-num::before`, `redOrbit`).
  Große Zahlen (Average, Doppelquote, Rekorde, `.pop`): gestaffelter Bordeaux-Schatten (mehrere Stufen hell → dunkel + weicher roter Schein).
  VIP lebendig (ersetzt „Backstage ohne Bewegung“ für die Glasfelder): Rand dunkel/ruhig, nur einzelne Lichtstriche (Verlauf 0 → 100 %) gleiten um Freundesliste und Kacheln,
  hin und her, mit eigenem Tempo je Feld (`--va`), Helligkeit schwankt (`--vg`) – nie alle gleich hell; dazu ein wandernder, auf- und abblendender silberner Lichtfleck im Hintergrund. Im VIP kein Rot in Lichtverläufen – Bordeaux nur in Texten (Überschriften rot, Ø-Zahlen mit rotem Schatten).
