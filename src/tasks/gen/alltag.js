// Welt "Alltag": anteil-von-groesse, rezept, teilen-durch-nat.
import { randInt, pick } from '../../core/rng.js';
import { frac, simplify, lcm, mul, add, sub, divNat, format, formatMixed } from '../../core/fractions.js';
import { makeTask } from '../types.js';
import { retry, fits, properFrac, mixedFrac, stripRows, stripsExplain, lineExplain } from './shared.js';

const WORLD = 'alltag';

const GROESSEN = [
  { unit: 'Euro', was: 'Taschengeld' },
  { unit: 'Meter', was: 'Lakritzschnur' },
  { unit: 'Liter', was: 'Monsterlimo' },
  { unit: 'kg', was: 'Gummibärchen' },
];

export function anteilVonGroesse(level, rng) {
  const g = pick(rng, GROESSEN);
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
    a = properFrac(rng, 3, 20);
    Q = randInt(rng, 2, 12);
  } else {
    ({ a, b, Q } = retry(() => {
      const x = properFrac(rng, 2, 20);
      const y = properFrac(rng, 2, 20);
      if (x.d === y.d || lcm(x.d, y.d) > 60) return null;
      const s = add(x, y);
      return s.n < s.d ? { a: x, b: y, Q: randInt(rng, 2, 12) } : null;
    }));
  }
  const base = frac(Q, 1);
  const part = simplify(mul(a, base));
  const value = b ? simplify(mul(simplify(sub(frac(1, 1), add(a, b))), base)) : part;
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
    const dMax = { 1: 12, 2: 20, 3: 12 }[level];
    const aa = level === 3 ? mixedFrac(rng, 2, dMax, 3) : properFrac(rng, 2, dMax);
    let o;
    let nw;
    if (level === 1) {
      o = randInt(rng, 2, 4);
      nw = o * randInt(rng, 2, 3);
    } else {
      o = pick(rng, [2, 4, 6, 8]);
      nw = randInt(rng, 1, 12);
      if (nw === o || (level === 2 && nw % o === 0)) return null;
    }
    const r = frac(nw, o);
    const v = simplify(mul(aa, r));
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
  { unit: 'l', was: 'Monsterlimo', wer: 'Gläser' },
  { unit: 'kg', was: 'Schokolade', wer: 'Kinder' },
  { unit: 'm', was: 'Lakritzschnur', wer: 'Monster' },
];

export function teilenDurchNat(level, rng) {
  const v = pick(rng, VERTEIL);
  const { a, k } = retry(() => {
    const kMax = { 1: 4, 2: 8, 3: 12 }[level];
    const aa = level === 3 ? mixedFrac(rng, 2, 12, 5) : properFrac(rng, 2, level === 1 ? 12 : 20);
    const kk = randInt(rng, 2, kMax);
    return aa.d * kk <= 60 ? { a: aa, k: kk } : null;
  });
  const res = divNat(a, k);
  const value = simplify(res);
  const A = level === 3 ? formatMixed(a) : format(a);
  return makeTask(rng, {
    world: WORLD, kind: 'teilen-durch-nat', level,
    prompt: `${A} ${v.unit} ${v.was} werden gerecht auf ${k} ${v.wer} verteilt. Wie viel bekommt jeder?`,
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
