// Welt "Zahlenstrahl": platzieren, schaetzen, vergleichen, dazwischen.
import { randInt, pick } from '../../core/rng.js';
import { frac, simplify, lcm, compare, format, formatMixed } from '../../core/fractions.js';
import { makeTask } from '../types.js';
import { retry, properFrac, lineExplain } from './shared.js';

// Orientierung in Vierteln, ohne Dezimalzahlen.
function quarterHint(f) {
  const q = (f.n * 4) / f.d;
  const nice = (n) => formatMixed(simplify(frac(n, 4)));
  if (Number.isInteger(q)) {
    const same = format(simplify(f)) === format(f);
    return same
      ? `${format(f)} liegt genau auf einem Viertel-Strich. Teile die Strecke im Kopf in Viertel und zähle ab.`
      : `${format(f)} ist gekürzt ${nice(q)} und liegt genau auf einem Viertel-Strich. Setz deinen Punkt dorthin.`;
  }
  return `${format(f)} liegt zwischen ${nice(Math.floor(q))} und ${nice(Math.ceil(q))}. Setz deinen Punkt in diese Gegend.`;
}

const WORLD = 'strahl';
const sym = ['<', '=', '>'];

// Stufe 1: Einteilung = Nenner, abzählen. Stufe 2: Einteilung feiner oder gröber als der Nenner,
// man muss erst erweitern oder kürzen. Stufe 3: unechte Brüche, Einteilung passt nie direkt zum Nenner.
export function platzieren(level, rng) {
  const { f, ticks, to } = retry(() => {
    if (level === 1) {
      const d = randInt(rng, 2, 12);
      const n = randInt(rng, 1, d - 1);
      return { f: frac(n, d), ticks: d, to: 1 };
    }
    const to_ = level === 2 ? 1 : 3;
    const base = level === 2 ? properFrac(rng, 2, 8) : (() => { const d = randInt(rng, 2, 6); return frac(randInt(rng, d + 1, 3 * d - 1), d); })();
    if (simplify(base).d !== base.d || base.n % base.d === 0 || base.n >= to_ * base.d) return null;
    const k = randInt(rng, 2, level === 2 ? 3 : 4);
    const t = base.d * k;
    if (t * to_ > 48) return null;
    // Halb der Fälle: feine Einteilung, Bruch gekürzt angegeben (3/4 auf Achteln).
    // Sonst: Einteilung gekürzt, Bruch erweitert angegeben (6/8 auf Vierteln).
    return rng() < 0.5
      ? { f: base, ticks: t, to: to_ }
      : { f: frac(base.n * k, base.d * k), ticks: base.d, to: to_ };
  });
  const sv = simplify(f);
  const step = ticks === f.d
    ? `Nenner ${f.d}: ${f.d} Stücke pro Ganzes. Zähle ${f.n} Striche von 0 aus ab und du landest bei ${format(f)}.`
    : ticks > f.d
      ? `Jedes Ganze hat ${ticks} Stücke. Erweitere: ${format(f)} = ${(f.n * ticks) / f.d}/${ticks}. Zähle ${(f.n * ticks) / f.d} Striche ab.`
      : `Jedes Ganze hat ${ticks} Stücke. Kürze: ${format(f)} = ${format(sv)}. Zähle ${(sv.n * ticks) / sv.d} Striche ab.`;
  return makeTask(rng, {
    world: WORLD, kind: 'platzieren', level,
    prompt: pick(rng, [
      `Parke ${format(f)} auf dem Zahlenstrahl. Das Monster hat Hunger, also bitte genau!`,
      `Wo wohnt ${format(f)} auf dem Zahlenstrahl? Tipp dein Ziel an.`,
    ]),
    widget: { type: 'numberline', data: { from: 0, to, ticks, marks: [] } },
    answer: { type: 'position', value: f, tolerance: 1 / (2 * Math.max(ticks, f.d)) },
    hints: [
      'Wie viele gleich große Stücke hat ein Ganzes auf diesem Strahl? Passt das zum Nenner deines Bruchs?',
      ticks === f.d
        ? 'Jeder Abschnitt zwischen zwei Strichen ist ein Stück. Der Zähler sagt dir, wie viele Stücke du von 0 aus abzählst.'
        : 'Die Striche passen nicht direkt zum Nenner. Schreib den Bruch so um, dass sein Nenner zur Einteilung passt.',
      step,
    ],
    explain: lineExplain([f], ticks),
    meta: { a: f },
  });
}

// Stufe 1: bis 1, Hilfsmarke 1/2, großzügig. Stufe 2: ohne Marke, enger.
// Stufe 3: bis 2, krumme Nenner (7, 9, 11, 13 …), Wert nie nahe an einem Viertel, sehr eng.
export function schaetzen(level, rng) {
  const to = level === 3 ? 2 : 1;
  const f = retry(() => {
    const d = level === 3 ? pick(rng, [7, 9, 11, 13, 14, 15, 17, 19, 21, 23]) : randInt(rng, 2, level === 1 ? 12 : 20);
    const n = randInt(rng, 1, to * d - 1);
    if (n % d === 0) return null;
    const g = frac(n, d);
    if (level === 2 && simplify(g).d < 5) return null;
    if (level === 3) {
      const q = (4 * n) / d;
      if (Math.abs(q - Math.round(q)) < 0.25) return null;
    }
    return g;
  });
  const tolerance = { 1: 0.08, 2: 0.05, 3: 0.04 }[level];
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

const value = (f) => f.n / f.d;

// Stufe 1: gleicher Nenner ODER gleicher Zähler (Stück-Größe verstehen, 1/3 > 1/4).
// Stufe 2: verschiedene Nenner, ein Nenner ist Vielfaches des anderen, oder Vergleich über 1/2 bzw. den Rest bis 1.
//   Die Brüche liegen höchstens 1/4 auseinander, damit man nicht nur auf die Größe schaut.
// Stufe 3: echte Knobelpaare. Beide auf derselben Seite von 1/2, Abstand höchstens 1/24,
//   der größere Zähler gehört NICHT automatisch zum größeren Bruch (Falle „größere Zahlen = größer“),
//   kein Nenner ist Vielfaches des anderen. Dazu gleichwertige Paare wie 6/9 und 8/12.
function comparePair(rng, level) {
  if (level === 1) {
    return retry(() => {
      if (rng() < 0.4) {
        const n = randInt(rng, 1, 5);
        const a = frac(n, randInt(rng, n + 1, 12));
        const b = frac(n, randInt(rng, n + 1, 12));
        return a.d === b.d ? null : [a, b];
      }
      const d = randInt(rng, 3, 12);
      const a = frac(randInt(rng, 1, d - 1), d);
      const b = frac(randInt(rng, 1, d - 1), d);
      return a.n === b.n ? null : [a, b];
    });
  }
  if (level === 2) {
    const equal = rng() < 0.15;
    const multiple = rng() < 0.5;
    return retry(() => {
      if (equal) {
        const a = properFrac(rng, 2, 6);
        if (simplify(a).d !== a.d) return null;
        const k = randInt(rng, 2, 4);
        return [a, frac(a.n * k, a.d * k)];
      }
      const a = properFrac(rng, 3, 12);
      if (simplify(a).d !== a.d) return null;
      let b;
      if (multiple) {
        b = properFrac(rng, a.d * 2, a.d * randInt(rng, 2, 3));
        if (b.d % a.d !== 0) return null;
      } else {
        b = properFrac(rng, 3, 15);
      }
      if (a.d === b.d || compare(a, b) === 0 || lcm(a.d, b.d) > 60) return null;
      if (Math.abs(value(a) - value(b)) > 0.25) return null;
      return rng() < 0.5 ? [a, b] : [b, a];
    });
  }
  const equal = rng() < 0.15;
  const trap = rng() < 0.6;
  return retry(() => {
    if (equal) {
      const base = properFrac(rng, 3, 6);
      if (simplify(base).d !== base.d) return null;
      const k1 = randInt(rng, 2, 5);
      const k2 = randInt(rng, 2, 5);
      if (k1 === k2 || k1 % k2 === 0 || k2 % k1 === 0) return null;
      const a = frac(base.n * k1, base.d * k1);
      const b = frac(base.n * k2, base.d * k2);
      return a.d <= 30 && b.d <= 30 && lcm(a.d, b.d) <= 60 ? [a, b] : null;
    }
    const a = properFrac(rng, 4, 20);
    const b = properFrac(rng, 4, 20);
    if (simplify(a).d !== a.d || simplify(b).d !== b.d) return null;
    if (a.d === b.d || a.n === b.n || a.d % b.d === 0 || b.d % a.d === 0) return null;
    if (lcm(a.d, b.d) > 60) return null;
    const diff = Math.abs(value(a) - value(b));
    if (diff === 0 || diff > 1 / 24) return null;
    if ((value(a) - 0.5) * (value(b) - 0.5) <= 0) return null;
    // Falle: der Bruch mit größerem Zähler und Nenner ist der kleinere, oder es ist knapp.
    const [big, small] = compare(a, b) > 0 ? [a, b] : [b, a];
    if (trap && !(small.n > big.n && small.d > big.d)) return null;
    return rng() < 0.5 ? [a, b] : [b, a];
  }, 20000);
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
        : a.n === b.n
          ? 'Beide haben gleich viele Stücke. Welche Stücke sind größer: bei kleinem oder bei großem Nenner?'
          : 'Bringe beide Brüche auf gleich große Stücke. Dann musst du nur noch zählen, wer mehr davon hat.',
      level === 3
        ? 'Vorsicht: Größere Zahlen heißen nicht größerer Bruch. Rechne nach, zum Beispiel mit dem Hauptnenner oder über das, was bis zum Ganzen fehlt.'
        : 'Schau beide Brüche auf dem Zahlenstrahl an: Wer weiter rechts steht, ist größer.',
      a.n === b.n && a.d !== b.d
        ? `Gleicher Zähler: Bei Nenner ${Math.min(a.d, b.d)} sind die Stücke größer als bei Nenner ${Math.max(a.d, b.d)}. Also ${format(a)} ${sym[c + 1]} ${format(b)}.`
        : `Hauptnenner ${L}: ${format(a)} = ${ax}/${L} und ${format(b)} = ${bx}/${L}. Also ${format(a)} ${sym[c + 1]} ${format(b)}.`,
    ],
    explain: lineExplain([a, b]),
    meta: { a, b, op: 'compare' },
  });
}

// Stufe 1: gleicher Nenner mit genau einem freien Strich dazwischen.
// Stufe 2: verschiedene Nenner, nah beieinander (höchstens 1/6 Abstand).
// Stufe 3: direkte Nachbarn wie 2/5 und 3/7 oder gleicher Nenner mit Abstand 1/d: man muss verfeinern.
export function dazwischen(level, rng) {
  const sameD = rng() < 0.4;
  const [a, b] = retry(() => {
    let x;
    let y;
    if (level === 1) {
      const d = randInt(rng, 4, 12);
      x = frac(randInt(rng, 1, d - 3), d);
      y = frac(x.n + 2, d);
    } else if (level === 2) {
      x = properFrac(rng, 3, 12);
      y = properFrac(rng, 3, 12);
      if (x.d === y.d || compare(x, y) === 0) return null;
      if (compare(x, y) > 0) [x, y] = [y, x];
      if (value(y) - value(x) > 1 / 6) return null;
    } else if (sameD) {
      const d = randInt(rng, 5, 15);
      x = frac(randInt(rng, 1, d - 2), d);
      y = frac(x.n + 1, d);
    } else {
      x = properFrac(rng, 3, 12);
      y = properFrac(rng, 3, 12);
      if (x.d === y.d || compare(x, y) === 0) return null;
      if (compare(x, y) > 0) [x, y] = [y, x];
      // Nachbarn: y·x.d - x·y.d = 1, dann liegt kein Bruch mit kleinem Nenner dazwischen.
      if (y.n * x.d - x.n * y.d !== 1) return null;
    }
    if (simplify(x).d !== x.d || simplify(y).d !== y.d) return null;
    return lcm(x.d, y.d) <= 30 ? [x, y] : null;
  }, 5000);
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
