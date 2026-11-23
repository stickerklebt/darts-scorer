/* Spielmodi – Titel, Kurzname, Erklärung. retired: nicht mehr wählbar (nur noch für alte Spiele in Historie/Statistik). */
import { HALF_START } from './party.js';

export const MAX_PLAYERS = 6;

export const GAMES = {
  x01: { title: 'X01', tile: '501',
    desc: 'Der Klassiker. Jeder startet mit derselben Punktzahl und spielt sie auf genau null herunter. Über 170 Rest gibst du die Summe ein, darunter jeden Dart einzeln.' },
  highscore: { retired: true, title: 'Highscore', tile: '180',
    desc: 'Jeder wirft eine feste Anzahl Runden. Wer am Ende die meisten Punkte hat, gewinnt.' },
  shanghai: { retired: true, title: 'Shanghai', tile: '1–7',
    desc: 'Runde 1 zählt nur die 1, Runde 2 nur die 2 und so weiter. Eingegeben werden die Punkte auf das Ziel.' },
  halveit: { retired: true, title: 'Halbieren', tile: '½',
    desc: `Start mit ${HALF_START} Punkten. Jede Runde hat ein Ziel (15, 16, Double, 17, 18, Triple, 19, 20, Bull). Wer es nicht trifft, verliert die Hälfte.` },
  cricket: { title: 'Cricket', tile: '15–B',
    desc: 'Gespielt wird auf 20, 19, 18, 17, 16, 15 und Bull. Drei Treffer schließen ein Feld (Double zählt 2, Triple 3, Bull 2). Wer ein Feld zu hat, punktet darauf, solange es beim Gegner noch offen ist. Gewonnen hat, wer alles zu hat und nicht hinten liegt. Jeder Dart wird einzeln eingegeben.' },
  football: { title: 'Fußball', tile: '1:0',
    desc: 'Immer einer gegen einen. Jeder hat ein Tor – ein Doppel –, der Gegner das gegenüberliegende (z. B. D16 gegen D4). Zu Beginn hat keiner den Ball: Wer Single Bull oder Bullseye trifft, erobert ihn – auch dem Gegner ab. Mit Ball schießt du aufs Tor des Gegners: Trifft du sein Doppel, ist es ein Tor und der Ball ist wieder frei. Den Ball behältst du auch nach deiner Aufnahme, bis der Gegner ein Bull trifft. Wer zuerst die eingestellte Zahl an Toren hat, gewinnt.' },
  bruch: { title: 'Challenge', tile: '3×',
    desc: 'Drei zufällige Herausforderungen eines Levels, eine Stunde Zeit. Was du geschafft hast, hakst du selbst ab – nur alle drei zählen als Sieg.' },
  atc: { retired: true, title: 'Around the Clock', tile: '1→20',
    desc: 'Die Zahlen der Reihe nach treffen. Pro Aufnahme gibst du ein, wie viele Ziele du geschafft hast.' },
};
