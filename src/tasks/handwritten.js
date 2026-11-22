// Handgeschriebene Aufgaben fuer "Alltag" und "Detektiv": echte Situationen, echte Denkfehler.
// Jede Aufgabe hat eine stabile id (hw-<welt>-<art>-NN), drei Tipps (Denkanstoss, Bild, Loesungsweg),
// eine Erklaerzeichnung und meta fuer die Fehlerdiagnose. Antwortschluessel stehen als Bruch [Zaehler, Nenner].
import { frac } from '../core/fractions.js';
import { stripsExplain as S, lineExplain as L } from './gen/shared.js';

const F = ([n, d]) => frac(n, d);
const q = (value, unit) => ({ value, unit });

function task(world, kind, num, level, spec) {
  return {
    id: `hw-${world}-${kind === 'anteil-von-groesse' ? 'anteil' : kind}-${String(num).padStart(2, '0')}`,
    world, kind, level, ...spec,
  };
}

// --- Alltag: Eingabe eines Bruchs oder einer Zahl ---
function alltag(kind, num, level, { prompt, answer, hints, explain, meta }) {
  return task('alltag', kind, num, level, {
    prompt,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value: F(answer) },
    hints, explain, meta,
  });
}

const anteil = (num, level, s) => alltag('anteil-von-groesse', num, level, s);
const rezept = (num, level, s) => alltag('rezept', num, level, s);
const teilen = (num, level, s) => alltag('teilen-durch-nat', num, level, s);

const ALLTAG = [
  // ---------- anteil-von-groesse ----------
  anteil(1, 1, {
    prompt: 'Du hast 20 Euro Taschengeld. 3/4 davon gehen für Eis und Gummibärchen drauf. Wie viele Euro sind das?',
    answer: [15, 1],
    hints: [
      'Teile das Taschengeld erst in so viele gleiche Haufen, wie der Nenner sagt. Dann nimmst du ein paar Haufen.',
      'Stell dir 20 Euro als Streifen mit 4 gleichen Stücken vor. 3 davon sind für Eis. Wie viel steckt in einem Stück?',
      '20 : 4 = 5 Euro pro Viertel. 3 Viertel sind 3 · 5 = 15 Euro.',
    ],
    explain: S([{ parts: 4, filled: 3 }]),
    meta: { a: F([3, 4]), quantity: q(20, 'Euro'), op: 'mul' },
  }),
  anteil(2, 1, {
    prompt: 'Pizza-Abend: Die Pizza hat 12 Stücke. Du isst 2/3 davon, das Monster guckt neidisch. Wie viele Stücke sind das?',
    answer: [8, 1],
    hints: [
      'Wie viele Stücke gehören zu einem Drittel? Fang mit einem einzigen Bruchteil an.',
      'Teile die 12 Stücke in 3 gleiche Gruppen. Du bekommst 2 dieser Gruppen.',
      '12 : 3 = 4 Stücke pro Drittel. 2 Drittel sind 2 · 4 = 8 Stücke.',
    ],
    explain: S([{ parts: 3, filled: 2 }]),
    meta: { a: F([2, 3]), quantity: q(12, 'Stücke'), op: 'mul' },
  }),
  anteil(3, 1, {
    prompt: 'Klassenfahrt: 30 Kinder sitzen im Bus. 2/5 davon wollen unbedingt hinten sitzen. Wie viele Kinder sind das?',
    answer: [12, 1],
    hints: [
      'Der Nenner sagt, in wie viele gleich große Gruppen du die Kinder aufteilst.',
      'Zeichne 5 Gruppen mit gleich vielen Kindern. 2 Gruppen wollen nach hinten.',
      '30 : 5 = 6 Kinder pro Gruppe. 2 Gruppen sind 2 · 6 = 12 Kinder.',
    ],
    explain: S([{ parts: 5, filled: 2 }]),
    meta: { a: F([2, 5]), quantity: q(30, 'Kinder'), op: 'mul' },
  }),
  anteil(4, 1, {
    prompt: 'Das Fußballtraining dauert 3/4 Stunde. Eine Stunde hat 60 Minuten. Wie viele Minuten trainierst du?',
    answer: [45, 1],
    hints: [
      'Du suchst einen Bruchteil von 60 Minuten. Wie lang ist ein Viertel einer Stunde?',
      'Eine Stunde ist ein Streifen mit 4 gleichen Stücken. Wie viele Minuten hat jedes Stück?',
      '60 : 4 = 15 Minuten pro Viertel. 3 Viertel sind 3 · 15 = 45 Minuten.',
    ],
    explain: S([{ parts: 4, filled: 3 }]),
    meta: { a: F([3, 4]), quantity: q(60, 'Minuten'), op: 'mul' },
  }),
  anteil(5, 2, {
    prompt: 'Dein Schal ist 3 Meter lang. 2/5 davon sind gestreift, der Rest ist einfarbig. Wie viele Meter sind gestreift?',
    answer: [6, 5],
    hints: [
      'Hier geht die Teilung nicht glatt auf. Das ist okay: Das Ergebnis darf ein Bruch sein.',
      'Teile 3 Meter in 5 gleiche Stücke. Wie lang ist eines, wenn du es als Bruch von einem Meter schreibst?',
      '3 : 5 = 3/5 Meter pro Stück. 2 Stücke sind 2 · 3/5 = 6/5 Meter, also 1 1/5 Meter.',
    ],
    explain: L([F([6, 5])]),
    meta: { a: F([2, 5]), quantity: q(3, 'Meter'), op: 'mul' },
  }),
  anteil(6, 2, {
    prompt: 'Beim Zelten gibt es 3 Liter Limo. Du trinkst im Lauf des Abends 3/4 davon. Wie viele Liter sind das?',
    answer: [9, 4],
    hints: [
      'Ein Bruchteil von einer Menge: erst durch den Nenner teilen, dann mal den Zähler.',
      'Stell dir die 3 Liter als 3 Streifen vor. Jeder wird in 4 Stücke geteilt, du nimmst von jedem 3 Stücke.',
      '3 · 3/4 = 9/4 Liter. Das sind 2 ganze Liter und noch 1/4 Liter.',
    ],
    explain: L([F([9, 4])]),
    meta: { a: F([3, 4]), quantity: q(3, 'Liter'), op: 'mul' },
  }),
  anteil(7, 2, {
    prompt: 'Dein Schulweg ist 5 km lang. Du bist schon 3/10 davon gelaufen. Wie viele Kilometer sind das?',
    answer: [3, 2],
    hints: [
      'Ein Bruchteil von 5 km kann ein Bruch sein. Rechne erst 3/10 mal 5.',
      'Zeichne einen Zahlenstrahl von 0 bis 5 km. Die Hälfte wären 2 1/2 km. Du bist noch nicht ganz bei der Hälfte.',
      '3/10 von 5 = 3 · 5 / 10 = 15/10 = 3/2. Das sind 1 1/2 km.',
    ],
    explain: L([F([3, 2])]),
    meta: { a: F([3, 10]), quantity: q(5, 'km'), op: 'mul' },
  }),
  anteil(8, 2, {
    prompt: 'Dein Handy-Akku hält 5 Stunden. 2/3 davon sind schon weg, weil du Videos geschaut hast. Wie viele Stunden sind das?',
    answer: [10, 3],
    hints: [
      'Zuerst: Verbraucht ist mehr als die Hälfte vom Akku. Dein Ergebnis muss also größer als 2 1/2 Stunden sein.',
      'Teile jede der 5 Stunden in 3 gleiche Stücke und nimm von jeder Stunde 2 Stücke.',
      '5 · 2/3 = 10/3 Stunden, das sind 3 1/3 Stunden.',
    ],
    explain: L([F([10, 3])]),
    meta: { a: F([2, 3]), quantity: q(5, 'Stunden'), op: 'mul' },
  }),
  anteil(9, 3, {
    prompt: 'Eine Klasse hat 24 Kinder. 1/4 fährt mit Bus A, 1/3 mit Bus B. Der Rest geht zu Fuß. Wie viele Kinder gehen zu Fuß?',
    answer: [10, 1],
    hints: [
      'Zuerst brauchst du den Anteil, der noch übrig ist. Zähle zusammen, was schon weg ist.',
      'Mach beide Brüche gleichnamig, damit du sie zählen kannst. Das Ganze sind 12 Zwölftel.',
      '1/4 + 1/3 = 3/12 + 4/12 = 7/12. Rest: 5/12. 24 : 12 = 2, mal 5 sind 10 Kinder.',
    ],
    explain: L([F([7, 12]), F([5, 12])]),
    meta: { a: F([1, 4]), b: F([1, 3]), quantity: q(24, 'Kinder'), op: 'sub' },
  }),
  anteil(10, 3, {
    prompt: 'In der Klassenkasse sind 40 Euro. 1/2 geht für den Bus weg, 1/5 für den Eintritt. Wie viele Euro bleiben übrig?',
    answer: [12, 1],
    hints: [
      'Rechne zuerst aus, welcher Anteil der Kasse ausgegeben ist. Was bleibt dann vom Ganzen?',
      'Halbe und Fünftel sind verschieden große Stücke. Auf Zehntel passen beide.',
      '1/2 + 1/5 = 5/10 + 2/10 = 7/10. Rest: 3/10. 40 : 10 = 4, mal 3 sind 12 Euro.',
    ],
    explain: L([F([7, 10]), F([3, 10])]),
    meta: { a: F([1, 2]), b: F([1, 5]), quantity: q(40, 'Euro'), op: 'sub' },
  }),
  anteil(11, 3, {
    prompt: 'Ein Kuchen hat 16 Stücke. Papa isst 1/4 davon, Mama 1/8. Wie viele Stücke bleiben für dich und das Monster?',
    answer: [10, 1],
    hints: [
      'Finde heraus, welcher Teil des Kuchens schon gegessen ist. Dein Anteil ist der Rest vom Ganzen.',
      'Viertel und Achtel: Auf Achtel passen beide. 1/4 sind 2 Achtel.',
      '1/4 + 1/8 = 2/8 + 1/8 = 3/8. Rest: 5/8. 16 : 8 = 2, mal 5 sind 10 Stücke.',
    ],
    explain: L([F([3, 8]), F([5, 8])]),
    meta: { a: F([1, 4]), b: F([1, 8]), quantity: q(16, 'Stücke'), op: 'sub' },
  }),

  // ---------- rezept ----------
  rezept(1, 1, {
    prompt: 'Pfannkuchen für 4 Personen brauchen 1/2 Liter Milch. Du machst sie für 8 Personen. Wie viel Liter Milch brauchst du?',
    answer: [1, 1],
    hints: [
      'Wie viele Personen kommen im Vergleich zum Rezept dazu? Das sagt dir, wie oft du die Menge nimmst.',
      'Doppelt so viele Personen heißt doppelt so viel Milch. Wird das Ergebnis größer oder kleiner?',
      '8 : 4 = 2, also doppelt. 2 · 1/2 = 1 Liter.',
    ],
    explain: L([F([1, 2]), F([1, 1])]),
    meta: { a: F([1, 2]), b: F([2, 1]), k: 8, op: 'mul' },
  }),
  rezept(2, 1, {
    prompt: 'Kakao für 2 Tassen braucht 1/4 Liter Milch. Deine Bande kommt zu sechst. Wie viel Liter Milch brauchst du?',
    answer: [3, 4],
    hints: [
      'Wie oft passen 2 Tassen in 6 Tassen? So oft brauchst du die Milchmenge.',
      'Du brauchst die Menge dreimal. Zeichne drei Streifen mit je einem Viertel.',
      '6 : 2 = 3. Also 3 · 1/4 = 3/4 Liter.',
    ],
    explain: S([{ parts: 4, filled: 1 }, { parts: 4, filled: 2 }, { parts: 4, filled: 3 }]),
    meta: { a: F([1, 4]), b: F([3, 1]), k: 6, op: 'mul' },
  }),
  rezept(3, 1, {
    prompt: 'Für 12 Muffins braucht man 1/2 kg Mehl. Du backst nur 6 Muffins, den Rest bäckt das Monster allein. Wie viel kg Mehl?',
    answer: [1, 4],
    hints: [
      'Du backst weniger Muffins. Brauchst du dann mehr oder weniger Mehl?',
      '6 Muffins sind die Hälfte von 12 Muffins. Halbiere also die Menge.',
      'Die Hälfte von 1/2 ist 1/2 : 2 = 1/4 kg Mehl.',
    ],
    explain: S([{ parts: 2, filled: 1 }, { parts: 4, filled: 1 }]),
    meta: { a: F([1, 2]), b: F([1, 2]), k: 6, op: 'mul' },
  }),
  rezept(4, 2, {
    prompt: 'Pfannkuchen für 4 Personen brauchen 3/4 Liter Milch. Es kommen 6 Gäste. Wie viel Liter Milch brauchst du?',
    answer: [9, 8],
    hints: [
      'Finde erst heraus, wie viel Milch für eine Person nötig ist. Dann nimmst du es mal 6.',
      'Teile die 3/4 Liter auf 4 Personen auf. Jedes Stück ist kleiner als ein Viertel.',
      'Pro Person: 3/4 : 4 = 3/16. Für 6: 6 · 3/16 = 18/16 = 9/8, also 1 1/8 Liter.',
    ],
    explain: L([F([3, 4]), F([9, 8])]),
    meta: { a: F([3, 4]), b: F([3, 2]), k: 6, op: 'mul' },
  }),
  rezept(5, 2, {
    prompt: 'Das Kakao-Rezept für 3 Becher braucht 1/2 Liter Milch. Es kommen 5 Becher-Fans. Wie viel Liter Milch brauchst du?',
    answer: [5, 6],
    hints: [
      'Rechne erst auf einen Becher herunter. Dann auf fünf Becher hoch.',
      'Teile die halbe Liter in 3 gleiche Stücke. Wie heißt der Bruchteil eines Bechers?',
      'Pro Becher: 1/2 : 3 = 1/6 Liter. Für 5 Becher: 5 · 1/6 = 5/6 Liter.',
    ],
    explain: S([{ parts: 2, filled: 1 }, { parts: 6, filled: 1 }, { parts: 6, filled: 5 }]),
    meta: { a: F([1, 2]), b: F([5, 3]), k: 5, op: 'mul' },
  }),
  rezept(6, 2, {
    prompt: 'Nudeln für 4 Personen: 1/2 kg. Dein Besuch bleibt zum Essen, ihr seid jetzt 5. Wie viel kg Nudeln brauchst du?',
    answer: [5, 8],
    hints: [
      'Eine Person isst gleich viel wie vorher. Wie viel braucht eine einzelne Person?',
      'Teile die halbe kg in 4 gleiche Portionen. Dann nimmst du 5 Portionen.',
      'Pro Person: 1/2 : 4 = 1/8 kg. Für 5 Personen: 5 · 1/8 = 5/8 kg.',
    ],
    explain: S([{ parts: 2, filled: 1 }, { parts: 8, filled: 1 }, { parts: 8, filled: 5 }]),
    meta: { a: F([1, 2]), b: F([5, 4]), k: 5, op: 'mul' },
  }),
  rezept(7, 3, {
    prompt: 'Das Gulasch-Rezept für 4 Personen braucht 1 1/2 kg Kartoffeln. Du kochst für 6 Personen. Wie viel kg Kartoffeln?',
    answer: [9, 4],
    hints: [
      'Wandle die gemischte Zahl zuerst in einen unechten Bruch um. Dann rechnest du wie immer.',
      'Zeichne 1 1/2 Streifen. Für 6 Personen brauchst du mehr, aber nicht doppelt so viel.',
      '1 1/2 = 3/2. Pro Person: 3/2 : 4 = 3/8. Für 6: 6 · 3/8 = 18/8 = 9/4, also 2 1/4 kg.',
    ],
    explain: L([F([3, 2]), F([9, 4])]),
    meta: { a: F([3, 2]), b: F([3, 2]), k: 6, op: 'mul' },
  }),
  rezept(8, 3, {
    prompt: 'Saftschorle für 6 Gläser braucht 1 1/2 Liter Wasser. Beim Schulfest füllst du 10 Gläser. Wie viel Liter Wasser?',
    answer: [5, 2],
    hints: [
      'Gemischte Zahl zuerst umwandeln, dann auf ein Glas herunterrechnen.',
      'Du füllst mehr Gläser als im Rezept, also brauchst du mehr Wasser als 1 1/2 Liter. Rechne erst auf ein Glas herunter.',
      '1 1/2 = 3/2. Pro Glas: 3/2 : 6 = 3/12 = 1/4. Für 10 Gläser: 10 · 1/4 = 10/4 = 5/2, also 2 1/2 Liter.',
    ],
    explain: L([F([3, 2]), F([5, 2])]),
    meta: { a: F([3, 2]), b: F([5, 3]), k: 10, op: 'mul' },
  }),

  // ---------- teilen-durch-nat ----------
  teilen(1, 1, {
    prompt: 'Von der Pizza ist noch die Hälfte da. Du und dein Bruder teilt sie gerecht. Welcher Bruchteil der ganzen Pizza gehört dir?',
    answer: [1, 4],
    hints: [
      'Wenn zwei gerecht teilen, bekommt jeder weniger als die Hälfte. Wie viel weniger?',
      'Zeichne die halbe Pizza und zerschneide sie in 2 gleiche Teile. Wie viele solche Teile passen in die ganze Pizza?',
      '1/2 : 2 = 1/4. Du bekommst ein Viertel der Pizza.',
    ],
    explain: S([{ parts: 2, filled: 1 }, { parts: 4, filled: 1 }]),
    meta: { a: F([1, 2]), k: 2, op: 'div' },
  }),
  teilen(2, 1, {
    prompt: 'In der Kanne sind noch 3/4 Liter Saft. Er wird gerecht auf 3 Gläser verteilt. Wie viel Liter kommen in jedes Glas?',
    answer: [1, 4],
    hints: [
      'Drei gleich große Portionen: Wie viele Viertel gibt es insgesamt, und wie viele pro Glas?',
      'Du hast 3 Viertel und 3 Gläser. Jedes Glas bekommt genau ein Stück.',
      '3/4 : 3 = 3/12 = 1/4. In jedes Glas kommt 1/4 Liter.',
    ],
    explain: S([{ parts: 4, filled: 3 }, { parts: 4, filled: 1 }]),
    meta: { a: F([3, 4]), k: 3, op: 'div' },
  }),
  teilen(3, 1, {
    prompt: 'Du hast 2/3 einer Tafel Schokolade. Du teilst sie fair mit deiner besten Freundin. Wie viel von einer ganzen Tafel bekommt jede?',
    answer: [1, 3],
    hints: [
      'Zwei Personen, fair geteilt: Jede bekommt die Hälfte von 2/3.',
      'Zwei Drittel sind zwei Stücke. Pro Person gibt es ein Stück.',
      '2/3 : 2 = 2/6 = 1/3. Jede bekommt 1/3 der Tafel.',
    ],
    explain: S([{ parts: 3, filled: 2 }, { parts: 3, filled: 1 }]),
    meta: { a: F([2, 3]), k: 2, op: 'div' },
  }),
  teilen(4, 2, {
    prompt: 'Es sind noch 3/5 Liter Kakao übrig. Sie werden auf 4 Becher verteilt. Wie viel Liter kommen in einen Becher?',
    answer: [3, 20],
    hints: [
      'Du teilst durch 4. Die Stücke werden kleiner, also muss der Nenner größer werden.',
      'Zerschneide jedes Fünftel in 4 kleinere Stücke. Wie heißen die neuen Stücke?',
      '3/5 : 4 = 3/(5 · 4) = 3/20 Liter.',
    ],
    explain: S([{ parts: 5, filled: 3 }, { parts: 20, filled: 3 }]),
    meta: { a: F([3, 5]), k: 4, op: 'div' },
  }),
  teilen(5, 2, {
    prompt: 'Ein Stück Lakritzschnur ist 5/6 m lang. Du schneidest es in 3 gleich lange Stücke. Wie lang ist jedes Stück in Metern?',
    answer: [5, 18],
    hints: [
      'Drei gleich lange Stücke sind kürzer als das Ganze. Dein Ergebnis muss kleiner als 5/6 sein.',
      'Teile jedes Sechstel noch einmal in 3 Teile. Wie heißen die kleineren Teile?',
      '5/6 : 3 = 5/(6 · 3) = 5/18 Meter.',
    ],
    explain: S([{ parts: 6, filled: 5 }, { parts: 18, filled: 5 }]),
    meta: { a: F([5, 6]), k: 3, op: 'div' },
  }),
  teilen(6, 2, {
    prompt: 'Papa hat 3/4 vom Kuchen aufgehoben. Er schneidet das in 6 gleiche Stücke. Welcher Bruchteil des ganzen Kuchens ist ein Stück?',
    answer: [1, 8],
    hints: [
      'Die 3/4 werden durch 6 geteilt. Teile den Nenner nicht, das macht die Stücke größer.',
      'Du hast 3 Stücke und teilst jedes in 2 Teile. Das sind 6 Teile. Wie viele Teile hat dann der ganze Kuchen?',
      '3/4 : 6 = 3/24 = 1/8. Jedes Stück ist ein Achtel vom Kuchen.',
    ],
    explain: S([{ parts: 4, filled: 3 }, { parts: 8, filled: 1 }]),
    meta: { a: F([3, 4]), k: 6, op: 'div' },
  }),
  teilen(7, 3, {
    prompt: '2 1/2 Liter Limonade werden auf 5 Gläser verteilt. Wie viel Liter kommen in jedes Glas?',
    answer: [1, 2],
    hints: [
      'Wandle die gemischte Zahl zuerst um. Dann teilst du durch 5.',
      'Schätze zuerst: 2 1/2 Liter auf 5 Gläser. Kommt mehr oder weniger als ein Liter in jedes Glas?',
      '2 1/2 = 5/2. 5/2 : 5 = 5/10 = 1/2 Liter pro Glas.',
    ],
    explain: L([F([5, 2]), F([1, 2])]),
    meta: { a: F([5, 2]), k: 5, op: 'div' },
  }),
  teilen(8, 3, {
    prompt: 'Du hast 3 1/3 Meter Geschenkband für 4 Päckchen. Jedes Päckchen bekommt gleich viel. Wie viele Meter sind das?',
    answer: [5, 6],
    hints: [
      'Gemischte Zahl in einen unechten Bruch umwandeln, dann durch 4 teilen.',
      'Das Ergebnis muss kleiner als 1 Meter sein. 4 Päckchen mit je einem Meter wären zu viel.',
      '3 1/3 = 10/3. 10/3 : 4 = 10/12 = 5/6 Meter.',
    ],
    explain: L([F([10, 3]), F([5, 6])]),
    meta: { a: F([10, 3]), k: 4, op: 'div' },
  }),
  teilen(9, 3, {
    prompt: 'Ein Stapel aus 6 gleich dicken Heften ist 2 1/4 cm hoch. Wie dick ist ein einzelnes Heft in cm?',
    answer: [3, 8],
    hints: [
      'Der Stapel ist 6-mal so hoch wie ein Heft. Du teilst also durch 6.',
      'Wandle 2 1/4 in einen unechten Bruch um. Dann teilst du den Bruch durch 6.',
      '2 1/4 = 9/4. 9/4 : 6 = 9/24 = 3/8 cm.',
    ],
    explain: L([F([9, 4]), F([3, 8])]),
    meta: { a: F([9, 4]), k: 6, op: 'div' },
  }),
];

// --- Detektiv ---
const PROMPT_FEHLER = 'Das Monster hat sich verrechnet! Tippe auf die Zeile, in der der erste Fehler steckt.';

function fehler(num, level, { prompt = PROMPT_FEHLER, steps, wrong, hints, explain, meta }) {
  return task('detektiv', 'fehler-finden', num, level, {
    prompt,
    widget: { type: 'mark', data: { steps } },
    answer: { type: 'marks', value: wrong },
    hints, explain, meta: { ...meta, isReasoning: true },
  });
}

function regel(num, level, { prompt, options, correct, hints, explain, meta }) {
  return task('detektiv', 'regel-entdecken', num, level, {
    prompt,
    widget: { type: 'choice', data: { options } },
    answer: { type: 'choice', value: correct },
    hints, explain, meta: { ...meta, isReasoning: true },
  });
}

const DETEKTIV = [
  // ---------- fehler-finden ----------
  fehler(1, 1, {
    steps: ['Anna isst 1/3 Pizza, Ben isst 1/3 Pizza.', 'Zusammen: 1/3 + 1/3', '= (1 + 1) / (3 + 3)', '= 2/6'],
    wrong: 2,
    hints: [
      'Prüfe jede Zeile: Folgt sie aus der Zeile davor? Frag dich, was beim Zusammenzählen mit der Stückgröße passieren sollte.',
      'Beide essen Drittel, also gleich große Stücke. Zählst du Stücke, ändert sich dabei ihre Größe?',
      'Zeile 3 ist falsch. Beim Addieren gleicher Nenner bleibt der Nenner stehen: 1/3 + 1/3 = 2/3.',
    ],
    explain: S([{ parts: 3, filled: 1 }, { parts: 3, filled: 1 }, { parts: 3, filled: 2 }]),
    meta: { a: F([1, 3]), b: F([1, 3]), op: 'add' },
  }),
  fehler(2, 1, {
    steps: ['Erweitere 2/3 auf Sechstel.', 'Faktor: 6 : 3 = 2', 'Nur den Nenner mal 2: 3 · 2 = 6', 'Also 2/3 = 2/6'],
    wrong: 2,
    hints: [
      'Denk an das Erweitern: Der Wert soll gleich bleiben. Rechnest du dazu nur an einer Stelle?',
      'Zeichne 2/3 und 2/6 als Streifen. Ist die gefärbte Länge gleich?',
      'Zeile 3 ist falsch. Zähler und Nenner mal 2: 2 · 2 = 4, 3 · 2 = 6. Richtig: 2/3 = 4/6.',
    ],
    explain: S([{ parts: 3, filled: 2 }, { parts: 6, filled: 4 }]),
    meta: { a: F([2, 3]), k: 2, targetD: 6, op: 'expand' },
  }),
  fehler(3, 1, {
    prompt: 'Zwei Brüche im Wettstreit: Welche Zeile enthält den ersten Denkfehler?',
    steps: ['Wer ist größer: 1/3 oder 1/5?', 'Beide haben den Zähler 1.', 'Die 5 ist größer als die 3, also ist 1/5 größer.', 'Anna isst 1/3 Kuchen, Ben 1/5. Ben hat mehr.'],
    wrong: 2,
    hints: [
      'Mach dir klar, was der Nenner bedeutet. Je mehr Stücke ein Ganzes hat, desto ... was?',
      'Zeichne zwei gleich lange Streifen: einen in 3 Teile, einen in 5 Teile. Welches Stück ist länger?',
      'Zeile 3 ist falsch. Je größer der Nenner, desto kleiner die Stücke. Also ist 1/3 größer als 1/5.',
    ],
    explain: S([{ parts: 3, filled: 1 }, { parts: 5, filled: 1 }]),
    meta: { a: F([1, 3]), b: F([1, 5]), op: 'compare' },
  }),
  fehler(4, 2, {
    steps: ['Kürze 6/8.', 'Ich ziehe von Zähler und Nenner 2 ab.', '6 - 2 = 4 und 8 - 2 = 6', 'Also 6/8 = 4/6'],
    wrong: 1,
    hints: [
      'Kürzen ist das Gegenstück zum Erweitern. Beim Erweitern wird mal gerechnet, beim Kürzen ...?',
      'Zeichne 6/8 und 4/6. Reichen beide gefärbten Teile gleich weit?',
      'Zeile 2 ist falsch. Beim Kürzen wird durch dieselbe Zahl geteilt: 6 : 2 = 3, 8 : 2 = 4. Richtig: 3/4.',
    ],
    explain: S([{ parts: 8, filled: 6 }, { parts: 4, filled: 3 }]),
    meta: { a: F([6, 8]), k: 2, op: 'reduce' },
  }),
  fehler(5, 2, {
    prompt: 'Das Monster rechnet 3/4 von 20 Euro. Tippe auf die Zeile mit dem Denkfehler.',
    steps: ['Gesucht: 3/4 von 20 Euro', 'Ich teile 20 durch den Zähler 3 und nehme mal 4.', '20 : 3 · 4 = 80/3', 'Das Monster bekommt 80/3 Euro.'],
    wrong: 1,
    hints: [
      'Prüfe, ob das Ergebnis passt. Kann 3/4 von 20 mehr als 20 sein?',
      'Welche Zahl sagt dir, in wie viele gleiche Teile das Ganze zerlegt wird? Zähler oder Nenner?',
      'Zeile 2 ist falsch. Erst durch den Nenner 4 teilen: 20 : 4 = 5. Dann mal den Zähler 3: 15 Euro.',
    ],
    explain: S([{ parts: 4, filled: 3 }]),
    meta: { a: F([3, 4]), quantity: q(20, 'Euro'), op: 'mul', isReasoning: true },
  }),
  fehler(6, 2, {
    prompt: 'Wer hat mehr Pizza gegessen? Das Monster sagt: Anna. Tippe auf die Zeile mit dem Denkfehler.',
    steps: ['Anna isst 1/2 einer Mini-Pizza (200 g).', 'Ben isst 1/4 einer Riesen-Pizza (1000 g).', '1/2 ist mehr als 1/4, also hat Anna mehr gegessen.', 'Anna gewinnt den Esswettbewerb.'],
    wrong: 2,
    hints: [
      'Wie viel Gramm sind das jeweils? Rechne nach, bevor du glaubst.',
      'Brüche vergleicht man nur, wenn beide vom gleich großen Ganzen sind. Sind die Pizzen gleich groß?',
      'Zeile 3 ist falsch. Anna: 1/2 von 200 g = 100 g. Ben: 1/4 von 1000 g = 250 g. Ben hat mehr gegessen.',
    ],
    explain: S([{ parts: 2, filled: 1 }, { parts: 4, filled: 1 }]),
    meta: { a: F([1, 2]), b: F([1, 4]), op: 'compare' },
  }),
  fehler(7, 3, {
    steps: ['5/6 : 4', 'Nenner durch 4: 6 : 4 = 1 Rest 2', 'Also 5/1 Rest 2', '= 5 Rest 2'],
    wrong: 1,
    hints: [
      'Das Ergebnis sollte kleiner werden, wenn du durch 4 teilst. Wird es hier kleiner?',
      'Beim Teilen durch 4 wird jedes Stück in 4 noch kleinere Stücke zerschnitten. Wird der Nenner dann größer oder kleiner?',
      'Zeile 2 ist falsch. Der Nenner wird mal 4 genommen: 6 · 4 = 24. Richtig: 5/6 : 4 = 5/24.',
    ],
    explain: S([{ parts: 6, filled: 5 }, { parts: 24, filled: 5 }]),
    meta: { a: F([5, 6]), k: 4, op: 'div' },
  }),
  fehler(8, 3, {
    steps: ['Wandle 2 3/4 in einen unechten Bruch um.', 'Ganze plus Zähler: 2 + 3 = 5', 'Der Nenner bleibt: 4', 'Also 2 3/4 = 5/4'],
    wrong: 1,
    hints: [
      'Prüfe, ob das Ergebnis passt: 2 3/4 ist mehr als 2. Ist 5/4 mehr als 2?',
      'Zwei Ganze haben jeweils 4 Viertel. Wie viele Viertel stecken in 2 Ganzen und 3 Vierteln zusammen?',
      'Zeile 2 ist falsch. Ganze mal Nenner plus Zähler: 2 · 4 + 3 = 11. Richtig: 11/4.',
    ],
    explain: L([F([11, 4])]),
    meta: { a: F([11, 4]) },
  }),
  fehler(9, 3, {
    steps: ['2 1/2 - 1 3/4', 'Ganze: 2 - 1 = 1', 'Brüche: 3/4 - 1/2 = 1/4 (immer klein von groß)', 'Ergebnis: 1 1/4'],
    wrong: 2,
    hints: [
      'Schätze: 2 1/2 minus fast 2 kann nicht mehr als 1 sein. Passt das Ergebnis?',
      'Beim Bruchteil gilt: 1/2 ist kleiner als 3/4. Darfst du dann einfach 3/4 minus 1/2 rechnen? Was wird eigentlich von was abgezogen?',
      'Zeile 3 ist falsch. Wandle um: 5/2 - 7/4 = 10/4 - 7/4 = 3/4. Richtig: 3/4.',
    ],
    explain: L([F([7, 4]), F([5, 2]), F([3, 4])]),
    meta: { a: F([5, 2]), b: F([7, 4]), op: 'sub' },
  }),

  // ---------- regel-entdecken (Begründungen) ----------
  regel(1, 1, {
    prompt: 'Warum ändert Erweitern den Wert eines Bruchs nicht? 1/2 = 2/4 = 4/8.',
    options: [
      'Weil das Ganze feiner geteilt wird und du entsprechend mehr Stücke nimmst. Der gefärbte Teil bleibt gleich lang.',
      'Weil beim Erweitern der Zähler größer und der Nenner kleiner wird. Das gleicht sich aus.',
      'Weil das in der Mathematik einfach so festgelegt ist, einen Grund gibt es nicht.',
    ],
    correct: 0,
    hints: [
      'Denk an einen Streifen. Du schneidest ihn in mehr Stücke. Was machst du mit der Färbung?',
      'Zeichne 1/2 und 2/4 untereinander. Ist die gefärbte Länge gleich?',
      'Beim Erweitern werden Zähler und Nenner mit derselben Zahl malgenommen. Die Stücke werden feiner, aber du nimmst entsprechend mehr davon.',
    ],
    explain: S([{ parts: 2, filled: 1 }, { parts: 4, filled: 2 }, { parts: 8, filled: 4 }]),
    meta: { a: F([1, 2]), op: 'expand' },
  }),
  regel(2, 1, {
    prompt: 'Warum ist 1/7 größer als 1/9?',
    options: [
      'Weil man bei Brüchen nur den Zähler anschaut. Der ist beide Male 1, also gleich groß.',
      'Weil Siebtel größere Stücke sind als Neuntel. Je mehr Teile, desto kleiner jedes Stück.',
      'Weil 9 Stücke mehr sind als 7 Stücke, und mehr Stücke sind immer mehr.',
    ],
    correct: 1,
    hints: [
      'Vergleiche die Stücke, nicht die Anzahl. Wer hat die größeren Stücke?',
      'Schneide eine Pizza in 7 gleiche und eine gleich große in 9 gleiche Stücke. Welches Stück ist größer?',
      'Je größer der Nenner, desto kleiner jedes Stück. Ein Siebtel ist also größer als ein Neuntel.',
    ],
    explain: S([{ parts: 7, filled: 1 }, { parts: 9, filled: 1 }]),
    meta: { a: F([1, 7]), b: F([1, 9]), op: 'compare' },
  }),
  regel(3, 2, {
    prompt: 'Warum braucht man beim Addieren von Brüchen gleiche Nenner?',
    options: [
      'Weil man die Nenner später sowieso zusammenzählt, und das geht nur, wenn sie gleich sind.',
      'Man kann nur gleich große Stücke zusammenzählen. Drittel und Fünftel sind verschieden groß.',
      'Damit die Brüche schöner aussehen. Das Ergebnis wäre sonst genauso richtig.',
    ],
    correct: 1,
    hints: [
      'Denk an Stücke zählen: Kannst du 2 Äpfel und 3 Birnen als 5 Äpfel bezeichnen?',
      'Zeichne 1/3 und 1/5 als Streifen. Die Stücke passen nicht aufeinander. Was fehlt?',
      'Erst gleich große Stücke schaffen (gleichnamig machen), dann die Stücke zählen. Der Nenner bleibt, nur die Zähler werden addiert.',
    ],
    explain: S([{ parts: 3, filled: 1 }, { parts: 5, filled: 1 }, { parts: 15, filled: 8 }]),
    meta: { a: F([1, 3]), b: F([1, 5]), op: 'add' },
  }),
  regel(4, 2, {
    prompt: 'Warum wird ein Bruch kleiner, wenn man ihn durch 3 teilt?',
    options: [
      'Weil man den Nenner durch 3 teilt. Ein kleinerer Nenner macht den Bruch kleiner.',
      'Jedes Stück wird in 3 kleinere Stücke zerschnitten. Die Stücke werden kleiner, also auch der Wert.',
      'Weil beim Teilen immer 3 Stück wegfallen.',
    ],
    correct: 1,
    hints: [
      'Überlege, was beim Teilen mit den Stücken passiert. Eine Pizza wird auf 3 Leute verteilt.',
      'Jede Portion ist ein Drittel so groß wie vorher. Zeichne den Streifen vorher und nachher.',
      'Beim Teilen durch 3 werden die Stücke dreimal kleiner. Das zeigt sich am Nenner: er wird mal 3 genommen, nicht geteilt.',
    ],
    explain: S([{ parts: 4, filled: 3 }, { parts: 12, filled: 3 }]),
    meta: { a: F([3, 4]), k: 3, op: 'div' },
  }),
  regel(5, 2, {
    prompt: 'Beispiele: 1/2 von 8 = 4, 1/4 von 8 = 2, 3/4 von 8 = 6. Wie findest du den Bruchteil von einer Zahl?',
    options: [
      'Zahl mal Nenner nehmen, dann durch den Zähler teilen.',
      'Durch den Zähler teilen, dann mal den Nenner nehmen.',
      'Durch den Nenner teilen, dann mal den Zähler nehmen.',
    ],
    correct: 2,
    hints: [
      'Probier die Beispiele aus: Bei 3/4 von 8 kommt 6 heraus. Welche Rechnung kommt darauf?',
      'Der Nenner sagt, in wie viele gleiche Teile die 8 zerlegt wird. Der Zähler, wie viele davon du nimmst.',
      '3/4 von 8: 8 : 4 = 2 pro Teil, mal 3 gleich 6. Zuerst durch den Nenner, dann mal den Zähler.',
    ],
    explain: S([{ parts: 4, filled: 3 }]),
    meta: { a: F([3, 4]), k: 8, op: 'mul' },
  }),
  regel(6, 2, {
    prompt: 'Warum macht man Brüche zum Vergleichen gleichnamig?',
    options: [
      'Damit die Zähler gleich werden. Dann entscheidet der größere Nenner.',
      'Damit die Stücke gleich groß sind. Dann gewinnt der Bruch mit dem größeren Zähler.',
      'Weil man dann Zähler und Nenner addieren darf.',
    ],
    correct: 1,
    hints: [
      'Du willst zwei Brüche vergleichen. Was muss gleich sein, damit der Vergleich fair ist?',
      'Stell dir Stücke vor. Sind sie gleich groß, ist der Vergleich nur noch eine Frage der Anzahl.',
      'Sind die Stücke gleich groß (gleicher Nenner), zählt nur noch die Anzahl der Stücke, also der Zähler.',
    ],
    explain: S([{ parts: 12, filled: 8 }, { parts: 12, filled: 9 }]),
    meta: { a: F([2, 3]), b: F([3, 4]), op: 'compare' },
  }),
  regel(7, 3, {
    prompt: 'Warum ist 1/2 · 6 kleiner als 6? Malnehmen macht doch größer, oder?',
    options: [
      'Weil bei Brüchen alles rückwärts geht. Mal bedeutet hier eigentlich geteilt.',
      'Mit 1/2 nimmst du nur die Hälfte von 6. Das ist weniger als das Ganze.',
      'Weil ein Bruch eine kleine Zahl ist und kleine Zahlen alles schrumpfen lassen.',
    ],
    correct: 1,
    hints: [
      'Mal mit einem Bruch heißt: ein Teil von etwas nehmen. Nimmst du dann mehr oder weniger?',
      'Zeichne 6 als Strecke. Die Hälfte davon ist wie lang?',
      '1/2 · 6 bedeutet: die Hälfte von 6, also 3. Ein echter Bruch ist weniger als ein Ganzes, also wird das Ergebnis kleiner.',
    ],
    explain: L([F([1, 2])]),
    meta: { a: F([1, 2]), k: 6, op: 'mul' },
  }),
  regel(8, 3, {
    prompt: 'Du kürzt 4/6 und teilst nur den Nenner durch 2: 4/3. Warum ist das falsch?',
    options: [
      'Weil 4/3 keine schöne Zahl ist, sondern mehr als ein Ganzes.',
      'Wer nur den Nenner teilt, ändert die Stückgröße, aber nicht die Anzahl. Der Wert ändert sich. Zähler und Nenner müssen beide geteilt werden.',
      'Weil man beim Kürzen nur den Zähler teilen darf.',
    ],
    correct: 1,
    hints: [
      'Denk an Streifen: 4 von 6 Teilen sind gefärbt. Was passiert, wenn du nur die Stückzahl des Ganzen änderst?',
      'Kürzen fasst Stücke zusammen. Dabei ändern sich Zähler und Nenner gleichzeitig. Warum?',
      'Gekürzt wird durch dieselbe Zahl in Zähler und Nenner: 4 : 2 = 2 und 6 : 2 = 3. Richtig ist 2/3.',
    ],
    explain: S([{ parts: 6, filled: 4 }, { parts: 3, filled: 2 }]),
    meta: { a: F([4, 6]), k: 2, op: 'reduce' },
  }),
];

export const HANDWRITTEN = [...ALLTAG, ...DETEKTIV];
