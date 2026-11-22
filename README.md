# Bruchmonster

Eine Lern-App zur Bruchrechnung für die 6. Klasse (Gymnasium und Realschule). Kinder üben in vier frei wählbaren Welten, verdienen Münzen und ziehen damit ein Comic-Monster groß: füttern, einkleiden, eine Höhle einrichten, Sammelkarten finden.

Die App besteht aus **einer einzigen HTML-Datei**. Sie läuft komplett im Browser, braucht kein Internet, kein Konto und keinen Server. Es werden keine Daten übertragen, und Schriften oder Skripte kommen nicht von fremden Servern.

**[Zur Datei `dist/bruchmonster.html`](dist/bruchmonster.html)** (auf „Raw“ klicken, speichern, per Doppelklick öffnen)

## Worum es didaktisch geht

Die App will nicht nur Rechenwege abfragen, sondern das System hinter den Brüchen sichtbar machen. Die Ideen dahinter stammen aus der Didaktik der Bruchrechnung (Grundvorstellungen nach Malle, Padberg, Wartha; Ergebnisse aus PALMA).

- **Vier Zugänge zum selben Stoff.** Kinder wählen frei, die App empfiehlt nur. Gesperrt wird nichts.
  - **Zahlenstrahl-Labor:** Brüche platzieren, schätzen, vergleichen.
  - **Bruchstreifen-Werkstatt:** darstellen, erweitern, kürzen, addieren, subtrahieren, Bruchteil vom Bruchteil.
  - **Alltag und Rezepte:** Anteile von Größen, Rezepte umrechnen, Teilen durch natürliche Zahlen.
  - **Fehler-Detektiv:** den Fehler in einer Rechnung finden und Regeln selbst entdecken.
- **Ausprobieren zuerst.** Vor jeder neuen Aufgabenart steht ein kleines Experiment, erst danach kommt die Regel. „Kenn ich schon“ überspringt es.
- **Längen statt Flächen.** Zahlenstrahl und Streifen sind die Hauptdarstellungen, weil sie die Zahlvorstellung stützen.
- **Typische Fehlvorstellungen werden erkannt.** Wer „Zähler plus Zähler, Nenner plus Nenner“ rechnet, bekommt eine passende Gegenzeichnung statt nur „falsch“.
- **Hilfe in Stufen.** Bis zu drei Tipps, dann eine Erklärzeichnung. Die Lösung zeigt die App erst nach Versuchen.
- **Raten lohnt sich nicht.** Nach einem Fehlversuch gibt es bei Auswahl-, Zahlenstrahl- und Streifenaufgaben keine Münzen mehr. Je Aufgabenart gilt ein Tageslimit. Es gibt keine Rangliste und keine Konkurrenz.

Stoff: Bruchbegriff, Darstellen, Vergleichen, Erweitern und Kürzen, Addieren und Subtrahieren, Multiplizieren und Teilen durch natürliche Zahlen (angelehnt an LehrplanPLUS Mathematik 6, Bayern).

## Benutzung

1. `dist/bruchmonster.html` herunterladen und im Browser öffnen. Getestet ist die App mit Chrome; andere aktuelle Browser sollten funktionieren, sind aber nicht geprüft. Maus, Touch und Tastatur sind vorgesehen.
2. Namen eingeben, Monster bekommen, Welt wählen.

**Wichtig:** Zum Spielen die Datei herunterladen und im normalen Browser-Fenster öffnen. In Vorschau-Fenstern (etwa in Chat-Programmen oder E-Mail-Vorschauen) kann der Browser das Speichern sperren, dann ist der Spielstand beim Schließen weg.

### Spielstand sichern

Der Spielstand liegt im Speicher des Browsers. Wer den Verlauf löscht oder das Gerät wechselt, braucht eine Sicherung:

- **Exportieren:** auf dem Profilbildschirm beim Profil „Exportieren“, oder im Hub „Spielstand sichern“. Es entsteht eine kleine `.json`-Datei.
- **Importieren:** auf dem Profilbildschirm unter „Spielstand mitbringen“.
- Kann der Browser nicht speichern (Privatmodus, gesperrter Speicher), weist die App darauf hin und bleibt benutzbar.

## Grenzen

- Die App ist **noch nicht mit Kindern im Unterricht erprobt**.
- Ein Test mit echtem Touch-Gerät und eine Kontrastmessung stehen noch aus. Bei 9 bis 12 Streifenstücken sind einzelne Stücke schmaler als 44 px. Als Ausweg gibt es „Ein Stück mehr/weniger“ und das Ziehen über mehrere Stücke.
- Eine Einbindung in Moodle oder mebis (SCORM, H5P) ist denkbar, aber nicht gebaut.

## Entwicklung

Voraussetzung: Node 22.

```
npm install
npm test          # Tests (node:test, linkedom)
npm run build     # schreibt dist/bruchmonster.html
```

Aufbau: ES-Module in `src/` (Rechenkern in `src/core/`, Aufgaben in `src/tasks/`, Oberfläche in `src/ui/`), esbuild bündelt Skript, Stile und Schriften in eine Datei. Die Browser-Abnahme mit Playwright und Chrome ist skriptgesteuert:

```
node scripts/build-e2e.mjs
python3 scripts/acceptance.py --md tests/e2e-smoke.md
```

Entwurf und Plan liegen in `docs/superpowers/`, die Gestaltungsidee in `docs/design-direction.md`.

## Hinweis zu KI

Dieses Projekt ist mit KI-Unterstützung entstanden. Konzept, Didaktik, Auswahl der Inhalte und Freigabe stammen von mir. Programmcode, Aufgabentexte und Erklärungen hat weitgehend **Claude** (Anthropic) geschrieben, die Bruchrechnung der Aufgabengeneratoren ist durch automatische Tests abgesichert.

KI macht Fehler. Bitte sieh dir Aufgaben, Tipps und Erklärungen vor dem Einsatz im Unterricht selbst an und melde Fehler gern als Issue.

Mehr zu mir und meinem Umgang mit KI: **[schmidbauer.io](https://schmidbauer.io)**

## Lizenz

© 2026 Tobias Schmidbauer

[Creative Commons Namensnennung – Nicht kommerziell 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/deed.de). Nutzen, Kopieren, Weitergeben und Verändern sind erlaubt, auch im Unterricht, aber nur mit Namensnennung und nicht kommerziell. Die Nennung (Name und Lizenz) steht auf der Startseite der App und muss bei Weitergabe erhalten bleiben. Den Volltext enthält die Datei [`LICENSE`](LICENSE).

Die eingebetteten Schriften **Grandstander** und **Atkinson Hyperlegible** stehen unter der SIL Open Font License 1.1 und behalten ihre eigene Lizenz.
