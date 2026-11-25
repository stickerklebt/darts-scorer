/* Partyspiel-Galerie: welche Kacheln auf dem Reiter Play stehen (`prefs.partyTiles`, synchronisiert) und was man hinzufügen kann.
   Spielbar sind die Modi aus games.js (auch die früher ausgeblendeten Highscore, Shanghai, Halbieren, Around the Clock).
   Die Modi in SOON sind nur Kacheln mit Namen und Kurzregel – noch nicht programmiert, auf Play ausgegraut („Bald“). */
import { GAMES } from './games.js';

export const DEFAULT_TILES = ['cricket', 'football'];

/** Bekannte Dart-Partyspiele, die es noch nicht gibt (Kurzregeln in eigenen Worten) */
export const SOON = {
  killer: { title: 'Killer', tile: 'KILL', desc: 'Jeder bekommt eine Zahl. Wer sein eigenes Doppel trifft, wird Killer und nimmt danach mit dem Doppel der anderen deren Leben. Wer übrig bleibt, gewinnt.' },
  bobs27: { title: "Bob's 27", tile: '27', desc: 'Doppel-Training: Start mit 27 Punkten, Runde für Runde D1 bis Bull. Jeder Treffer bringt den Doppelwert, eine Runde ohne Treffer kostet ihn. Unter null ist Schluss.' },
  baseball: { title: 'Baseball', tile: '9', desc: 'Neun Innings, im Inning 1 zählt die 1, im Inning 2 die 2 … Single ein Run, Double zwei, Triple drei. Die meisten Runs gewinnen.' },
  golf: { title: 'Golf', tile: '18', desc: 'Neun oder 18 Löcher, Loch n ist die Zahl n. Je besser der Treffer, desto weniger Schläge – wie beim Golf gewinnt die kleinste Zahl.' },
  gotcha: { title: 'Gotcha', tile: '301', desc: 'Alle spielen auf genau 301 hoch. Triffst du mit deinem Stand genau den eines Gegners, fällt er auf null zurück.' },
  tictactoe: { title: 'Tic Tac Toe', tile: '3×3', desc: 'Neun Felder der Scheibe bilden ein 3×3-Raster. Wer ein Feld zuerst trifft, besetzt es – drei in einer Reihe gewinnen.' },
  mickey: { title: 'Mickey Mouse', tile: '20–12', desc: 'Cricket-Verwandter mit 20 bis 12 plus Doppel, Triple und Bull. Drei Treffer schließen ein Feld.' },
  scram: { title: 'Scram', tile: 'S', desc: 'Zwei Rollen: Der Stopper schließt Felder, der Scorer punktet auf allen, die noch offen sind. Danach wird getauscht.' },
  c121: { title: '121', tile: '121', desc: 'Checkout-Training: 121 in neun Darts checken. Geschafft – weiter mit 122, sonst zurück auf 121.' },
  ninelives: { title: 'Nine Lives', tile: '3 ♥', desc: 'Die Zahlen 1 bis 20 der Reihe nach. Wer mit allen drei Darts sein Ziel verfehlt, verliert ein Leben – drei Leben hat jeder.' },
};

/** Alle Modi, die man in der Galerie findet: spielbare zuerst, dann die kommenden */
export const PLAYABLE = ['x01', 'cricket', 'football', 'bruch', 'shanghai', 'halveit', 'atc', 'highscore']; // X01 (101 … 1001) steht in der Galerie ganz oben
export const ALL_PARTY = [...PLAYABLE, ...Object.keys(SOON)];

export const isPlayable = (id) => PLAYABLE.includes(id) && !!GAMES[id];
export const partyInfo = (id) => (GAMES[id] && PLAYABLE.includes(id) ? { ...GAMES[id], playable: true } : SOON[id] ? { ...SOON[id], playable: false } : null);

/** Kacheln auf Play (nur bekannte, ohne Doppelte) */
export function partyTiles(prefs) {
  const list = Array.isArray(prefs?.partyTiles) ? prefs.partyTiles : DEFAULT_TILES;
  return [...new Set(list)].filter((id) => ALL_PARTY.includes(id));
}
export function addTile(prefs, id) {
  if (!ALL_PARTY.includes(id)) return;
  const cur = partyTiles(prefs);
  if (!cur.includes(id)) prefs.partyTiles = [...cur, id];
}
export function removeTile(prefs, id) { prefs.partyTiles = partyTiles(prefs).filter((x) => x !== id); }
