# Darts Scorer

PWA zum Darts-Zählen (iPhone/iPad) mit Konto, Datensync und Freunden. Ein kleiner Node-Server liefert die App aus
und speichert die Daten aller Nutzer in SQLite. Keine npm-Abhängigkeiten.

## Betrieb im Container

```bash
cp .env.example .env          # optional anpassen
docker compose up -d --build  # → http://<rechner>:8080
```

Mit eigener Domain und automatischem HTTPS (empfohlen – nur mit HTTPS funktionieren Offline-Modus und „Zum Home-Bildschirm“ auf dem iPhone richtig):

```bash
# in .env: DOMAIN=darts.example.de und TRUST_PROXY=true
docker compose --profile https up -d --build
```

| Was | Wo |
|---|---|
| Daten (Nutzer, Spiele, Freunde) | Volume `darts-data` → `/data/darts.db` im Container |
| Logs (JSON-Zeilen) | `docker compose logs -f app` |
| Gesundheit | `GET /healthz` (auch Docker-Healthcheck) |
| Backup | `docker compose exec app node --disable-warning=ExperimentalWarning server/src/backup.js` → `/data/backups/` (die letzten 14) |
| Backup auf den Host holen | `docker compose cp app:/data/backups ./deploy/backups` |
| Update | `git pull && docker compose up -d --build` (Daten bleiben im Volume, Schema migriert automatisch) |

## Lokal ohne Container

`Darts starten.command` doppelklicken (braucht Node ≥ 22.13) – oder:

```bash
cd server && npm run dev      # http://localhost:8787, Daten in .data/
```

Tests: `node tests/run.mjs`

## Aufbau

```
server/src/
  server.js        Start, sauberes Beenden (SIGTERM), Aufräumen abgelaufener Sitzungen
  app.js           Sicherheits-Header (CSP …), Herkunftsprüfung, Routing, Fehler, Request-Log
  config.js        alle Einstellungen aus Umgebungsvariablen (.env.example)
  db.js            SQLite (node:sqlite), WAL, Migrationen über PRAGMA user_version
  sessions.js      HttpOnly-Cookie, Token nur als SHA-256 in der DB, gleitende Laufzeit
  passwords.js     scrypt-Hashes
  ratelimit.js     Schutz vor Durchprobieren (Anmeldung, Suche, Sync)
  static.js        Auslieferung der App (nur freigegebene Pfade)
  friend-stats.js  Freundes-Statistik aus den gespeicherten Matches (nutzt js/stats.js)
  backup.js        konsistente Sicherung im laufenden Betrieb
  routes/          auth · account · sync · friends
```

### API (JSON, Sitzung per Cookie)

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/auth/email` | Gibt es ein Konto zu dieser E-Mail? |
| GET | `/api/auth/username?name=` | Name frei/gültig? |
| POST | `/api/auth/register` | E-Mail, Passwort, eindeutiger Name |
| POST | `/api/auth/login` · `/api/auth/logout` | |
| GET/PATCH/DELETE | `/api/me` | Konto anzeigen, Namen ändern, Konto löschen (Passwort) |
| POST | `/api/me/password` | Passwort ändern (andere Geräte werden abgemeldet) |
| POST | `/api/sync` | Delta-Sync der Spieldaten |
| GET | `/api/users/search?q=` | Nutzer nach Namensanfang suchen |
| GET/POST | `/api/friends` | Freunde + Anfragen / Anfrage per Name |
| POST | `/api/friends/:id/accept` | Anfrage annehmen |
| DELETE | `/api/friends/:id` | Ablehnen, zurückziehen oder entfernen |
| GET | `/api/friends/:id` | Profil + Statistik (nur Freunde) |

## Noch offen

- Zusammen spielen (Online-Match gegen Freunde) – in der App als „Kommt bald“ angekündigt
- Passwort vergessen / E-Mail bestätigen (braucht einen Mailversand, z. B. SMTP)
- Mehrere Server-Instanzen: Rate-Limit liegt im Speicher, SQLite ist für eine Instanz gedacht
