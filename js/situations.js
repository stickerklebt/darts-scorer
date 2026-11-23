/* Verlauf im Leg: Ø Punkte je Aufnahme-Nummer von 501 bis zum Finish-Bereich. Reine Funktion ohne DOM.
   („Wann du gut wirfst“ – Umstände wie nach schlechter Aufnahme, Druck usw. – wurde auf Wunsch entfernt.) */

/**
 * Verlauf im Leg: Ø Punkte der 1., 2., 3. … Aufnahme von 501 bis zum Finish-Bereich (Rest vor der Aufnahme über 170).
 * → { points: [{ n, avg, count }], avgTurns } – gezeigt werden die Aufnahmen 1 … (Ø Anzahl bis 170, aufgerundet),
 *   nur solche mit mindestens 3 Werten.
 */
export function legCurve(matches, pid) {
  const sum = [], cnt = [];
  let legs = 0, total = 0;
  for (const m of matches) {
    for (const l of m.legs) {
      let n = 0;
      for (const t of l.turns) {
        if (t.pid !== pid || !(t.startRem > 170)) continue;
        sum[n] = (sum[n] || 0) + t.score; cnt[n] = (cnt[n] || 0) + 1; n++;
      }
      if (n) { legs++; total += n; }
    }
  }
  const avgTurns = legs ? total / legs : null;
  const upto = avgTurns ? Math.max(1, Math.ceil(avgTurns)) : 0;
  const points = [];
  for (let i = 0; i < upto; i++) if ((cnt[i] || 0) >= 3) points.push({ n: i + 1, avg: sum[i] / cnt[i], count: cnt[i] });
  return { points, avgTurns };
}
