# Bruchmonster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine lokale Web-App, in der Kinder der 6. Klasse Brüche über vier frei wählbare Welten lernen und mit Punkten ein Monster füttern, einkleiden und einrichten.

**Architecture:** Quelltext als ES-Module in `src/`, getestet mit `node --test`. Ein Build-Skript (`esbuild`, nur Dev-Abhängigkeit) bündelt alles samt CSS und SVG in **eine** `dist/bruchmonster.html`. Reine Logik (Brüche, Aufgabengeneratoren, Fehlerdiagnose, Speicher, Belohnung) ist von der Oberfläche getrennt und vollständig testbar; die UI ist Vanilla-JS mit SVG.

**Tech Stack:** JavaScript (ES2022), `node:test`, `esbuild`, SVG, CSS. Keine Laufzeit-Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-11-22-bruchmonster-design.md`

## Global Constraints

- Läuft lokal, **keine Anfragen an fremde Server**: keine Web-Fonts, CDNs, Analytics. Schriften sind System-Fonts oder als Data-URI eingebettet.
- Auslieferung als eine einzige HTML-Datei: `dist/bruchmonster.html`.
- Touch und Maus, Handy bis PC, große Tippflächen (mind. 44 px), sichtbarer Tastaturfokus, `prefers-reduced-motion` wird beachtet, Kontrast mind. WCAG AA.
- Stoff v1: Bruchbegriff und Darstellen, Erweitern, Kürzen, Vergleichen, Addieren und Subtrahieren, Multiplizieren und Teilen durch natürliche Zahlen. Keine Dezimalbrüche, Prozente, negativen Zahlen.
- Vier Welten (Schlüssel): `strahl` (Zahlenstrahl-Labor), `streifen` (Bruchstreifen-Werkstatt), `alltag` (Alltag und Rezepte), `detektiv` (Fehler-Detektiv und Regel-Forscher). Drei Stufen `level` 1, 2, 3.
- Belohnung: Münzen; Tipps senken die Belohnung, bestrafen nicht; Tageslimit pro Aufgabentyp.
- Mehrere Profile pro Gerät; Export und Import als Datei.
- Ton: frech und witzig, nie auf Kosten des Kindes. Sprache Deutsch, Anrede "du".
- Optik: bunter Comic-Look, schöne App-Gestaltung nach üblichen Regeln (nicht Markenhandbuch von schmidbauer.io).
- Nenner in generierten Aufgaben höchstens 60, Ergebnisse höchstens 12 Ganze.

## Review Focus

1. Eingabe `3/0`, leer, Buchstaben, `- 1/2`: kein Absturz, freundliche Meldung (Task 2).
2. Eingabe mit Leerzeichen, `1 1/2`, ungekürzt (`2/4` statt `1/2`): wird erkannt, bei Kürzen-Aufgaben aber als "noch nicht gekürzt" markiert (Task 2, 3).
3. Import einer kaputten, leeren oder neueren Datei: Spielstand bleibt unverändert, klare Fehlermeldung (Task 5).
4. `localStorage` nicht verfügbar oder voll (Privatmodus): App läuft mit Speicher im Arbeitsspeicher weiter und warnt (Task 5).
5. Doppelklick auf "Prüfen" oder "Kaufen": Münzen werden nie doppelt vergeben oder abgezogen, Kontostand nie negativ (Task 6, 8).

---

## File Structure

```
package.json            scripts: test, build
build.mjs               bündelt src/ -> dist/bruchmonster.html
src/index.html          Gerüst mit Platzhaltern für CSS und JS
src/styles.css          Design-Tokens, Komponenten
src/main.js             Start, Router, aktive Profil-Sitzung
src/core/fractions.js   Bruch-Mathematik und Parser
src/core/rng.js         Zufall mit Seed
src/core/storage.js     Profile, Speicher, Export/Import
src/core/economy.js     Belohnung, Käufe, Monsterstufe
src/core/recommend.js   Kompetenz pro Aufgabentyp, Empfehlung
src/tasks/types.js      Task-Form, checkAnswer
src/tasks/generators.js Generatoren pro Aufgabentyp und Stufe
src/tasks/handwritten.js Alltagsaufgaben und Detektivfälle
src/tasks/errors.js     Fehlertyp-Erkennung und Gegenbeispiele
src/ui/dom.js           Hilfen: h(), Fokus, Ankündigungen
src/ui/runner.js        Aufgabenablauf, Tipp-Stufen, Rückmeldung
src/ui/widgets/numberline.js, strips.js, explain.js
src/ui/monster/art.js, wardrobe.js, cave.js, cards.js, shop.js
src/ui/screens/profile.js, hub.js, world.js, monster.js
tests/*.test.js
```

---

### Task 1: Projektgerüst und Build zu einer HTML-Datei

**Files:**
- Create: `package.json`, `build.mjs`, `src/index.html`, `src/styles.css`, `src/main.js`, `tests/build.test.js`

**Interfaces:**
- Produces: `npm test` (führt `node --test tests/`), `npm run build` (erzeugt `dist/bruchmonster.html`).

- [ ] **Step 1: Failing test** `tests/build.test.js`, Test `build erzeugt eine eigenständige Datei`: Baut, liest `dist/bruchmonster.html`, erwartet `<style>` und `<script>` inline und **keine** Treffer für `/(src|href)=["']https?:\/\//` und kein `@import`, `url(http`.
- [ ] **Step 2:** `npm test` ausführen, erwartet FAIL (Datei fehlt).
- [ ] **Step 3:** `git init`, `package.json` mit `esbuild` als devDependency und `"type": "module"`. `build.mjs` bündelt `src/main.js` als IIFE (minify aus), liest `src/styles.css` und `src/index.html`, ersetzt `<!--CSS-->` und `<!--JS-->` und schreibt `dist/bruchmonster.html`. `main.js` rendert vorerst `<h1>Bruchmonster</h1>`.
- [ ] **Step 4:** `npm test` erwartet PASS.
- [ ] **Step 5:** `.gitignore` (`node_modules`, `dist`), Commit `chore: scaffold build to single html`.

### Task 2: Bruch-Mathematik und Eingabe-Parser

**Files:**
- Create: `src/core/fractions.js`, `tests/fractions.test.js`

**Interfaces:**
- Produces:
  - `type Frac = { n: number, d: number }` (n ≥ 0, d ≥ 1, ganze Zahlen)
  - `frac(n, d): Frac` wirft `RangeError` bei d ≤ 0, nicht ganzen Zahlen oder n < 0
  - `gcd(a, b): number`, `lcm(a, b): number`
  - `simplify(f): Frac`, `isSimplified(f): boolean`, `equal(a, b): boolean`, `compare(a, b): -1|0|1`
  - `expand(f, k): Frac`, `add(a, b)`, `sub(a, b)` (wirft `RangeError` bei negativem Ergebnis), `mul(a, b)`, `divNat(f, k)` (k ≥ 1)
  - `toMixed(f): { whole: number, n: number, d: number }`, `fromMixed(whole, n, d): Frac`
  - `format(f): string` (`"3/4"`), `formatMixed(f): string` (`"1 1/2"`)
  - `parseAnswer(text: string): { ok: true, value: Frac } | { ok: false, reason: 'leer'|'nenner-null'|'format'|'negativ' }`

- [ ] **Step 1: Failing tests:** `add(frac(1,4), frac(1,6))` gleich `frac(5,12)` per `equal`; `compare(frac(2,3), frac(3,5)) === 1`; `simplify(frac(6,8))` → `{n:3,d:4}`; `sub(frac(1,3), frac(1,2))` wirft; `divNat(frac(3,4), 3)` → `{n:3,d:12}`; `toMixed(frac(7,4))` → `{whole:1,n:3,d:4}`; Parser: `" 3 / 4 "` ok `{3,4}`, `"1 1/2"` ok `{3,2}`, `"2"` ok `{2,1}`, `"3/0"` → `nenner-null`, `""` → `leer`, `"-1/2"` → `negativ`, `"abc"` → `format`.
- [ ] **Step 2:** Test ausführen, erwartet FAIL.
- [ ] **Step 3:** Implementieren; Ergebnisse von `add/sub/mul/divNat` werden **nicht** automatisch gekürzt (damit Kürzen-Aufgaben möglich sind). Parser trimmt, erlaubt Leerzeichen um `/`, erkennt gemischte Zahl.
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** Commit `feat: fraction math and answer parser`.

### Task 3: Aufgabenmodell, Zufall und Generatoren

**Files:**
- Create: `src/core/rng.js`, `src/tasks/types.js`, `src/tasks/generators.js`, `tests/generators.test.js`

**Interfaces:**
- Consumes: `fractions.js` (Task 2).
- Produces:
  - `makeRng(seed: number): () => number` (mulberry32, Werte in [0,1)), `randInt(rng, lo, hi): number`, `pick(rng, arr)`
  - `type Task = { id: string, world: World, kind: string, level: 1|2|3, prompt: string, widget: { type: 'input'|'numberline'|'strips'|'choice'|'mark', data: object }, answer: { type: 'frac'|'choice'|'position'|'marks', value: any, mustBeSimplified?: boolean }, hints: [string, string, string], explain: { type: 'strips'|'numberline', data: object }, meta: object }`
  - `checkAnswer(task: Task, input: any): { correct: boolean, mistake?: string, note?: 'nicht-gekuerzt' }`
  - `KINDS: Record<World, string[]>`: `strahl`: `platzieren`, `schaetzen`, `vergleichen`, `dazwischen`; `streifen`: `darstellen`, `erweitern`, `kuerzen`, `addieren`, `subtrahieren`, `bruchteil-vom-bruchteil`; `alltag`: `anteil-von-groesse`, `rezept`, `teilen-durch-nat`; `detektiv`: `fehler-finden`, `regel-entdecken`
  - `generate(kind: string, level: 1|2|3, rng): Task`
  - Stufen: 1 gleichnamig/Nenner ≤ 12; 2 ungleichnamig mit Nenner ≤ 20; 3 Hauptnenner bis 60, gemischte Zahlen, mehrstufig.

- [ ] **Step 1: Failing tests:** (a) Für jede Art in `KINDS` und jede Stufe 200 Seeds: Task hat 3 nicht leere `hints`, Nenner ≤ 60, Lösung existiert und `checkAnswer(task, task.answer.value)` ist `correct` (Eigenprobe, damit Generatoren nie falsche Aufgaben bauen). (b) Gleicher Seed erzeugt gleiche Aufgabe. (c) `erweitern`/`kuerzen` Stufe 2: Eingabe `2/4` bei Lösung `1/2` ergibt `correct:false, note:'nicht-gekuerzt'`. (d) `subtrahieren` erzeugt nie ein negatives Ergebnis.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementieren. Je Art eine Funktion; `generate` verteilt. Tipps: (1) Denkanstoß ohne Zahlen, (2) Hinweis zur Visualisierung (`explain.data`), (3) Lösungsweg mit Zahlen. `explain.data` enthält, was `strips`/`numberline` zeichnen.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: task model and generators`.

### Task 4: Fehlertyp-Erkennung

**Files:**
- Create: `src/tasks/errors.js`, `tests/errors.test.js`
- Modify: `src/tasks/types.js` (`checkAnswer` ruft `diagnose` auf)

**Interfaces:**
- Consumes: `Task`, `Frac`.
- Produces:
  - `type MistakeId = 'nenner-addiert' | 'groesserer-nenner' | 'nur-nenner-erweitert' | 'kreuz-multipliziert' | 'falsch-herum-geteilt' | 'ganzes-vergessen'`
  - `diagnose(task: Task, input: Frac): MistakeId | null`
  - `describe(id: MistakeId): { text: string, counter: { type: 'strips'|'numberline', data: object } }` (frecher Text, Gegenbeispiel am Modell)

- [ ] **Step 1: Failing tests:** `1/2 + 1/3` mit Eingabe `2/5` → `nenner-addiert`; Vergleich `1/3` vs `1/5` mit Antwort "1/5 ist größer" → `groesserer-nenner`; `erweitere 2/3 auf Nenner 12` mit Eingabe `2/12` → `nur-nenner-erweitert`; `3/4 : 3` mit Eingabe `9/4` → `falsch-herum-geteilt`; korrekte Antwort → `null`; unbekannter Fehler → `null`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementieren; jede Regel ist eine kleine Funktion, `diagnose` probiert sie der Reihe nach, nur Regeln passend zu `task.kind`.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: mistake diagnosis`.

### Task 5: Profile und Speicher mit Export/Import

**Files:**
- Create: `src/core/storage.js`, `tests/storage.test.js`

**Interfaces:**
- Produces:
  - `type Profile = { id: string, name: string, version: 1, coins: number, xp: number, owned: string[], wearing: Record<string,string>, cave: string[], cards: string[], mastery: Record<string,{ right: number, wrong: number, last: number }>, daily: Record<string,{ date: string, coins: number }>, streak: { days: number, lastDate: string } }`
  - `createStore(backend?: { getItem, setItem, removeItem }): Store`; fällt auf In-Memory-Backend zurück, wenn `localStorage` fehlt oder wirft; `store.persistent: boolean`
  - `store.listProfiles(): { id, name }[]`, `store.createProfile(name: string): Profile`, `store.load(id): Profile | null`, `store.save(p): { ok: boolean, reason?: 'voll'|'nicht-verfuegbar' }`, `store.remove(id)`
  - `exportProfile(p): string` (JSON mit `format: 'bruchmonster'`, `version`), `importProfile(text: string): { ok: true, profile: Profile } | { ok: false, reason: 'kein-json'|'falsches-format'|'zu-neu'|'beschaedigt' }`

- [ ] **Step 1: Failing tests:** Round-Trip Export/Import; `importProfile("")`, `"{"`, `{"format":"x"}`, `version: 99` liefern die jeweiligen Gründe; fehlende Felder in alter Datei werden mit Standardwerten ergänzt; Backend, das beim `setItem` wirft: `save` gibt `{ok:false, reason:'voll'}` und die App-Instanz bleibt benutzbar; Backend, das beim Zugriff wirft: `persistent === false`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren; Schlüssel `bruchmonster:profiles` und `bruchmonster:profile:<id>`. Namen auf 20 Zeichen kürzen.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: profiles and storage`.

### Task 6: Belohnung, Käufe, Monsterstufe, Empfehlung

**Files:**
- Create: `src/core/economy.js`, `src/core/recommend.js`, `tests/economy.test.js`, `tests/recommend.test.js`

**Interfaces:**
- Consumes: `Profile`, `Task`.
- Produces:
  - `ITEMS: { id, kind: 'futter'|'kleidung'|'farbe'|'moebel'|'karte', price: number, name: string }[]` (mindestens 6 Futter, 12 Kleidung/Farben, 10 Möbel, 8 Karten)
  - `reward(r: { level: 1|2|3, hintsUsed: number, streak: number, explained: boolean }): number` (Stufe 1: 2, Stufe 2: 3, Stufe 3: 5; je Tipp −1, mindestens 1; Serie ab 3 richtigen +1; Begründung +2)
  - `applyResult(p: Profile, task: Task, r: { correct: boolean, hintsUsed: number, explained: boolean }, today: string): { profile: Profile, coins: number, capped: boolean }` (Tageslimit 40 Münzen pro `kind`; bei Limit `coins: 0, capped: true`; falsche Antwort gibt 0, nie negativ)
  - `buy(p: Profile, itemId: string): { ok: true, profile: Profile } | { ok: false, reason: 'zu-wenig'|'schon-besessen'|'unbekannt' }`
  - `monsterStage(xp: number): 0|1|2|3|4` (Grenzen 0, 30, 100, 250, 500)
  - `recommend(p: Profile, nowMs: number): { world: World, kind: string, reason: string }`: höchste Fehlerquote bei mindestens 3 Versuchen, sonst am längsten nicht geübter oder neuer Typ

- [ ] **Step 1: Failing tests:** Beispielwerte oben; `buy` mit 5 Münzen bei Preis 10 → `zu-wenig`, Münzen unverändert; zweimal `buy` desselben Items → zweites `schon-besessen` (deckt Doppelklick); Tageslimit greift; `recommend` bei leerem Profil liefert gültige Art; bei Fehlerquote 80 % in `kuerzen` wird diese empfohlen.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren; Funktionen sind rein, geben neue Profile zurück. **Step 4:** PASS. **Step 5:** Commit `feat: economy and recommendation`.

### Task 7: Design-System, App-Gerüst, Profil- und Hub-Bildschirm

**Files:**
- Create: `src/ui/dom.js`, `src/ui/screens/profile.js`, `src/ui/screens/hub.js`, `tests/dom.test.js`
- Modify: `src/styles.css`, `src/main.js`

**Interfaces:**
- Consumes: `store` (Task 5), `recommend` (Task 6).
- Produces:
  - `h(tag, attrs, ...children): HTMLElement`, `announce(text)` (aria-live), `go(screen: string, params?: object)`
  - Bildschirme: `profile` (Profil wählen, anlegen, Datei importieren, exportieren, löschen mit Rückfrage), `hub` (vier Welt-Karten, Monster-Vorschau, Münzen, Empfehlungshinweis, Link zu Monster-Bereich)
  - CSS-Tokens: Farben, Abstände, Radien, Schatten, Schriftgrößen als Custom Properties; Hell-Modus; `:focus-visible` Rahmen; `@media (prefers-reduced-motion: reduce)` schaltet Animationen ab.

- [ ] **Step 1: Failing test** (`tests/dom.test.js`, mit minimalem DOM-Ersatz, z. B. `linkedom` als devDependency): `h('button', {class:'x'}, 'Hi')` baut richtiges Element; `announce` setzt Text in `[aria-live]`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementieren. Designrichtung (Entscheidung des Bauenden, vor dem Codieren kurz festhalten): eigene Farbwelt, runde Comic-Formen, kräftige Konturen, eine unverwechselbare Schriftwahl aus System-Fonts oder eingebetteter Schrift mit freier Lizenz.
- [ ] **Step 4:** Test PASS; `npm run build`, Seite im Browser öffnen, Screenshot auf 390 px und 1280 px Breite prüfen. **Step 5:** Commit `feat: app shell, hub and profiles`.

### Task 8: Aufgabenablauf mit Tipp-Stufen und Rückmeldung

**Files:**
- Create: `src/ui/runner.js`, `src/ui/widgets/explain.js`, `src/ui/screens/world.js`, `tests/runner.test.js`

**Interfaces:**
- Consumes: `generate`, `checkAnswer`, `diagnose`, `describe`, `applyResult`, `store.save`.
- Produces: `createRunner({ profile, kind, level, rng, onUpdate }): { current(): Task, hint(): string|null, submit(input): Result, next(): Task, state(): { hintsUsed, solved } }`

- [ ] **Step 1: Failing tests:** `submit` zweimal mit derselben richtigen Antwort vergibt Münzen **nur einmal**; `hint()` liefert nacheinander Tipp 1, 2, 3, danach `null`; falsche Antwort mit erkennbarem Fehler liefert `mistake`; nach 3 Tipps und Lösung sind Münzen ≥ 1.
- [ ] **Step 2:** FAIL. **Step 3:** Runner (Logik) und `world.js` (Welt-Bildschirm: Stufenwahl, Aufgabenliste, Fortschritt, Rückmeldungen mit frechem Text, Erklär-Animation für `explain`). Prüfen-Schaltfläche wird nach dem Abschicken sofort deaktiviert.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: task runner and feedback`.

### Task 9: Zahlenstrahl-Labor und Bruchstreifen-Werkstatt

**Files:**
- Create: `src/ui/widgets/numberline.js`, `src/ui/widgets/strips.js`
- Modify: `src/ui/screens/world.js`, `tests/generators.test.js`

**Interfaces:**
- Produces:
  - `numberline(opts: { from: number, to: number, ticks: number, marks: Frac[], draggable?: boolean, onPlace?: (x: number) => void }): SVGElement`
  - `strips(opts: { rows: { parts: number, filled: number, color?: string }[], interactive?: 'split'|'fill'|'overlay', onChange?: (state) => void }): SVGElement`
  - Beide: per Tastatur bedienbar (Pfeiltasten), Zielflächen ≥ 44 px, `aria-label` mit dem Bruchwert.
  - "Ausprobieren zuerst": je neues Thema ein Experiment-Bildschirm (z. B. Streifen übereinanderlegen, Beobachtung als Auswahl), danach erst die Regel als Karte.

- [ ] **Step 1: Failing test:** Für jede Art in `strahl` und `streifen` bildet `task.widget.data` mit dem passenden Widget ein SVG ohne Fehler, und die `answer`-Koordinate liegt im Wertebereich.
- [ ] **Step 2:** FAIL. **Step 3:** Widgets bauen, in `world.js` einhängen. **Step 4:** PASS; im Browser mit Maus und Tastatur je Aufgabentyp einmal durchspielen, Screenshots prüfen. **Step 5:** Commit `feat: numberline and strips worlds`.

### Task 10: Alltag und Rezepte, Fehler-Detektiv und Regel-Forscher

**Files:**
- Create: `src/tasks/handwritten.js`, `tests/handwritten.test.js`
- Modify: `src/tasks/generators.js`, `src/ui/screens/world.js`

**Interfaces:**
- Produces: `HANDWRITTEN: Task[]` (mindestens 20 Alltagsaufgaben, 15 Detektivfälle, jeweils mit `world`, `level`, vier Antwortformen erlaubt); `generate` mischt für `alltag` und `detektiv` Generator- und handgeschriebene Aufgaben.

- [ ] **Step 1: Failing test:** Alle handgeschriebenen Aufgaben haben eindeutige `id`, 3 Tipps, lösbare Antwort (Eigenprobe wie Task 3) und keinen Text über 280 Zeichen.
- [ ] **Step 2:** FAIL. **Step 3:** Aufgaben schreiben (Rezepte, Geld, Zeit, geteilte Mengen; Detektivfälle mit erfundener falscher Rechnung, Kind markiert den Fehler und begründet per Auswahl). Regel-Forscher: Experiment → Vermutung wählen → Regel mit Begründung bestätigen, Bonus `explained: true`.
- [ ] **Step 4:** PASS. **Step 5:** Commit `feat: everyday and detective worlds`.

### Task 11: Monster, Shop, Inventar, Wohnhöhle, Sammelkarten

**Files:**
- Create: `src/ui/monster/art.js`, `wardrobe.js`, `cave.js`, `cards.js`, `shop.js`, `src/ui/screens/monster.js`, `tests/monster.test.js`

**Interfaces:**
- Consumes: `ITEMS`, `buy`, `monsterStage`, `Profile`.
- Produces:
  - `monsterSvg(opts: { stage: 0|1|2|3|4, color: string, wearing: Record<string,string> }): SVGElement` (Layer pro Slot: `kopf`, `koerper`, `hand`, `fuss`), `caveSvg(p: Profile): SVGElement`
  - Shop mit Kategorien, Inventar zum Anlegen, Farbwahl, Möbel platzieren und verschieben (Tastatur und Zeigen), Sammelkarten-Album, Serien-Anzeige (Tage in Folge).
  - Futterkauf erhöht `xp`; Stufenwechsel löst **eine** kurze Animation aus (einmalig bei Wechsel).

- [ ] **Step 1: Failing tests:** `monsterSvg` für alle Stufen und alle Items rendert ohne Fehler; jedes Item aus `ITEMS` hat eine Darstellung; Kauf im Shop ändert Münzen genau einmal; Serie erhöht sich nur einmal pro Kalendertag.
- [ ] **Step 2:** FAIL. **Step 3:** Monster und Items als eigene SVG-Zeichnungen (originale Figuren, keine bekannten Charaktere). **Step 4:** PASS; Screenshots Monster auf 5 Stufen. **Step 5:** Commit `feat: monster, shop, cave and cards`.

### Task 12: Feinschliff, Barrierefreiheit und Gesamtabnahme

**Files:**
- Modify: `src/styles.css`, Bildschirme nach Befund
- Create: `tests/e2e-smoke.md` (Prüfliste), `README.md` (Bedienung und Build, kurz)

**Interfaces:** keine neuen.

- [ ] **Step 1:** Test ergänzen in `tests/build.test.js`: gebaute Datei enthält weder `fetch(`, `XMLHttpRequest`, `navigator.sendBeacon` noch externe URLs (außer reinen Text-Links in Hilfetexten, die nicht geladen werden).
- [ ] **Step 2:** Test ausführen; Befunde beheben.
- [ ] **Step 3:** Manuelle Abnahme im Browser (Screenshots 390 px, 768 px, 1280 px): komplette Runde pro Welt, Tippen nur per Tastatur, Reduced-Motion an, Profil exportieren und in neuem Profil importieren, Privatmodus-Fenster. Ergebnis in `tests/e2e-smoke.md` abhaken.
- [ ] **Step 4:** `npm test` und `npm run build` fehlerfrei; Dateigröße von `dist/bruchmonster.html` notieren.
- [ ] **Step 5:** Commit `chore: polish and acceptance`.

---

## Self-Review (erledigt)

- **Spec-Abdeckung:** Welten (Tasks 3, 9, 10), Stoff (Task 3 Arten), Hilfen: Tipp-Stufen und Erklär-Animation (3, 8), Fehlertyp (4), Ausprobieren zuerst (9, 10); Monster (11), Belohnung und Tageslimit (6), Profile und Export (5), Führung (6, 7), Ton (7, 8, 10), lokale Datei (1, 12).
- **Typkonsistenz:** `Frac`, `Task`, `Profile`, `World`, `MistakeId` werden einmal definiert und danach nur verwendet.
- **Review Focus** ist je einem Test zugeordnet (Tasks 2, 3, 5, 6, 8).
