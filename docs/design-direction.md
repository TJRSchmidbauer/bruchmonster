# Bruchmonster – Gestaltungsrichtung

**Für wen:** 10- bis 12-Jährige, am Handy, Tablet oder Schul-PC. **Hauptjob:** Brüche anfassen, ausprobieren, Monster päppeln. **Ton:** frech, warm, nie gemein.

## Die eine Idee
**Sticker-Comic.** Alles sieht aus wie dicke, ausgeschnittene Aufkleber: kräftige Tinten-Kontur (3 px), harter versetzter Schatten (4 px nach unten rechts, Tintenfarbe, keine Unschärfe), satte Flächenfarben. Das Erkennungsmerkmal sind **große, gestapelte Brüche** (Zähler über dickem Bruchstrich über Nenner) als eigenes Bauteil – Brüche sind hier Figuren, nicht Text. Sonst bleibt die Oberfläche ruhig: viel Fläche, wenig Deko.

## Farben (Custom Properties)
| Token | Hex | Rolle |
|---|---|---|
| `--ink` | `#2B1B3D` | Pflaumentinte: Konturen, Text, Schatten (kein Schwarz) |
| `--bg` | `#EDE4FF` | Gelee-Lila: Seitenhintergrund |
| `--paper` | `#FFFFFF` | Flächen von Aufgaben und Dialogen |
| `--pumpkin` | `#FF8A1F` | Hauptaktion (Prüfen, Kaufen) |
| `--lemon` | `#FFD43B` | Münzen, Serien |
| `--algae` | `#22A866` | Richtig |
| `--bramble` | `#D93D73` | Achtung/Fehler (sparsam, nie großflächig) |
| Welt `strahl` | `#14A9BD` | Türkis |
| Welt `streifen` | `#FF8A1F` | Kürbis |
| Welt `alltag` | `#7DB82F` | Kiwi |
| Welt `detektiv` | `#7B5CFF` | Violett |

Text auf Farbflächen immer `--ink` (Kontrast prüfen, mind. 4.5:1); Weiß nur auf `--ink` oder Violett.

## Schrift
- **Grandstander** (OFL, `@fontsource/grandstander`, Gewichte 700 und 900): Überschriften, Brüche, Zahlen, Münzen, Knöpfe.
- **Atkinson Hyperlegible** (OFL, `@fontsource/atkinson-hyperlegible`, 400 und 700): Fließtext, Aufgaben, Tipps – gut lesbar auch für schwächere Leser.
- Beide als woff2 per Data-URI ins HTML einbetten (nur latin-Subset), keine externen Anfragen. Fallback `system-ui`.
- Skala (rem): 0.875 · 1 · 1.25 · 1.5 · 2 · 3; Bruchbauteil 2.5–4 rem. Zeilenhöhe Fließtext 1.5, Überschriften 1.1. Zeilenlänge ≤ 60 Zeichen.
- Keine Großbuchstaben-Labels, keine Etiketten über Überschriften, kein einzelnes eingefärbtes Wort in Überschriften.

## Formen
- Radien nach Rang: Seitenflächen 28 px, Karten/Kacheln 20 px, Knöpfe 999 px (Pille), Eingabefelder 14 px.
- Knopf: Kontur + harter Schatten; beim Drücken `translate(2px,2px)` und Schatten 2 px (fühlt sich gedrückt an). Mindesthöhe 52 px.
- Fokus: 4 px `--lemon`-Ring außen plus 2 px Tinte innen (auf allen Hintergründen sichtbar).

## Layout
Mobil zuerst, zentrierte Spalte max. 720 px, linksbündiger Text.

```
Hub                          Aufgabe
┌──────────────────────┐     ┌──────────────────────┐
│ Profil   🪙 128  Serie│     │ ←  Zahlenstrahl  🪙 128│
│  ┌────────────────┐  │     │  ● ● ● ○ ○  (Fortschritt)
│  │  Monster in    │  │     │ ┌──────────────────┐ │
│  │  seiner Höhle  │  │     │ │ Aufgabe + großer  │ │
│  └────────────────┘  │     │ │ gestapelter Bruch │ │
│ Monster-Sprechblase: │     │ │   [ Widget ]      │ │
│ Empfehlung           │     │ └──────────────────┘ │
│ ┌────────┐┌────────┐ │     │                      │
│ │Zahlen- ││Bruch-  │ │     │ [Tipp]     [Prüfen]  │ ← klebt unten
│ │strahl  ││streifen│ │     └──────────────────────┘
│ ├────────┤├────────┤ │     Rückmeldung: Blatt fährt von
│ │Alltag  ││Detektiv│ │     unten hoch, Monster reagiert
│ └────────┘└────────┘ │
│ [Monster füttern]    │
└──────────────────────┘
```
Ab 900 px: Hub zweispaltig (Monster links, Welten rechts); Aufgabe bleibt einspaltig, Widget wird breiter.

Weltkacheln sind nicht identisch: jede hat ihre Weltfarbe und ein eigenes kleines SVG-Motiv (Zahlenstrahl mit Pfeil, Streifenstapel, Kochtopf, Lupe) und den Fortschritt als Anzahl gesammelter Sterne.

## Bewegung
- Genau ein inszenierter Moment: bei richtiger Antwort hüpft das Monster und Münzen fliegen zum Münzzähler (≤ 700 ms).
- Sonst nur Bewegung als Antwort auf Handlungen: Blatt öffnet, Knopf drückt, Streifen rastet ein.
- `prefers-reduced-motion: reduce` → keine Bewegung, nur Zustandswechsel.

## Sprache
Kurz, Du-Form, Satzanfang groß. Knöpfe sagen, was passiert: „Prüfen", „Nächste Aufgabe", „Kaufen", „Anziehen". Fehlermeldungen sagen, was zu tun ist („Unten steht eine 0 – durch null teilen kann nicht mal ein Monster."). Witz über die Aufgabe oder das Monster, nie über das Kind.
