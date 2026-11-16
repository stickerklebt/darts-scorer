# Bilder der Bots

Die App bringt keine Bilder der Figuren mit. Wenn du eigene Bilder hier ablegst,
zeigt die App sie automatisch an – sonst erscheint ein gestalteter Platzhalter
(Initialen in der Bot-Farbe).

Erwartete Dateinamen (quadratisch, z. B. 256 × 256 Pixel):

| Bot         | Datei                                     |
|-------------|-------------------------------------------|
| Sensei Wu   | `sensei-wu.png` oder `sensei-wu.jpg`      |
| Super Mario | `super-mario.png` oder `super-mario.jpg`  |
| Shrek       | `shrek.png` oder `shrek.jpg`              |

Danach den Dateinamen in `bilder.json` eintragen, z. B.:

```json
{ "sensei-wu": "sensei-wu.png", "super-mario": "super-mario.jpg", "shrek": null }
```

`null` heißt: kein Bild, Platzhalter anzeigen. (Die Liste verhindert, dass die App
nach fehlenden Dateien sucht.) Nach dem Hochladen (Commit auf `main`) die App
zweimal öffnen, damit die neue Version geladen wird.

Namen, Farben und Sprüche der Bots stehen in `js/bots.js`.
