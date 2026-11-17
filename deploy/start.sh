#!/usr/bin/env bash
# Server starten (Node über systemd; nginx läuft eigenständig weiter).
set -euo pipefail
sudo systemctl start darts
systemctl --no-pager --lines=0 status darts
