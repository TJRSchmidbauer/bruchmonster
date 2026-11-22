import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  frac, gcd, lcm, simplify, isSimplified, equal, compare,
  expand, add, sub, mul, divNat, toMixed, fromMixed,
  format, formatMixed, parseAnswer,
} from '../src/core/fractions.js';

test('frac validiert Eingaben', () => {
  assert.deepEqual(frac(3, 4), { n: 3, d: 4 });
  assert.throws(() => frac(1, 0), RangeError);
  assert.throws(() => frac(1, -2), RangeError);
  assert.throws(() => frac(-1, 2), RangeError);
  assert.throws(() => frac(1.5, 2), RangeError);
  assert.throws(() => frac(1, 2.5), RangeError);
});

test('gcd und lcm', () => {
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(0, 5), 5);
  assert.equal(lcm(4, 6), 12);
});

test('simplify kürzt und behandelt 0', () => {
  assert.deepEqual(simplify(frac(6, 8)), { n: 3, d: 4 });
  assert.deepEqual(simplify(frac(0, 5)), { n: 0, d: 1 });
  assert.equal(isSimplified(frac(3, 4)), true);
  assert.equal(isSimplified(frac(6, 8)), false);
});

test('equal und compare per Kreuzmultiplikation', () => {
  assert.equal(equal(add(frac(1, 4), frac(1, 6)), frac(5, 12)), true);
  assert.equal(equal(frac(2, 4), frac(1, 2)), true);
  assert.equal(compare(frac(2, 3), frac(3, 5)), 1);
  assert.equal(compare(frac(3, 5), frac(2, 3)), -1);
  assert.equal(compare(frac(1, 2), frac(2, 4)), 0);
});

test('expand erweitert ohne Kürzen', () => {
  assert.deepEqual(expand(frac(3, 4), 2), { n: 6, d: 8 });
});

test('add, mul ergebnisse werden nicht automatisch gekürzt', () => {
  assert.deepEqual(add(frac(1, 4), frac(1, 6)), { n: 10, d: 24 });
  assert.deepEqual(mul(frac(2, 3), frac(3, 4)), { n: 6, d: 12 });
});

test('sub wirft bei negativem Ergebnis', () => {
  assert.throws(() => sub(frac(1, 3), frac(1, 2)), RangeError);
  assert.deepEqual(sub(frac(1, 2), frac(1, 3)), { n: 1, d: 6 });
});

test('divNat dividiert durch natürliche Zahl ohne Kürzen', () => {
  assert.deepEqual(divNat(frac(3, 4), 3), { n: 3, d: 12 });
  assert.throws(() => divNat(frac(3, 4), 0), RangeError);
});

test('toMixed und fromMixed', () => {
  assert.deepEqual(toMixed(frac(7, 4)), { whole: 1, n: 3, d: 4 });
  assert.deepEqual(toMixed(frac(3, 4)), { whole: 0, n: 3, d: 4 });
  assert.deepEqual(fromMixed(1, 1, 2), { n: 3, d: 2 });
});

test('format und formatMixed', () => {
  assert.equal(format(frac(3, 4)), '3/4');
  assert.equal(format(frac(3, 1)), '3');
  assert.equal(formatMixed(frac(7, 4)), '1 3/4');
  assert.equal(formatMixed(frac(3, 4)), '3/4');
  assert.equal(formatMixed(frac(8, 4)), '2');
});

test('parseAnswer: gültige Eingaben', () => {
  assert.deepEqual(parseAnswer(' 3 / 4 '), { ok: true, value: { n: 3, d: 4 } });
  assert.deepEqual(parseAnswer('1 1/2'), { ok: true, value: { n: 3, d: 2 } });
  assert.deepEqual(parseAnswer('2'), { ok: true, value: { n: 2, d: 1 } });
  assert.deepEqual(parseAnswer('2/4'), { ok: true, value: { n: 2, d: 4 } });
});

test('parseAnswer: Fehlergründe', () => {
  assert.deepEqual(parseAnswer('3/0'), { ok: false, reason: 'nenner-null' });
  assert.deepEqual(parseAnswer(''), { ok: false, reason: 'leer' });
  assert.deepEqual(parseAnswer('   '), { ok: false, reason: 'leer' });
  assert.deepEqual(parseAnswer('-1/2'), { ok: false, reason: 'negativ' });
  assert.deepEqual(parseAnswer('abc'), { ok: false, reason: 'format' });
  assert.deepEqual(parseAnswer('0,75'), { ok: false, reason: 'format' });
});

test('parseAnswer: sehr lange Ziffernfolgen werfen nicht', () => {
  const big = '9'.repeat(40);
  assert.deepEqual(parseAnswer(big), { ok: false, reason: 'format' });
  assert.deepEqual(parseAnswer(`1/${big}`), { ok: false, reason: 'format' });
  assert.deepEqual(parseAnswer(`${big}/3`), { ok: false, reason: 'format' });
  assert.deepEqual(parseAnswer(`${big} 1/2`), { ok: false, reason: 'format' });
  assert.deepEqual(parseAnswer('9007199254740991 1/9007199254740991'), { ok: false, reason: 'format' });
});

test('parseAnswer: zu grosse Zahlen und zu lange Eingaben werden abgelehnt (keine Gleitkomma-Faelschung wie 6755399441055743/9007199254740991)', () => {
  for (const t of ['6755399441055743/9007199254740991', '1000001/2', '1/1000001', '1 1000001/2', '1'.repeat(41), '9'.repeat(30)]) {
    assert.equal(parseAnswer(t).ok, false, t);
  }
  assert.equal(parseAnswer('1000000/999999').ok, true);
});
