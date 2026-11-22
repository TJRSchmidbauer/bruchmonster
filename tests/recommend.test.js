import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile } from '../src/core/storage.js';
import { KINDS } from '../src/tasks/generators.js';
import { recommend } from '../src/core/recommend.js';

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 22, 10, 0, 0);
const profile = (over = {}) => ({ ...defaultProfile('Test', 'p1', '2026-11-01T00:00:00.000Z'), ...over });
const allKinds = Object.values(KINDS).flat();
const worldOf = (kind) => Object.keys(KINDS).find((w) => KINDS[w].includes(kind));

test('recommend: leeres Profil liefert eine gueltige Art mit Welt und Begruendung', () => {
  const r = recommend(profile(), NOW);
  assert.ok(allKinds.includes(r.kind));
  assert.equal(r.world, worldOf(r.kind));
  assert.ok(typeof r.reason === 'string' && r.reason.length > 0);
});

test('recommend: hohe Fehlerquote bei mindestens 3 Versuchen gewinnt', () => {
  const p = profile({ mastery: { kuerzen: { right: 1, wrong: 4, last: NOW - DAY } } });
  const r = recommend(p, NOW);
  assert.equal(r.kind, 'kuerzen');
  assert.equal(r.world, 'streifen');
  assert.match(r.reason, /80/);
});

test('recommend: hohe Fehlerquote mit weniger als 3 Versuchen zaehlt nicht', () => {
  const p = profile({ mastery: { kuerzen: { right: 0, wrong: 2, last: NOW } } });
  assert.notEqual(recommend(p, NOW).kind, 'kuerzen');
});

test('recommend: ohne Fehlerquote gewinnt die am laengsten nicht geuebte Art', () => {
  const mastery = {};
  allKinds.forEach((kind, i) => {
    mastery[kind] = { right: 1, wrong: 0, last: NOW - (i + 1) * DAY };
  });
  const oldest = allKinds[allKinds.length - 1];
  assert.equal(recommend(profile({ mastery }), NOW).kind, oldest);
});

test('recommend: noch nie geuebte Art kommt vor geuebten', () => {
  const mastery = {};
  for (const kind of allKinds) if (kind !== 'rezept') mastery[kind] = { right: 1, wrong: 0, last: NOW };
  assert.equal(recommend(profile({ mastery }), NOW).kind, 'rezept');
});

test('recommend: Fehlerquote 0 zaehlt nicht als Empfehlung', () => {
  const mastery = {};
  for (const kind of allKinds) mastery[kind] = { right: 5, wrong: 0, last: NOW };
  mastery.platzieren = { right: 2, wrong: 0, last: NOW - 9 * DAY };
  assert.equal(recommend(profile({ mastery }), NOW).kind, 'platzieren');
});

test('recommend: Eingabe wird nicht veraendert', () => {
  const p = profile({ mastery: { kuerzen: { right: 1, wrong: 4, last: NOW } } });
  const snap = structuredClone(p);
  recommend(p, NOW);
  assert.deepEqual(p, snap);
});
