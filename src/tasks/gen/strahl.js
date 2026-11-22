// Welt "Zahlenstrahl": platzieren, schaetzen, vergleichen, dazwischen.
import { randInt, pick } from '../../core/rng.js';
import { frac, simplify, lcm, compare, format, formatMixed } from '../../core/fractions.js';
import { makeTask } from '../types.js';
import { retry, properFrac, lineExplain } from './shared.js';

// Orientierung in Vierteln, ohne Dezimalzahlen.
function quarterHint(f) {
  const q = (f.n * 4) / f.d;
  const lo = frac(Math.floor(q), 4);
  const hi = frac(Math.ceil(q), 4);
  return `${format(f)} liegt zwischen ${formatMixed(lo)} und ${formatMixed(hi)}. Setz deinen Punkt in diese Gegend.`;
}

const WORLD = 'strahl';
const sym = ['<', '=', '>'];

export function platzieren(level, rng) {
  const [dMax, to] = { 1: [12, 1], 2: [20, 2], 3: [24, 3] }[level];
  const f = retry(() => {
    const d = randInt(rng, 2, dMax);
    const n = randInt(rng, 1, to * d - 1);
    return n % d === 0 ? null : frac(n, d);
  });
  const ticks = f.d;
  return makeTask(rng, {
    world: WORLD, kind: 'platzieren', level,
    prompt: pick(rng, [
      `Parke ${format(f)} auf dem Zahlenstrahl. Das Monster hat Hunger, also bitte genau!`,
      `Wo wohnt ${format(f)} auf dem Zahlenstrahl? Tipp dein Ziel an.`,
    ]),
    widget: { type: 'numberline', data: { from: 0, to, ticks, marks: [] } },
    answer: { type: 'position', value: f, tolerance: 1 / (2 * ticks) },
    hints: [
      'Wie viele gleich große Stücke passen zwischen zwei ganze Zahlen? Das verrät dir den Nenner.',
      'Jeder Abschnitt zwischen zwei Strichen ist ein Stück. Der Zähler sagt dir, wie viele Stücke du von 0 aus abzählst.',
      `Nenner ${f.d}: ${f.d} Stücke pro Ganzes. Zähle ${f.n} Striche von 0 aus ab und du landest bei ${format(f)}.`,
    ],
    explain: lineExplain([f], ticks),
    meta: { a: f },
  });
}

export function schaetzen(level, rng) {
  const dMax = { 1: 12, 2: 20, 3: 60 }[level];
  const to = level === 3 ? 2 : 1;
  const f = retry(() => {
    const d = randInt(rng, 2, dMax);
    const n = randInt(rng, 1, to * d - 1);
    return n % d === 0 ? null : frac(n, d);
  });
  const tolerance = { 1: 0.08, 2: 0.06, 3: 0.05 }[level];
  const half = frac(1, 2);
  return makeTask(rng, {
    world: WORLD, kind: 'schaetzen', level,
    prompt: `Keine Striche, nur Gefühl: Wo liegt ungefähr ${format(f)}? Das Monster drückt ein Auge zu, aber nur eines.`,
    widget: { type: 'numberline', data: { from: 0, to, ticks: 0, marks: level === 1 ? [half] : [] } },
    answer: { type: 'position', value: f, tolerance },
    hints: [
      'Ist der Bruch kleiner oder größer als ein halbes Ganzes? Zähler und Nenner im Vergleich verraten das.',
      'Teile die Strecke im Kopf: erst in die Hälfte, dann in Viertel. So kommst du in die richtige Gegend.',
      quarterHint(f),
    ],
    explain: lineExplain([f, half], 0),
    meta: { a: f },
  });
}

function comparePair(rng, level) {
  if (level === 1) {
    const d = randInt(rng, 3, 12);
    return retry(() => {
      const a = frac(randInt(rng, 1, d - 1), d);
      const b = frac(randInt(rng, 1, d - 1), d);
      return a.n === b.n ? null : [a, b];
    });
  }
  const dMax = level === 2 ? 20 : 60;
  const equalChance = 0.2;
  return retry(() => {
    if (rng() < equalChance) {
      const a = properFrac(rng, 2, Math.floor(dMax / 3));
      const k = randInt(rng, 2, Math.floor(dMax / a.d));
      return k >= 2 ? [a, frac(a.n * k, a.d * k)] : null;
    }
    const a = properFrac(rng, 2, dMax);
    const b = properFrac(rng, 2, dMax);
    if (a.d === b.d || lcm(a.d, b.d) > 60) return null;
    return [a, b];
  });
}

export function vergleichen(level, rng) {
  const [a, b] = comparePair(rng, level);
  const c = compare(a, b);
  const L = lcm(a.d, b.d);
  const ax = (a.n * L) / a.d;
  const bx = (b.n * L) / b.d;
  return makeTask(rng, {
    world: WORLD, kind: 'vergleichen', level,
    prompt: `Wer ist größer? ${format(a)} ? ${format(b)}. Wähle <, = oder >, das Monster schaut genau hin.`,
    widget: { type: 'choice', data: { options: ['<', '=', '>'] } },
    answer: { type: 'choice', value: c + 1 },
    hints: [
      a.d === b.d
        ? 'Die Stücke sind gleich groß. Wer hat mehr davon?'
        : 'Bringe beide Brüche auf gleich große Stücke. Dann musst du nur noch zählen, wer mehr davon hat.',
      'Schau beide Brüche auf dem Zahlenstrahl an: Wer weiter rechts steht, ist größer.',
      `Hauptnenner ${L}: ${format(a)} = ${ax}/${L} und ${format(b)} = ${bx}/${L}. Also ${format(a)} ${sym[c + 1]} ${format(b)}.`,
    ],
    explain: lineExplain([a, b]),
    meta: { a, b, op: 'compare' },
  });
}

export function dazwischen(level, rng) {
  const [a, b] = retry(() => {
    let x;
    let y;
    if (level === 1) {
      const d = randInt(rng, 3, 12);
      x = frac(randInt(rng, 1, d - 2), d);
      y = frac(x.n + randInt(rng, 1, Math.min(3, d - 1 - x.n)), d);
    } else {
      const dMax = level === 2 ? 20 : 30;
      const span = level === 2 ? 1 : 3;
      x = properFrac(rng, 2, dMax);
      y = properFrac(rng, 2, dMax);
      if (level === 3) {
        x = frac(x.n + x.d * randInt(rng, 0, span - 1), x.d);
        y = frac(y.n + y.d * randInt(rng, 0, span - 1), y.d);
      }
      if (x.d === y.d || compare(x, y) === 0) return null;
      if (compare(x, y) > 0) [x, y] = [y, x];
    }
    return lcm(x.d, y.d) <= 30 ? [x, y] : null;
  });
  const L = lcm(a.d, b.d);
  const lo = frac((a.n * L) / a.d, L);
  const hi = frac((b.n * L) / b.d, L);
  const mid = simplify(frac(lo.n + hi.n, 2 * L));
  return makeTask(rng, {
    world: WORLD, kind: 'dazwischen', level,
    prompt: `Nenne einen Bruch, der strikt zwischen ${format(a)} und ${format(b)} liegt. Die Grenzen selbst zählen nicht!`,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value: mid, accept: 'between', range: [a, b] },
    hints: [
      'Zwischen zwei Brüchen ist immer noch Platz. Mach die Stücke feiner, dann passen mehr Striche dazwischen.',
      'Erweitere beide Brüche, bis zwischen ihnen mindestens ein Strich frei ist.',
      `Doppelter Hauptnenner ${2 * L}: ${format(a)} = ${lo.n * 2}/${2 * L}, ${format(b)} = ${hi.n * 2}/${2 * L}. Dazwischen liegt zum Beispiel ${format(mid)}.`,
    ],
    explain: lineExplain([a, b, mid]),
    meta: { a, b, op: 'compare' },
  });
}
