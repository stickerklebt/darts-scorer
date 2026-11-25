import assert from 'node:assert/strict';
import { partyTiles, addTile, removeTile, DEFAULT_TILES, ALL_PARTY, SOON, partyInfo } from '../js/partygames.js';

test('Partyspiele: Standard ohne Challenge, hinzufügen/entfernen, 10 kommende Modi', () => {
  const prefs = {};
  assert.deepEqual(partyTiles(prefs), DEFAULT_TILES);
  assert.ok(!DEFAULT_TILES.includes('x01'));
  assert.ok(!partyTiles(prefs).includes('bruch'));
  addTile(prefs, 'killer'); addTile(prefs, 'killer'); addTile(prefs, 'gibtsnicht');
  assert.deepEqual(partyTiles(prefs), [...DEFAULT_TILES, 'killer']);
  removeTile(prefs, 'cricket');
  assert.ok(!partyTiles(prefs).includes('cricket'));
  assert.equal(Object.keys(SOON).length, 10);
  assert.equal(partyInfo('killer').playable, false);
  assert.equal(partyInfo('bruch').playable, true);
  assert.ok(ALL_PARTY.includes('bruch'));
});
