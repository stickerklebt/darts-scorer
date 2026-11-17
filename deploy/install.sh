#!/usr/bin/env bash
# Einmalige Einrichtung auf dem Server (Linux mit systemd). Aufruf aus dem geklonten Repo:  sudo deploy/install.sh
# Legt an: Systemnutzer „darts“, systemd-Unit, nginx-Konfiguration, nächtliches Backup (Cron). Mehrfach ausführbar.
# Das Repo muss für den Nutzer darts lesbar sein (z. B. nach /opt/darts-scorer klonen, nicht in ein privates Home).
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
[ "$(id -u)" -eq 0 ] || { echo "Bitte mit sudo ausführen: sudo $0"; exit 1; }

NODE="$(command -v node || true)"
[ -n "$NODE" ] || { echo "Node.js fehlt (mind. 22.13), z. B. über https://nodejs.org oder NodeSource installieren."; exit 1; }
"$NODE" -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)" \
  || { echo "Node.js $("$NODE" -v) ist zu alt – mindestens 22.13 nötig (node:sqlite)."; exit 1; }

if ! command -v nginx >/dev/null; then
  if command -v apt-get >/dev/null; then apt-get update -qq && apt-get install -y -qq nginx; else echo "nginx fehlt – bitte installieren."; exit 1; fi
fi

echo "→ Nutzer darts"
id darts >/dev/null 2>&1 || useradd --system --home-dir /var/lib/darts --no-create-home --shell /usr/sbin/nologin darts

echo "→ Tests"
"$NODE" --disable-warning=ExperimentalWarning "$APP_DIR/tests/run.mjs" >/dev/null || { echo "Tests schlagen fehl – Abbruch."; exit 1; }

echo "→ systemd-Unit"
sed -e "s#@APP_DIR@#$APP_DIR#g" -e "s#@NODE@#$NODE#g" "$APP_DIR/deploy/darts.service" > /etc/systemd/system/darts.service
systemctl daemon-reload
systemctl enable --now darts
systemctl restart darts

echo "→ nginx"
install -m 644 "$APP_DIR/deploy/nginx.conf" /etc/nginx/conf.d/darts.conf
# Die Standardseite belegt ebenfalls Port 80 als default_server → abschalten
if [ -L /etc/nginx/sites-enabled/default ]; then rm /etc/nginx/sites-enabled/default; echo "  (Standardseite /etc/nginx/sites-enabled/default deaktiviert)"; fi
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx || systemctl start nginx

echo "→ Backup jede Nacht um 3:30 (die letzten 14 in /var/lib/darts/backups)"
cat > /etc/cron.d/darts-backup <<EOF
# Darts Scorer: tägliche Sicherung der Datenbank
PATH=$(dirname "$NODE"):/usr/local/bin:/usr/bin:/bin
30 3 * * * darts $APP_DIR/deploy/backup.sh 2>&1 | logger -t darts-backup
EOF
chmod 644 /etc/cron.d/darts-backup

echo "→ Warte auf den Server …"
for _ in $(seq 1 20); do
  if curl -fsS http://127.0.0.1/healthz >/dev/null 2>&1; then echo "Fertig: läuft auf Port 80 (nginx) → 127.0.0.1:8080 (Node)."; exit 0; fi
  sleep 0.5
done
echo "Server antwortet nicht – siehe: $APP_DIR/deploy/logs.sh"; exit 1
