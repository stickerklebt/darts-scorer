/* Bots: feste Gegner, die ab dem ersten Start da sind.
   Hier kannst du Namen, Farben und Sprüche frei ändern.
   - avg:   Ziel-Average (3 Darts). Nur zur Anzeige – die Wurfstärke kommt aus `sigma`.
   - sigma: Streuung jedes Darts in Millimetern (2D-Normalverteilung um den Zielpunkt).
            Per Simulation kalibriert (tests/bots.test.mjs prüft: Average über viele Legs = avg ± 1).
   - lines: Sprüche als Sprechblase. Pro Spiel höchstens 3 pro Bot.
            start = Spielbeginn · good = eigener starker Wurf (100+ oder Finish ab 60) ·
            oppBust = Gegner überwirft · oppGood = Gegner wirft 140+ · win/lose = Spielende. */

export const BOTS = [
  {
    id: 'sensei-wu', name: 'Sensei Wu', initials: 'WU', avg: 45, sigma: 17.74, color: '#f3e9d2', ink: '#0b0a08',
    lines: {
      start: [
        'Ein Pfeil, der zögert, findet nie sein Ziel.',
        'Atme ein. Wirf aus. Mehr ist es nicht.',
        'Die Scheibe ist geduldig. Sei es auch.',
        'Wer das Bull sucht, muss zuerst sich selbst finden.',
      ],
      good: [
        'Der Arm war still, der Geist war leer.',
        'Treffen ist kein Glück. Treffen ist Übung, die man nicht mehr sieht.',
        'Siehst du? Der Draht hat sich verneigt.',
      ],
      oppBust: [
        'Zu viel Wille, zu wenig Rest.',
        'Auch der Fluss läuft manchmal über. Er fließt trotzdem weiter.',
        'Zähle, bevor du wirfst. Nicht danach.',
      ],
      oppGood: ['Ein guter Wurf. Der Schüler wächst.', 'Interessant. Sehr interessant.'],
      win: ['Der Sieg gehört dem, der ruhig blieb.', 'Verbeuge dich vor der Scheibe, nicht vor mir.'],
      lose: ['Heute war ich der Schüler. Danke für die Lektion.', 'Auch der Meister verfehlt. Darum bleibt er Meister.'],
    },
  },
  {
    id: 'super-mario', name: 'Super Mario', initials: 'SM', avg: 42, sigma: 18.87, color: '#e5402c', ink: '#f3e9d2',
    lines: {
      start: [
        'Wahoo! Auf geht’s, Mamma mia, ich bin bereit!',
        'Pfeile? Pilze? Egal, ich springe einfach los!',
        'Si si! Heute sammeln wir nur Sterne ein!',
        'Andiamo! Der Bull wartet auf mich!',
      ],
      good: [
        'Yahoo! Das war ein Power-Up-Wurf!',
        'Mamma mia, schau dir das an! Bellissimo!',
        'Hüpf, hüpf, Triple! Wie im Bonuslevel!',
      ],
      oppBust: [
        'Oh-oh! Da ist wohl jemand in die Lava gefallen!',
        'Ups! Kein Extraleben für diese Aufnahme!',
        'Mamma mia, zu hoch gesprungen!',
      ],
      oppGood: ['Wow! Hast du einen Stern gegessen?', 'Che forza! Nicht schlecht, amico!'],
      win: ['Evviva! Fahnenmast erreicht, ganz oben!', 'Wahoo! Level geschafft! Grazie mille!'],
      lose: ['Mamma mia… Game Over. Nochmal, per favore!', 'Ohhh! Nächstes Mal nehme ich einen Extra-Pilz!'],
    },
  },
  {
    id: 'shrek', name: 'Shrek', initials: 'SH', avg: 40, sigma: 19.8, color: '#1f9a4c', ink: '#f3e9d2',
    lines: {
      start: [
        'Na schön. Werfen wir halt. Dann ist Ruhe.',
        'Darts. Bei mir im Sumpf. Ernsthaft?',
        'Ich spiele mit. Aber nur, damit ihr danach geht.',
        'Ich hab extra Zwiebeln gegessen. Damit keiner zu nah ans Board kommt.',
      ],
      good: [
        'Hah! Nicht schlecht für einen mit so großen Fingern.',
        'Da staunt ihr, was? Sumpfluft macht treffsicher.',
        'Siehst du? Ich kann auch zielen, wenn ich will.',
      ],
      oppBust: [
        'Tja. Zu gierig. Wie ein Esel am Buffet.',
        'Überworfen. Das passiert, wenn man zu viel nachdenkt.',
        'Hehe. Schlamm im Getriebe, was?',
      ],
      oppGood: ['Okay, okay. Das war gut. Jetzt hör auf zu grinsen.', 'Mhm. Glückstreffer. Bestimmt.'],
      win: ['So. Gewonnen. Kann ich jetzt wieder meine Ruhe haben?', 'Gewonnen. Ich geh jetzt baden. Im Schlamm.'],
      lose: ['Pfff. War eh langweilig. Ich hab Zwiebeln auf dem Herd.', 'Verloren. Ist mir egal. Wirklich. Lasst mich in Ruhe.'],
    },
  },
  /* ---- Bots mit Zufallssprüchen (Update 4): Sprüche hängen an keinem Ereignis, sondern an zufällig
     ausgelosten Aufnahmen (aus den ersten 8, nie der ersten). random.count = Sprüche pro Spiel,
     random.weights = gewichtete Ziehung, random.repeat = Wiederholung erlaubt, startLine = immer zum Spielstart. ---- */
  {
    id: 'jensn-huang', name: 'Jensn Huang', initials: 'JH', avg: 40, sigma: 19.8, color: '#2f6fe4', ink: '#f3e9d2', art: 'jensn',
    random: { count: 2, lines: [
      'Ich will auch mal andere Darts ausprobieren.',
      'Man, meine Darts sind nicht so nice.',
      'Andere Darts sollte ich echt mal ausprobieren.',
      'Ich sollte vielleicht chinesische Darts ausprobieren.',
      'Sind chinesische Darts gut?',
      'Habe gerade chinesische Darts gefunden, die probiere ich mal.',
      'Die chinesischen Darts funktionieren ganz gut.',
      'Ich will also nur meine chinesischen Darts.',
      'Kann ich mehr Dartpfeile haben als nur ein Set?',
      'Man, die chinesischen Darts sind gut.',
      'Schaffe ich es eigentlich, an einem Tag 200 Milliarden Dollar zu verlieren?',
      'Wie viel Geld kann ich eigentlich an einem Tag mit Nvidia verlieren?',
    ] },
  },
  {
    id: 'michael-jackson', name: 'Michael Jackson', initials: 'MJ', avg: 40, sigma: 19.8, color: '#e5402c', ink: '#f3e9d2', art: 'mj',
    startLine: 'Hee-hee!',
    random: { count: 2, lines: [
      'Dirty Diana, ooohhhh!',
      'Thriller, thrilllerrrr!',
      "I'm a smooth criminal, dada!",
      'Yiaauuuh!',
      'Uuuuuh!',
      'Black or White! Shamone!',
      'Black or White, da da da!',
      'Billie Jean! Dah!',
      'Man in the Mirror! Ow!',
      'Bad! Ow!',
      'Yiiiihaaaaa!',
      "Say it one more time, I'm not gonna stop, aaaauuuu!",
    ] },
  },
  {
    id: 'phil-taylor', name: 'Phil Taylor', initials: 'PT', avg: 100, sigma: 6.42, color: '#ffd23f', ink: '#0b0a08', art: 'phil',
    random: { count: 2, repeat: true, lines: ['Power!', 'Easy.', 'Lightwork.'], weights: [60, 20, 20] },
  },
  {
    id: 'dreimac', name: 'Dreimac', initials: 'DM', avg: 40, sigma: 19.8, color: '#8b5cf6', ink: '#f3e9d2', art: 'dreimac',
    random: { count: 2, lines: [
      'negativ, absolut RIESEN ABGELEHNT',
      'cola!?',
      'ich mag das hier nicht, wobei, ich glaube, schon',
      'unbreaking aszuwakjhaqua infinity',
      'unterschätz das mal nicht',
      'naaa auch im norden isst man flammkuchen',
      '"dieser song könnte dir auch gefallen" am arsch ich will everybody',
      'laber kein... scheiß',
    ] },
  },
];

export const BOT_IDS = new Set(BOTS.map((b) => b.id));
export const isBot = (id) => BOT_IDS.has(id);
export const bot = (id) => BOTS.find((b) => b.id === id) || null;
export const MAX_LINES = 3;

/* ---------------- Zufallssprüche (nur Bots mit `random`) ---------------- */
/**
 * Zu Spielbeginn auslosen: welche Sprüche (ohne Doppelte, außer repeat; gewichtet, wenn weights)
 * und nach welchen eigenen Aufnahmen (2.–8. Aufnahme, nie die erste). → { turns: [Nr.], lines: [Text] }
 */
export function planLines(b, rnd = Math.random) {
  const r = b.random;
  if (!r) return null;
  const n = Math.min(r.count, 7, r.repeat ? Infinity : r.lines.length);
  const slots = [2, 3, 4, 5, 6, 7, 8];
  const turns = [];
  while (turns.length < n) { const i = Math.floor(rnd() * slots.length); turns.push(slots.splice(i, 1)[0]); }
  turns.sort((x, y) => x - y);
  const pool = r.lines.map((t, i) => ({ t, w: r.weights ? r.weights[i] : 1 }));
  const lines = [];
  for (let k = 0; k < n; k++) {
    const total = pool.reduce((a, p) => a + p.w, 0);
    let x = rnd() * total, idx = 0;
    while (idx < pool.length - 1 && x >= pool[idx].w) { x -= pool[idx].w; idx++; }
    lines.push(pool[idx].t);
    if (!r.repeat) pool.splice(idx, 1);
  }
  return { turns, lines };
}
