# Bruchmonster

Bruchmonster ist eine lokale Lern-App für Klasse 6 (10 bis 12 Jahre): Bruchrechnen in vier Welten, dazu ein Comic-Monster, das mit jeder richtigen Antwort wächst. Oberfläche auf Deutsch, Anrede "du", Ton frech, aber nie spöttisch.

## Öffnen

Die Datei `bruchmonster.html` (aus `dist/`) per Doppelklick im Browser öffnen. Sie ist eine einzelne Datei, läuft ohne Internet und fragt keine fremden Server an. Es werden keine Daten an irgendjemanden gesendet. Funktioniert mit Maus, Touch und Tastatur, von 360 bis 1440 px Breite.

## Spielstand sichern und mitnehmen

Der Spielstand liegt im Speicher des Browsers (`localStorage`). Wer den Verlauf löscht oder ein anderes Gerät benutzt, braucht eine Sicherung:

- **Exportieren:** Profil-Bildschirm (oben auf den Namen tippen), beim Profil "Exportieren". Es entsteht eine kleine `.json`-Datei.
- **Importieren:** Auf dem Profil-Bildschirm unter "Spielstand mitbringen" die Datei auswählen.
- Im Privatmodus oder bei gesperrtem Speicher warnt die App und bleibt trotzdem benutzbar. Dann vor dem Schließen exportieren.

## Für Lehrkräfte

Vier Welten, je mit eigenen Aufgabenarten in drei Stufen:

- **Zahlenstrahl-Labor:** platzieren, schätzen, vergleichen, dazwischen.
- **Bruchstreifen-Werkstatt:** darstellen, erweitern, kürzen, addieren, subtrahieren, Bruchteil vom Bruchteil.
- **Alltag und Rezepte:** Anteil von einer Größe, Rezepte umrechnen, teilen durch natürliche Zahlen.
- **Fehler-Detektiv:** den Fehler in einer Rechnung finden, Regeln selbst entdecken.

Didaktische Idee:

- **Grundvorstellungen:** Bruch als Teil eines Ganzen, als Anteil, als Zahl auf dem Strahl und als Ergebnis einer Division. Die Welten bedienen jeweils eine andere Sicht.
- **Zahlenstrahl und Streifen** sind die zwei Hauptdarstellungen. Aufgaben zum Einfärben und Setzen sind bedienbar (Ziehen, Tippen, Tastatur).
- **Fehlvorstellungen** werden erkannt (zum Beispiel "Zähler plus Zähler, Nenner plus Nenner") und mit einer passenden Gegenzeichnung beantwortet statt nur mit "falsch".
- **Ausprobieren zuerst:** Zu neuen Themen gibt es ein kurzes Experiment mit Regel-Karte, bevor Aufgaben kommen ("Kenn ich schon" überspringt es).
- **Hilfen in Stufen:** bis zu drei Tipps, dann eine Erklärzeichnung, die Lösung erst nach Versuchen.
- **Belohnung:** Münzen (mit Tageslimit je Aufgabenart gegen Dauerklicken), Futter, Kleidung, Farben, Möbel und Sammelkarten mit Merksätzen. Es gibt keine Rangliste und keine Konkurrenz.

## Bauen

Voraussetzung: Node 22.

```
npm install
npm test          # Tests (node:test, linkedom)
npm run build     # schreibt dist/bruchmonster.html
```

Die Abnahme im Browser (Playwright und Chrome) ist skriptgesteuert und wiederholbar:

```
node scripts/build-e2e.mjs
python3 scripts/acceptance.py --md tests/e2e-smoke.md
```

Schriften (OFL) sind eingebettet, es gibt keine externen Abhängigkeiten zur Laufzeit.

## Ausblick

Eine Verpackung für Moodle oder mebis (SCORM oder H5P) wäre später möglich. Sie ist nicht gebaut.
