# Abnahme Bruchmonster (Task 12)

Erzeugt von `scripts/acceptance.py` (Playwright, Chrome headless). Wiederholbar mit:

```
node scripts/build-e2e.mjs && python3 scripts/acceptance.py --md tests/e2e-smoke.md
```

| Schritt | Ergebnis | Detail |
|---|---|---|
| Profil anlegen (Tastatur: Name tippen, Enter) | ✅ |  |
| Runde Zahlenstrahl-Labor (nur Tastatur): 5 Aufgaben, 5 richtig | ✅ | Münzen 0->12, nicht lösbar: 0 |
| Runde Bruchstreifen-Werkstatt: 5 Aufgaben, 5 richtig | ✅ | Münzen 12->24, nicht lösbar: 0 |
| Tab bleibt im Rückmeldeblatt (7x Tab) | ✅ |  |
| Shift+Tab bleibt im Rückmeldeblatt (7x) | ✅ |  |
| Esc schließt das Blatt nach Fehlversuch und Fokus liegt im Antwortbereich | ✅ | blatt weg=True, fokus im widget=True |
| Runde Alltag und Rezepte: 5 Aufgaben, 5 richtig | ✅ | Münzen 24->34, nicht lösbar: 0 |
| Runde Fehler-Detektiv: 5 Aufgaben, 5 richtig | ✅ | Münzen 34->56, nicht lösbar: 0 |
| Münzen gesammelt | ✅ | 0 -> 56 |
| Kaufen: Futter, Kleidung, Möbel (3 + 10 + 10 Münzen) | ✅ | 70 -> 47 |
| Kleidung anziehen | ✅ |  |
| Möbel aufstellen | ✅ |  |
| Höhle: Möbelzeile kompakt (<= 90 px bei 1280) | ✅ | 84 px |
| Futter erhöht Wachstum | ✅ | Noch 30 Wachstum bis Baby-Monster. -> Noch 24 Wachstum bis Baby-Monster. |
| Export liefert Datei mit Münzen, Besitz und Höhle | ✅ | coins=47 |
| Profil löschen mit Rückfrage | ✅ |  |
| Neues Profil "Neu" startet bei 0 Münzen | ✅ |  |
| Import stellt Münzen wieder her | ✅ | 47 == 47 |
| Import stellt Kleidung und Höhle wieder her | ✅ | socken=True, hocker=True |
| Hauptlauf: 0 Konsolenfehler | ✅ |  |
| Hauptlauf: 0 Netzanfragen außerhalb file:/data: | ✅ |  |
| Reduced Motion: matchMedia greift | ✅ |  |
| Reduced Motion: keine laufenden Animationen nach richtiger Antwort | ✅ | animationen=0, fliegende Münzen=0 |
| Ohne localStorage: Warnhinweis auf dem Profil-Bildschirm | ✅ |  |
| Ohne localStorage: Profil anlegen und Aufgabe lösen funktioniert | ✅ |  |
| Gesamt: 0 Konsolenfehler/Seitenfehler (alle Läufe) | ✅ |  |
| Gesamt: 0 Netzanfragen außerhalb file:/data: | ✅ |  |
| Kein horizontales Scrollen bei 360 px | ✅ | 25 Bildschirmzustände geprüft |

## Tippflächen unter 44 px

Gemessen bei 360 px Breite an allen Bildschirmzuständen. Ausnahme: einzelne Streifenstücke (SVG) sind bei 10 und mehr
Teilen schmaler als 44 px (Höhe 44 px). Das ist geometrisch nicht zu vermeiden; Gegenmittel: Ziehen über mehrere Stücke
malt sie, die Tastatur erreicht jedes Stück, und die Knöpfe "Ein Stück mehr/weniger" ersetzen das Antippen.

- 18x44 px: `rect|Teil 1 von 12` (Aufgabe strips)
- 37x44 px: `rect|Teil 1 von 6` (Aufgabe strips)
- 32x44 px: `rect|Teil 1 von 7` (Aufgabe strips)
- 18x44 px: `rect|Teil 10 von 12` (Aufgabe strips)
- 18x44 px: `rect|Teil 11 von 12` (Aufgabe strips)
- 18x44 px: `rect|Teil 12 von 12` (Aufgabe strips)
- 18x44 px: `rect|Teil 2 von 12` (Aufgabe strips)
- 37x44 px: `rect|Teil 2 von 6` (Aufgabe strips)
- 32x44 px: `rect|Teil 2 von 7` (Aufgabe strips)
- 18x44 px: `rect|Teil 3 von 12` (Aufgabe strips)
- 37x44 px: `rect|Teil 3 von 6` (Aufgabe strips)
- 32x44 px: `rect|Teil 3 von 7` (Aufgabe strips)
- 18x44 px: `rect|Teil 4 von 12` (Aufgabe strips)
- 37x44 px: `rect|Teil 4 von 6` (Aufgabe strips)
- 32x44 px: `rect|Teil 4 von 7` (Aufgabe strips)
- 18x44 px: `rect|Teil 5 von 12` (Aufgabe strips)
- 37x44 px: `rect|Teil 5 von 6` (Aufgabe strips)
- 32x44 px: `rect|Teil 5 von 7` (Aufgabe strips)
- 18x44 px: `rect|Teil 6 von 12` (Aufgabe strips)
- 37x44 px: `rect|Teil 6 von 6` (Aufgabe strips)
- 32x44 px: `rect|Teil 6 von 7` (Aufgabe strips)
- 18x44 px: `rect|Teil 7 von 12` (Aufgabe strips)
- 32x44 px: `rect|Teil 7 von 7` (Aufgabe strips)
- 18x44 px: `rect|Teil 8 von 12` (Aufgabe strips)
- 18x44 px: `rect|Teil 9 von 12` (Aufgabe strips)

## Geprüfte Bildschirmzustände (360 px)

Aufgabe (Welt 0, Art 1), Aufgabe (Welt 0, Art 2), Aufgabe (Welt 1, Art 1), Aufgabe (Welt 1, Art 2), Aufgabe (Welt 2, Art 1), Aufgabe (Welt 3, Art 1), Aufgabe input, Aufgabe mark, Aufgabe numberline, Aufgabe strips, Experiment, Hub, Höhle, Höhle (leer), Karten, Monster, Profil (leer), Profil (mit Eintrag), Rueckmeldeblatt, Rundenende, Schrank, Shop Futter, Shop Kleidung, Shop Möbel, Welt-Liste
