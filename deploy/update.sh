#!/usr/bin/env bash
# Update: neuesten Stand holen, Tests laufen lassen, Server neu starten. Bei roten Tests bleibt der alte Stand.
# Aufruf:  bash deploy/update.sh   (sudo nicht nötig – das Skript holt sich die Rechte selbst)
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"
[ "$(id -u)" -eq 0 ] || exec sudo bash "$0" "$@"   # holt sich root-Rechte selbst (fragt ggf. nach dem Passwort)

# git als Besitzer des Repos ausführen (sonst „dubious ownership“)
OWNER="$(stat -c %U "$APP_DIR")"
as_owner() { if [ "$OWNER" = root ]; then "$@"; else runuser -u "$OWNER" -- "$@"; fi; }

PREV="$(as_owner git rev-parse HEAD)"
as_owner git pull --ff-only
NEW="$(as_owner git rev-parse HEAD)"
[ "$PREV" != "$NEW" ] || { echo "Schon aktuell ($NEW)."; exit 0; }

if ! node --disable-warning=ExperimentalWarning tests/run.mjs; then
  echo "Tests rot – zurück auf $PREV, Server läuft unverändert weiter."
  as_owner git reset --hard "$PREV"
  exit 1
fi

# Unit/nginx-Konfiguration neu einspielen (könnten sich geändert haben) und Server neu starten
"$APP_DIR/deploy/install.sh" >/dev/null
echo "Aktualisiert: ${PREV:0:7} → ${NEW:0:7}"
