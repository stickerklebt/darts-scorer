/* Als Datei geöffnet (file://) laden Firefox und Chrome keine ES-Module → statt schwarzem Bildschirm ein Hinweis.
   Klassisches Skript (kein Modul), damit es auch unter file:// läuft; extern statt inline wegen Content-Security-Policy. */
if (location.protocol === 'file:') setTimeout(function () {
  if (document.getElementById('app').childElementCount || document.querySelector('.splash')) return;
  var d = document.createElement('div');
  d.setAttribute('style', 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b0a08;color:#f3e9d2;font:18px/1.45 Georgia,serif;text-align:center');
  d.innerHTML = '<div style="max-width:460px;padding:26px 22px;border:2px solid #e3ae2b;outline:1px solid #e3ae2b;outline-offset:-8px;border-radius:10px">'
    + '<div style="color:#e3ae2b;letter-spacing:.2em;font-size:13px;text-transform:uppercase">DartVader</div>'
    + '<h1 style="margin:6px 0 12px;font-size:28px;font-weight:normal">Bitte nicht als Datei öffnen</h1>'
    + '<p style="margin:0 0 14px">Der Browser blockiert die App, wenn die <i>index.html</i> direkt per Doppelklick geöffnet wird.</p>'
    + '<p style="margin:0 0 18px">Die App läuft über den Darts-Server (siehe README).</p>'
    + '<p style="margin:0;color:#a89d87;font-size:15px">Lokal auf dem Mac: im Ordner <i>Darts starten.command</i> doppelklicken.</p></div>';
  document.body.appendChild(d);
}, 1500);
