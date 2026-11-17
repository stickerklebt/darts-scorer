# Darts Scorer – Architektur & Regeln

PWA für iPhone/iPad. Vanilla JS als ES-Module, kein Build-Step, keine Frameworks, keine CDNs.
Betrieb mit **nginx + systemd** (kein Docker): Node-Server in `server/` (nur 127.0.0.1:8080) liefert die App aus und speichert
Konten, Spieldaten und Freundschaften in SQLite (`node:sqlite`, `/var/lib/darts`). nginx (Port 80, ohne TLS) davor; HTTPS macht
ein weiterer Reverse Proxy, dessen X-Forwarded-Proto/-For/-Host durchgereicht werden. Keine npm-Abhängigkeiten.
Konfiguration: nur `PORT` und `DATA_DIR` per Umgebung (setzt `darts.service`), alles andere fest in `config.js`.
Das Gerät hält alles weiter in `localStorage` (offline spielbar), `js/sync.js` gleicht mit dem Konto ab.
GitHub Pages reicht nicht mehr (kein Server → keine Anmeldung). Betrieb/Backup: `README.md`.

## Regeln für die Arbeit
- Kein Build-Tool, keine externen Libraries. Diagramme, Ornamente, Wappen, Dartscheiben, Animationen: eigene SVG/CSS/Canvas im Code. Keine Sounds.
- Schriften lokal als `.woff2` (nur OFL): **League Gothic** (Zahlen, Beschriftungen, Knöpfe – schmale Holzlettern),
  **IM Fell English SC** (Überschriften, Bleisatz-Versalien), **IM Fell English** (Fließtext). IM Fell hat Mediävalziffern –
  deshalb kommen Ziffern in `--f-display`/`--f-text` per `unicode-range` aus League Gothic („Fell Digits“ in `tokens.css`).
  Nur ein Schnitt je Schrift, `font-synthesis: none` (kein künstliches Fett).
- Design: **Queen-Look** – heraldisch, Gold/Creme auf Schwarz, Ornamente (Eck-Ornamente, Lorbeer, Sterne, Strahlenkranz),
  Pop-Art-Farbblöcke mit Raster, Comic-Momente, Kupferstich-Plakate (Rekorde, Regeln, Heatmap). Nur Stilmittel:
  **keine** Cover-Motive, kein Queen-Wappen, keine Band-Logos/-Namen. **Hintergründe schlicht** (keine Körnung, kein Rauschen,
  keine Muster) – Details gehören auf die Elemente. Die alten Stein-Texturvariablen (`--tex-grain/stone/cracks`) sind `none`.
- **Handgemacht statt perfekt** (Block „HANDGEMACHT“ am Ende von `screens.css`): SVG-Filter in `index.html` – `#rough` (Linien
  wackeln wie mit der Feder), `#rough-s` (Plakatkarten, leicht gedruckt), `#ink` (Bleisatz-Kanten an großen Zahlen/Titeln).
  Ornamente in `svg.js` von Hand: Lorbeerblätter ungleich mit Ader, Sterne leicht schief (`starPath(…, wob)`), Schnörkel in
  Ecken und Trennern, Schraffur im Wappen. Gealtertes Papier (`--paper-age`) nur auf Cremekarten, handgezogene Linien
  (`--hand-line`) bei Labels, kleine Schieflagen, leicht versetzter Pop-Art-Druck. Ecken etwas runder (`--r-btn` 6, `--r-panel` 10).
  Im Spiel nur zurückhaltend (Innenrahmen der aktiven Karte), damit Zahlen klar lesbar bleiben.
- **Lichtlinie** (`fuse()` in `svg.js`, `.fuse` in `base.css`): ein heller Schein gleitet sehr langsam die Goldrahmen-Linie
  entlang und läuft nach hinten weich aus (6 übereinanderliegende Striche, SVG-`<animate>`) –
  Hero-Karte, Start-Button im Setup, Rekord-Karten, Overall-Average, Sieger-Screen. **Im laufenden Spiel kein Leuchten.**
- **Rendering ohne Flackern:** `render()` setzt nicht mehr `innerHTML`, sondern gleicht den Bildschirm per `morph()` an
  (nur geänderte Texte/Attribute/Kinder). Elemente bleiben stehen, Einblend-Animationen starten nicht bei jedem Neuzeichnen neu.
- Bei jeder Dateiänderung: `CACHE` in `sw.js` hochzählen, neue Dateien in `ASSETS` aufnehmen.
- Logik-Tests: `node tests/run.mjs` (ohne Abhängigkeiten). Vor jedem Commit grün. Neue Logik bekommt eigene Tests.
- App-Icon: Wappen aus `js/ui/svg.js` → `node tools/mkicon.mjs icon.svg` (bettet IM Fell ein, Federfilter), dann `qlmanage -t -s 1024 icon.svg`
  und mit `sips -Z 512/180` zu `icon-512.png` / `icon-180.png` verkleinern.
- Service Worker nur unter HTTPS (nicht auf localhost), damit lokale Tests frische Dateien sehen. `/api/` wird nie gecacht.
- **Server-Regeln:** keine npm-Pakete. Neue Endpunkte in `server/src/routes/`, Eingaben in `validate.js` prüfen, Fehler als
  `HttpError` mit deutscher Meldung. Schema-Änderungen nur als neuer Eintrag am Ende von `MIGRATIONS` in `db.js`.
  Statische Dateien nur über die Allowlist in `static.js` (neue Ordner dort eintragen). Content-Security-Policy erlaubt
  kein Inline-Skript (`script-src 'self'`) – Skripte immer als Datei. Server-Tests: `tests/server.test.mjs` (startet die App auf freiem Port).
- Lokal mit Server: `Darts starten.command` (Node, Daten in `.data/`) oder Vorschau „darts-server“ (Port 8787, `.data/dev`).
- **Nicht als Datei öffnen:** Firefox/Chrome laden ES-Module nicht über `file://` (sonst schwarzer Bildschirm). `js/filehint.js`
  zeigt dann nach 1,5 s einen Hinweis. Lokal starten: `Darts starten.command` (Doppelklick, Node-Server auf 127.0.0.1,
  Port ab 8000, öffnet den Browser).
- Statistik wird **immer aus gespeicherten Matches berechnet**, nie als Zähler mitgeführt. Keine Statistik/Funktion entfernen.
- Animationen in der Konsole prüfen: `(await import('/js/ui/fx.js')).fxPlay('trophy', {score:180, name:'Test'})`,
  `__fxFreeze()` hält das Bild an (Seite im Hintergrund: Animationen per `document.getAnimations()` auf eine Zeit setzen).

## Dateistruktur
```
index.html              Gerüst, lädt css/, js/main.js (type="module") und js/filehint.js
deploy/  nginx.conf · darts.service · install.sh (einmalig) · update.sh · start.sh · stop.sh · logs.sh · backup.sh; README.md (Betrieb)
server/src/             server.js · app.js · config.js · db.js · sessions.js · passwords.js · ratelimit.js · static.js ·
                        validate.js · friend-stats.js · backup.js · routes/ (auth, account, sync, friends)
css/
  tokens.css            Farben, Schriften, Muster (Raster, Gold-Schraffur, Kupferstich, Papier, Handlinie)
  base.css              Reset, Typo, Buttons, Tabs, Dialoge
  screens.css           Screens (Play, Setup, Spiel, Ausbullen, Leg-Info, Ergebnis, Statistik, Vergleich, Bots)
  fx.css                Vollbild-Animationen
fonts/                  league-gothic.woff2, fell-sc.woff2, fell.woff2, fell-i.woff2, OFL-*.txt
bots/                   Optionale Bot-Bilder + bilder.json (Liste) + README.md
js/
  main.js               Boot, Rendering, Aktionen, Match-Ablauf, Ausbullen-Steuerung, Bot-Steuerung, Sprüche, Undo
  store.js              Laden/Speichern (Key `darts.v3`), Profile, Prefs, UI-Zustand, SYNC_KEYS, Save-Hook
  api.js                fetch-Wrapper zum Server (ApiError, deutsche Meldungen)
  sync.js               Konto (auth), Login/Logout, Delta-Sync mit dem Server (Meta in `darts.sync`)
  match.js              Match-Objekt, Werfer-Reihenfolge
  checkout.js           Feste Checkout-Tabelle (1/2/3 Darts), Setup-Würfe, Doppelversuch, Summen-Eingabe fertig?
  x01.js                X01-Engine (Legs/Sets, Summe/Einzeldart, Undo, Matchstatistik)
  party.js              Highscore, Shanghai, Halbieren, Around the Clock
  cricket.js            Cricket: 20–15 + Bull, Treffer/Punkte, Sieg, Rundenlimit, Undo pro Dart, Bot-Ziel
  bulloff.js            Echte Scheibengeometrie (mm), Feld an Position, Ausbullen-Logik
  fx.js                 Welche Animation zu welchem Wurf (Töpfe, Zufall ohne Wiederholung)
  bots.js               Bots: Name, Farbe, Ziel-Average, Streuung (sigma, dsigma), Sprüche  ← zum Selbst-Ändern
  botsim.js             Bot-Wurfmodell: zielen + 2D-Normalstreuung, X01 und Partyspiele
  stats.js              Kennzahlen, Heatmap-Daten, relative Doppel-Bewertung (Stufen + Top 3), Schnellwahl (quickScores)
  history.js            Spielhistorie: Zeilen aller Spiele (historyRows, resultText), Spiel löschen (deleteMatch)
  demo.js               Testdaten-Generator (fester Seed, demo: true), einmalig einfügen / gezielt entfernen
  games.js              Spielmodi (Titel, Regeln)
  ui/ svg.js · board.js (Eingabe-, Heatmap- und Echt-Scheibe) · charts.js · play.js · setup.js · game.js ·
      bulloff-view.js · moments.js (Leg-Info) · result.js · stats-view.js (Unter-Reiter) · stats-extra.js ·
      compare.js · sheets.js · auth.js (Anmeldung) · friends.js (Reiter Freunde, Freundesprofil) · history.js (Spielhistorie) · aimboard.js (Eingabe-Scheibe mit Lupe) · avatar.js (Bot-Bilder/Platzhalter) · common.js ·
      fx.js · fx-core.js (Ebene, Partikel, Wackeln) · fx-anims.js (17 Animationen) · fx-art.js (Comic-SVGs)
sw.js, manifest.webmanifest, icon-180.png, icon-512.png, Darts starten.command (lokaler Start per Doppelklick)
tools/  mkicon.mjs (Icon), calibrate-bots.mjs (sigma + dsigma per Simulation)
tests/  run.mjs + checkout · x01 · party · stats · bulloff · fx · bots · demo · cricket · server · history · aimboard
```

## Datenmodell (`localStorage['darts.v3']`)
```js
{
  version: 3, mainId, profiles: [{ id, name, createdAt, demo? }], // nur Menschen; Bots stehen in js/bots.js
  matches: [Match], current: Match | null,
  lineup: [{ id, team }],                                     // id = Profil- oder Bot-id ('sensei-wu' …)
  teamMode, anwurf: 'list' | 'bull', demoSeeded,              // demoSeeded: Testdaten wurden schon einmal eingefügt
  opts: { x01: { start, out, mode, target }, highscore: { rounds }, shanghai: { rounds }, halveit: {}, atc: { bull } },
  prefs: { voice: false, hints: true, dartInput: 'board' | 'keys', anim: true },   // aimV: einmal auf 'board' umgestellt
  screen, tab, statsPid, statsPeriod, statsSub, cmpA, cmpB, game,
}
Match = { id, game, opts, demo?, first, startedAt, endedAt?, done, winners?, sides: [[id…]], playerIds, legs | turns, pending,
          bull?: { contenders, throws: [{ s, x, y }], rounds: [{ throws, group, winner }], winner, done } }  // x,y in mm
Leg  = { set, starter, winner?, turns: [Turn] }
Turn = { s, pid, startRem, input: 'sum' | 'darts', score, darts, bust?, out?, throws?: [{ n, m, before, target }] }
Cricket-Turn = { s, pid, v (Punkte), marks (Treffer), throws: [{ n, m }] }   // Match.pending = laufende Darts
Party-Turn = { s, pid, v, throws? }   // throws nur bei Bots: [{ n, m, before: null, target: null }]
```
- Einzeldart-Eingabe für Menschen ab Rest ≤ 170. **Bots werfen immer Dart für Dart** (`throwDart(m, n, mult, { any: true })`).
- Doppelversuch (Double Out): Dart mit `before` gerade 2–40 oder 50.
- Teams: Werfer = `side[(Aufnahmen der Seite im Match) % Teamgröße]`. Ausbullen wirft der Erste der Teamliste.

## Server-Datenmodell (SQLite `/var/lib/darts/darts.db`)
`users` (id, email klein, username, username_key klein + UNIQUE, pw_hash scrypt) · `sessions` (token_hash SHA-256, Ablauf) ·
`user_state` (rev, state = JSON der SYNC_KEYS, state_rev) · `matches` (user_id, id, rev, deleted = Grabstein, data JSON) ·
`friendships` (requester_id, addressee_id, status pending|accepted).
Sync: Gerät schickt `{ since, upsert, remove, state? }`, bekommt Änderungen anderer Geräte seit `since`. Zustand nur bei
bekanntem Stand übernommen, sonst `stateConflict` → Gerät führt zusammen (Server-Basis + eigene Spieler). Laufendes Match
(`current`) und UI-Zustand bleiben lokal.

## Regeln der neuen Funktionen
- **Anmeldung** beim Start (`ui/auth.js`): E-Mail → Konto vorhanden? Passwort : Passwort festlegen (2×, mind. 8) + eindeutiger
  Name (3–20, Buchstaben/Ziffern/_.-, Groß/Klein egal eindeutig, Bot-Namen reserviert, Live-Prüfung). Hauptspieler = Kontoname
  (`ensureMainProfile`), Umbenennen nur über den Server. Erste Anmeldung übernimmt vorhandene lokale Spiele ins Konto
  (hat das Konto schon einen Hauptspieler, werden die lokalen Matches auf dessen id umgeschrieben). Abmelden sichert erst
  und leert dann das Gerät. Einstellungen: Konto (Name, E-Mail, Sync-Stand), Passwort ändern, Abmelden, Konto löschen.
- **Eingabe-Scheibe** (`ui/aimboard.js`, Standard für Einzeldarts in X01 und Cricket; Tastatur in den Einstellungen wählbar):
  eigene Scheibe im App-Stil (warm-dunkle Felder, leicht getönte Grün-/Rot-Ringe, Golddrähte, breitere Ringe für Finger).
  Finger drauf → Feld unter dem Finger leuchtet gold; nach 140 ms halten (oder beim Ziehen) erscheint die Lupe über dem Finger
  mit Fadenkreuz und Feldname; loslassen setzt den Dart (außerhalb des Double-Rings = daneben, dazu Knopf „Daneben“).
  Über der Scheibe drei Treffer-Kacheln (1 · T20 60 …, nächster Dart „Jetzt“), getroffene Felder der laufenden Aufnahme
  leuchten mit Nummer an der Wurfstelle (`ui.aimPos`, nur flüchtig). Ausnahme vom „kein Leuchten im Spiel“: nur diese Treffer.
- **Spielhistorie** (Screen `history`, Knopf im Reiter Spielen neben Einstellungen und unter Statistik › Verlauf):
  alle fertigen Spiele aller Modi, neueste zuerst, nach Monat gruppiert, Filter Alle · X01 · Cricket · Party. Zeile: S/N/=
  aus Sicht des Hauptspielers, Modus, Gegner, Datum, Ergebnis, Ø bei X01. Antippen → Details (X01-Tabelle bzw. Platzierung)
  und „Spiel löschen“ (mit Bestätigung). Gelöscht wird aus `S.matches` → fehlt in jeder Statistik, Sync löscht es auf dem
  Server (Grabstein) → auch andere Geräte und Freundes-Statistik.
- **Freunde** (dritter Reiter): Suche nach Namensanfang, Anfrage → Annehmen/Ablehnen/Zurückziehen, gegenseitige Anfrage =
  sofort Freunde. Profil (Screen `friend`): 501-Kennzahlen des Hauptspielers, Formkurve der letzten 10, Spiele je Modus –
  vom Server aus den Matches berechnet (`friend-stats.js` → `js/stats.js`), keine Einzelmatches/Mitspielernamen.
  „Zusammen spielen“ ist als „Kommt bald“ angekündigt (noch nicht gebaut).
- **Aktiver Spieler**: Karte komplett in Spielerfarbe + großer Name, Rest abgedunkelt, Leuchtbalken oben (`.turnbar`), Wechsel ≤ 300 ms.
- **Setup**: ein Screen – Modus · Spieler & Bots · Startpunkte/Runden · First to · Anwurf · Start; „Mehr Optionen“ (Out, Legs/Sets, Mischen, Regeln).
  Hinzufügen nur über **ein Plus** → Auswahlfenster: Neuer Spieler (Name eindeutig gegenüber Profilen und Bots, Groß/Klein und
  Rand-Leerzeichen egal, Live-Hinweis am Feld) · Bekannter Spieler (alphabetisch, Suchfeld ab 6 Einträgen) · Bot als Gegner.
- **Summen-Eingabe ohne OK**: kann keine weitere Ziffer mehr eine mögliche Aufnahme ergeben (43 → 430+ gibt es nicht,
  19, 100, 0 …), wird nach 220 ms automatisch übernommen (`entryDone` in `checkout.js`). Unmögliche Eingaben (179) → Hinweis.
  Die Eingabe steht im Querformat groß und mittig im freien Bereich über der Tastatur.
- **Checkout-Weg** steht direkt unter dem Rest in der Karte des werfenden Spielers (`.sbp-co`), nicht mehr im Ticker.
- **Solo**: ein Mensch allein spielt ohne Gegner (Setup zeigt „Solo starten“), alle Modi.
- **Schnellwahl** über der Tastatur (X01-Summe, Highscore): erst ab 30 eigenen Summen-Aufnahmen (ohne Busts) des werfenden
  Spielers, dann seine 8 häufigsten Scores nach Wert sortiert; sonst ausgeblendet. Shanghai/Halbieren behalten ihre Vielfachen.
- **Ausbullen** (nur Matchbeginn, alle Modi, ab 2 Seiten): Finger halten → Lupe, loslassen setzt, dann Rückgängig/Bestätigen.
  Nächster am Mittelpunkt gewinnt; mehrere im Bull bzw. (ohne Bull) mehrere im 25er oder exakt gleich weit → nur diese nochmal.
- **Animationen** (`js/fx.js`):  26, 60 (4 s) · 100–120 Topf (4 s) · 121–179 Topf (5 s) · 180 Pokal (7 s) ·
  Finish 2–60 (2 s), 61–99 (4 s), 100–167 Atomrakete (5 s), 170 Big Fish (8 s, nur Checkout). Mehrere Phasen (Aufbau, Höhepunkt,
  Ausklang; letzter Ausklang über `--dur` in `fx.css`). Nur X01 + Highscore, keine Busts, keine für Bots (nur Andeutung in der Karte).
  Zufällig, nie zweimal dieselbe hintereinander. Antippen überspringt; nach Finish-Animation die Leg-/Set-Info. Abschaltbar (`prefs.anim`).
- **Bots** (klassisch, Ereignis-Sprüche): Sensei Wu Ø 46, Super Mario Ø 42, Shrek Ø 48.
  Stärke = zwei Streuungen: `sigma` (Scoring) und `dsigma` (nur auf Doppel → Checkout-Quote, Ø 40 ≈ 15 %, Ø 50 ≈ 19,5 %,
  Ø 100 ≈ 42 % pro Dart). Kalibriert mit `node tools/calibrate-bots.mjs`: **Ø pro Leg, gemittelt über viele Legs** = avg
  (so wie man ihn im Spiel sieht; der Schnitt über alle Darts liegt ~2,5 darunter). Averages 40/42/…/50 zufällig verteilt.
  Zielen T20, im Finish nach Checkout-Tabelle, im Partyspiel aufs jeweilige Ziel. 3 Darts ≈ 2 s. Mindestens ein Mensch pro Spiel.
  Bots nicht in Statistik/Profilwahl. Sprüche: max. 3 pro Spiel und Bot (Start · ein Moment · Ende).
  Undo nimmt die letzte menschliche Eingabe zurück, Bot-Würfe danach mit.
- **Bots mit Zufallssprüchen** (Feld `random` in `js/bots.js`): Jensn Huang Ø 50, Michael Jackson Ø 44 (`startLine` „Hee-hee!“),
  Phil Taylor Ø 100 (immer 100; Sprüche gewichtet 60/20/20, Wiederholung erlaubt), Dreimac Ø 40. `planLines()` lost zu Spielbeginn
  2 Sprüche und 2 eigene Aufnahmen (2.–8., nie die erste) aus; gesagt wird nach genau diesen Aufnahmen, unabhängig von Ereignissen.
  Keine Ereignis- oder End-Sprüche für diese Bots. Avatare sind gezeichnete SVGs (`art` → `ART` in `ui/avatar.js`).
  Bilder optional: Datei in `bots/` + Eintrag in `bots/bilder.json` (hat Vorrang vor dem gezeichneten Avatar).
- **Statistik**: Unter-Reiter Überblick · Scoring · Checkout · Doppel · Verlauf (nur 501). Doppelfarben relativ zur eigenen
  Gesamtquote: ≥1,5× grün · ≥1,15× hellgrün · ≥0,85× gold · ≥0,5× orange · darunter rot; unter 5 Versuchen neutral; Top 3 markiert.
  Gleiche Logik im Vergleich (jede Scheibe relativ zum eigenen Spieler).

- **Testdaten** (`js/demo.js`): ~60 × 501 über 90 Tage (Hauptspieler, „Test-Tim“, „Test-Ben“) + 5 Partyspiele, Würfe aus dem
  Wurfmodell (über 170 als Summe, darunter Einzeldarts), verschiedene Lieblingsdoppel. Einmalig beim Start (`S.demoSeeded`,
  bleibt auch nach „Alle Daten löschen“ gesetzt). „Testdaten entfernen“ in den Einstellungen löscht nur `demo: true`.

- **Einmaliger Daten-Neustart** (`S.cleanV`): beim ersten Start nach Update 4 wurden alle Matches und alle Spieler außer dem
  Hauptspieler gelöscht; keine Testdaten mehr. `demo.js` bleibt für spätere Tests erhalten.

- **Cricket** (`js/cricket.js`): 20, 19, 18, 17, 16, 15, Bull; 3 Treffer schließen (Double 2, Triple 3, 25 = 1, Bull = 2).
  „Mit Punkten“: Treffer auf eigene, beim Gegner offene Felder zählen Feldwert; Sieg = alles zu und nicht hinten.
  „Nur Schließen“: wer zuerst alles zu hat. Rundenlimit (15/20/25) → meiste Punkte, dann meiste Treffer. Eingabe Dart für Dart
  (Tastatur 20–15/25/Bull/Daneben oder Dartscheibe), Treffer-Tafel unter den Karten. Keine Animationen, nicht in der Statistik.
  Bots zielen auf die höchste offene Zahl bzw. punkten, wenn sie hinten liegen.

## Stand
Update 1 (Meilensteine 1–4), Update 2 (Setup, Ausbullen, Animationen, Bots, Statistik) und Update 3 (Queen-Look zurück,
Spieler-Plus, Schnellwahl, längere Animationen mit Pokal, Testdaten) und Update 4 (Daten-Neustart, langsame Lichtlinie,
vier neue Bots mit Zufallssprüchen) erledigt. Danach: Cricket, Eingabe ohne OK, Checkout unter dem Rest, Solo,
Bots neu kalibriert (Ø pro Leg + Doppelquote), Queen-Look mit neuen Schriften (League Gothic, IM Fell) und handgemachten Details,
Server mit Konto per E-Mail, Sync und Freunden mit Statistik (Betrieb über nginx + systemd), Stand 17.11.2026.
Offen: Zusammen spielen, Passwort vergessen / E-Mail-Bestätigung (braucht Mailversand).
