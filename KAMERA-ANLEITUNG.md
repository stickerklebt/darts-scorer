# Kamera-Erkennung – Anleitung

Die App kann deine Würfe mit einer Handykamera erkennen. Das ist eine **Hilfe, kein Schiedsrichter**: Jeder Wurf erscheint
im Scoreboard und lässt sich mit einem Tipp korrigieren. Manuelle Eingabe geht immer.

## 1. Aufstellen
- Das **Kamera-Gerät** (meist das iPhone) steht **seitlich neben dem Board** – auf einem Stuhl, Regal oder Klemmhalter.
- Abstand **40–80 cm**, etwa auf Boardhöhe oder leicht darunter, **schräg aufs Board** gerichtet.
- Mindestens **30 cm außerhalb des Boardrands**, damit kein Dart das Handy trifft.
- **Das ganze Board muss im Bild sein.** Gleichmäßiges Licht hilft (keine harten Schatten, kein Gegenlicht).
- Ladekabel anschließen: Die Kamera läuft dauerhaft und das Display bleibt an.

## 2. Verbinden (zwei Geräte)
1. Am **Kamera-Gerät**: *Spielen* › **Kamera** › **„Als Kamera-Gerät nutzen“**. Kamera erlauben.
   Oben steht ein **6-stelliger Code**. („Link teilen“ schickt einen Link, der das andere Gerät direkt verbindet.)
2. Am **Steuer-Gerät** (meist das iPad, hier läuft das Spiel): *Spielen* › **„Kamera-Gerät verbinden“** › Code eingeben.
3. Oben rechts zeigt ein kleines Schild den Stand: **● Kamera verbunden** (grün), **● Verbinde …** (gelb), **● Getrennt** (rot).
   Bricht die Verbindung ab, versucht die App es alle 3 Sekunden neu – das Spiel läuft solange mit Eingabe von Hand weiter.

**Nur ein Gerät?** *Kamera* › **„Nur dieses Gerät“**: Kamera und Scoreboard auf demselben Gerät, das Livebild klein oben rechts.

## 3. Kalibrieren (am Kamera-Gerät)
1. Hinweis zum Aufstellen lesen › *Weiter*.
2. Nacheinander auf **4 Punkte** tippen – jeweils der **äußere Rand des Doppelrings** in der **Mitte** der Felder
   **20 (oben), 6 (rechts), 3 (unten), 11 (links)**. Beim Tippen erscheint eine **Lupe**; Punkte lassen sich verschieben.
3. **Kontrolle:** Ringe und Linien werden übers Bild gelegt, unten rechts eine entzerrte Draufsicht. Liegen sie auf den Drähten › *Passt*.
4. **Testdart** werfen (optional) – das erkannte Feld wird angezeigt.

Beim nächsten Start fragt die App, ob sie die letzte Kalibrierung nehmen soll – aber nur, wenn das Bild noch gleich aussieht.

## 4. Spielen
- Im Setup (501/X01 und Cricket) erscheint **„Mit Kamera-Erkennung spielen“** – an lassen.
- Über der Eingabe stehen **3 Dart-Felder**, daneben ein kleines Board mit den Treffern.
  **Gelb mit „Bitte prüfen“** = die Kamera ist unsicher (z. B. Dart nah am Draht).
- Nach 3 Darts läuft **2 Sekunden** ein Countdown, dann wird die Aufnahme gewertet. Davor kannst du korrigieren.
  (Einstellungen › „Kamera: Würfe automatisch übernehmen“ aus → jede Aufnahme mit **OK** bestätigen.)
- **Korrigieren:** auf ein Dart-Feld tippen › Bild vom Wurf ansehen › Single/Double/Triple + Zahl, 25, Bull oder Miss wählen.
- **Miss / 0:** Dart daneben oder abgeprallt (die Kamera trägt in dem Fall nichts ein).
- **Aufnahme beenden:** weniger als 3 Darts (z. B. Checkout) – fehlende Darts zählen als daneben.
- **Darts gezogen:** falls die Kamera das Ziehen nicht selbst merkt.
- Bots werfen weiter virtuell; solange ein Bot dran ist, ignoriert die App Kamera-Würfe.

## 5. Typische Probleme
| Problem | Lösung |
|---|---|
| „Kamera nicht erlaubt“ | iPhone: Einstellungen › Safari › Kamera › Erlauben (oder „aA“ in der Adressleiste › Website-Einstellungen), dann neu laden. |
| „Kamera verrutscht – bitte neu kalibrieren“ | Handy wurde bewegt. Am Kamera-Gerät *Neu kalibrieren*. |
| Falsches Feld, oft am Triple/Double | Kamera etwas tiefer und seitlicher stellen, Licht verbessern, neu kalibrieren. |
| Dart wird gar nicht erkannt | Dart verdeckt einen anderen oder steckt im Schatten → *Miss / 0* bzw. von Hand eintragen. |
| Erkennt Würfe, während jemand vor dem Board steht | Kurz warten – die Erkennung wertet erst ruhige Bilder aus. |
| Getrennt | Beide Geräte brauchen Internet. Die App verbindet sich selbst neu (gleicher Code). |
| Debuggen | Einstellungen › „Kamera: Debug-Ansicht“ – zeigt am Kamera-Gerät Differenzbild, Achse und Spitze. |
