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
| `logs.sh` | Logs live (`journalctl -u darts`) |
| `backup.sh` | Sicherung jetzt; läuft sonst täglich 3:30 → `/var/lib/darts/backups` (die letzten 14) |

Einstellbar sind nur `PORT` (8080) und `DATA_DIR` (`/var/lib/darts`), beide in `darts.service`.

## Lokal (Mac)

`Darts starten.command` doppelklicken – oder `cd server && npm run dev` (Port 8787, Daten in `.data/`).
Tests: `node tests/run.mjs`

## Noch offen

Zusammen spielen (Online-Match gegen Freunde) · Passwort vergessen / E-Mail-Bestätigung (braucht Mailversand)
