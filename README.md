# Darts Scorer

PWA zum Darts-Zählen (iPhone/iPad) mit Konto, Datensync und Freunden. Ein Node-Server ohne npm-Abhängigkeiten liefert
die App aus und speichert alles in SQLite. Betrieb mit nginx und systemd.

```
Internet ─HTTPS→ äußerer Reverse Proxy ─HTTP→ nginx :80 ─→ Node 127.0.0.1:8080 ─→ /var/lib/darts/darts.db
```

nginx macht kein TLS und kennt keine Domain. HTTPS kommt vom Proxy davor; der muss `X-Forwarded-Proto` und
`X-Forwarded-For` setzen (sonst keine Secure-Cookies und ein Rate-Limit für alle gemeinsam).

## Einrichten (Linux mit systemd, Node ≥ 22.13)

```bash
sudo git clone https://github.com/stickerklebt/darts-scorer.git /opt/darts-scorer
sudo /opt/darts-scorer/deploy/install.sh
```

`install.sh` legt den Systemnutzer `darts`, die Unit `darts.service`, `/etc/nginx/conf.d/darts.conf` und ein nächtliches
Backup an (installiert nginx bei Bedarf, schaltet die nginx-Standardseite ab). Mehrfach ausführbar.

## Betrieb

| Skript (in `deploy/`) | Zweck |
|---|---|
| `update.sh` | `git pull`, Tests, Neustart – bei roten Tests bleibt der alte Stand |
| `start.sh` · `stop.sh` | Server starten / anhalten |
| `logs.sh` | Logs live · `logs.sh fehler` nur Warnungen/Fehler · `logs.sh heute` · `logs.sh id <Fehler-Nr.>` alle Zeilen einer Anfrage |
| `backup.sh` | Sicherung jetzt; läuft sonst täglich 3:30 → `/var/lib/darts/backups` (die letzten 14) |

Einstellbar sind nur `PORT` (8080) und `DATA_DIR` (`/var/lib/darts`), beide in `darts.service`.

## Logs

Eine JSON-Zeile pro Ereignis im systemd-Journal, z. B.

```
{"t":"…","level":"warn","msg":"login_failed","rid":"eb2aa05be3b359ac","reason":"bad_password"}
{"t":"…","level":"info","msg":"req","rid":"…","m":"POST","p":"/api/sync","s":200,"ms":12,"u":"…","ip":"203.0.113.0"}
```

`rid` verbindet alle Zeilen einer Anfrage; zeigt die App „Fehler-Nr. …“, findet `deploy/logs.sh id <Nr>` die passenden Zeilen.
Fehler aus dem Browser erscheinen als `client_error`. E-Mail-Adressen, Passwörter und Cookies werden nie geloggt, IPs nur gekürzt.

## Lokal (Mac)

`Darts starten.command` doppelklicken – oder `cd server && npm run dev` (Port 8787, Daten in `.data/`).
Tests: `node tests/run.mjs`

## Noch offen

Zusammen spielen (Online-Match gegen Freunde) · Passwort vergessen / E-Mail-Bestätigung (braucht Mailversand)
