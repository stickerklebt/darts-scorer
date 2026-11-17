/* Fehler in der App an den Server melden (landen im Server-Log als „client_error“).
   Klassisches Skript, wird vor main.js geladen – fängt so auch Fehler beim Laden der Module ab.
   Höchstens 5 Meldungen pro Seitenaufruf, gleiche Meldung nur einmal; keine Eingaben/Spielstände, nur Fehlertext und Ort. */
(function () {
  if (location.protocol === 'file:') return;
  var sent = 0, seen = {};
  function report(kind, msg, src, line, stack) {
    try {
      msg = String(msg || 'Unbekannter Fehler');
      var key = kind + '|' + msg + '|' + (src || '') + ':' + (line || '');
      if (sent >= 5 || seen[key]) return;
      seen[key] = 1; sent++;
      var body = JSON.stringify({
        kind: kind, msg: msg, src: src ? String(src).replace(location.origin, '') : undefined, line: line || undefined,
        stack: stack ? String(stack).slice(0, 1500) : undefined,
      });
      fetch('api/client-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true, credentials: 'same-origin' }).catch(function () {});
    } catch (e) { /* Melden darf nie selbst stören */ }
  }
  window.addEventListener('error', function (e) {
    if (e.target && e.target !== window && (e.target.src || e.target.href)) { report('resource', 'Datei nicht geladen', e.target.src || e.target.href); return; }
    report('error', e.message, e.filename, e.lineno, e.error && e.error.stack);
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    if (r && (r.name === 'AbortError' || r.code === 'offline')) return; // Netz weg ist kein Programmfehler
    report('promise', r && r.message ? r.message : String(r), undefined, undefined, r && r.stack);
  });
  window.__reportError = report; // für bewusste Meldungen aus der App
})();
