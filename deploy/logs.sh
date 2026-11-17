#!/usr/bin/env bash
# Logs des Servers (JSON-Zeilen aus dem systemd-Journal).
#   deploy/logs.sh               live verfolgen
#   deploy/logs.sh fehler        nur Warnungen und Fehler (live)
#   deploy/logs.sh heute         alles von heute (ohne Folgen)
#   deploy/logs.sh id <rid>      alle Zeilen einer Anfrage (Fehler-Nr. aus der App)
#   deploy/logs.sh <journalctl-Optionen …>   z. B. --since "1 hour ago"
set -euo pipefail
J=(sudo journalctl -u darts -o cat --no-pager)
case "${1:-}" in
  fehler) exec "${J[@]}" -f | grep --line-buffered -E '"level":"(warn|error)"' ;;
  heute)  exec "${J[@]}" --since today ;;
  id)     [ -n "${2:-}" ] || { echo "Aufruf: $0 id <Request-ID>"; exit 1; }; exec "${J[@]}" --since "7 days ago" | grep -F "\"rid\":\"$2\"" ;;
  "")     exec "${J[@]}" -f ;;
  *)      exec "${J[@]}" "$@" ;;
esac
