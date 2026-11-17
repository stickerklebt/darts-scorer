#!/bin/bash
# Startet den Darts Scorer lokal (Doppelklick im Finder) und öffnet ihn im Standardbrowser.
# Fenster schließen (oder Ctrl+C) beendet den Server.
cd "$(dirname "$0")" || exit 1
exec python3 - <<'PY'
import http.server, threading, webbrowser
for port in range(8000, 8050):
    try:
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), http.server.SimpleHTTPRequestHandler)
        break
    except OSError:
        continue
url = f'http://localhost:{port}/'
print(f'Darts Scorer läuft auf {url}  (Fenster schließen zum Beenden)', flush=True)
threading.Timer(0.6, lambda: webbrowser.open(url)).start()
srv.serve_forever()
PY
