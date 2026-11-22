# Darts Scorer – Architektur & Regeln

PWA für iPhone/iPad. Vanilla JS als ES-Module, kein Build-Step, keine Frameworks, keine CDNs.
Betrieb mit **nginx + systemd** (kein Docker): Node-Server in `server/` (nur 127.0.0.1:8080) liefert die App aus und speichert
Konten, Spieldaten und Freundschaften in SQLite (`node:sqlite`, `/var/lib/darts`). nginx (Port 80, ohne TLS) davor; HTTPS macht
ein weiterer Reverse Proxy, dessen X-Forwarded-Proto/-For/-Host durchgereicht werden. Keine npm-Abhängigkeiten.
Konfiguration: nur `PORT` und `DATA_DIR` per Umgebung (setzt `darts.service`), alles andere fest in `config.js`.
Das Gerät hält alles weiter in `localStorage` (offline spielbar), `js/sync.js` gleicht mit dem Konto ab.
GitHub Pages reicht nicht mehr (kein Server → keine Anmeldung). Betrieb/Backup: `README.md`.

## Regeln für die Arbeit
- **Aussehen: `DESIGN.md` ist verbindlich** (Farben, Schrift-Rollen, Zahlen, Rahmen, Licht, Bausteine). Neue Elemente danach bauen,
  neue Regeln dort eintragen.
- Kein Build-Tool, keine externen Libraries. Diagramme, Ornamente, Wappen, Dartscheiben, Animationen: eigene SVG/CSS/Canvas im Code. Keine Sounds.
- Schriften lokal als `.woff2` (nur OFL): **League Gothic** (Zahlen, Beschriftungen, Knöpfe – schmale Holzlettern),
  **Cinzel** (Überschriften, Namen – römische Versalien, Queen-Plakat-Anmutung, nur der fette Schnitt), **IM Fell English** (Fließtext). IM Fell hat Mediävalziffern –
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
- **Licht & Bewegung** (außerhalb des Spiels): `.glint` = ein Lichtpunkt wandert sehr langsam am Rand entlang
  (CSS conic-gradient + `@property --ga`, Verzögerung `--gd` je Karte versetzt) – Statistik-Karten, Spielerkarte, Anmeldekarte,
  Statistik-Kopf. Karten erscheinen nacheinander (`--i`), roter Reiterstrich glimmt, große rote Knöpfe mit gelegentlichem Lichtstreif.
- **Zahlen:** League Gothic ist sehr schmal → große Zahlen außerhalb des Spiels werden mit `scaleX(var(--num-w))` (1,16)
  leicht verbreitert. Plakat-Stil `.pop` (rot versetzter Schatten + `#ink`) nur für ausgewählte Zahlen: Ø auf der
  Spielerkarte, Overall-Average, Rekord-Karten, Ø in der Freundesliste. Kleine Karten (`.kv-c`) mit Goldrand ringsum.
- **Rendering ohne Flackern:** `render()` setzt nicht mehr `innerHTML`, sondern gleicht den Bildschirm per `morph()` an
  (nur geänderte Texte/Attribute/Kinder). Elemente bleiben stehen, Einblend-Animationen starten nicht bei jedem Neuzeichnen neu.
- Bei jeder Dateiänderung: `CACHE` in `sw.js` hochzählen, neue Dateien in `ASSETS` aufnehmen.
- Logik-Tests: `node tests/run.mjs` (ohne Abhängigkeiten). Vor jedem Commit grün. Neue Logik bekommt eigene Tests.
- App-Icon: bewusst schlicht (Zielscheibe: Goldring, Rot, Schwarz, Creme, rotes Bull auf dunklem Grund) aus
  `tools/mkicon.mjs` → `node tools/mkicon.mjs icon.svg && qlmanage -t -s 1024 icon.svg`, dann mit `sips -Z 512/180`
  zu `icon-512.png` / `icon-180.png`. Das Wappen bleibt nur in der App (Splash, Anmeldung).
- Service Worker nur unter HTTPS (nicht auf localhost), damit lokale Tests frische Dateien sehen. `/api/` wird nie gecacht.
  Neue Version (`controllerchange`) → App lädt sich einmal selbst neu, aber nie mitten im laufenden Spiel; beim Zurückholen
  der App (`visibilitychange`) wird nach Updates gesucht.
- **Server-Regeln:** keine npm-Pakete. Neue Endpunkte in `server/src/routes/`, Eingaben in `validate.js` prüfen, Fehler als
  `HttpError` mit deutscher Meldung. Schema-Änderungen nur als neuer Eintrag am Ende von `MIGRATIONS` in `db.js`.
  Statische Dateien nur über die Allowlist in `static.js` (neue Ordner dort eintragen). Content-Security-Policy erlaubt
  kein Inline-Skript (`script-src 'self'`) – Skripte immer als Datei. Server-Tests: `tests/server.test.mjs` (startet die App auf freiem Port).
- **Logging** (`server/src/log.js`): eine JSON-Zeile pro Ereignis → systemd-Journal. Felder `t, level, msg` (snake_case),
  `rid` (Request-ID, von nginx/Proxy übernommen oder neu, steht auch im Header `X-Request-Id` und bei 500ern in der Fehlermeldung),
  `u` (Nutzer-id). In Routen immer `c.log` benutzen (hat rid + u). Stufen: `error` = Programmfehler/5xx, `warn` = 4xx,
  fehlgeschlagene Anmeldung, Rate-Limit, App-Fehler, langsame Anfragen (> 1,5 s); `info` = Ereignisse (login, user_registered,
  friend_*, call_*, sync mit Änderungen, Start/Stopp, Migrationen); `debug` (nicht ausgegeben) = Leer-Syncs. Statische Dateien
  nur bei Fehlern. **Nie** E-Mail, Passwort, Token/Cookie loggen; IPs nur gekürzt (`anonIp`). App-Fehler aus dem Browser
  meldet `js/errlog.js` an `POST /api/client-log` (max. 5 je Seitenaufruf, Server drosselt 20/min je IP).
- Lokal mit Server: `Darts starten.command` (Node, Daten in `.data/`) oder Vorschau „darts-server“ (Port 8787, `.data/dev`).
- **Nicht als Datei öffnen:** Firefox/Chrome laden ES-Module nicht über `file://` (sonst schwarzer Bildschirm). `js/filehint.js`
  zeigt dann nach 1,5 s einen Hinweis. Lokal starten: `Darts starten.command` (Doppelklick, Node-Server auf 127.0.0.1,
  Port ab 8000, öffnet den Browser).
- Statistik wird **immer aus gespeicherten Matches berechnet**, nie als Zähler mitgeführt. Keine Statistik/Funktion entfernen.
- Animationen in der Konsole prüfen: `(await import('/js/ui/fx.js')).fxPlay('trophy', {score:180, name:'Test'})`,
  `__fxFreeze()` hält das Bild an (Seite im Hintergrund: Animationen per `document.getAnimations()` auf eine Zeit setzen).

## Dateistruktur
```
index.html              Gerüst, lädt css/, js/errlog.js (Fehler melden), js/main.js (type="module") und js/filehint.js
deploy/  nginx.conf · darts.service · install.sh (einmalig) · update.sh · start.sh · stop.sh · logs.sh · backup.sh; README.md (Betrieb)
server/src/             server.js · app.js · config.js · db.js · sessions.js · passwords.js · ratelimit.js · static.js ·
                        validate.js · friend-stats.js · backup.js · log.js · routes/ (auth, account, sync, friends, games, caller, client-log)
css/
  tokens.css            Farben, Schriften, Muster (Raster, Gold-Schraffur, Kupferstich, Papier, Handlinie)
  base.css              Reset, Typo, Buttons, Tabs, Dialoge
  screens.css           Screens (Play, Setup, Spiel, Ausbullen, Leg-Info, Ergebnis, Statistik, Vergleich, Bots)
  fx.css                Vollbild-Animationen
fonts/                  league-gothic.woff2, cinzel.woff2, fell.woff2, fell-i.woff2, OFL-*.txt
bots/                   Optionale Bot-Bilder + bilder.json (Liste) + README.md
js/
  main.js               Boot, Rendering, Aktionen, Match-Ablauf, Ausbullen-Steuerung, Bot-Steuerung, Sprüche, Undo
  store.js              Laden/Speichern (Key `darts.v3`), Profile, Prefs, UI-Zustand, SYNC_KEYS, Save-Hook
  api.js                fetch-Wrapper zum Server (ApiError, deutsche Meldungen)
  caller.js             Eigener Caller: Aufnahme als Rohdaten über Web Audio (ScriptProcessor, eigener AudioContext mit Mikrofon-Abtastrate;
                        kein MediaRecorder – Safari „Decoding failed“) → WAV (mono 22 kHz, getrimmt, normalisiert), Server + IndexedDB
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
      compare.js · sheets.js · auth.js (Anmeldung) · friends.js (Reiter Freunde, Freundesprofil) · history.js (Spielhistorie) · aimboard.js (Eingabe-Scheibe mit Lupe) · caller.js (Screen Eigener Caller) · avatar.js (Bot-Bilder/Platzhalter) · common.js ·
      fx.js · fx-core.js (Ebene, Partikel, Wackeln) · fx-anims.js (17 Animationen) · fx-art.js (Comic-SVGs)
sw.js, manifest.webmanifest, icon-180.png, icon-512.png, Darts starten.command (lokaler Start per Doppelklick)
tools/  mkicon.mjs (Icon), calibrate-bots.mjs (sigma + dsigma per Simulation)
tests/  run.mjs + board-geometry · detect · trophies · bruch · checkout · x01 · party · stats · bulloff · fx · bots · demo · cricket · server · history · aimboard · caller
```

## Datenmodell (`localStorage['darts.v3']`)
```js
{
  version: 3, mainId, profiles: [{ id, name, createdAt, demo? }], // nur Menschen; Bots stehen in js/bots.js
  matches: [Match], current: Match | null,
  lineup: [{ id, team }],                                     // id = Profil- oder Bot-id ('sensei-wu' …)
  teamMode, anwurf: 'list' | 'bull', demoSeeded,              // demoSeeded: Testdaten wurden schon einmal eingefügt
  opts: { x01: { start, out, mode, target }, highscore: { rounds }, shanghai: { rounds }, halveit: {}, atc: { bull } },
  prefs: { voice: false, hints: true, dartInput: 'board' | 'keys', anim: true, ownCalls: true, showAvg: true },   // aimV: einmal auf 'board' umgestellt
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
`friendships` (requester_id, addressee_id, status pending|accepted) · `caller_clips` (user_id, score 0–180, WAV-Daten) ·
`games` (Online-Spiel: host_id, guest_id, status invited|active|done|declined|aborted, rev, data) · `match_confirms` (from_id, to_id, match_id, data).
Sync: Gerät schickt `{ since, upsert, remove, state? }`, bekommt Änderungen anderer Geräte seit `since`. Zustand nur bei
bekanntem Stand übernommen, sonst `stateConflict` → Gerät führt zusammen (Server-Basis + eigene Spieler). Laufendes Match
(`current`) und UI-Zustand bleiben lokal.

## Regeln der neuen Funktionen
- **Anmeldung** beim Start (`ui/auth.js`): E-Mail → Konto vorhanden? Passwort : Passwort festlegen (2×, mind. 8) + eindeutiger
  Name (3–20, Buchstaben/Ziffern/_.-, Groß/Klein egal eindeutig, Bot-Namen reserviert, Live-Prüfung). Hauptspieler = Kontoname
  (`ensureMainProfile`), Umbenennen nur über den Server. Erste Anmeldung übernimmt vorhandene lokale Spiele ins Konto
  (hat das Konto schon einen Hauptspieler, werden die lokalen Matches auf dessen id umgeschrieben). Abmelden sichert erst
  und leert dann das Gerät. Einstellungen: Konto (Name, E-Mail, Sync-Stand), Passwort ändern, Abmelden, Konto löschen.
- **Eigener Caller** (Backstage › Eigener Caller, Screen `caller`; nicht mehr in den Einstellungen): Zahl wählen (Beliebt + alle möglichen 0–180), aufnehmen
  (max. 5 s, Pegel + Zeit live), anhören, speichern/löschen. Wirft der **Hauptspieler** in X01 oder Highscore genau eine
  eingesprochene Zahl (kein Bust), spielt seine Aufnahme statt der Computerstimme (`prefs.ownCalls`, unabhängig von „Ansage“);
  weitere Computer-Ansagen warten, bis sie fertig ist. Ablage im Konto (`/api/calls`, PUT nur `audio/wav`, max. 400 KB, 200 Stück),
  Offline-Kopie in IndexedDB; Abmelden löscht die Kopie. Mikrofon braucht HTTPS (Permissions-Policy `microphone=(self)`).
- **Eingabe-Scheibe** (`ui/aimboard.js`, Standard für Einzeldarts in X01 und Cricket; Tastatur in den Einstellungen wählbar):
  eigene Scheibe im App-Stil (warm-dunkle Felder, leicht getönte Grün-/Rot-Ringe, Golddrähte, breitere Ringe für Finger).
  Finger drauf → Feld unter dem Finger leuchtet gold; nach 140 ms halten (oder beim Ziehen) erscheint die Lupe über dem Finger
  mit Fadenkreuz und Feldname; loslassen setzt den Dart (außerhalb des Double-Rings = daneben, dazu Knopf „Daneben“).
  Über der Scheibe drei Treffer-Kacheln (1 · T20 60 …, nächster Dart „Jetzt“), getroffene Felder der laufenden Aufnahme
  leuchten, an der Wurfstelle steckt ein kleiner Dartpfeil mit Nummer (`ui.aimPos`, nur flüchtig). Mauszeiger = Dartpfeil
  (Spitze = Treffpunkt). Lupe: runder „Glas“-Ausschnitt mit feinem Goldring, Dartpfeil statt Fadenkreuz, Feldname als Pille darunter. Ausnahme vom „kein Leuchten im Spiel“: nur diese Treffer.
- **Spielhistorie** (Screen `history`, Knopf im Reiter Spielen neben Einstellungen und unter Statistik › Verlauf):
  alle fertigen Spiele aller Modi, neueste zuerst, nach Monat gruppiert, Filter Alle · X01 · Cricket · Party. Zeile: S/N/=
  aus Sicht des Hauptspielers, Modus, Gegner, Datum, Ergebnis, Ø bei X01. Antippen → Details (X01-Tabelle bzw. Platzierung)
  und „Spiel löschen“ (mit Bestätigung). Gelöscht wird aus `S.matches` → fehlt in jeder Statistik, Sync löscht es auf dem
  Server (Grabstein) → auch andere Geräte und Freundes-Statistik.
- **Backstage** (dritter Reiter, Ticket-Symbol; interner Schlüssel `friends`): oben drei Kacheln Spielhistorie · Eigener Caller ·
  Einstellungen, darunter die Freunde. Der Reiter „Spielen“ hat keine Knöpfe für Historie/Einstellungen mehr.
- **Spieler-Banner** (`ui/banner.js`, `playerBanner`): im Backstage und oben im Freundesprofil. Kein Hintergrund, nur das Band
  von links bis rechts (Schwalbenschwanz-Enden): schwarz mit Flammen-Rand, Name groß in Karminrot, Ø 501 in Gold direkt daneben,
  darunter 3 Abzeichen mit grünen Ranken. Stil eines heraldischen Plakats – **kein** Queen-Wappen/-Logo nachbauen.
- **Trophäen** (`js/trophies.js`, aus den Matches berechnet, läuft auch auf dem Server): Katalog `TROPHIES` (Scoring, Finishes,
  Legs, Einzeldart, Laufbahn, Bots), Stufen bronze · silver · gold · royal (Königsrot) · legendary (nur 9-Darter).
  Alle haben vorerst dasselbe Pokal-Wappen (`trophyBadge`), Farbe = erreichte Stufe, nicht erreicht = ausgegraut.
  Eigenes Banner: Abzeichen antippen → darunter Auswahl aller Trophäen; nur erreichte wählbar, keine doppelt.
  Wahl in `prefs.badges` (synchronisiert); Freunde sehen sie über `friend-stats.js` (`badges`). Doppelquote im Match erst ab
  3 Versuchen; Robin Hood = zwei eigene Darts beim Ausbullen unter 2 mm auseinander.
- **Freunde** (im Backstage): Suche nach Namensanfang, Anfrage → Annehmen/Ablehnen/Zurückziehen, gegenseitige Anfrage =
  sofort Freunde. Profil (Screen `friend`): 501-Kennzahlen des Hauptspielers, Formkurve der letzten 10, Spiele je Modus –
  vom Server aus den Matches berechnet (`friend-stats.js` → `js/stats.js`), keine Einzelmatches/Mitspielernamen.
- **Gegen Freunde spielen** (`js/online.js`, `ui/versus.js`, Server `routes/games.js`): Setup › Plus › Freunde › Freund wählen ›
  „Spielt auf meinem Gerät mit“ oder „Spielt auf seinem Gerät mit“. Aufstellungs-Eintrag `{ id: pid des Freundes (sein mainId),
  name, friend: { uid, mode: 'local' | 'remote' }, banner }`; Match bekommt `names`, `friends`, `banners` (Namen ohne eigenes Profil
  über `nameOf` → `m.names`). Jedes Spiel mit Gegner (Freund, Gast, Bot) startet mit dem VS-Intro: eigenes Banner rot,
  Gegner-Banner weiß (`variant: 'white'`); Bots mit Bild auf dem Band, ihrem Ø und drei festen Pokalen (`badges` in `js/bots.js`), Gäste ohne Ø (`addBanners` in `main.js`).
  · **Online** (`remote`): nur du gegen einen Freund, Anwurf ausgelost, kein Ausbullen. Einladung (`POST /api/games`, gilt 10 min)
  → beim Freund Fenster + Liste im Backstage → Annehmen. Laufendes Match steht in `games` (rev): wer dran ist, gibt ein und schickt
  den Stand (`PUT`, falscher rev → 409 mit aktuellem Stand), das andere Gerät fragt alle 1,2 s (`GET …?rev=`, nicht protokolliert).
  Eingabe/Undo nur für den, der dran ist bzw. die eigene letzte Eingabe (Knopf „Meine letzte Aufnahme zurücknehmen“ im Warte-Feld,
  solange der Freund noch keinen Dart eingegeben hat); Abbrechen beendet es für beide; keine Revanche-Taste.
  Am Ende speichert jedes Gerät das Match im eigenen Konto. `S.current.online = { gid, role, rev, status, other }`.
  · **Auf meinem Gerät** (`local`): am Ende geht das Match an den Freund (`POST /api/confirms`, offline über `S.outbox`).
  Er sieht es im Backstage ganz unten „Hast du diese Spiele gespielt?“ → ✓ übernimmt es in sein Konto (zählt dann in seiner
  Statistik), ✕ verwirft es. So kann niemand fremde Averages verderben.
- **Aktiver Spieler**: Karte komplett in Spielerfarbe + großer Name, Rest abgedunkelt, Leuchtbalken oben (`.turnbar`), Wechsel ≤ 300 ms.
  **Bot am Zug** (`.game.botturn`): keine Vollfarbe – Karte bleibt dunkel und glimmt nur leicht in seiner Farbe (Rand + Schein),
  Leuchtbalken neutral. Statt der Tastatur steht dann groß die Scheibe mit seinen Darts
  (Feldname neben jedem Dart) und darunter nur „Letzte eigene Eingabe zurück“; der Bereich behält die Höhe der eigenen Tastatur
  (`ui.padH`), damit oben nichts springt. Auf dem Handy keine kleine Scheibe in der Bot-Karte.
- **Average im Spiel ausblendbar** (`prefs.showAvg`, Zahnrad im Spiel bzw. Einstellungen): blendet die Ø-Angaben in den Karten und beim Bot aus.
  Ebenso „Darts im Leg anzeigen“ (`prefs.showDarts`, X01): blendet die Darts-Zahl des laufenden Legs in den Karten aus.
- **Setup**: ein Screen ohne Kopfkarte – 1 Spieler & Bots · 2 Spiel (First to … bzw. Runden/Ziele) · 3 Anwurf (nur ab zwei Seiten,
  bei Solo ausgeblendet) · Start. „Mehr Optionen“ (aufklappbar, zeigt eingeklappt eine Zusammenfassung wie „501 · Double Out“):
  Jeder für sich/Teams, Startpunkte 301/501/701, Check-Out, Legs/Sets, Reihenfolge mischen, Spielregeln.
  Hinzufügen nur über **ein Plus** → Auswahlfenster: Freunde · Gast · Bot (Freunde zuerst). **Gast** = Name für genau dieses Spiel (kein Profil,
  keine Statistik, `{ id: 'g_…', name, guest: true }`, Name eindeutig gegenüber Profilen, Bots und Aufstellung, Live-Hinweis);
  beim Start landet der Name in `m.names` und der Gast fliegt aus der Aufstellung – nächstes Spiel neu eingeben.
- **Summen-Eingabe ohne OK**: kann keine weitere Ziffer mehr eine mögliche Aufnahme ergeben (43 → 430+ gibt es nicht,
  19, 100, 0 …), wird nach 220 ms automatisch übernommen (`entryDone` in `checkout.js`). Unmögliche Eingaben (179) → Hinweis.
  Die Eingabe steht im Querformat groß und mittig im freien Bereich über der Tastatur.
- **Checkout-Weg** steht direkt unter dem Rest in der Karte des werfenden Spielers (`.sbp-co`), nicht mehr im Ticker.
- **Solo**: ein Mensch allein spielt ohne Gegner (Setup zeigt „Solo starten“), alle Modi. Solo = **Training**: zählt weder als
  Sieg noch als Niederlage (Siege, Siegquote, Serie nur aus Spielen mit Gegner); Historie/Matchliste/Form zeigen „T“ bzw. „Training“.
- **Schnellwahl** über der Tastatur (X01-Summe, Highscore): gezählt werden nur die **letzten 50** eigenen Summen-Aufnahmen
  (ohne Busts, X01 nur außerhalb des Checkout-Bereichs = Rest vor der Aufnahme > 170); ab 30 davon die 8 häufigsten nach Wert,
  sonst ausgeblendet. Antippen zeigt die Zahl erst ~0,4 s groß im Eingabefeld (Kontrolle), dann wird sie übernommen.
  Shanghai/Halbieren behalten ihre Vielfachen.
- **Kamera-Erkennung** (Anleitung für Nutzer: `KAMERA-ANLEITUNG.md`). Rollen: **Kamera-Gerät** (filmt, erkennt, schickt Würfe) und
  **Steuer-Gerät** (Scoreboard, Spiellogik, Korrektur); dazu **Ein-Geräte-Modus**. Dateien: `camera.js` (Start, Kamerawahl, Wake Lock),
  `calibration.js` (Assistent: Platzierung · 4 Punkte mit Lupe/verschiebbar · Overlay + Draufsicht · Testdart; `localStorage['darts.calib']`
  mit 32×18-Referenzbild), `homography.js` (eigene 4-Punkt-DLT), `board-geometry.js` (`scoreFromBoardMM`, Drahtabstand),
  `detect-core.js` (reine Bildverarbeitung: Blur, Differenz, Morphologie, Konturen, PCA-Achse, Spitze = schmales Ende, Takeout,
  Verrutscht, Konfidenz) im Worker `detector-worker.js`, `detector.js` (Ausschnitt ≤ 800 px, 12 fps, Snapshot-JPEG 320 px),
  `camera-link.js` + Server `routes/camlink.js` (**statt PeerJS**: 6-stelliger Code, Nachrichten über den eigenen Server, Abfrage
  ~0,5 s, Neuverbinden alle 3 s; `?join=CODE` verbindet direkt), `ui/camstation.js` (Kamera-Station/Ein-Geräte-Fenster).
  Keine CDN-Bibliotheken (CSP `script-src 'self'`): kein OpenCV.js, kein PeerJS, kein QR-Code – stattdessen Code + „Link teilen“.
  Im Spiel (`camBar` in `ui/game.js`, Logik `camAdd/commitCam` in `main.js`): 3 Slots, Mini-Board, Konfidenz < 0,7 gelb,
  Korrektur-Fenster (`camFix`), Miss / 0, Aufnahme beenden, Darts gezogen; nach 3 Darts 2 s Countdown (`prefs.camAuto`), dann Dart für
  Dart in die Engine. Setup-Schalter „Mit Kamera-Erkennung spielen“ (`prefs.camPlay`, nur X01/Cricket). Bots/fremder Zug: ignoriert.
- **Bruchchallenge** (`js/bruch.js`, `ui/bruch.js`, Screen `bruch`): Level wählen (Leicht · Mittel · Schwer · Extrem) → 3 zufällige
  von 100 Herausforderungen (25 je Level, selbst geschrieben, selbst prüfbar), Countdown 1 Stunde. Abhaken mit ✓; alle drei = Sieg.
  „Abbrechen“ verwirft sie ohne Spur. Ende (alle geschafft, Zeit um, Aufgeben) → als Match `game: 'bruch'` in `S.matches` (Historie „Party“, Sync, nicht in 501-Statistik).
  Laufende Challenge in `S.bruch` (nur lokal).
- **Partyspiele:** wählbar sind nur noch **Cricket** und die Bruchchallenge. Highscore, Shanghai, Halbieren, Around the Clock sind `retired` in `games.js`
  (nicht mehr im Menü, Engines bleiben für alte Spiele in Historie/Statistik).
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
- **Statistik**: Überblick-Karte „Lieblingsdoppel“ = Doppel mit der besten Quote (statt Bester Average). Drei Unter-Reiter Überblick · Doppel · Verlauf & mehr (nur 501). Aktiver Reiter groß im Vordergrund, die anderen
  treten zurück (kleiner, blasser), roter Strich gleitet mit. „Verlauf & mehr“: zuerst die Verlaufsdiagramme, darunter
  eingeklappt (mit Kurzinfo im Kopf) Scoring · Checkout · Legs · Matches (`ui.statsOpen`). Zeitraum: Standard immer „Gesamt“
  (beim Öffnen des Reiters und beim Start zurückgesetzt), ändern nur über den Uhr-Knopf im Kopf → Auswahlfenster; ein anderer
  Zeitraum erscheint als Chip mit ✕ (zurück auf Gesamt). Alte Werte `scoring/checkout/history` von `statsSub` → „Verlauf & mehr“. Doppelfarben relativ zur eigenen
  Gesamtquote: ≥1,5× grün · ≥1,15× hellgrün · ≥0,85× gold · ≥0,5× orange · darunter rot; unter 5 Versuchen neutral.
  Heatmap-Scheibe im Stil der Eingabe-Scheibe; die 3 besten Doppel mit Gold-/Silber-/Bronze-Rand (glimmend), in der Liste
  als Medaillen-Ring. Liste: „Beste zuerst“ (Standard, erst ab 5 Versuchen) oder „Nach Zahl“. Farblegende klein am Ende.
  Verlaufsdiagramme: y-Achse passt sich den Werten an (`axisRange` in `ui/charts.js`), Quoten nie über 100 %.
  Gleiche Logik im Vergleich (jede Scheibe relativ zum eigenen Spieler).
  Doppel antippen (Scheibe oder Liste) → Fenster mit Trefferquote und den 5 häufigsten Fehlwürfen auf dieses Doppel
  in % aller Versuche, „0“ = daneben, Busts zählen mit (`doubleAttempts().outcomes`, `doubleMisses` in `stats.js`).
  Punkte im Verlaufsdiagramm antippen → Match-Detail (wie Rekord-Karten). Unter-Reiter ohne Unschärfe/Skalierung (nur Schriftgröße).

- **Testdaten** (`js/demo.js`): ~60 × 501 über 90 Tage (Hauptspieler, „Test-Tim“, „Test-Ben“) + 5 Partyspiele, Würfe aus dem
  Wurfmodell (über 170 als Summe, darunter Einzeldarts), verschiedene Lieblingsdoppel. Einmalig beim Start (`S.demoSeeded`,
  bleibt auch nach „Alle Daten löschen“ gesetzt). „Testdaten entfernen“ in den Einstellungen löscht nur `demo: true`.

- **Nur noch der Hauptspieler als Profil** (`dropExtraProfiles` in `sync.js`, bei jedem `ensureMainProfile`): alte Zweitspieler/Gäste
  früherer Versionen werden entfernt (auch wenn ein altes Gerät sie per Sync zurückbringt), ihr Name bleibt in `m.names` der Matches.
  Statistik/Vergleich gibt es damit nur für den Hauptspieler.
- **Einmaliger Daten-Neustart** (`S.cleanV`): beim ersten Start nach Update 4 wurden alle Matches und alle Spieler außer dem
  Hauptspieler gelöscht; keine Testdaten mehr. `demo.js` bleibt für spätere Tests erhalten.

- **Cricket** (`js/cricket.js`): 20, 19, 18, 17, 16, 15, Bull; 3 Treffer schließen (Double 2, Triple 3, 25 = 1, Bull = 2).
  „Mit Punkten“: Treffer auf eigene, beim Gegner offene Felder zählen Feldwert; Sieg = alles zu und nicht hinten.
  „Nur Schließen“: wer zuerst alles zu hat. Rundenlimit (15/20/25) → meiste Punkte, dann meiste Treffer.
  **Die Tafel ist die Eingabe** (`ckBoard` in `ui/game.js`): Mitte die Zahlen 20–15 als Knöpfe Single · Double · Triple
  (kleine Ringe um die Zahl: 1 = Single, 2 = Double, 3 = Triple), Bull als 25 (1 Ring) · Bull (2 Ringe); links/rechts die Treffer der Spieler (gerade Seiten links, ungerade rechts):
  1 = Schrägstrich, 2 = X, 3 = X im Kreis. Haben alle ein Feld zu, wird die Zeile durchgestrichen und gesperrt.
  Leiste darüber: 3 Dart-Felder, Rückgängig, Daneben. Keine Dartscheiben-Eingabe. Bot am Zug: Tafel bleibt (gesperrt), nur eine winzige
  Scheibe neben seinem Namen in der Karte. Keine Animationen, nicht in der Statistik.
  Bots zielen auf die höchste offene Zahl bzw. punkten, wenn sie hinten liegen.

## Stand
Update 1 (Meilensteine 1–4), Update 2 (Setup, Ausbullen, Animationen, Bots, Statistik) und Update 3 (Queen-Look zurück,
Spieler-Plus, Schnellwahl, längere Animationen mit Pokal, Testdaten) und Update 4 (Daten-Neustart, langsame Lichtlinie,
vier neue Bots mit Zufallssprüchen) erledigt. Danach: Cricket, Eingabe ohne OK, Checkout unter dem Rest, Solo,
Bots neu kalibriert (Ø pro Leg + Doppelquote), Queen-Look mit neuen Schriften (League Gothic, IM Fell) und handgemachten Details,
Server mit Konto per E-Mail, Sync und Freunden mit Statistik (Betrieb über nginx + systemd), Stand 17.11.2026.
Danach: Trophäen, Spieler-Banner, gegen Freunde spielen (online und auf einem Gerät mit Bestätigung).
Offen: Passwort vergessen / E-Mail-Bestätigung (braucht Mailversand).
