import assert from 'node:assert/strict';
import { translate, tr } from '../js/i18n.js';

test('Sprache: Deutsch bleibt unverändert, Englisch übersetzt Texte und Attribute, Muster mit Zahlen', () => {
  const html = '<h2 class="label">Partyspiele</h2><input placeholder="Namen suchen …"><b data-t="Average">Average</b><small>12 Spiele · zuletzt vor 2 Tagen</small>';
  assert.equal(translate(html, 'de'), html);
  const en = translate(html, 'en');
  assert.match(en, />Party games</);
  assert.match(en, /placeholder="Search names …"/);
  assert.match(en, /12 games · last played 2 days ago/);
  assert.equal(tr('Rest 40'), 'Left 40');
  assert.equal(tr('Unbekannt XYZ'), 'Unbekannt XYZ');       // Unbekanntes bleibt
  assert.equal(translate('<p>  Fertig  </p>', 'en'), '<p>  Done  </p>'); // Leerraum bleibt
});
