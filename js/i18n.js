/* Sprache: Deutsch (Standard) oder Englisch (`prefs.lang`, nur in den Einstellungen umstellbar).
   Die Oberfläche wird auf Deutsch erzeugt; bei Englisch übersetzt `translate()` das fertige HTML vor dem Zeichnen:
   Texte zwischen Tags und die Attribute placeholder / aria-label / title / data-t. Erst exakte Treffer (DICT),
   dann Muster mit Zahlen/Namen (PATTERNS). Was fehlt, bleibt Deutsch – neue Texte hier eintragen. */

export const DICT = {
  'Break': 'Break', 'Zuerst im Finish': 'First in finish', 'Comeback': 'Comeback', 'Triple im Finish': 'Treble in finish',
  'The Game': 'The Game', 'High Finish · Treffer je Dart': 'High finish · hits per dart', '1. Dart': '1st dart', '2. Dart': '2nd dart', '3. Dart': '3rd dart',
  'Doppel': 'Doubles', 'Doppelquote anzeigen': 'Show double rate', 'Doppelquote im Spiel anzeigen': 'Show double rate in game',
  'in diesem Spiel – neben Letzte und Average': 'in this game – next to last and average', 'Zahl-Vorschläge': 'Score suggestions', 'Zahl-Vorschläge im Spiel': 'Score suggestions in game',
  'deine häufigsten Aufnahmen über der Tastatur': 'your most frequent scores above the keypad', 'Spiel wirklich löschen?': 'Really delete game?',
  'Du hast noch 3 Spiele offen': 'You still have 3 open games', 'Zu den offenen Spielen': 'To your open games', 'Weiterspielen': 'Continue',
  'Spiel eins davon zu Ende oder lösche eins auf der Play-Seite (Mülleimer) – dann kannst du ein neues starten.': 'Finish one of them or delete one on the Play page (bin) – then you can start a new one.',
  // Reiter, Navigation, Allgemeines
  'Spielen': 'Play', 'Statistik': 'Stats', 'Zurück': 'Back', 'Weiter': 'Next', 'Fertig': 'Done', 'Abbrechen': 'Cancel', 'Schließen': 'Close',
  'Bestätigen': 'Confirm', 'Löschen': 'Delete', 'Entfernen': 'Remove', 'Hinzufügen': 'Add', 'Speichern': 'Save', 'Sichern': 'Save', 'Starten': 'Start',
  'Start': 'Start', 'Nochmal': 'Again', 'Nochmal!': 'Again!', 'Bearbeiten': 'Edit', 'Mehr': 'More', 'Ja': 'Yes', 'Nein': 'No', 'Aus': 'Off', 'An': 'On',
  'Übersicht': 'Overview', 'Einstellungen': 'Settings', 'Profil': 'Profile', 'Dein Profil': 'Your profile', 'Suche …': 'Searching …', 'Live': 'Live',
  'Rückgängig': 'Undo', 'Überspringen': 'Skip', 'Erneut versuchen': 'Try again', 'Zur Übersicht': 'Back to overview', 'Revanche': 'Rematch',
  'Nach oben': 'Move up', 'Antippen für Details': 'Tap for details', 'Lange drücken zum Umschalten': 'Long-press to switch', 'Bald': 'Soon',
  'Unbekannter Fehler': 'Unknown error', 'Der Server ist gerade nicht erreichbar.': 'The server is not reachable right now.',
  'Offline – wird nachgeholt': 'Offline – will sync later', 'Fehler – wird erneut versucht': 'Error – retrying', 'Wird gesichert …': 'Saving …',
  'Antippen zum Starten': 'Tap to start',

  // Anmeldung
  'Willkommen': 'Welcome', 'Willkommen zurück': 'Welcome back', 'Passwort': 'Password', 'Passwort vergessen?': 'Forgot password?', 'ändern': 'change',
  'Schau in dein Postfach': 'Check your inbox', 'Nichts angekommen? Schau auch im Spam-Ordner nach.': 'Nothing arrived? Check your spam folder too.',
  'Zurück zur Anmeldung': 'Back to sign in', 'Neues Passwort': 'New password', 'Neues Konto': 'New account', 'Dein Name': 'Your name',
  'Passwort festlegen': 'Choose a password', 'E-Mail oder Name': 'Email or name', '1 · Konto': '1 · Account', '2 · Passwort': '2 · Password',
  '2 · Konto anlegen': '2 · Create account', '2 · Neues Passwort': '2 · New password',
  'Melde dich mit deiner E-Mail oder deinem Namen an. Neu hier? Dann mit E-Mail – den Rest klären wir im nächsten Schritt.': 'Sign in with your email or your name. New here? Use your email – we will sort out the rest in the next step.',
  'Deine Spiele liegen sicher in deinem Konto – spielen geht auch offline.': 'Your games are safe in your account – you can also play offline.',
  'Dein Passwort': 'Your password', 'Mindestens 8 Zeichen': 'At least 8 characters', 'Passwort wiederholen': 'Repeat password', 'Eindeutiger Name': 'Unique name',
  'name@beispiel.de oder Name': 'name@example.com or name', 'Anmelden': 'Sign in', 'Konto anlegen': 'Create account', 'Moment …': 'One moment …',
  'Passwort speichern': 'Save password', 'Freunde finden dich darüber · ohne Leerzeichen': 'Friends find you by it · no spaces',
  'Die beiden Passwörter sind nicht gleich.': 'The two passwords do not match.', 'Neues Passwort gespeichert': 'New password saved',

  // Play
  'Partyspiele': 'Party games', 'Partyspiel': 'Party game', 'Spiel fortsetzen': 'Resume game', 'Laufendes Spiel löschen': 'Delete running game',
  'X01 spielen': 'Play X01', 'Partyspiele entdecken': 'Discover party games', 'Entdecken': 'Discover', 'Bald spielbar': 'Coming soon',
  'Auf deinem Play-Reiter': 'On your Play tab', 'Du hast schon alle Partyspiele auf deinem Play-Reiter.': 'All party games are already on your Play tab.',
  'Noch keine Partyspiele auf Play – füge oben welche hinzu.': 'No party games on Play yet – add some above.', '501 spielen': 'Play 501',

  // Spiele
  'Fußball': 'Football', 'Halbieren': 'Halve-It', 'Challenge': 'Challenge', 'Highscore': 'High score', 'Around the Clock': 'Around the Clock',
  'Jeder wirft eine feste Anzahl Runden. Wer am Ende die meisten Punkte hat, gewinnt.': 'Everyone throws a fixed number of rounds. Most points at the end wins.',

  // Setup
  'Spieler & Bots': 'Players & bots', 'Spiel': 'Game', 'Mehr Optionen': 'More options', 'Startpunkte': 'Starting score', 'Check-Out': 'Check-out', 'Check-In': 'Check-in',
  'Gespielt wird in': 'Played in', 'Modus': 'Mode', 'Variante': 'Variant', 'Nur Schließen': 'Close only', 'Mit Punkten': 'With points', 'Runden (max.)': 'Rounds (max.)',
  'Tore': 'Goals', 'Sieg bei': 'Win at', 'Runden': 'Rounds', 'Ziele': 'Targets', 'Ende': 'End', 'Mit Bull': 'With bull', 'Bis 20': 'Up to 20',
  'Tore bis zum Sieg': 'Goals to win', 'Tore (Seite 1 · Seite 2)': 'Goals (side 1 · side 2)', 'Anwurf': 'Throw first', 'fängt an': 'starts', 'Ausbullen': 'Bull-off',
  'Vor dem Match wirft jede Seite einen Dart aufs Bull. Wer am nächsten dran ist, fängt an.': 'Before the match each side throws one dart at the bull. Closest starts.',
  'Der erste Spieler bzw. das erste Team der Liste fängt an.': 'The first player or team in the list starts.', 'Spielweise': 'Format',
  'Solo starten': 'Start solo', 'Spieler hinzufügen': 'Add player', 'Wer wirft heute mit?': 'Who is playing today?', 'Freunde': 'Friends', 'Gast': 'Guest', 'Bot': 'Bot',
  'spielt schon mit': 'already playing', 'Du hast noch keine Freunde – füge sie unter „More“ hinzu.': 'You have no friends yet – add them under “More”.',
  'Lade Freunde …': 'Loading friends …', 'Alle Bots spielen schon mit.': 'All bots are already playing.', 'Noch keine Spieler ausgewählt.': 'No players selected yet.',
  'Reihenfolge mischen': 'Shuffle order', 'Das Spiel': 'The Game', 'Weniger': 'Less', 'Doppel gestellt': 'Double set up', 'Zuerst im Finish': 'First in the finish', 'Comeback': 'Comeback', 'Break': 'Break', 'Triple im Finish': 'Triple in the finish', 'Partyspiele mitzählen': 'Include party games', 'Noch keine X01-Partyspiele gespielt': 'No X01 party games played yet',
  'X01-Varianten aus den Partyspielen (z. B. 301, Double In) zusätzlich zu 501': 'X01 variants from the party games (e.g. 301, Double In) in addition to 501', 'Antippen zum Umschalten': 'Tap to switch', 'Mikrofon': 'Microphone', 'Punkte ansagen statt tippen': 'Call scores instead of typing', 'an – Punkte ansagen': 'on – call your scores',
  'Darts per Kamera erkennen': 'Detect darts by camera', 'erkennt die Darts': 'detecting darts', 'An': 'On', 'Aus': 'Off', 'Mikrofon aus': 'Microphone off', 'Nutzer simulieren': 'Simulate a player', 'Zahlen selbst einsprechen': 'Record your own calls',
  'Ein Spieler mit einem Jahr Spielen und Ø 70 – so siehst du, was die App alles kann. Nur auf diesem Gerät, ohne Konto.': 'A player with a year of games and a 70 average – see everything the app can do. Only on this device, no account.',
  'Demo: ein Jahr gespielt, Ø 70': 'Demo: one year played, 70 average', 'Erst mit deinem Konto anmelden': 'Sign in with your account first',
  'Im Demo-Modus nicht verfügbar – melde dich mit einem Konto an.': 'Not available in demo mode – sign in with an account.', 'Double In? Oder X01?': 'Double In? Or X01?', 'Double In? Single Out? Oder X01?': 'Double In? Single Out? Or X01?',
  'Double In, Single Out und die anderen Startwerte (101 · 301 · 701 · 1001) gibt es im Modus X01 – füge ihn auf Play unter „Partyspiele“ beim': 'Double In, Single Out and the other starting scores (101 · 301 · 701 · 1001) are in the X01 mode – add it on Play under “Party games” with the', 'Zu den Partyspielen': 'To the party games',
  'Double In und die anderen Startwerte (101 · 301 · 701 · 1001) findest du auf Play unter „Partyspiele“ beim': 'You find Double In and the other starting scores (101 · 301 · 701 · 1001) on Play under “Party games” behind the',
  'Tastatur: T20 · D16 · S5 · B = Bull · 0 = daneben': 'Keyboard: T20 · D16 · S5 · B = Bull · 0 = miss', 'Farbskala: links schwach, rechts stark': 'Colour scale: weak on the left, strong on the right', 'Jeder für sich': 'Free for all', 'Teams': 'Teams', 'Die Spielregeln': 'The rules', 'Spielregeln': 'Rules',
  'Nur 501-Matches zählen für die Statistik.': 'Only 501 matches count for the stats.', 'Mit Kamera-Erkennung spielen': 'Play with camera detection',
  'Würfe kommen von der Kamera, du kannst sie korrigieren': 'Throws come from the camera, you can correct them', 'Gast · nur dieses Spiel, ohne Statistik': 'Guest · this game only, no stats',
  'Fußball spielt man immer einer gegen einen – genau zwei Spieler in der Liste.': 'Football is always one against one – exactly two players in the list.',
  'Teams gibt es ab 2 Spielern – im Team spielt ihr zusammen von 501 herunter.': 'Teams need at least 2 players – a team plays down from 501 together.',
  'Tippe bei den Spielern auf „Team“, um sie zuzuordnen. Im Team wird reihum geworfen, in der Reihenfolge der Liste.': 'Tap “Team” on the players to assign them. Team members throw in turn, in list order.',
  'jeder an seinem Gerät, der Anwurf wird ausgelost.': 'each on their own device, the starter is drawn.', 'Spielt auf meinem Gerät mit': 'Plays on my device',
  'Spielt auf seinem Gerät mit': 'Plays on their own device', 'Anderen Freund wählen': 'Choose another friend', 'spielt auf seinem Gerät': 'plays on their device',
  'spielt hier mit, bestätigt danach': 'plays here, confirms afterwards', 'Wie spielt': 'How does', 'mit?': 'play?',
  'Wie heißt dein Gast? Er spielt nur dieses Spiel mit – nichts wird für ihn gespeichert, beim nächsten Spiel gibst du den Namen neu ein. Wer seine Statistik behalten will, legt ein Konto an und wird dein Freund.': 'What is your guest called? They only play this game – nothing is saved for them, next game you enter the name again. Anyone who wants to keep stats creates an account and becomes your friend.',
  'Mindestens ein Spieler': 'At least one player', 'Mindestens zwei Teams nötig': 'At least two teams needed', 'Mindestens ein Mensch muss mitspielen': 'At least one human must play',
  'Fußball spielt man einer gegen einen – genau zwei Spieler': 'Football is one against one – exactly two players',
  'Online spielst du allein gegen einen Freund – nur ihr zwei in der Liste': 'Online you play alone against one friend – only you two in the list',
  'Online spielst du nur gegen deinen Freund': 'Online you only play against your friend', 'Einzeldart-Eingabe': 'Single dart input', 'Spiel beenden': 'End game',
  'Neues Spiel?': 'New game?', 'Spiel beenden?': 'End game?', 'Weiterspielen': 'Keep playing',

  // Spiel
  'Überworfen': 'Bust', 'Bust': 'Bust', 'Rest': 'Left', 'Daneben': 'Miss', 'Miss': 'Miss', 'Miss / 0': 'Miss / 0', 'Treffer?': 'Hit?', 'Tastatur': 'Keypad',
  'Dartscheibe': 'Dartboard', 'Erst ein Doppel': 'Double first', 'Stellen': 'Set up', 'Ball': 'Ball', 'Ziel': 'Target', 'hat den Ball': 'has the ball',
  'auf seinem Gerät – du siehst jeden Dart hier': 'on their device – you see every dart here', 'Letzte': 'Last', 'Tor': 'Goal', 'Aufs Tor': 'At goal',
  'Ball frei': 'Ball free', 'Ball holen': 'Get the ball', 'Verfehlt': 'Missed', 'Single Bull · Ball': 'Single bull · ball', 'Bullseye · Ball': 'Bullseye · ball',
  'Tor!': 'Goal!', 'zählt nur mit Ball': 'only counts with the ball', 'oder anderes Feld': 'or another field', 'Mikrofon: Punkte ansagen': 'Microphone: call your score',
  'Letzte Eingabe zurücknehmen': 'Undo last entry', 'Rückgängig geht nur für deine eigene letzte Eingabe': 'You can only undo your own last entry',
  'Maximal 180': 'Maximum 180', 'Wertung in': 'Scoring in', 'Aufnahme beenden': 'End turn', 'Zur Kamera-Scheibe': 'To camera board', 'War daneben': 'Was a miss',
  'jetzt aufs Feld tippen': 'now tap the field', 'bitte prüfen': 'please check', 'antippen zum Ändern': 'tap to change',
  'Die Kamera ist sich nicht sicher – gelbe Kästen prüfen, dann OK': 'The camera is not sure – check the yellow boxes, then OK',
  'Tippe auf das Feld, das wirklich getroffen wurde': 'Tap the field that was really hit', 'Alles richtig? Sonst Kasten antippen': 'All correct? Otherwise tap a box',
  'Wo hast du genau getroffen?': 'Where exactly did you hit?', 'Wo genau getroffen?': 'Where exactly?', 'Gleichstand': 'Tie', 'für das Team': 'for the team',
  'wirft aufs Bull': 'throws at the bull',
  'Finger auf die Scheibe halten, wo der Dart steckt – die Lupe zeigt die genaue Stelle. Loslassen setzt den Dart.': 'Hold your finger where the dart is – the magnifier shows the exact spot. Release to place the dart.',
  'Single': 'Single', 'Double': 'Double', 'Triple': 'Triple', 'Single Bull': 'Single bull', 'Bull': 'Bull', 'Darts': 'Darts', 'Punkte': 'Points', 'Leg': 'Leg', 'Set': 'Set',
  'Summe': 'Total', 'Danach': 'After', 'Aufnahme im Leg': 'Turn in leg', 'Aufnahmen': 'Turns', 'Leg!': 'Leg!', 'Set!': 'Set!', 'Kein Score': 'No score',
  'Einhundertachtzig!': 'One hundred and eighty!', 'Halbiert': 'Halved', 'Spracheingabe geht in diesem Browser nicht': 'Voice input does not work in this browser',
  'Mikrofon nicht erlaubt – in den Einstellungen des Browsers freigeben': 'Microphone not allowed – enable it in the browser settings', 'Darts gezogen': 'Darts pulled',

  // Ergebnis
  'Sieg': 'Win', 'Niederlage': 'Loss', 'Unentschieden': 'Draw', 'Training': 'Practice', 'Ø 3 Darts': 'Avg 3 darts', 'First 9 Ø': 'First 9 avg',
  'Höchste Aufnahme': 'Highest turn', 'Höchstes Finish': 'Highest finish', 'Pro Spieler': 'Per player', 'Höchste': 'Highest', 'Platzierung': 'Ranking',
  'Für eine Revanche lade deinen Freund neu ein': 'For a rematch invite your friend again', 'Das Online-Spiel wurde beendet': 'The online game was ended',

  // Statistik
  'Überblick': 'Overview', 'Doppel': 'Doubles', 'Scoring': 'Scoring', 'Gesamt': 'All time', 'Zeitraum': 'Period', 'Welche Spiele sollen in die Statistik?': 'Which games should count?',
  'Alle gespeicherten Spiele': 'All saved games', 'Letztes Jahr': 'Last year', 'Letzte 7 Tage': 'Last 7 days', 'Letzte 30 Tage': 'Last 30 days', '7 Tage': '7 days',
  '30 Tage': '30 days', '1 Jahr': '1 year', 'Zurück auf Gesamt': 'Back to all time', 'Average': 'Average', 'Modus 501': '501 mode', 'First 9': 'First 9',
  'Darts geworfen': 'Darts thrown', 'Ø Darts aufs Doppel': 'Avg darts at double', 'pro Checkout': 'per checkout', 'Bestes Leg': 'Best leg', '180er': '180s',
  'Höchstes Checkout': 'Highest checkout', 'Quote nach Bereich': 'Rate by range', 'Top 5 Checkouts': 'Top 5 checkouts', 'Top 10 Checkouts': 'Top 10 checkouts', 'Checkout-Versuche ab Rest 101 – getroffen, wenn das Finish danach noch geht': 'Checkout attempts from 101 – a hit keeps the finish possible', 'Doppelquote': 'Checkout rate',
  'Lieblingsdoppel': 'Favourite double', 'Verteilung der Aufnahmen': 'Score distribution', 'Aufnahmen im Leg': 'Turns per leg', 'Average pro Match': 'Average per match',
  'First 9 Average pro Match': 'First 9 average per match', 'Average gesamt': 'Overall average', 'First 9 Average gesamt': 'Overall first 9 average', 'Average insgesamt nach jedem Match': 'Overall average after each match', 'First-9-Average insgesamt nach jedem Match': 'Overall first 9 average after each match', 'Average insgesamt bis zu diesem Match': 'Overall average up to this match', 'First 9 Average insgesamt bis zu diesem Match': 'Overall first 9 average up to this match', 'Ø der ersten drei Aufnahmen jedes Legs': 'Average of the first three turns of each leg',
  'Doppelquote gesamt': 'Overall checkout rate', 'nur Scoring – Rest über 170': 'scoring only – above 170 left', 'Doppelquote insgesamt bis zu diesem Match': 'Overall checkout rate up to this match',
  'Ruhige Zeiten': 'Quiet times', 'Die Bühne ist frei': 'The stage is yours', 'In diesem Zeitraum wurde kein 501-Match gespielt.': 'No 501 match was played in this period.',
  'Noch zu wenig Daten': 'Not enough data yet', 'Auffällig': 'Notable', 'Matchdart-Nerven': 'Match dart nerves', 'Die Hand zittert ein wenig.': 'The hand shakes a little.',
  'Eiskalt, wenn es zählt.': 'Ice cold when it counts.', 'Nerven wie Drahtseile.': 'Nerves of steel.', 'Entscheidungsleg': 'Deciding leg',
  'Du lebst für den Showdown.': 'You live for the showdown.', 'Da wird es eng in der Brust.': 'It gets tight in the chest.', 'Ganz normal weiter.': 'Business as usual.',
  'Bust-Schock': 'Bust shock', 'Erster Versuch': 'First attempt', 'Der erste sitzt.': 'The first one sits.', 'Du brauchst Anlauf.': 'You need a run-up.',
  'High Finish': 'High finish', 'Nach dem langen Weg wackelt das Doppel.': 'After the long way the double wobbles.', 'Wenn du schon mal da bist, sitzt er.': 'Once you are there, it sits.',
  'Egal wie du hinkommst.': 'No matter how you get there.', 'Wochentag': 'Weekday', 'Treffer': 'Hits', 'Versuche': 'Attempts', 'Quote': 'Rate', 'Feld': 'Field',
  'Deine Doppel': 'Your doubles', 'Wenn du nicht triffst, wirfst du': 'When you miss, you throw', 'Inside': 'Inside', 'Outside': 'Outside', 'daneben (0) →': 'off the board (0) →',
  'Noch keine Daten in diesem Zeitraum.': 'No data in this period yet.', 'pro Match': 'per match', 'gleitender Schnitt (5)': 'moving average (5)',
  'Punkt antippen = Match': 'tap a point = match', 'Noch zu wenige Legs für diesen Verlauf.': 'Not enough legs for this chart yet.', 'Noch nichts eingetragen': 'Nothing entered yet',
  'Vergleichen': 'Compare', 'Vergleich': 'Comparison', 'Spieler wählen': 'Choose player', 'Wessen Statistik möchtest du sehen?': 'Whose stats do you want to see?',
  'Lade Statistik …': 'Loading stats …', 'Match': 'Match', 'Matches': 'Matches', 'Bester Average': 'Best average', 'Siegquote': 'Win rate', 'Längste Serie': 'Longest streak',
  'Doppelfelder': 'Double fields', 'Keine 501-Matches im Zeitraum.': 'No 501 matches in this period.', 'Spieler 1': 'Player 1', 'Spieler 2': 'Player 2',
  'Direkte Duelle (501)': 'Head to head (501)', 'Wen möchtest du vergleichen?': 'Who do you want to compare?',
  'Für einen Vergleich braucht es mindestens zwei Spieler.': 'A comparison needs at least two players.', 'Checkout': 'Checkout', 'Doppelquote je Feld': 'Checkout rate per field',
  'deutlich besser (ab 1,5×)': 'much better (from 1.5×)', 'etwa deine Quote': 'about your rate', 'schwächer': 'weaker', 'deutlich schwächer (unter 0,5×)': 'much weaker (below 0.5×)',
  'nicht beendet': 'not finished', 'angesagt, ohne einzelne Darts': 'called, without single darts', 'als Summe eingegeben': 'entered as a total',

  // Historie
  'Spielhistorie': 'Game history', 'Alle': 'All', 'Party': 'Party', 'Noch keine Spiele': 'No games yet', 'Nichts in dieser Auswahl': 'Nothing in this selection',
  'Jedes fertig gespielte Spiel landet hier. Gelöschte Spiele zählen nicht mehr in der Statistik.': 'Every finished game lands here. Deleted games no longer count in the stats.',
  'Spiel löschen': 'Delete game', 'Spiel löschen?': 'Delete game?', 'Spiel gelöscht': 'Game deleted', 'Spiel nicht gefunden': 'Game not found', 'Nicht gefunden': 'Not found',
  'Dieses Spiel gibt es nicht mehr.': 'This game no longer exists.', 'Herausforderungen': 'Challenges',
  'Das Spiel verschwindet aus der Historie und zählt nicht mehr in der Statistik – auch auf deinen anderen Geräten und bei deinen Freunden. Das lässt sich nicht rückgängig machen.': 'The game disappears from the history and no longer counts in the stats – also on your other devices and for your friends. This cannot be undone.',

  // VIP / Freunde
  'Freund hinzufügen': 'Add friend', 'Namen suchen …': 'Search names …', 'Angefragt': 'Requested', 'Annehmen': 'Accept', 'Ablehnen': 'Decline', 'Anfragen': 'Requests',
  'möchte dein Freund sein': 'wants to be your friend', 'Gesendete Anfragen': 'Sent requests', 'wartet auf Antwort': 'waiting for reply', 'Zurückziehen': 'Withdraw',
  'Hast du diese Spiele gespielt?': 'Did you play these games?', 'Gespielt auf dem Gerät eines Freundes. Erst mit deinem Haken zählen sie für deine Statistik.': 'Played on a friend’s device. They only count for your stats once you tick them.',
  'Noch allein am Oche': 'Still alone at the oche', 'Such oben nach dem Namen deiner Freunde und schick eine Anfrage. Sobald sie annehmen, siehst du ihre Statistik.': 'Search for your friends’ names above and send a request. Once they accept, you can see their stats.',
  'Einladungen zum Spiel': 'Game invitations', 'Freund': 'Friend', 'Overall-Average · 501': 'Overall average · 501', 'Noch kein 501': 'No 501 yet', 'Gespielt': 'Played',
  'Spiele': 'Games', 'Freund entfernen': 'Remove friend', 'Freund entfernen?': 'Remove friend?', 'Nicht gespielt': 'Not played', 'Ja, gespielt': 'Yes, played',
  'Profil bearbeiten': 'Edit profile', 'Dart (Platzhalter)': 'Dart (placeholder)', 'Einladung zurückziehen': 'Withdraw invitation', 'Freund hinzugefügt': 'Friend added',
  'Anfrage abgelehnt': 'Request declined', 'Anfrage zurückgezogen': 'Request withdrawn', 'Freund entfernt': 'Friend removed', 'Dein Freund': 'Your friend',
  'Eigener Caller': 'Own caller', 'Kamera': 'Camera', 'Zahlen einsprechen': 'Record numbers', 'Konto · Ansage · Eingabe': 'Account · voice · input',
  'Dieses Handy filmt das Board': 'This phone films the board', 'Alle Spiele · löschen': 'All games · delete', 'Dein Dart ist da': 'Your dart is here',

  // Profil / Konto
  'Name': 'Name', 'Freunde finden dich darüber': 'Friends find you by it', 'E-Mail': 'Email', 'Daten': 'Data', 'Passwort ändern': 'Change password', 'Abmelden': 'Sign out',
  'Dein Dart': 'Your dart', 'Leg ihn auf einen ruhigen, einfarbigen Tisch und fotografiere ihn von oben – die App schneidet ihn aus, der Tisch verschwindet.': 'Put it on a calm, single-coloured table and photograph it from above – the app cuts it out, the table disappears.',
  'Leg ihn flach auf einen ruhigen, einfarbigen Tisch und fotografiere ihn von oben – die App misst Form, Rillen und Farben und zeichnet ihn im Stil der App. Das Foto wird zur Verbesserung der Erkennung gespeichert.': 'Lay it flat on a calm, plain table and photograph it from above – the app measures shape, grooves and colours and draws it in the app style. The photo is stored to improve detection.',
  'Rillen': 'Grooves', 'Wie Foto': 'As photo', 'Flight-Muster': 'Flight pattern', 'Aus dem Foto': 'From photo', 'Einfarbig': 'Plain', 'Silber': 'Silver', 'Schwarz': 'Black', 'Farbe': 'Colour', 'Flight-Farbe': 'Flight colour', 'Weniger Rillen': 'Fewer grooves', 'Mehr Rillen': 'More grooves',
  'Dart nicht sauber erkannt. Leg ihn flach und ganz ins Bild, von oben fotografiert.': 'Dart not detected cleanly. Lay it flat, fully in frame, photographed from above.',
  'Dart fotografieren': 'Photograph dart', 'Neues Foto': 'New photo', 'Erkenne Dart …': 'Detecting dart …', 'Konto löschen': 'Delete account', 'Konto löschen?': 'Delete account?',
  'Eindeutig – Freunde finden dich darüber. 3–16 Zeichen, ohne Leerzeichen.': 'Unique – friends find you by it. 3–16 characters, no spaces.',
  'Aktuelles Passwort': 'Current password', 'Neues Passwort (mind. 8 Zeichen)': 'New password (min. 8 characters)', 'Andere Geräte werden danach abgemeldet.': 'Other devices will be signed out.',
  'Nicht gesichert': 'Not saved', 'Trotzdem abmelden': 'Sign out anyway', 'Endgültig löschen': 'Delete permanently', 'Passwort geändert': 'Password changed',
  'Konto gelöscht': 'Account deleted', 'Name geändert': 'Name changed',
  'Dein Konto, alle gespeicherten Spiele und deine Freundschaften werden endgültig gelöscht. Zur Bestätigung dein Passwort:': 'Your account, all saved games and your friendships will be deleted permanently. Confirm with your password:',

  // Einstellungen
  'Ansage': 'Voice', 'Checkout-Hilfe': 'Checkout help', 'Average anzeigen': 'Show average', 'Average im Spiel anzeigen': 'Show average in game',
  'Darts im Leg anzeigen': 'Show darts in leg', 'Kamera: Würfe automatisch übernehmen': 'Camera: accept throws automatically', 'Kamera: Debug-Ansicht': 'Camera: debug view',
  'Animationen': 'Animations', 'Bewegung in den Kästen': 'Motion in the boxes', 'Lichter, Glanz und Funkeln an Karten, Kacheln und Leisten': 'Lights, shine and sparkle on cards, tiles and bars',
  'Sprache': 'Language', 'Checkout-Vorschläge enden, wenn möglich, auf diesem Doppel': 'Checkout suggestions end on this double where possible',
  'Testdaten entfernen': 'Remove test data', 'Testdaten entfernen?': 'Remove test data?', 'Testdaten entfernt': 'Test data removed',
  'Alle Test-Matches und die Testspieler werden gelöscht. Deine echten Spiele und Spieler bleiben erhalten.': 'All test matches and test players will be deleted. Your real games and players stay.',

  // Caller
  'Eigene Ansagen abspielen': 'Play own calls', 'Beliebt': 'Popular', 'Alle Zahlen': 'All numbers', 'Aufnehmen': 'Record', '▶ Anhören': '▶ Listen', '● Neu': '● New',
  'Ansage für': 'Call for', 'Warte auf Mikrofon …': 'Waiting for microphone …', 'Sprich jetzt – höchstens 5 Sekunden.': 'Speak now – 5 seconds max.',
  'Mikrofon wird freigegeben … Bitte den Zugriff erlauben.': 'Enabling microphone … Please allow access.',
  'Noch keine Aufnahme. Tippe auf Aufnehmen und sag die Zahl so, wie du sie hören willst.': 'No recording yet. Tap Record and say the number the way you want to hear it.',
  'Sprich deine Lieblingszahlen selbst ein. Wirfst du im Spiel genau diese Zahl, hörst du deine Stimme statt der Computer-Ansage. Gilt für deine eigenen Aufnahmen in X01 und Highscore.': 'Record your favourite numbers yourself. When you throw exactly that number in a game, you hear your voice instead of the computer. Applies to your own turns in X01 and High score.',
  'Gold umrandet = eingesprochen. Die Aufnahmen liegen in deinem Konto und sind auf all deinen Geräten da.': 'Outlined = recorded. The recordings are in your account and on all your devices.',
  'Kein Zugriff aufs Mikrofon – bitte in den Einstellungen des Browsers erlauben.': 'No microphone access – please allow it in the browser settings.',

  // Challenge
  'Drei zufällige Herausforderungen, eine Stunde Zeit. Hake ab, was du geschafft hast – nur alle drei zählen als Sieg.': 'Three random challenges, one hour. Tick off what you managed – only all three count as a win.',
  'Level wählen': 'Choose level', 'Noch': 'Left', 'Aufgeben': 'Give up', 'Neue Challenge': 'New challenge', 'Challenge abbrechen?': 'Cancel challenge?', 'Challenge abgebrochen': 'Challenge cancelled',
  'Abbrechen: die Challenge verschwindet, ohne in der Historie zu landen. Aufgeben: sie wird mit deinem Stand gespeichert.': 'Cancel: the challenge disappears without landing in the history. Give up: it is saved with your progress.',
  'Die drei Herausforderungen verschwinden und nichts wird in der Historie gespeichert.': 'The three challenges disappear and nothing is saved in the history.',
  'Leicht': 'Easy', 'Mittel': 'Medium', 'Schwer': 'Hard', 'Extrem': 'Extreme',

  // Kamera / Regie (Auswahl)
  'Regie': 'Control', 'Hier wird gespielt': 'Play here', 'Dieses Gerät filmt mit': 'This device films', 'Wie soll dieses Gerät mitmachen?': 'How should this device join?',
  'Kamera steuern': 'Control camera', 'Kamera trennen': 'Disconnect camera', 'Kamera läuft': 'Camera running', 'Kamera starten': 'Start camera', 'Kamera getrennt': 'Camera disconnected',
  'Kamera verbunden': 'Camera connected', 'Kamera-Gerät verbunden': 'Camera device connected', 'Kamera verrutscht': 'Camera moved', 'Verbinden': 'Connect', 'Beenden': 'Stop',
  'Neu kalibrieren': 'Recalibrate', 'Kalibrieren': 'Calibrate', 'Link teilen': 'Share link', 'Objektiv': 'Lens', 'Einrichten': 'Set up', 'Neu einrichten': 'Set up again',
  'Erkennung pausieren': 'Pause detection', 'Erkennung fortsetzen': 'Resume detection', 'Als Kamera-Gerät nutzen': 'Use as camera device', 'Kamera-Gerät verbinden': 'Connect camera device',
  'Nur dieses Gerät': 'This device only', 'Kamera und Scoreboard auf demselben Gerät': 'Camera and scoreboard on the same device', 'Eine Kamera läuft': 'A camera is running',
  'nicht eingerichtet': 'not set up', 'Getrennt': 'Disconnected', 'Verbinde …': 'Connecting …', 'verbinde …': 'connecting …', 'Antippen für Einstellungen': 'Tap for settings',
  'Kamerabild …': 'Camera image …', 'Kamerabild groß': 'Large camera image', 'Dart nicht erkannt': 'Dart not detected', 'So lassen': 'Keep', 'Erkannt:': 'Detected:',
};

/** Texte mit Zahlen/Namen */
const PATTERNS = [
  [/^(\d+)\/(\d+) gestellt$/, (m, a, b) => `${a}/${b} set up`],
  [/^(\d+)\/(\d+) Aufnahmen ab 61 Rest – nach Dart 1 oder 2 stand ein Doppel$/, (m, a, b) => `${a}/${b} visits from 61 left – a double was left after dart 1 or 2`],
  [/^Quote Rest (.+)$/, (m, r) => `Rate left ${r}`],
  [/^Seite (\d+)$/, (m, n) => `Page ${n}`],
  [/^([SDT]\d{1,2}) gibt es nicht$/, (m, d) => `${d} does not exist`],
  [/^(\d+) Spiele? · zuletzt (heute|gestern)$/, (m, n, d) => `${n} game${n === '1' ? '' : 's'} · last played ${d === 'heute' ? 'today' : 'yesterday'}`],
  [/^(\d+) Spiele? · zuletzt vor (\d+) Tag(en)?$/, (m, n, d) => `${n} game${n === '1' ? '' : 's'} · last played ${d} day${d === '1' ? '' : 's'} ago`],
  [/^(\d+) Spieler · (\d+) gespeicherte Spiele$/, (m, a, b) => `${a} player${a === '1' ? '' : 's'} · ${b} saved games`],
  [/^Deine Freunde · (\d+)$/, (m, n) => `Your friends · ${n}`],
  [/^Rest (\d+)$/, (m, n) => `Left ${n}`],
  [/^Leg (\d+) · First to (\d+) Legs$/, (m, a, b) => `Leg ${a} · First to ${b} legs`],
  [/^Set (\d+) · Leg (\d+) · First to (\d+) Sets$/, (m, a, b, c) => `Set ${a} · Leg ${b} · First to ${c} sets`],
  [/^First to … (Legs|Sets)$/, (m, a) => `First to … ${a.toLowerCase()}`],
  [/^(\d+) Fehlwürfe · (\d+)× inside · (\d+)× outside$/, (m, a, b, c) => `${a} misses · ${b}× inside · ${c}× outside`],
  [/^Noch kein Versuch auf (.+)\.$/, (m, k) => `No attempt at ${k} yet.`],
  [/^Jeder Versuch auf (.+) war ein Treffer\.$/, (m, k) => `Every attempt at ${k} was a hit.`],
  [/^← ins Board \(alles außer (.+)\)$/, (m, k) => `← into the board (anything but ${k})`],
  [/^(.*) · gegen (.+)$/, (m, a, b) => `${tr(a)} · vs ${b}`],
  [/^gegen (.+)$/, (m, b) => `vs ${b}`],
  [/^(\d+) (Matches|Match) · (\d+)\/(\d+) Legs$/, (m, a, b, c, d) => `${a} ${b === 'Match' ? 'match' : 'matches'} · ${c}/${d} legs`],
  [/^Rest (.+)$/, (m, r) => `Left ${r}`],
  [/^(.+) ist dran$/, (m, n) => `${n} to throw`],
  [/^Kein Konto mit dem Namen „(.+)“\. Neu hier\? Dann mit deiner E-Mail registrieren\.$/, (m, n) => `No account with the name “${n}”. New here? Then register with your email.`],
  [/^Wir haben dir eine E-Mail (.*) geschickt\. Über den Link darin legst du ein neues Passwort fest – er gilt eine Stunde\.$/, (m, a) => `We sent you an email ${a.replace(/^an die Adresse deines Kontos$/, 'to your account’s address').replace(/^an /, 'to ')}. Use the link in it to set a new password – it is valid for one hour.`],
  [/^(\d+) Darts?$/, (m, n) => `${n} dart${n === '1' ? '' : 's'}`],
  [/^(\d+) Legs?$/, (m, n) => `${n} leg${n === '1' ? '' : 's'}`],
  [/^(\d+) Sets?$/, (m, n) => `${n} set${n === '1' ? '' : 's'}`],
  [/^(\d+) Tore$/, (m, n) => `${n} goals`],
  [/^(\d+) Pkt$/, (m, n) => `${n} pts`],
  [/^Gegen (.+)$/, (m, n) => `Against ${n}`],
];

export function tr(s) {
  if (!s) return s;
  if (Object.prototype.hasOwnProperty.call(DICT, s)) return DICT[s];
  for (const [re, fn] of PATTERNS) { const m = re.exec(s); if (m) return fn(...m); }
  return s;
}

/** Ein Textstück übersetzen, Leerraum drumherum behalten */
function trSeg(seg) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(seg);
  if (!m[2] || !/[A-Za-zÄÖÜäöüß]/.test(m[2])) return seg;
  const t = tr(m[2].replace(/\s+/g, ' '));
  return t === m[2].replace(/\s+/g, ' ') ? seg : m[1] + t + m[3];
}

/** Ganzes HTML übersetzen (nur wenn Englisch gewählt ist) */
export function translate(html, lang) {
  if (lang !== 'en' || !html) return html;
  return html
    .replace(/>([^<>]+)</g, (all, txt) => `>${trSeg(txt)}<`)
    .replace(/\b(placeholder|aria-label|title|data-t)="([^"]*)"/g, (all, a, v) => `${a}="${trSeg(v)}"`);
}
