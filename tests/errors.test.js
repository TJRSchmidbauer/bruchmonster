import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/core/rng.js';
import { frac, equal, simplify, mul, add, divNat, toMixed } from '../src/core/fractions.js';
import { KINDS, generate, checkAnswer } from '../src/tasks/generators.js';
import { diagnose, describe, MISTAKES } from '../src/tasks/errors.js';

const T = (kind, answer, meta, extra = {}) => ({ id: 't', world: 'x', kind, level: 1, answer, meta, ...extra });

test('nenner-addiert: 1/2 + 1/3 mit 2/5', () => {
  const t = T('addieren', { type: 'frac', value: frac(5, 6) }, { a: frac(1, 2), b: frac(1, 3), op: 'add' });
  assert.equal(diagnose(t, '2/5'), 'nenner-addiert');
  assert.equal(diagnose(t, frac(2, 5)), 'nenner-addiert');
  assert.equal(diagnose(t, '5/6'), null);
  assert.equal(diagnose(t, '1/7'), null);
  assert.equal(diagnose(t, 'quatsch'), null);
});

test('groesserer-nenner: 1/3 vs 1/5, Kind waehlt "<" (1/3 < 1/5)', () => {
  const t = T('vergleichen', { type: 'choice', value: 2 }, { a: frac(1, 3), b: frac(1, 5), op: 'compare' });
  assert.equal(diagnose(t, 0), 'groesserer-nenner');
  assert.equal(diagnose(t, 2), null);
  assert.equal(diagnose(t, 1), null);
  const u = T('vergleichen', { type: 'choice', value: 0 }, { a: frac(1, 5), b: frac(1, 3), op: 'compare' });
  assert.equal(diagnose(u, 2), 'groesserer-nenner');
  assert.equal(diagnose(u, 0), null);
});

test('nur-nenner-erweitert: 2/3 auf Nenner 12 mit 2/12', () => {
  const t = T('erweitern', { type: 'frac', value: frac(8, 12), accept: 'exact' },
    { a: frac(2, 3), k: 4, targetD: 12, op: 'expand' });
  assert.equal(diagnose(t, '2/12'), 'nur-nenner-erweitert');
  assert.equal(diagnose(t, '8/12'), null);
  assert.equal(diagnose(t, '3/12'), null);
});

test('falsch-herum-geteilt: 3/4 : 3 mit 9/4', () => {
  const t = T('teilen-durch-nat', { type: 'frac', value: frac(1, 4) }, { a: frac(3, 4), k: 3, op: 'div' });
  assert.equal(diagnose(t, '9/4'), 'falsch-herum-geteilt');
  assert.equal(diagnose(t, '1/4'), null);
  assert.equal(diagnose(t, '3/12'), null);
});

test('kreuz-multipliziert', () => {
  const a = frac(2, 3);
  const b = frac(3, 4);
  const t = T('bruchteil-vom-bruchteil', { type: 'frac', value: frac(1, 2) }, { a, b, op: 'mul' });
  assert.equal(diagnose(t, '8/9'), 'kreuz-multipliziert');
  assert.equal(diagnose(t, '1/2'), null);
});

test('ganzes-vergessen: 1 3/4 erwartet, 3/4 getippt', () => {
  const t = T('addieren', { type: 'frac', value: frac(7, 4) }, { a: frac(5, 4), b: frac(1, 2), op: 'add' });
  assert.equal(diagnose(t, '3/4'), 'ganzes-vergessen');
  assert.equal(diagnose(t, '1 3/4'), null);
  const ganz = T('addieren', { type: 'frac', value: frac(2, 1) }, { a: frac(1, 2), b: frac(3, 2), op: 'add' });
  assert.equal(diagnose(ganz, '0'), null);
});

test('Korrekt, unbekannter Fehler, falscher Typ -> null', () => {
  const t = T('teilen-durch-nat', { type: 'frac', value: frac(1, 4) }, { a: frac(3, 4), k: 3, op: 'div' });
  assert.equal(diagnose(t, '1/4'), null);
  assert.equal(diagnose(t, '5/7'), null);
  assert.equal(diagnose(t, 5), null);
  assert.equal(diagnose(t, null), null);
  const p = T('platzieren', { type: 'position', value: frac(1, 2), tolerance: 0.1 }, { a: frac(1, 2) });
  assert.equal(diagnose(p, 0.9), null);
});

test('describe: Text und Gegenbeispiel in Explain-Form', () => {
  assert.equal(MISTAKES.length, 6);
  for (const id of MISTAKES) {
    const d = describe(id);
    assert.ok(d.text.length > 10 && d.text.length <= 200, id);
    assert.ok(['strips', 'numberline'].includes(d.counter.type));
    if (d.counter.type === 'strips') {
      assert.ok(d.counter.data.rows.length >= 2);
      for (const r of d.counter.data.rows) assert.ok(r.parts >= 1 && r.filled >= 0 && r.filled <= r.parts * 3);
    } else {
      const { from, to, ticks, marks } = d.counter.data;
      assert.ok(to > from && ticks >= 0 && marks.length >= 1);
    }
  }
  assert.match(describe('nenner-addiert').text, /Autsch/);
  assert.throws(() => describe('gibts-nicht'));
});

test('checkAnswer: mistake nur bei falsch + erkannt, wirft nie', () => {
  const t = T('addieren', { type: 'frac', value: frac(5, 6) }, { a: frac(1, 2), b: frac(1, 3), op: 'add' });
  assert.deepEqual(checkAnswer(t, '2/5'), { correct: false, mistake: 'nenner-addiert' });
  assert.deepEqual(checkAnswer(t, '5/6'), { correct: true });
  assert.deepEqual(checkAnswer(t, '1/7'), { correct: false });
  assert.deepEqual(checkAnswer(t, 'x'), { correct: false, invalid: 'format' });
  const broken = { ...t, meta: undefined };
  assert.doesNotThrow(() => checkAnswer(broken, '2/5'));
});

test('generierte Aufgaben: diagnose wirft nie, korrekt -> null', () => {
  for (const kinds of Object.values(KINDS)) for (const kind of kinds) for (const level of [1, 2, 3]) {
    for (let s = 1; s <= 40; s++) {
      const t = generate(kind, level, makeRng(s));
      const a = t.answer;
      const inputs = a.type === 'frac' ? [a.value, '2/5', '0', '3/7'] : [a.value, 0, 1, 2];
      for (const i of inputs) assert.doesNotThrow(() => diagnose(t, i));
      if (a.type === 'frac' && (a.accept ?? 'equal') === 'equal') assert.equal(diagnose(t, a.value), null);
    }
  }
});

test('generierte Aufgaben: typische Fehler werden erkannt', () => {
  let add_ = 0; let div_ = 0; let kreuz = 0; let erw = 0; let vgl = 0;
  for (let s = 1; s <= 60; s++) {
    let t = generate('addieren', 2, makeRng(s));
    const { a, b } = t.meta;
    const w = frac(a.n + b.n, a.d + b.d);
    if (!equal(w, t.answer.value)) { assert.equal(checkAnswer(t, w).mistake, 'nenner-addiert'); add_++; }
    t = generate('teilen-durch-nat', 1, makeRng(s));
    assert.equal(checkAnswer(t, frac(t.meta.a.n * t.meta.k, t.meta.a.d)).mistake, 'falsch-herum-geteilt'); div_++;
    t = generate('bruchteil-vom-bruchteil', 2, makeRng(s));
    const m = t.meta;
    const kz = frac(m.a.n * m.b.d, m.a.d * m.b.n);
    if (!equal(kz, t.answer.value)) { assert.equal(checkAnswer(t, kz).mistake, 'kreuz-multipliziert'); kreuz++; }
    t = generate('erweitern', 2, makeRng(s));
    assert.equal(checkAnswer(t, frac(t.meta.a.n, t.meta.targetD)).mistake, 'nur-nenner-erweitert'); erw++;
    t = generate('vergleichen', 2, makeRng(s));
    const { a: x, b: y } = t.meta;
    if (x.d !== y.d && t.answer.value !== (x.d > y.d ? 2 : 0)) {
      assert.equal(checkAnswer(t, x.d > y.d ? 2 : 0).mistake, 'groesserer-nenner'); vgl++;
    }
  }
  assert.ok(add_ > 20 && div_ === 60 && kreuz > 20 && erw === 60 && vgl > 10, `${add_} ${kreuz} ${vgl}`);
});
