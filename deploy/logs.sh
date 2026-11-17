#!/usr/bin/env bash
# Logs des Servers live verfolgen (JSON-Zeilen). Weitere Optionen werden an journalctl durchgereicht, z. B. --since today.
exec sudo journalctl -u darts -f -o cat "$@"
