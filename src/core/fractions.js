// Reine Bruch-Mathematik und Eingabe-Parser fuer Bruchmonster.
// type Frac = { n: number, d: number }  (n >= 0, d >= 1, ganze Zahlen)
// Ergebnisse von add/sub/mul/divNat werden bewusst NICHT automatisch gekuerzt.

function assertNat(x, name, min) {
  if (!Number.isInteger(x) || x < min) {
    throw new RangeError(`${name} muss eine ganze Zahl >= ${min} sein`);
  }
}

export function frac(n, d) {
  assertNat(n, 'Zaehler', 0);
  assertNat(d, 'Nenner', 1);
  return { n, d };
}

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

export function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

export function simplify(f) {
  if (f.n === 0) return { n: 0, d: 1 };
  const g = gcd(f.n, f.d);
  return { n: f.n / g, d: f.d / g };
}

export function isSimplified(f) {
  return gcd(f.n, f.d) === 1;
}

export function equal(a, b) {
  return a.n * b.d === b.n * a.d;
}

export function compare(a, b) {
  const diff = a.n * b.d - b.n * a.d;
  if (diff > 0) return 1;
  if (diff < 0) return -1;
  return 0;
}

export function expand(f, k) {
  assertNat(k, 'Erweiterungsfaktor', 1);
  return { n: f.n * k, d: f.d * k };
}

export function add(a, b) {
  return { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
}

export function sub(a, b) {
  const n = a.n * b.d - b.n * a.d;
  if (n < 0) throw new RangeError('Differenz ist negativ');
  return { n, d: a.d * b.d };
}

export function mul(a, b) {
  return { n: a.n * b.n, d: a.d * b.d };
}

export function divNat(f, k) {
  assertNat(k, 'Divisor', 1);
  return { n: f.n, d: f.d * k };
}

export function toMixed(f) {
  return { whole: Math.floor(f.n / f.d), n: f.n % f.d, d: f.d };
}

export function fromMixed(whole, n, d) {
  assertNat(whole, 'Ganzzahl', 0);
  return frac(whole * d + n, d);
}

export function format(f) {
  return f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`;
}

export function formatMixed(f) {
  const { whole, n, d } = toMixed(f);
  if (n === 0) return `${whole}`;
  if (whole === 0) return `${n}/${d}`;
  return `${whole} ${n}/${d}`;
}

const RE_INT = /^\d+$/;
const RE_FRAC = /^(\d+)\s*\/\s*(\d+)$/;
const RE_MIXED = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/;

// Liefert den eingegebenen Wert unveraendert (nicht gekuerzt).
export function parseAnswer(text) {
  const t = String(text ?? '').trim();
  if (t === '') return { ok: false, reason: 'leer' };
  if (t.length > 40) return { ok: false, reason: 'format' };
  if (t.includes('-')) return { ok: false, reason: 'negativ' };

  // Bis eine Million: dann sind alle Produkte beim Vergleichen und Kuerzen exakt darstellbar.
  const safe = (...xs) => xs.every((x) => Number.isSafeInteger(x) && x <= 1_000_000);
  let m;
  if ((m = RE_MIXED.exec(t))) {
    const whole = Number(m[1]);
    const n = Number(m[2]);
    const d = Number(m[3]);
    if (!safe(whole, n, d) || !safe(whole * d + n)) return { ok: false, reason: 'format' };
    if (d === 0) return { ok: false, reason: 'nenner-null' };
    return { ok: true, value: fromMixed(whole, n, d) };
  }
  if ((m = RE_FRAC.exec(t))) {
    const n = Number(m[1]);
    const d = Number(m[2]);
    if (!safe(n, d)) return { ok: false, reason: 'format' };
    if (d === 0) return { ok: false, reason: 'nenner-null' };
    return { ok: true, value: frac(n, d) };
  }
  if (RE_INT.test(t)) {
    const n = Number(t);
    if (!safe(n)) return { ok: false, reason: 'format' };
    return { ok: true, value: frac(n, 1) };
  }
  return { ok: false, reason: 'format' };
}
