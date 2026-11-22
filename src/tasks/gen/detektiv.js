// Welt "Detektiv": fehler-finden (falsche Zeile in einer Rechnung), regel-entdecken (Vermutung waehlen).
import { randInt, pick, shuffle } from '../../core/rng.js';
import { frac, simplify, gcd, lcm, expand, format, formatMixed, add } from '../../core/fractions.js';
import { makeTask } from '../types.js';
import { retry, properFrac, mixedFrac, stripRows, stripsExplain, lineExplain } from './shared.js';

const WORLD = 'detektiv';
const mixed = (w, p) => frac(w * p.d + p.n, p.d);

// ---- fehler-finden: jede Vorlage liefert { steps, wrong, why, right, tip, explain, ...meta } ----

function addNennerGleich(rng) {
  const d = randInt(rng, 3, 12);
  const a = frac(randInt(rng, 1, d - 1), d);
  const b = frac(randInt(rng, 1, d - 1), d);
  return {
    steps: [`${format(a)} + ${format(b)}`, `= (${a.n} + ${b.n}) / (${d} + ${d})`, `= ${a.n + b.n}/${2 * d}`],
    wrong: 1, a, b, op: 'add',
    why: 'Beim Addieren gleichnamiger Brüche bleibt der Nenner stehen, nur die Zähler werden addiert.',
    right: `${a.n + b.n}/${d}`,
    tip: 'Stell dir zwei Pizzen vor, jede in gleich viele Stücke geschnitten. Die Stücke werden zusammengezählt, die Größe der Stücke bleibt.',
    explain: stripsExplain([{ parts: d, filled: a.n }, { parts: d, filled: b.n }]),
  };
}

function addNennerUngleich(rng) {
  const { a, b, L } = retry(() => {
    const x = properFrac(rng, 2, 12);
    const y = properFrac(rng, 2, 12);
    const l = lcm(x.d, y.d);
    return x.d !== y.d && l <= 30 ? { a: x, b: y, L: l } : null;
  });
  const x = (a.n * L) / a.d;
  const y = (b.n * L) / b.d;
  return {
    steps: [`${format(a)} + ${format(b)}`, `= ${x}/${L} + ${y}/${L}`, `= (${x} + ${y}) / (${L} + ${L})`, `= ${x + y}/${2 * L}`],
    wrong: 2, a, b, op: 'add',
    why: 'Der gemeinsame Nenner bleibt beim Addieren stehen. Nur die Zähler werden addiert.',
    right: `${x + y}/${L}`,
    tip: 'Gleich große Stücke werden gezählt, nicht verdoppelt. Prüfe, ob die Stückgröße nach dem Addieren noch dieselbe ist.',
    explain: stripsExplain([{ parts: L, filled: x }, { parts: L, filled: y }]),
  };
}

function erweiternNurZaehler(rng) {
  const d = randInt(rng, 2, 6);
  const a = frac(randInt(rng, 1, d - 1), d);
  const k = randInt(rng, 2, 5);
  const e = expand(a, k);
  return {
    steps: [`Erweitere ${format(a)} mit ${k}`, `Zähler mal ${k}: ${a.n} · ${k} = ${e.n}`, `Nenner bleibt: ${d}`, `= ${e.n}/${d}`],
    wrong: 2, a, k, op: 'expand',
    why: 'Beim Erweitern wird auch der Nenner mit der Zahl multipliziert, sonst ändert sich der Wert.',
    right: format(e),
    tip: 'Erweitern schneidet die Stücke feiner, ohne den Wert zu ändern. Wenn nur der Zähler wächst, hast du mehr Stücke gleicher Größe.',
    explain: stripsExplain([...stripRows(a), ...stripRows(e)]),
  };
}

function kuerzenNurZaehler(rng) {
  const { base, g } = retry(() => {
    const d = randInt(rng, 2, 6);
    const n = randInt(rng, 1, d - 1);
    return gcd(n, d) === 1 ? { base: frac(n, d), g: randInt(rng, 2, 6) } : null;
  });
  const a = expand(base, g);
  return {
    steps: [`Kürze ${format(a)}`, `Zähler durch ${g}: ${a.n} : ${g} = ${base.n}`, `Nenner bleibt: ${a.d}`, `= ${base.n}/${a.d}`],
    wrong: 2, a, k: g, op: 'reduce',
    why: `Beim Kürzen teilst du Zähler und Nenner durch dieselbe Zahl, hier durch ${g}.`,
    right: format(base),
    tip: 'Kürzen fasst Stücke zu größeren zusammen. Dabei ändern sich Stückzahl und Stückgröße gleichzeitig, der Wert bleibt.',
    explain: stripsExplain([...stripRows(a), ...stripRows(simplify(a))]),
  };
}

function malNennerGleich(rng) {
  const { a, b, L } = retry(() => {
    const x = properFrac(rng, 2, 10);
    const y = properFrac(rng, 2, 10);
    const l = lcm(x.d, y.d);
    return x.d !== y.d && l <= 30 ? { a: x, b: y, L: l } : null;
  });
  const x = (a.n * L) / a.d;
  const y = (b.n * L) / b.d;
  const p = frac(a.n * b.n, a.d * b.d);
  return {
    steps: [`${format(a)} · ${format(b)}`, `= ${x}/${L} · ${y}/${L}`, `= (${x} · ${y}) / ${L}`, `= ${x * y}/${L}`],
    wrong: 2, a, b, op: 'mul',
    why: 'Beim Multiplizieren wird auch der Nenner mit dem Nenner multipliziert. Einen Hauptnenner braucht man dafür nicht.',
    right: format(p),
    tip: 'Ein Teil von einem Teil wird sehr klein. Prüfe, ob dein Ergebnis überhaupt kleiner sein kann als jeder einzelne Faktor.',
    explain: lineExplain([a, simplify(p)]),
  };
}

function teilenNennerGeteilt(rng) {
  const k = randInt(rng, 2, 5);
  const m = randInt(rng, 2, Math.floor(12 / k));
  const d = k * m;
  const a = frac(randInt(rng, 1, d - 1), d);
  const wrongRes = frac(a.n, m);
  const res = frac(a.n, d * k);
  const steps = [`${format(a)} : ${k}`, `= ${a.n} / (${d} : ${k})`, `= ${a.n}/${m}`];
  if (wrongRes.n >= wrongRes.d) steps.push(`= ${formatMixed(wrongRes)}`);
  return {
    steps, wrong: 1, a, k, op: 'div',
    why: `Beim Teilen durch ${k} werden die Stücke ${k}-mal kleiner. Der Nenner wird mit ${k} multipliziert.`,
    right: `${format(res)}${format(simplify(res)) === format(res) ? '' : ` = ${format(simplify(res))}`}`,
    tip: 'Wer etwas durch eine natürliche Zahl teilt, bekommt weniger. Passt dein Ergebnis zu dieser Faustregel?',
    explain: stripsExplain([...stripRows(a), { parts: res.d, filled: res.n }]),
  };
}

function mixedAdd(rng) {
  return retry(() => {
    const pa = properFrac(rng, 2, 15);
    const pb = properFrac(rng, 2, 15);
    const wa = randInt(rng, 1, 4);
    const wb = randInt(rng, 1, 4);
    const L = lcm(pa.d, pb.d);
    if (pa.d === pb.d || L > 30) return null;
    return { pa, pb, wa, wb, L };
  });
}

function umwandelnFalsch(rng) {
  const { pa, pb, wa, wb, L } = mixedAdd(rng);
  const A = mixed(wa, pa);
  const B = mixed(wb, pb);
  const badA = frac(wa + pa.n, pa.d);
  const x = (badA.n * L) / pa.d;
  const y = (B.n * L) / B.d;
  const sum = add(A, B);
  return {
    steps: [`${formatMixed(A)} + ${formatMixed(B)}`, `= ${format(badA)} + ${format(B)}`, `= ${x}/${L} + ${y}/${L}`, `= ${x + y}/${L}`],
    wrong: 1, a: A, b: B, op: 'add',
    why: `Gemischte Zahl umwandeln heißt: Ganze mal Nenner plus Zähler, hier ${wa} · ${pa.d} + ${pa.n} = ${A.n}.`,
    right: `${format(A)} + ${format(B)} = ${format(simplify(sum))} = ${formatMixed(simplify(sum))}`,
    tip: 'Eine gemischte Zahl hat mehr als ein Ganzes. Passt der umgewandelte Bruch überhaupt zur Größe der Ausgangszahl?',
    explain: lineExplain([A, B, simplify(sum)]),
  };
}

function hauptnennerNurNenner(rng) {
  const { pa, pb, wa, wb, L } = mixedAdd(rng);
  const A = mixed(wa, pa);
  const B = mixed(wb, pb);
  const sum = add(A, B);
  const x = (A.n * L) / A.d;
  const y = (B.n * L) / B.d;
  return {
    steps: [`${formatMixed(A)} + ${formatMixed(B)}`, `= ${format(A)} + ${format(B)}`, `= ${A.n}/${L} + ${B.n}/${L}`, `= ${A.n + B.n}/${L}`],
    wrong: 2, a: A, b: B, op: 'add',
    why: `Beim Erweitern auf den Hauptnenner ${L} muss auch der Zähler mit dem Erweiterungsfaktor multipliziert werden.`,
    right: `${x}/${L} + ${y}/${L} = ${x + y}/${L} = ${formatMixed(simplify(sum))}`,
    tip: 'Erweitern ändert den Wert nicht. Vergleiche vor und nach dem Erweitern, ob der Bruch noch gleich viel wert ist.',
    explain: lineExplain([A, B, simplify(sum)]),
  };
}

const FEHLER = {
  1: [addNennerGleich, erweiternNurZaehler, kuerzenNurZaehler],
  2: [addNennerUngleich, erweiternNurZaehler, kuerzenNurZaehler, malNennerGleich, teilenNennerGeteilt],
  3: [umwandelnFalsch, hauptnennerNurNenner, malNennerGleich, teilenNennerGeteilt, addNennerUngleich],
};

export function fehlerFinden(level, rng) {
  const f = pick(rng, FEHLER[level])(rng);
  return makeTask(rng, {
    world: WORLD, kind: 'fehler-finden', level,
    prompt: 'Das Monster hat sich verrechnet! Tippe auf die Zeile, in der der erste Fehler steckt.',
    widget: { type: 'mark', data: { steps: f.steps } },
    answer: { type: 'marks', value: f.wrong },
    hints: [
      'Geh die Rechnung Zeile für Zeile durch. Folgt jede Zeile wirklich aus der davor, ohne dass sich der Wert ändert?',
      f.tip,
      `Zeile ${f.wrong + 1} ist falsch. ${f.why} Richtig: ${f.right}.`,
    ],
    explain: f.explain,
    meta: { a: f.a, b: f.b, k: f.k, op: f.op, isReasoning: true },
  });
}

// ---- regel-entdecken: Beispiele zeigen, richtige Vermutung waehlen ----

function regelErweitern(rng) {
  const a = properFrac(rng, 2, 6);
  const [e2, e3, e4] = [2, 3, 4].map((k) => expand(a, k));
  return {
    prompt: `Beobachte: ${format(a)} = ${format(e2)} = ${format(e3)} = ${format(e4)}. Was passiert beim Erweitern?`,
    correct: 'Der Wert bleibt gleich, nur die Stücke werden feiner.',
    wrongs: ['Der Bruch wird immer größer.', 'Der Bruch wird immer kleiner.', 'Nur der Zähler ändert sich.'],
    tip: 'Mal dir den Streifen für jeden dieser Brüche. Ist der gefärbte Teil jedes Mal gleich lang?',
    solution: `Zähler und Nenner werden mit derselben Zahl malgenommen (${a.n}·2 = ${e2.n}, ${a.d}·2 = ${e2.d}). Der gefärbte Anteil bleibt gleich lang.`,
    explain: stripsExplain([...stripRows(a), ...stripRows(e2), ...stripRows(e3)]),
    meta: { a, op: 'expand' },
  };
}

function regelGleicherZaehler(rng) {
  const n = randInt(rng, 1, 4);
  const ds = [randInt(rng, n + 1, n + 3)];
  ds.push(ds[0] + randInt(rng, 1, 3));
  ds.push(ds[1] + randInt(rng, 1, 3));
  const fs = ds.map((d) => frac(n, d));
  return {
    prompt: `Vergleiche ${fs.map(format).join(', ')}. Was fällt auf?`,
    correct: 'Bei gleichem Zähler gilt: Je größer der Nenner, desto kleiner der Bruch.',
    wrongs: ['Bei gleichem Zähler gilt: Je größer der Nenner, desto größer der Bruch.', 'Der Nenner hat keinen Einfluss auf die Größe.'],
    tip: 'Je mehr Stücke ein Ganzes hat, desto winziger ist jedes einzelne. Wer hat also mehr, wenn man gleich viele Stücke nimmt?',
    solution: `${format(fs[0])} > ${format(fs[1])} > ${format(fs[2])}: Die Stücke werden kleiner, je größer der Nenner ist.`,
    explain: lineExplain(fs),
    meta: { a: fs[0], b: fs[2], op: 'compare' },
  };
}

function regelAddieren(rng) {
  const mk = () => {
    const d = randInt(rng, 3, 12);
    const a = frac(randInt(rng, 1, d - 2), d);
    return [a, frac(randInt(rng, 1, d - 1 - a.n), d)];
  };
  const [a1, b1] = mk();
  const [a2, b2] = mk();
  const s = (a, b) => `${format(a)} + ${format(b)} = ${a.n + b.n}/${a.d}`;
  return {
    prompt: `Beispiele: ${s(a1, b1)} und ${s(a2, b2)}. Was gilt beim Addieren gleichnamiger Brüche?`,
    correct: 'Die Zähler werden addiert, der Nenner bleibt.',
    wrongs: ['Zähler und Nenner werden addiert.', 'Die Nenner werden addiert, der Zähler bleibt.'],
    tip: 'Gleich große Stücke zählt man einfach zusammen. Ändert sich dabei die Größe der Stücke?',
    solution: `Die Zähler zählen die Stücke: ${a1.n} + ${b1.n} = ${a1.n + b1.n}. Der Nenner benennt nur die Stückgröße und bleibt.`,
    explain: stripsExplain([{ parts: a1.d, filled: a1.n }, { parts: a1.d, filled: b1.n }]),
    meta: { a: a1, b: b1, op: 'add' },
  };
}

function regelTeilen(rng) {
  const mk = () => ({ a: properFrac(rng, 2, 10), k: randInt(rng, 2, 5) });
  const e1 = mk();
  const e2 = mk();
  const s = ({ a, k }) => `${format(a)} : ${k} = ${a.n}/${a.d * k}`;
  return {
    prompt: `Beispiele: ${s(e1)} und ${s(e2)}. Was passiert beim Teilen eines Bruchs durch eine natürliche Zahl?`,
    correct: 'Der Nenner wird mit der Zahl multipliziert, der Zähler bleibt.',
    wrongs: ['Der Zähler wird mit der Zahl multipliziert.', 'Der Nenner wird durch die Zahl geteilt.'],
    tip: 'Wenn du etwas auf mehr Leute verteilst, werden die Stücke kleiner. Was sagt der Nenner über die Größe der Stücke?',
    solution: `Jedes Stück wird in ${e1.k} kleinere Stücke zerlegt, der Nenner wird also ${e1.a.d}·${e1.k} = ${e1.a.d * e1.k}.`,
    explain: stripsExplain([...stripRows(e1.a), { parts: e1.a.d * e1.k, filled: e1.a.n }]),
    meta: { a: e1.a, k: e1.k, op: 'div' },
  };
}

function regelMalBruch(rng) {
  const mk = () => {
    const a = properFrac(rng, 2, 6);
    return { a, m: a.d * randInt(rng, 1, Math.floor(12 / a.d)) };
  };
  const [e1, e2, e3] = [mk(), mk(), mk()];
  const s = ({ a, m }) => `${format(a)} · ${m} = ${(a.n * m) / a.d}`;
  return {
    prompt: `Beispiele: ${s(e1)}, ${s(e2)}, ${s(e3)}. Was fällt beim Malnehmen mit einem echten Bruch auf?`,
    correct: 'Das Ergebnis ist kleiner als die Zahl, die du malgenommen hast.',
    wrongs: ['Das Ergebnis ist größer als die Zahl.', 'Das Ergebnis ist genauso groß wie die Zahl.'],
    tip: 'Ein echter Bruch ist weniger als ein Ganzes. Du nimmst also nur einen Teil der Zahl. Wird das mehr oder weniger?',
    solution: `${format(e1.a)} von ${e1.m} ist nur ein Teil von ${e1.m}, nämlich ${(e1.a.n * e1.m) / e1.a.d}.`,
    explain: lineExplain([e1.a]),
    meta: { a: e1.a, k: e1.m, op: 'mul' },
  };
}

const REGELN = {
  1: [regelErweitern, regelGleicherZaehler],
  2: [regelGleicherZaehler, regelAddieren, regelTeilen],
  3: [regelAddieren, regelTeilen, regelMalBruch],
};

export function regelEntdecken(level, rng) {
  const r = pick(rng, REGELN[level])(rng);
  const options = shuffle(rng, [r.correct, ...r.wrongs]);
  return makeTask(rng, {
    world: WORLD, kind: 'regel-entdecken', level,
    prompt: r.prompt,
    widget: { type: 'choice', data: { options } },
    answer: { type: 'choice', value: options.indexOf(r.correct) },
    hints: [
      'Schau dir die Beispiele genau an. Was ist in jedem Beispiel gleich, und was verändert sich immer auf dieselbe Art?',
      r.tip,
      r.solution,
    ],
    explain: r.explain,
    meta: { ...r.meta, isReasoning: true },
  });
}
