/* Mehrere Kameras sehen denselben Dart: Würfe zusammenführen. Reine Funktion.
   Gleiches Feld → sicherer. Verschiedene Felder → eine deutlich sicherere Kamera gewinnt, sonst Mittelpunkt (gewichtet nach Sicherheit). */
import { scoreFromBoardMM } from './board-geometry.js';

export function fuseThrows(list) {
  if (list.length === 1) return list[0];
  const best = list.reduce((a, b) => ((b.confidence ?? 0) > (a.confidence ?? 0) ? b : a));
  const agree = list.every((t) => t.label === list[0].label);
  const wsum = list.reduce((s, t) => s + Math.max(0.05, t.confidence ?? 0.5), 0);
  const x = list.reduce((s, t) => s + (t.boardX ?? 0) * Math.max(0.05, t.confidence ?? 0.5), 0) / wsum;
  const y = list.reduce((s, t) => s + (t.boardY ?? 0) * Math.max(0.05, t.confidence ?? 0.5), 0) / wsum;
  if (agree) return { ...best, boardX: x, boardY: y, confidence: Math.min(1, (best.confidence ?? 0.5) + 0.15), cams: list.length };
  const others = list.filter((t) => t !== best);
  if ((best.confidence ?? 0) >= 0.85 && others.every((t) => (t.confidence ?? 0) < 0.6)) return { ...best, cams: list.length };
  const s = scoreFromBoardMM(x, y);
  return { ...best, boardX: x, boardY: y, label: s.label, segment: s.segment, multiplier: s.multiplier, points: s.points,
    confidence: Math.round(Math.min(0.69, (best.confidence ?? 0.5) * 0.8) * 100) / 100, cams: list.length };
}
