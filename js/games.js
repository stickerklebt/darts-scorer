/* Spielmodi – Titel, Kurzname, Erklärung. */
import { HALF_START } from './party.js';

export const MAX_PLAYERS = 6;

export const GAMES = {
  x01: { title: 'X01', tile: '501',
    desc: 'Der Klassiker. Jeder startet mit derselben Punktzahl und spielt sie auf genau null herunter. Über 170 Rest gibst du die Summe ein, darunter jeden Dart einzeln.' },
  highscore: { title: 'Highscore', tile: '180',
    desc: 'Jeder wirft eine feste Anzahl Runden. Wer am Ende die meisten Punkte hat, gewinnt.' },
  shanghai: { title: 'Shanghai', tile: '1–7',
    desc: 'Runde 1 zählt nur die 1, Runde 2 nur die 2 und so weiter. Eingegeben werden die Punkte auf das Ziel.' },
  halveit: { title: 'Halbieren', tile: '½',
    desc: `Start mit ${HALF_START} Punkten. Jede Runde hat ein Ziel (15, 16, Double, 17, 18, Triple, 19, 20, Bull). Wer es nicht trifft, verliert die Hälfte.` },
  atc: { title: 'Around the Clock', tile: '1→20',
    desc: 'Die Zahlen der Reihe nach treffen. Pro Aufnahme gibst du ein, wie viele Ziele du geschafft hast.' },
};
