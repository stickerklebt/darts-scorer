#!/usr/bin/env bash
# Server anhalten. Läuft beim nächsten Systemstart wieder an (systemctl disable darts verhindert das).
set -euo pipefail
sudo systemctl stop darts
echo "Darts Scorer gestoppt."
