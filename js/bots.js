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
    id: 'sensei-wu', name: 'Sensei Wu', initials: 'WU', avg: 45, sigma: 33.2, color: '#b9b3a0', ink: '#14110c',
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
    id: 'super-mario', name: 'Super Mario', initials: 'SM', avg: 42, sigma: 36.6, color: '#c4452f', ink: '#fff4e0',
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
    id: 'shrek', name: 'Shrek', initials: 'SH', avg: 40, sigma: 39.4, color: '#6f8f3c', ink: '#f2f0dc',
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
];

export const BOT_IDS = new Set(BOTS.map((b) => b.id));
export const isBot = (id) => BOT_IDS.has(id);
export const bot = (id) => BOTS.find((b) => b.id === id) || null;
export const MAX_LINES = 3;
