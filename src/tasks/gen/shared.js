// Gemeinsame Helfer der Generatoren.
import { randInt } from '../../core/rng.js';
import { frac, lcm, simplify } from '../../core/fractions.js';

export const MAX_D = 60;
export const MAX_WHOLE = 12;

// Nenner <= 60 und Wert <= 12 Ganze.
export const fits = (f) => f.d <= MAX_D && f.n <= MAX_WHOLE * f.d;

// Ruft fn() bis ein Ergebnis kommt (null = verwerfen). Deterministisch, da rng geteilt.
export function retry(fn, tries = 500) {
  for (let i = 0; i < tries; i++) {
    const r = fn();
    if (r) return r;
  }
  throw new Error('Generator fand keine gueltige Aufgabe');
}

// Echter Bruch 0 < n/d < 1, Nenner in [dLo, dHi].
export function properFrac(rng, dLo, dHi) {
  const d = randInt(rng, Math.max(2, dLo), dHi);
  return frac(randInt(rng, 1, d - 1), d);
}

// Gemischte Zahl als unechter Bruch: whole in [1, maxWhole] plus echter Bruch.
export function mixedFrac(rng, dLo, dHi, maxWhole) {
  const p = properFrac(rng, dLo, dHi);
  return frac(randInt(rng, 1, maxWhole) * p.d + p.n, p.d);
}

export const times = (f, k) => simplify({ n: f.n * k, d: f.d });
export const lcmD = (...fs) => fs.reduce((acc, f) => lcm(acc, f.d), 1);

// Streifenzeilen fuer einen (auch unechten) Bruch: je Ganzes eine Zeile.
export function stripRows(f) {
  const rows = [];
  let left = f.n;
  do {
    const filled = Math.min(f.d, left);
    rows.push({ parts: f.d, filled });
    left -= filled;
  } while (left > 0);
  return rows;
}

export const stripsExplain = (rows) => ({ type: 'strips', data: { rows } });

// Zahlenstrahl-Erklaerung: von 0 bis zum naechsten Ganzen ueber dem Maximum.
export function lineExplain(marks, extraTicks) {
  const max = Math.max(...marks.map((m) => m.n / m.d));
  const t = lcmD(...marks);
  const ticks = extraTicks ?? (t <= MAX_D ? t : 0);
  return { type: 'numberline', data: { from: 0, to: Math.max(1, Math.ceil(max - 1e-9)), ticks, marks } };
}

// Hauptnenner-Zeile "x/L + y/L = s/L" (Operanden echt oder unecht).
export function commonLine(a, b, op) {
  const L = lcmD(a, b);
  const x = (a.n * L) / a.d;
  const y = (b.n * L) / b.d;
  const s = op === '-' ? x - y : x + y;
  return { L, x, y, s, text: `${x}/${L} ${op === '-' ? '-' : '+'} ${y}/${L} = ${s}/${L}` };
}
