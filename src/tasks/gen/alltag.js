// Welt "Alltag": anteil-von-groesse, rezept, teilen-durch-nat.
import { randInt, pick } from '../../core/rng.js';
import { frac, simplify, lcm, gcd, mul, add, sub, divNat, format, formatMixed } from '../../core/fractions.js';
import { makeTask } from '../types.js';
import { retry, fits, properFrac, mixedFrac, stripRows, stripsExplain, lineExplain } from './shared.js';

const WORLD = 'alltag';

const GROESSEN = [
  { unit: 'Euro', was: 'Taschengeld' },
  { unit: 'Meter', was: 'Lakritzschnur' },
  { unit: 'Liter', was: 'Monsterlimo' },
  { unit: 'kg', was: 'Gummibärchen' },
  { unit: 'Stunden', was: 'Spielzeit' },
  { unit: 'km', was: 'Radweg' },
];
// Euro nur, wenn das Ergebnis ganz ist; bei Bruechen passen Liter, kg, Stunden, km, Meter.
const BRUCH_GROESSEN = GROESSEN.filter((g) => g.unit !== 'Euro');

// Stufe 1: Ergebnis ganz. Stufe 2: Ergebnis ist ein Bruch oder eine gemischte Zahl.
// Stufe 3: rückwärts (3/4 sind 18 kg, wie viel ist das Ganze?) oder Rest nach zwei Anteilen.
function anteilRueckwaerts(rng) {
  const { a, part, whole } = retry(() => {
    const f = properFrac(rng, 3, 10);
    if (simplify(f).d !== f.d || f.n < 2) return null;
    const p_ = randInt(rng, 2, 10);
    const w = simplify(frac(p_ * f.d, f.n));
    return fits(w) && w.n <= 12 * w.d ? { a: f, part: p_, whole: w } : null;
  });
  const g = pick(rng, whole.d === 1 ? GROESSEN : BRUCH_GROESSEN);
  const one = simplify(frac(part, a.n));
  const W = formatMixed(whole);
  return makeTask(rng, {
    world: WORLD, kind: 'anteil-von-groesse', level: 3,
    prompt: `${format(a)} der ${g.was} sind ${part} ${g.unit}. Wie viel ${g.unit} sind es insgesamt?`,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value: whole },
    hints: [
      'Diesmal kennst du den Teil und suchst das Ganze. Das Ganze muss größer sein als der Teil.',
      `Wie viel ist ein einzelnes ${a.d}-tel? Teile den bekannten Teil durch den Zähler.`,
      `${format(a)} sind ${part} ${g.unit}, also ist 1/${a.d} gleich ${part} : ${a.n} = ${formatMixed(one)}. Das Ganze ist ${a.d}-mal so viel: ${W} ${g.unit}.`,
    ],
    explain: stripsExplain(stripRows(a)),
    meta: { a, quantity: { value: part, unit: g.unit }, op: 'div' },
  });
}

export function anteilVonGroesse(level, rng) {
  if (level === 3 && rng() < 0.5) return anteilRueckwaerts(rng);
  let a;
  let b = null;
  let Q;
  if (level === 1) {
    ({ a, Q } = retry(() => {
      const f = properFrac(rng, 2, 12);
      const m = randInt(rng, 1, Math.floor(12 / f.n));
      return { a: f, Q: f.d * m };
    }));
  } else if (level === 2) {
    ({ a, Q } = retry(() => {
      const f = properFrac(rng, 3, 12);
      const q = randInt(rng, 2, 12);
      if (simplify(f).d !== f.d || (f.n * q) % f.d === 0) return null;
      return { a: f, Q: q };
    }));
  } else {
    ({ a, b, Q } = retry(() => {
      const x = properFrac(rng, 2, 12);
      const y = properFrac(rng, 2, 12);
      if (x.d === y.d || lcm(x.d, y.d) > 60) return null;
      if (simplify(x).d !== x.d || simplify(y).d !== y.d) return null;
      const s_ = add(x, y);
      return s_.n < s_.d ? { a: x, b: y, Q: randInt(rng, 2, 12) } : null;
    }));
  }
  const base = frac(Q, 1);
  const part = simplify(mul(a, base));
  const value = b ? simplify(mul(simplify(sub(frac(1, 1), add(a, b))), base)) : part;
  const g = pick(rng, value.d === 1 ? GROESSEN : BRUCH_GROESSEN);
  const q = { value: Q, unit: g.unit };
  const prompt = b
    ? `Von ${Q} ${g.unit} ${g.was} gehen ${format(a)} an Anna und ${format(b)} an Ben. Wie viel bleibt für dich?`
    : `Das Monster teilt ${Q} ${g.unit} ${g.was}. Du bekommst ${format(a)} davon. Wie viel sind das?`;
  const rest = b ? simplify(sub(frac(1, 1), add(a, b))) : null;
  return makeTask(rng, {
    world: WORLD, kind: 'anteil-von-groesse', level,
    prompt,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value },
    hints: [
      b
        ? 'Zähle zuerst zusammen, welcher Anteil weg ist. Der Rest ist das, was vom Ganzen übrig bleibt.'
        : 'Teile das Ganze zuerst in so viele gleiche Teile, wie der Nenner sagt. Dann nimmst du so viele Teile, wie der Zähler sagt.',
      'Zeichne einen Streifen für das Ganze und färbe den gesuchten Anteil. Jeder Teil ist gleich viel wert.',
      b
        ? `Weg: ${format(a)} + ${format(b)} = ${format(simplify(add(a, b)))}. Rest: ${format(rest)}. ${format(rest)} von ${Q} = ${format(value)}.`
        : `${Q} : ${a.d} = ${format(simplify(frac(Q, a.d)))} pro Teil, mal ${a.n} = ${format(value)}.`,
    ],
    explain: b
      ? lineExplain([simplify(add(a, b)), rest])
      : stripsExplain(stripRows(frac(a.n, a.d))),
    meta: b ? { a, b, quantity: q, op: 'sub' } : { a, quantity: q, op: 'mul' },
  });
}

const ZUTATEN = [
  { name: 'Monsterschleim', unit: 'l' },
  { name: 'Mehl', unit: 'kg' },
  { name: 'Zucker', unit: 'kg' },
  { name: 'Milch', unit: 'l' },
  { name: 'Schokolade', unit: 'kg' },
];

export function rezept(level, rng) {
  const z = pick(rng, ZUTATEN);
  const { a, oldN, newN, ratio, value } = retry(() => {
    // Stufe 1: Vielfache der Personenzahl. Stufe 2: krumme Personenzahl. Stufe 3: gemischte Mengen,
    // Personenzahl 3 oder 6 möglich, Ergebnis nie ganz.
    const dMax = { 1: 12, 2: 12, 3: 8 }[level];
    const aa = level === 3 ? mixedFrac(rng, 2, dMax, 3) : properFrac(rng, 2, dMax);
    if (simplify(aa).d !== aa.d) return null;
    let o;
    let nw;
    if (level === 1) {
      o = randInt(rng, 2, 4);
      nw = o * randInt(rng, 2, 3);
    } else {
      o = pick(rng, level === 3 ? [3, 4, 6, 8] : [2, 4, 6, 8]);
      nw = randInt(rng, 1, 12);
      if (nw === o || nw % o === 0) return null;
    }
    const r = frac(nw, o);
    const v = simplify(mul(aa, r));
    if (level === 3 && (v.d === 1 || simplify(r).n === 1 || simplify(r).d === 1)) return null;
    return aa.d * o <= 60 && fits(v) && fits(aa) ? { a: aa, oldN: o, newN: nw, ratio: r, value: v } : null;
  });
  const per = divNat(a, oldN);
  const A = level === 3 ? formatMixed(a) : format(a);
  return makeTask(rng, {
    world: WORLD, kind: 'rezept', level,
    prompt: `Rezept für ${oldN} Monster: ${A} ${z.unit} ${z.name}. Wie viel brauchst du für ${newN} Monster?`,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value },
    hints: [
      'Wie viel braucht ein einzelnes Monster? Von dort aus kommst du zu jeder Gruppengröße.',
      'Mehr Gäste heißt mehr Zutat, weniger Gäste heißt weniger. Das Ergebnis muss dazu passen: Wird es größer oder kleiner?',
      `Für 1 Monster: ${format(a)} : ${oldN} = ${format(per)}. Für ${newN}: ${format(per)} · ${newN} = ${format(value)} ${z.unit}.`,
    ],
    explain: lineExplain([a, value]),
    meta: { a, b: ratio, k: newN, op: 'mul' },
  });
}

const VERTEIL = [
  { unit: 'l', was: 'Monsterlimo', wer: 'Gläser', je: 'jedes Glas' },
  { unit: 'kg', was: 'Schokolade', wer: 'Kinder', je: 'jedes Kind' },
  { unit: 'm', was: 'Lakritzschnur', wer: 'Monster', je: 'jedes Monster' },
];

export function teilenDurchNat(level, rng) {
  const v = pick(rng, VERTEIL);
  const { a, k } = retry(() => {
    const kMax = { 1: 4, 2: 8, 3: 12 }[level];
    // Stufe 1: Zähler oft durch k teilbar. Stufe 2: Ergebnis muss gekürzt werden oder Zähler nicht teilbar.
    // Stufe 3: gemischte Zahl, Zähler des unechten Bruchs nicht durch k teilbar.
    const aa = level === 3 ? mixedFrac(rng, 2, 10, 4) : properFrac(rng, 2, level === 1 ? 12 : 15);
    if (simplify(aa).d !== aa.d) return null;
    const kk = randInt(rng, 2, kMax);
    if (level === 3 && aa.n % kk === 0) return null;
    if (level === 2 && aa.n % kk === 0 && rng() < 0.7) return null;
    return aa.d * kk <= 60 ? { a: aa, k: kk } : null;
  });
  const res = divNat(a, k);
  const value = simplify(res);
  const A = level === 3 ? formatMixed(a) : format(a);
  return makeTask(rng, {
    world: WORLD, kind: 'teilen-durch-nat', level,
    prompt: `${A} ${v.unit} ${v.was} werden gerecht auf ${k} ${v.wer} verteilt. Wie viel bekommt ${v.je}?`,
    widget: { type: 'input', data: {} },
    answer: { type: 'frac', value },
    hints: [
      'Teilst du etwas auf mehr Leute auf, bekommt jeder weniger. Was passiert mit der Größe der Stücke?',
      'Zerschneide jedes Stück im Streifen in so viele kleinere Stücke, wie es Empfänger gibt.',
      `Nenner mal ${k}: ${format(a)} : ${k} = ${res.n}/${res.d}${format(value) === format(res) ? '' : ` = ${format(value)}`}.`,
    ],
    explain: a.n < a.d
      ? stripsExplain([...stripRows(a), { parts: res.d, filled: res.n }])
      : lineExplain([a, value]),
    meta: { a, k, op: 'div' },
  });
}
