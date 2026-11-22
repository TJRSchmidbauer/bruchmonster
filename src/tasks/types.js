// Aufgabenmodell: Konstanten, Task-Bau mit Plausibilitaetspruefung, Antwortpruefung.
//
// type Frac = { n, d }
// type Task = { id, world, kind, level, prompt, widget:{type,data}, answer, hints:[s,s,s],
//               explain:{type:'strips'|'numberline', data}, meta }
// answer: { type:'frac', value, accept?:'equal'|'exact'|'between', mustBeSimplified?, range? }
//       | { type:'position', value:Frac, tolerance }
//       | { type:'choice'|'marks', value:number }

import { parseAnswer, equal, compare, isSimplified } from '../core/fractions.js';
import { diagnose } from './errors.js';

export const WORLDS = ['strahl', 'streifen', 'alltag', 'detektiv'];

export const KINDS = {
  strahl: ['platzieren', 'schaetzen', 'vergleichen', 'dazwischen'],
  streifen: ['darstellen', 'erweitern', 'kuerzen', 'addieren', 'subtrahieren', 'bruchteil-vom-bruchteil'],
  alltag: ['anteil-von-groesse', 'rezept', 'teilen-durch-nat'],
  detektiv: ['fehler-finden', 'regel-entdecken'],
};

export const MAX_PROMPT = 200;

// Baut ein Task-Objekt und verweigert kaputte Aufgaben (3 Tipps, Promptlaenge).
export function makeTask(rng, spec) {
  const { world, kind, level, prompt, widget, answer, hints, explain, meta } = spec;
  if (!Array.isArray(hints) || hints.length !== 3 || hints.some((h) => !h || !String(h).trim())) {
    throw new Error(`${kind}: genau 3 nicht leere Tipps noetig`);
  }
  if (!prompt || prompt.length > MAX_PROMPT) throw new Error(`${kind}: Prompt leer oder zu lang`);
  return {
    id: `${kind}-${level}-${Math.floor(rng() * 1e9)}`,
    world, kind, level, prompt, widget, answer, hints, explain, meta: meta ?? {},
  };
}

function isFrac(x) {
  return x !== null && typeof x === 'object' && Number.isInteger(x.n) && x.n >= 0
    && Number.isInteger(x.d) && x.d >= 1;
}

function checkFrac(a, input) {
  let x;
  if (typeof input === 'string') {
    const p = parseAnswer(input);
    if (!p.ok) return { correct: false, invalid: p.reason };
    x = p.value;
  } else if (isFrac(input)) {
    x = input;
  } else {
    return { correct: false, invalid: 'format' };
  }
  const accept = a.accept ?? 'equal';
  if (accept === 'exact') return { correct: x.n === a.value.n && x.d === a.value.d };
  if (accept === 'between') {
    return { correct: compare(x, a.range[0]) > 0 && compare(x, a.range[1]) < 0 };
  }
  if (!equal(x, a.value)) return { correct: false };
  if (a.mustBeSimplified && !isSimplified(x)) return { correct: false, note: 'nicht-gekuerzt' };
  return { correct: true };
}

function withMistake(task, input, res) {
  if (res.correct) return res;
  const mistake = diagnose(task, input);
  return mistake ? { ...res, mistake } : res;
}

export function checkAnswer(task, input) {
  const res = rawCheck(task, input);
  return res.invalid ? res : withMistake(task, input, res);
}

function rawCheck(task, input) {
  const a = task.answer;
  switch (a.type) {
    case 'frac':
      return checkFrac(a, input);
    case 'position': {
      const x = typeof input === 'number' ? input : isFrac(input) ? input.n / input.d : NaN;
      if (!Number.isFinite(x)) return { correct: false, invalid: 'format' };
      return { correct: Math.abs(x - a.value.n / a.value.d) <= a.tolerance + 1e-9 };
    }
    case 'choice':
    case 'marks':
      if (!Number.isInteger(input)) return { correct: false, invalid: 'format' };
      return { correct: input === a.value };
    default:
      return { correct: false, invalid: 'format' };
  }
}
