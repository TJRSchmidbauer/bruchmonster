# Bruchmonster – Design (Entwurf zur Freigabe)

Arbeitstitel: **Bruchmonster** (mein Vorschlag, änderbar)

## Absicht
Kinder der 6. Klasse (Gymnasium und Realschule, Bayern) sollen Brüche verstehen, nicht nur ausrechnen. Wer das System nicht durchschaut, soll es wenigstens durch viel Übung sicher anwenden. Die Kinder wählen selbst, auf welchem Weg sie lernen, und werden durch ein Monster belohnt, das sie großziehen.

Fachliche Grundlage (Recherche): Fehler entstehen meist durch fehlende oder nicht erweiterte Grundvorstellungen (Malle, Padberg, Wartha). Längenmodelle und Zahlenstrahl gelten als besonders wirksam, Flächenmodelle ergänzen sie. Brüche haben fünf Aspekte: Teil vom Ganzen, Verhältnis, Operator, Skalenwert, Quotient. Alle fünf sollen vorkommen.

## Ziele
- Vier frei wählbare Welten mit je vielen Aufgaben in drei Stufen.
- Stoff v1 (LehrplanPLUS M6, Bruchzahlen): Bruchbegriff und Darstellen, Erweitern, Kürzen, Vergleichen, Addieren und Subtrahieren, Multiplizieren und Teilen durch natürliche Zahlen.
- Meta-Ebene: Das Kind entdeckt und begründet Regeln selbst, bevor sie genannt werden.
- Monster-System: füttern und entwickeln, einkleiden und färben, Wohnhöhle einrichten, Sammelkarten und Serien.
- Hilfen: Tipp-Stufen, Fehlertyp-Erkennung, Erklär-Animation, Ausprobieren zuerst.
- Mehrere Profile pro Gerät, Spielstand als Export- und Importdatei.
- Ton: frech und witzig, ohne Kinder bloßzustellen.

## Nicht-Ziele (v1)
Kein Moodle-/mebis-Paket (später möglich), kein Server, keine Konten, keine Lehrer-Übersicht, keine Dezimalbrüche, Prozente oder negativen Zahlen.

## Anti-Ziele (wäre ein Misserfolg, auch wenn es läuft)
- Punkte farmen ohne Verständnis (z. B. nur die leichteste Stufe wiederholen).
- Regeln ohne Bild oder Begründung.
- Frust oder Spott bei Fehlern.
- Lösungen raten und durchklicken zahlt sich aus.

## Rahmenbedingungen
- Läuft lokal, **keine Anfragen an fremde Server** (keine Web-Fonts oder CDNs, alles eingebettet).
- Eine einzige HTML-Datei zum Ausliefern.
- Bedienbar mit Touch und Maus, Handy bis PC, große Tippflächen, sichtbarer Tastaturfokus, reduzierte Bewegung wird beachtet, gute Kontraste.
- Bunter Comic-Look, schön gestaltet nach üblichen App-Regeln, unabhängig vom Markenhandbuch.

## Die vier Welten
1. **Zahlenstrahl-Labor:** Brüche platzieren und schätzen, vergleichen, Brüche zwischen zwei Brüchen finden (Dichte), gemischte Zahlen. Aspekt: Skalenwert.
2. **Bruchstreifen-Werkstatt:** Streifen und Flächen teilen, übereinanderlegen, Erweitern und Kürzen als feineres und gröberes Teilen, Addieren mit gemeinsamer Teilung, Multiplizieren als Bruchteil vom Bruchteil. Aspekte: Teil vom Ganzen, Operator.
3. **Alltag und Rezepte:** Anteile von Größen, Rezepte skalieren, Geld und Zeit, geteilte Mengen. Aspekte: Operator, Verhältnis, Quotient.
4. **Fehler-Detektiv und Regel-Forscher:** Falsche Rechnungen entlarven (z. B. Zähler und Nenner addiert), Regeln durch Experimente herausfinden und in eigenen Worten begründen.

Jede Welt: drei Stufen (leicht, mittel, knackig), Realschule und Gymnasium nutzen dieselben Welten, die Stufe wählt das Kind selbst, die App empfiehlt nur.

## Aufgaben
Mischung aus **Generatoren** (praktisch unbegrenzt, mit Stufen und Zahlenbereichen) für das Üben und **handgeschriebenen Aufgaben** für Alltag, Geschichten und Detektivfälle. Aufgabenformate: ziehen und platzieren, Streifen teilen, Antwort eintippen, Auswahl, Fehler markieren, Regel vervollständigen.

## Führung und Empfehlung
Freie Wahl der Welt. Ein Hinweis schlägt vor, was gerade passt (Basis: Fehlerquote pro Aufgabentyp und Zeit seit dem letzten Üben). Es wird nichts gesperrt.

## Hilfen bei Fehlern
- Tipp-Stufen: Hinweis, dann Visualisierung, dann Lösungsweg. Nutzen von Tipps senkt die Belohnung leicht, bestraft aber nicht.
- Fehlertyp-Erkennung: Die App erkennt typische Fehler (Nenner addiert, größerer Nenner heißt größerer Bruch, Erweitern nur im Nenner usw.) und zeigt ein Gegenbeispiel am Modell.
- Erklär-Animation: kurz, am Streifen oder Zahlenstrahl.
- Ausprobieren zuerst: Neue Themen beginnen mit einem Experiment, die Regel folgt danach.

## Belohnung und Monster
Punkte werden zu Münzen. Mehr Münzen gibt es für richtige Antworten ohne Tipp, für Serien und für Aufgaben, die eine Begründung verlangen. Mit Münzen kauft man Futter (Monster entwickelt sich in Stufen), Kleidung und Farben (Inventar), Möbel für die Wohnhöhle und bekommt Sammelkarten für Serien. Ein Deckel pro Tag und Aufgabentyp verhindert reines Farmen.

## Speicher
Mehrere Profile pro Gerät im Browser. Export und Import als Datei.

## Ton
Frech und witzig. Fehler sind Anlass für einen Gag über die Aufgabe, nie über das Kind.

## Ansätze (Abwägung)
- **A: Eine HTML-Datei, selbst geschriebenes JavaScript.** Läuft überall, keine Abhängigkeiten, passt zu "lokal ohne fremde Server". **Gewählt.**
- **B: Projekt mit Build-Werkzeug und Rahmenwerk.** Gut wartbar, aber mehr Technik und für Lehrkräfte schwerer zu ändern.
- **C: Erst ein spielbarer Kern.** Schnelles Feedback. Dein Wunsch war "alles in einem Rutsch", daher nicht gewählt.

## Meine Entscheidungen (bitte prüfen)
- Quelltext in mehreren Modulen, ein Skript baut daraus die eine HTML-Datei.
- Monster, Kleidung und Möbel als SVG, damit sie sich kombinieren und färben lassen.
- Tests für Aufgabengeneratoren und Fehlertyp-Erkennung, damit die Mathematik stimmt.

## Dem Bauenden überlassen
Monsterarten, Namen, genaue Preise und Belohnungswerte, Anzahl der Items, Texte und Witze, Farbwelt und Typografie.
