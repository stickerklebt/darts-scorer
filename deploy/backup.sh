#!/usr/bin/env bash
# Sicherung der Datenbank im laufenden Betrieb → /var/lib/darts/backups (die letzten 14).
# Läuft nachts per Cron (/etc/cron.d/darts-backup), kann jederzeit von Hand gestartet werden:  sudo deploy/backup.sh
set -euo pipefail
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$(id -u)" -eq 0 ]; then exec runuser -u darts -- "$0" "$@"; fi
DATA_DIR=/var/lib/darts exec node --disable-warning=ExperimentalWarning "$APP_DIR/server/src/backup.js"
