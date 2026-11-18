#!/usr/bin/env bash
# Sicherung der Datenbank im laufenden Betrieb → /var/lib/darts/backups (die letzten 14).
# Läuft nachts per Cron (/etc/cron.d/darts-backup), kann jederzeit von Hand gestartet werden:  bash deploy/backup.sh
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$(id -un)" != darts ]; then
  [ "$(id -u)" -eq 0 ] || exec sudo bash "$0" "$@"   # erst root holen …
  exec runuser -u darts -- bash "$0" "$@"           # … dann als Nutzer darts sichern
fi
DATA_DIR=/var/lib/darts exec node --disable-warning=ExperimentalWarning "$APP_DIR/server/src/backup.js"
