/* Animations-Auswahl: welche Animation zu welchem Wurf. Reine Logik ohne DOM. */

/** Töpfe: aus jedem wird zufällig und gleich häufig gewählt, nie zweimal hintereinander dieselbe. */
export const POOLS = {
  breakfast: ['breakfast'],                                              // genau 26
  triangle: ['triangle'],                                                // genau 60
  s100: ['confetti', 'balloons', 'clap', 'paparazzi', 'fireworks'],      // 100–120
  s121: ['bassdrop', 'shatter', 'flare', 'flash', 'freeze'],             // 121–179
  s180: ['lootbox'],                                                     // 180
  f2: ['arrow'],                                                         // Finish 2–60
  f61: ['klick'],                                                        // Finish 61–99
  f100: ['nuke'],                                                        // Finish 100–167
  f170: ['bigfish'],                                                     // Finish 170
};

/** Ungefähre Dauer je Animation in ms */
export const DURATION = {
  breakfast: 1500, triangle: 1500,
  confetti: 2000, balloons: 2000, clap: 2000, paparazzi: 2000, fireworks: 2000,
  bassdrop: 3000, shatter: 3000, flare: 3000, flash: 3000, freeze: 3000,
  lootbox: 5200, arrow: 1000, klick: 2000, nuke: 3000, bigfish: 6000,
};

/** Topf für eine Aufnahme (ohne Finish). */
export function scorePool(score) {
  if (score === 26) return 'breakfast';
  if (score === 60) return 'triangle';
  if (score === 180) return 's180';
  if (score >= 121 && score <= 179) return 's121';
  if (score >= 100 && score <= 120) return 's100';
  return null;
}

/** Topf für ein Finish (nur X01). */
export function finishPool(score) {
  if (score === 170) return 'f170';
  if (score >= 100 && score <= 167) return 'f100';
  if (score >= 61 && score <= 99) return 'f61';
  if (score >= 2 && score <= 60) return 'f2';
  return null;
}

/**
 * Welcher Topf passt zu dieser Aufnahme?
 * X01: Finish → Finish-Topf, sonst Aufnahme-Topf. Highscore: nur Aufnahmen. Busts und andere Spiele: keine.
 */
export function poolFor(game, turn) {
  if (!turn || turn.bust) return null;
  if (game === 'x01') return turn.out ? finishPool(turn.score) : scorePool(turn.score);
  if (game === 'highscore') return scorePool(turn.v);
  return null;
}

/** Gleich häufig aus dem Topf wählen, aber nie dieselbe wie `last`. */
export function pickAnim(pool, last = null, rnd = Math.random) {
  const all = POOLS[pool];
  if (!all) return null;
  const cand = all.length > 1 ? all.filter((a) => a !== last) : all;
  return cand[Math.min(cand.length - 1, Math.floor(rnd() * cand.length))];
}
