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

// Stufe 1: Streifen hat so viele Teile wie der Nenner. Stufe 2: Streifen feiner oder gröber
// als der Nenner (3/4 auf Achteln, 6/9 auf Dritteln). Stufe 3: gemischte Zahl, Einteilung passt nicht.
export function darstellen(level, rng) {
  const { f, parts } = retry(() => {
    if (level === 1) {
      const g = properFrac(rng, 2, 10);
      return { f: g, parts: g.d };
    }
    const base = level === 2 ? properFrac(rng, 2, 6) : (() => { const d = randInt(rng, 2, 6); return frac(randInt(rng, d + 1, 2 * d - 1), d); })();
    if (simplify(base).d !== base.d) return null;
    const k = randInt(rng, 2, level === 2 ? 3 : 4);
    if (base.d * k > 24) return null;
    return rng() < 0.5 ? { f: base, parts: base.d * k } : { f: frac(base.n * k, base.d * k), parts: base.d };
  });
  const unit = { n: 0, d: parts };
  const rows = stripRows(unit).concat(f.n > f.d ? stripRows(unit) : []);
  const shown = level === 3 ? formatMixed(f) : format(f);
  const target = (f.n * parts) / f.d;
  return makeTask(rng, {
    world: WORLD, kind: 'darstellen', level,
    prompt: `Färbe ${shown} ein. Das Monster kontrolliert mit dem Lineal!`,
    widget: { type: 'strips', data: { rows: rows.map((r) => ({ ...r, filled: 0 })), mode: 'fill' } },
    answer: { type: 'frac', value: f },
    hints: [
      parts === f.d
        ? 'Wie viele gleich große Stücke hat ein Ganzes? Der Nenner verrät es. Der Zähler sagt, wie viele du färbst.'
        : `Dein Streifen hat ${parts} Stücke, der Bruch hat den Nenner ${f.d}. Schreib den Bruch erst passend um.`,
      'Zähle die Stücke im Streifen und färbe von links so viele ein, wie der umgeschriebene Zähler verlangt.',
      `${parts === f.d ? '' : `${format(f)} = ${target}/${parts}. `}Färbe ${target} Stücke ein${f.n > f.d ? `, also ${formatMixed(f)} Streifen` : ''}.`,
    ],
    explain: stripsExplain(stripRows(frac(target, parts))),
    meta: { a: f },
  });
}

// Stufe 1: kleiner Faktor. Stufe 2: größere Nenner bis 60.
// Stufe 3: Ausgangsbruch ist nicht gekürzt und der Zielnenner kein Vielfaches davon (6/9 auf Nenner 15):
// erst kürzen, dann erweitern.
export function erweitern(level, rng) {
  if (level === 3) {
    const { a, e } = retry(() => {
      const base = properFrac(rng, 2, 9);
      if (simplify(base).d !== base.d) return null;
      const k1 = randInt(rng, 2, 5);
      const k2 = randInt(rng, 2, 8);
      const from = frac(base.n * k1, base.d * k1);
      const to_ = frac(base.n * k2, base.d * k2);
      if (to_.d % from.d === 0 || from.d % to_.d === 0 || to_.d > 60 || from.d > 40) return null;
      return { a: from, e: to_ };
    });
    const b = simplify(a);
    return makeTask(rng, {
      world: WORLD, kind: 'erweitern', level,
      prompt: `Schreibe ${format(a)} mit dem Nenner ${e.d}. Vorsicht, ${e.d} ist kein Vielfaches von ${a.d}!`,
      widget: { type: 'input', data: {} },
      answer: { type: 'frac', value: e, accept: 'exact' },
      hints: [
        `${e.d} : ${a.d} geht nicht auf. Kannst du ${format(a)} vorher kleiner machen, ohne den Wert zu ändern?`,
        'Erst kürzen, dann erweitern. Beides ändert den Wert nicht.',
        `${format(a)} = ${format(b)} (gekürzt). ${e.d} : ${b.d} = ${e.d / b.d}, also ${format(b)} = ${format(e)}.`,
      ],
      explain: stripsExplain([...stripRows(a), ...stripRows(b), ...stripRows(e)]),
      meta: { a, k: e.d / b.d, targetD: e.d, op: 'expand' },
    });
  }
  const cfg = { 1: [2, 6, 12], 2: [3, 12, 60] }[level];
  const [dLo, dHi, tMax] = cfg;
  const { a, k } = retry(() => {
    const d = randInt(rng, dLo, dHi);
    const kMax = Math.floor(tMax / d);
    if (kMax < 2) return null;
    const kk = level === 2 ? randInt(rng, Math.max(3, Math.floor(kMax / 2)), kMax) : randInt(rng, 2, kMax);
    if (kk < 2 || kk > kMax) return null;
    const n = level === 2 ? randInt(rng, 1, 2 * d - 1) : randInt(rng, 1, d - 1);
    if (n % d === 0) return null;
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

// Stufe 1: kleiner Faktor (2, 3, 5). Stufe 2: Faktor 4 bis 9, Nenner bis 60.
// Stufe 3: großer zusammengesetzter Faktor (12, 14, 15, 16, 18 …), oft unecht: mehrere Schritte nötig.
export function kuerzen(level, rng) {
  const { base, k } = retry(() => {
    const kk = level === 1 ? pick(rng, [2, 3, 5]) : level === 2 ? randInt(rng, 4, 9) : pick(rng, [12, 14, 15, 16, 18, 20, 21, 24]);
    const dMaxBase = Math.floor(60 / kk);
    if (dMaxBase < 2) return null;
    const d = randInt(rng, 2, Math.min(level === 1 ? 6 : 12, dMaxBase));
    const n = randInt(rng, 1, level === 3 ? 2 * d - 1 : d - 1);
    if (gcd(n, d) !== 1 || n % d === 0) return null;
    if (level === 3 && (n * kk > 120 || d < 3 || n < 2)) return null;
    return { base: frac(n, d), k: kk };
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
// Stufe 1: gleicher Nenner. Stufe 2: verschiedene Nenner, Hauptnenner ist nicht einfach das Produkt
// oder das Ergebnis muss gekürzt werden. Stufe 3: gemischte Zahlen; beim Addieren meist mit Übertrag,
// beim Subtrahieren meist mit Aufbrechen eines Ganzen.
function operands(rng, level, forSub) {
  const tricky = rng() < 0.7;
  return retry(() => {
    let a;
    let b;
    if (level === 1) {
      const d = randInt(rng, 2, 12);
      a = frac(randInt(rng, 1, d - 1), d);
      b = frac(randInt(rng, 1, d - 1), d);
    } else if (level === 2) {
      a = properFrac(rng, 3, 20);
      b = properFrac(rng, 3, 20);
      if (simplify(a).d !== a.d || simplify(b).d !== b.d) return null;
      const L = lcm(a.d, b.d);
      if (a.d === b.d || L > 60) return null;
      const res = forSub ? sub(a.n / a.d >= b.n / b.d ? a : b, a.n / a.d >= b.n / b.d ? b : a) : add(a, b);
      const needsReduce = simplify(res).d !== res.d || (res.n * L) / res.d !== Math.round((res.n * L) / res.d) || simplify(frac((res.n * L) / res.d, L)).d !== L;
      if (tricky && L === a.d * b.d && !needsReduce) return null;
    } else {
      a = mixedFrac(rng, 3, 15, 5);
      b = mixedFrac(rng, 3, 15, 4);
      if (simplify(a).d !== a.d || simplify(b).d !== b.d) return null;
      if (a.d === b.d || lcm(a.d, b.d) > 60) return null;
      const ra = (a.n % a.d) / a.d;
      const rb = (b.n % b.d) / b.d;
      if (!forSub && tricky && ra + rb <= 1) return null;
      if (forSub && Math.floor(a.n / a.d) === Math.floor(b.n / b.d)) return null;
      if (forSub) {
        const [big, small] = a.n / a.d >= b.n / b.d ? [ra, rb] : [rb, ra];
        if (tricky && big >= small) return null;
      }
    }
    if (forSub) {
      const c = compare(a, b);
      if (c === 0) return null;
      if (c < 0) [a, b] = [b, a];
    }
    return { a, b };
  }, 5000);
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
  // Stufe 1: Stammbruch von einem Bruch. Stufe 2: beliebige echte Brüche, Ergebnis oft kürzbar.
  // Stufe 3: Bruch von gemischter Zahl, vor dem Multiplizieren kürzen lohnt sich immer (4/9 von 2 1/4).
  const dMax = { 1: 8, 2: 12, 3: 12 }[level];
  const { a, b } = retry(() => {
    const a_ = level === 1 ? frac(1, randInt(rng, 2, 6)) : properFrac(rng, 2, dMax);
    const b_ = level === 3 ? mixedFrac(rng, 2, dMax, 3) : properFrac(rng, 2, dMax);
    if (simplify(a_).d !== a_.d || simplify(b_).d !== b_.d) return null;
    if (a_.d * b_.d > (level === 3 ? 120 : 60)) return null;
    if (level === 3 && gcd(a_.n, b_.d) === 1 && gcd(b_.n, a_.d) === 1) return null;
    if (level === 2 && gcd(a_.n * b_.n, a_.d * b_.d) === 1 && rng() < 0.6) return null;
    return { a: a_, b: b_ };
  }, 5000);
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
      level === 3
        ? (() => {
          const g1 = gcd(a.n, b.d);
          const g2 = gcd(b.n, a.d);
          return `Als unechter Bruch: ${format(b)}. Erst über Kreuz kürzen: ${a.n} und ${b.d} durch ${g1}, ${b.n} und ${a.d} durch ${g2}. Dann (${a.n / g1}·${b.n / g2}) / (${a.d / g2}·${b.d / g1}) = ${format(value)}${value.n > value.d && value.d > 1 ? ` = ${formatMixed(value)}` : ''}.`;
        })()
        : `Zähler mal Zähler, Nenner mal Nenner: (${a.n}·${b.n}) / (${a.d}·${b.d}) = ${p.n}/${p.d}${format(value) === format(p) ? '' : ` = ${format(value)}`}.`,
    ],
    explain: level === 3
      ? lineExplain([b, value])
      : stripsExplain([{ parts: b.d, filled: b.n }, { parts: p.d, filled: p.n }]),
    meta: { a, b, op: 'mul' },
  });
}
