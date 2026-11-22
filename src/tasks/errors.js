// Fehlertyp-Erkennung: erkennt typische Denkfehler anhand von Aufgabe (task.meta) und Eingabe.
// diagnose(task, input) bekommt die ROHE Eingabe wie checkAnswer (String/Frac bzw. Index) und wirft nie.
import { frac, equal, parseAnswer } from '../core/fractions.js';

export const MISTAKES = [
  'nenner-addiert', 'groesserer-nenner', 'nur-nenner-erweitert',
  'kreuz-multipliziert', 'falsch-herum-geteilt', 'ganzes-vergessen',
];

function isFrac(x) {
  return x !== null && typeof x === 'object' && Number.isInteger(x.n) && x.n >= 0
    && Number.isInteger(x.d) && x.d >= 1;
}

function toFrac(input) {
  if (typeof input === 'string') {
    const p = parseAnswer(input);
    return p.ok ? p.value : null;
  }
  return isFrac(input) ? input : null;
}

const isNat = (x) => Number.isInteger(x) && x >= 1;

// Jede Regel: (task, x /* Frac bzw. Index */) => boolean. Nur fuer passende Aufgabenarten.
const RULES = [
  ['nenner-addiert', ['addieren', 'subtrahieren'], 'frac', (m, x) => {
    if (!isFrac(m.a) || !isFrac(m.b) || m.a.d === m.b.d) return false;
    const n = m.op === 'sub' ? m.a.n - m.b.n : m.a.n + m.b.n;
    return n >= 0 && equal(x, frac(n, m.a.d + m.b.d));
  }],
  ['nur-nenner-erweitert', ['erweitern'], 'frac', (m, x) =>
    isFrac(m.a) && isNat(m.targetD) && x.n === m.a.n && x.d === m.targetD],
  ['kreuz-multipliziert', ['bruchteil-vom-bruchteil'], 'frac', (m, x) =>
    isFrac(m.a) && isFrac(m.b) && m.b.n > 0 && equal(x, frac(m.a.n * m.b.d, m.a.d * m.b.n))],
  ['falsch-herum-geteilt', ['teilen-durch-nat'], 'frac', (m, x) =>
    isFrac(m.a) && isNat(m.k) && equal(x, frac(m.a.n * m.k, m.a.d))],
  ['groesserer-nenner', ['vergleichen'], 'choice', (m, i) => {
    if (!isFrac(m.a) || !isFrac(m.b) || m.a.d === m.b.d) return false;
    // Optionen ["<", "=", ">"]: Kind haelt den Bruch mit dem groesseren Nenner fuer groesser.
    return i === (m.a.d > m.b.d ? 2 : 0);
  }],
  ['ganzes-vergessen', ['addieren', 'subtrahieren', 'bruchteil-vom-bruchteil', 'rezept',
    'teilen-durch-nat', 'anteil-von-groesse'], 'frac', (m, x, task) => {
    const v = task.answer.value;
    if (v.n < v.d) return false;
    const rest = v.n % v.d;
    return rest > 0 && equal(x, frac(rest, v.d));
  }],
];

export function diagnose(task, input) {
  try {
    const a = task?.answer;
    if (!a) return null;
    const meta = task.meta ?? {};
    let x;
    if (a.type === 'frac') {
      x = toFrac(input);
      if (!x) return null;
      if ((a.accept ?? 'equal') === 'equal' && equal(x, a.value)) return null;
    } else if (a.type === 'choice') {
      if (!Number.isInteger(input) || input === a.value) return null;
      x = input;
    } else {
      return null;
    }
    for (const [id, kinds, kind, test] of RULES) {
      if (kind === a.type && kinds.includes(task.kind) && test(meta, x, task)) return id;
    }
  } catch {
    // Diagnose ist nur ein Bonus und darf nie die Antwortpruefung stoeren.
  }
  return null;
}

const strips = (rows) => ({ type: 'strips', data: { rows } });
const line = (from, to, ticks, marks) => ({ type: 'numberline', data: { from, to, ticks, marks } });

const INFO = {
  'nenner-addiert': {
    text: 'Autsch, du hast oben und unten addiert. Halbe Pizza plus Drittel Pizza sind aber mehr als 2/5 – schau mal auf die Streifen.',
    counter: strips([{ parts: 2, filled: 1 }, { parts: 3, filled: 1 }, { parts: 5, filled: 2 }]),
  },
  'groesserer-nenner': {
    text: 'Mehr Stücke heißt nicht größere Stücke! Teil eine Pizza in 5 statt in 3 Teile, und jedes Stück wird winzig. Streifen lügen nicht.',
    counter: strips([{ parts: 3, filled: 1 }, { parts: 5, filled: 1 }]),
  },
  'nur-nenner-erweitert': {
    text: 'Huch, da hast du nur unten gedreht. Wer den Nenner erweitert, muss den Zähler mitnehmen, sonst wird der Bruch kleiner.',
    counter: strips([{ parts: 3, filled: 2 }, { parts: 12, filled: 2 }, { parts: 12, filled: 8 }]),
  },
  'kreuz-multipliziert': {
    text: 'Das war ein Kreuz-Salto! Zähler mal Zähler, Nenner mal Nenner. Ein Teil von einem Teil kann nie mehr sein als vorher.',
    counter: strips([{ parts: 3, filled: 1 }, { parts: 6, filled: 1 }]),
  },
  'falsch-herum-geteilt': {
    text: 'Geteilt wird es kleiner, nicht größer! Der Zähler bleibt, die Stücke werden feiner: der Nenner wird mal Teiler genommen.',
    counter: strips([{ parts: 4, filled: 3 }, { parts: 12, filled: 3 }]),
  },
  'ganzes-vergessen': {
    text: 'Fast! Aber da sind noch ganze Pizzen übrig, die du unterwegs verloren hast. Such sie auf dem Zahlenstrahl.',
    counter: line(0, 2, 4, [frac(3, 4), frac(7, 4)]),
  },
};

export function describe(id) {
  const info = INFO[id];
  if (!info) throw new Error(`Unbekannter Fehlertyp: ${id}`);
  return { text: info.text, counter: JSON.parse(JSON.stringify(info.counter)) };
}
