// Welt "Streifen": darstellen, erweitern, kuerzen, addieren, subtrahieren, bruchteil-vom-bruchteil.
import { randInt, pick } from '../../core/rng.js';
import {
  frac, simplify, gcd, lcm, compare, expand, add, sub, mul, format, formatMixed,
} from '../../core/fractions.js';
import { makeTask } from '../types.js';
import {
  retry, properFrac, mixedFrac, stripRows, stripsExplain, lineExplain, commonLine,
} from './shared.js';

const WORLD = 'streifen';

export function darstellen(level, rng) {
  const f = level === 3
    ? retry(() => {
      const d = randInt(rng, 2, 12);
      const n = randInt(rng, d + 1, 2 * d - 1);
      return frac(n, d);
    })
    : properFrac(rng, 2, level === 1 ? 12 : 20);
  const unit = frac(0, f.d);
  const rows = stripRows(unit).concat(f.n > f.d ? stripRows(unit) : []);
  return makeTask(rng, {
    world: WORLD, kind: 'darstellen', level,
    prompt: `Färbe ${level === 3 ? formatMixed(f) : format(f)} ein. Das Monster kontrolliert mit dem Lineal!`,
    widget: { type: 'strips', data: { rows: rows.map((r) => ({ ...r, filled: 0 })), mode: 'fill' } },
    answer: { type: 'frac', value: f },
    hints: [
      'Wie viele gleich große Stücke hat ein Ganzes? Der Nenner verrät es. Der Zähler sagt, wie viele du färbst.',
      'Zähle die Stücke im Streifen und färbe von links so viele ein, wie der Zähler verlangt.',
      `Nenner ${f.d}: ${f.d} Stücke pro Streifen. Färbe ${f.n} Stücke ein${f.n > f.d ? `, also ${formatMixed(f)} Streifen` : ''}.`,
    ],
    explain: stripsExplain(stripRows(f)),
    meta: { a: f },
  });
}

export function erweitern(level, rng) {
  const cfg = { 1: [2, 6, 12], 2: [2, 10, 20], 3: [2, 12, 60] }[level];
  const [dLo, dHi, tMax] = cfg;
  const { a, k } = retry(() => {
    const d = randInt(rng, dLo, dHi);
    const kMax = Math.floor(tMax / d);
    if (kMax < 2) return null;
    const kk = level === 3 ? randInt(rng, Math.max(2, Math.floor(kMax / 2)), kMax) : randInt(rng, 2, kMax);
    const n = level === 3 ? randInt(rng, 1, 2 * d - 1) : randInt(rng, 1, d - 1);
    return { a: frac(n, d), k: kk };
  });
  const e = expand(a, k);
  return makeTask(rng, {
    world: WORLD, kind: 'erweitern', level,
    prompt: `Erweitere ${format(a)} auf den Nenner ${e.d}. Schreibe den Bruch mit genau diesem Nenner.`,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value: e, accept: 'exact' },
    hints: [
      'Beim Erweitern machst du die Stücke feiner, aber der Wert ändert sich nicht. Womit musst du den Nenner malnehmen?',
      'Teile jedes Stück im Streifen in gleich viele kleinere Stücke. Zähler und Nenner wachsen im gleichen Tempo.',
      `${e.d} : ${a.d} = ${k}. Also Zähler und Nenner mal ${k}: ${a.n}·${k} = ${e.n}, ${a.d}·${k} = ${e.d}.`,
    ],
    explain: stripsExplain([...stripRows(a), ...stripRows(e)]),
    meta: { a, k, targetD: e.d, op: 'expand' },
  });
}

export function kuerzen(level, rng) {
  const dMax = { 1: 12, 2: 20, 3: 60 }[level];
  const { base, k } = retry(() => {
    const d = randInt(rng, 2, Math.floor(dMax / 2));
    const n = randInt(rng, 1, level === 3 ? 2 * d - 1 : d - 1);
    if (gcd(n, d) !== 1) return null;
    const kMax = Math.floor(dMax / d);
    if (kMax < 2) return null;
    return { base: frac(n, d), k: randInt(rng, level === 3 ? Math.max(2, Math.floor(kMax / 2)) : 2, kMax) };
  });
  const a = expand(base, k);
  return makeTask(rng, {
    world: WORLD, kind: 'kuerzen', level,
    prompt: `Kürze ${format(a)} so weit wie möglich. Halbe Sachen mag das Monster nicht.`,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value: base, mustBeSimplified: true },
    hints: [
      'Gibt es eine Zahl, durch die Zähler und Nenner beide ohne Rest teilbar sind? Dann kannst du kürzen.',
      'Fasse im Streifen immer gleich viele Stücke zu einem größeren Stück zusammen. Wann geht es nicht mehr weiter?',
      `Teile Zähler und Nenner durch ${k}: ${a.n} : ${k} = ${base.n}, ${a.d} : ${k} = ${base.d}. Das Ergebnis ${format(base)} lässt sich nicht weiter kürzen.`,
    ],
    explain: stripsExplain([...stripRows(a), ...stripRows(base)]),
    meta: { a, k, op: 'reduce' },
  });
}

// Operandenpaar fuer Addition/Subtraktion nach Stufe.
function operands(rng, level, forSub) {
  return retry(() => {
    let a;
    let b;
    if (level === 1) {
      const d = randInt(rng, 2, 12);
      a = frac(randInt(rng, 1, d - 1), d);
      b = frac(randInt(rng, 1, d - 1), d);
    } else {
      const dMax = level === 2 ? 20 : 30;
      const mk = level === 2 ? () => properFrac(rng, 2, dMax) : () => mixedFrac(rng, 2, dMax, 5);
      a = mk();
      b = mk();
      if (a.d === b.d || lcm(a.d, b.d) > 60) return null;
    }
    if (forSub) {
      const c = compare(a, b);
      if (c === 0) return null;
      if (c < 0) [a, b] = [b, a];
    }
    return { a, b };
  });
}

function addSubTask(kind, level, rng) {
  const sub_ = kind === 'subtrahieren';
  const { a, b } = operands(rng, level, sub_);
  const res = sub_ ? sub(a, b) : add(a, b);
  const value = simplify(res);
  const op = sub_ ? '-' : '+';
  const show = (f) => (level === 3 ? formatMixed(f) : format(f));
  const cl = commonLine(a, b, op);
  const gleich = a.d === b.d;
  const rows = [
    { parts: cl.L, filled: Math.min(cl.L, cl.x) },
    { parts: cl.L, filled: Math.min(cl.L, cl.y) },
  ];
  const resText = formatMixed(value);
  const tail = format(value) === `${cl.s}/${cl.L}` ? '' : ` = ${format(value)}`;
  return makeTask(rng, {
    world: WORLD, kind, level,
    prompt: pick(rng, [
      `Rechne ${show(a)} ${op} ${show(b)}. Kürzen darfst du, das Monster knurrt nur leise.`,
      `Was ergibt ${show(a)} ${op} ${show(b)}? Bruch oder gemischte Zahl, beides passt.`,
    ]),
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value },
    hints: [
      gleich
        ? 'Die Stücke sind schon gleich groß. Was musst du jetzt zählen und was bleibt, wie es ist?'
        : 'Nur gleich große Stücke kann man zusammenzählen. Wie bekommst du erst mal gleich große Stücke?',
      'Mal dir beide Brüche als Streifen mit gleicher Einteilung. Dann siehst du, wie viele Stücke es zusammen sind.',
      `${level === 3 ? `Als unechte Brüche: ${format(a)} und ${format(b)}. ` : ''}${gleich ? '' : `Hauptnenner ${cl.L}: `}${cl.text}${tail}${value.n >= value.d && value.d > 1 ? ` = ${resText}` : ''}.`,
    ],
    explain: level === 3 || value.n > value.d ? lineExplain([a, b, value]) : stripsExplain(rows),
    meta: { a, b, op: sub_ ? 'sub' : 'add' },
  });
}

export const addieren = (level, rng) => addSubTask('addieren', level, rng);
export const subtrahieren = (level, rng) => addSubTask('subtrahieren', level, rng);

export function bruchteilVomBruchteil(level, rng) {
  const dMax = { 1: 8, 2: 20, 3: 12 }[level];
  const { a, b } = retry(() => {
    const a_ = properFrac(rng, 2, dMax);
    const b_ = level === 3 ? mixedFrac(rng, 2, dMax, 3) : properFrac(rng, 2, dMax);
    return a_.d * b_.d <= 60 ? { a: a_, b: b_ } : null;
  });
  const p = mul(a, b);
  const value = simplify(p);
  const bShow = level === 3 ? formatMixed(b) : format(b);
  return makeTask(rng, {
    world: WORLD, kind: 'bruchteil-vom-bruchteil', level,
    prompt: level === 3
      ? `Das Monster frisst ${format(a)} von ${bShow} Pizzen. Wie viele ganze Pizzen sind das?`
      : `Das Monster frisst ${format(a)} von ${bShow} einer Pizza. Wie viel von der ganzen Pizza ist das?`,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value },
    hints: [
      '„Von" heißt hier „mal". Du nimmst einen Teil von einem Teil, das Ergebnis muss also kleiner werden.',
      'Zeichne den zweiten Bruch als Streifen und zerlege dann jedes Stück in so viele Teile, wie der Nenner des ersten Bruchs sagt.',
      `Zähler mal Zähler, Nenner mal Nenner: (${a.n}·${b.n}) / (${a.d}·${b.d}) = ${p.n}/${p.d}${format(value) === format(p) ? '' : ` = ${format(value)}`}.`,
    ],
    explain: level === 3
      ? lineExplain([b, value])
      : stripsExplain([{ parts: b.d, filled: b.n }, { parts: p.d, filled: p.n }]),
    meta: { a, b, op: 'mul' },
  });
}
