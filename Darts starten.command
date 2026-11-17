#!/bin/bash
# Startet den Darts Scorer lokal (Doppelklick im Finder) mit dem echten Server (Anmeldung, Freunde, Sync)
# und öffnet ihn im Standardbrowser. Daten liegen in .data/ in diesem Ordner. Fenster schließen (oder Ctrl+C) beendet den Server.
# Braucht Node.js ab Version 22.13 (https://nodejs.org). Für den Dauerbetrieb auf einem Server: deploy/, siehe README.md.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte von https://nodejs.org installieren (LTS) und erneut doppelklicken."
  read -r -p "Enter zum Schließen …"
  exit 1
fi
PORT=$(node -e "const n=require('net');(function t(p){const s=n.createServer();s.once('error',()=>t(p+1));s.listen(p,'127.0.0.1',()=>{s.close(()=>console.log(p))})})(8000)")
echo "Darts Scorer läuft auf http://localhost:$PORT/  (Fenster schließen zum Beenden)"
(sleep 1; open "http://localhost:$PORT/") &
PORT=$PORT DATA_DIR="$PWD/.data" exec node --disable-warning=ExperimentalWarning server/src/server.js
