import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile, exportProfile, exportCode, importProfile, importProfileFromCode } from '../src/core/storage.js';
import { rightTotal, markBackedUp, backupDue, backupLabel, BACKUP_AFTER_RIGHT } from '../src/core/backup.js';

const withRight = (right, over = {}) => ({ ...defaultProfile('Mia', 'p1'), mastery: { kuerzen: { right, wrong: 0, last: 1 } }, ...over });

test('neues Profil: noch nie gesichert, Erinnerung erst nach genug richtigen Antworten', () => {
  const p = defaultProfile('Mia', 'p1');
  assert.deepEqual(p.backup, { date: '', right: 0 });
  assert.equal(backupDue(p), false);
  assert.equal(backupDue(withRight(BACKUP_AFTER_RIGHT - 1)), false);
  assert.equal(backupDue(withRight(BACKUP_AFTER_RIGHT)), true);
});

test('rightTotal zaehlt richtige Antworten ueber alle Aufgabenarten', () => {
  const p = { ...defaultProfile('Mia', 'p1'), mastery: { a: { right: 3, wrong: 9, last: 1 }, b: { right: 4, wrong: 0, last: 1 } } };
  assert.equal(rightTotal(p), 7);
  assert.equal(rightTotal(defaultProfile('x', 'y')), 0);
});

test('markBackedUp setzt Datum und Stand; danach keine Erinnerung, bis wieder genug dazukommt', () => {
  const p = markBackedUp(withRight(25), '2026-11-22');
  assert.deepEqual(p.backup, { date: '2026-11-22', right: 25 });
  assert.equal(backupDue(p), false);
  const more = { ...p, mastery: { kuerzen: { right: 25 + BACKUP_AFTER_RIGHT, wrong: 0, last: 1 } } };
  assert.equal(backupDue(more), true);
});

test('backupLabel: noch nie, heute, gestern, vor N Tagen, Uhr zurueckgestellt', () => {
  const at = (date) => ({ ...defaultProfile('Mia', 'p1'), backup: { date, right: 0 } });
  assert.equal(backupLabel(at(''), '2026-11-22'), 'noch nie gesichert');
  assert.equal(backupLabel(at('2026-11-22'), '2026-11-22'), 'heute gesichert');
  assert.equal(backupLabel(at('2026-11-21'), '2026-11-22'), 'gestern gesichert');
  assert.equal(backupLabel(at('2026-11-10'), '2026-11-22'), 'vor 12 Tagen gesichert');
  assert.equal(backupLabel(at('2026-11-30'), '2026-11-22'), 'heute gesichert', 'Datum in der Zukunft zaehlt als heute');
});

test('backup-Feld uebersteht Export, Import und wird bei Muell repariert', () => {
  const p = markBackedUp(withRight(30), '2026-11-22');
  assert.deepEqual(importProfile(exportProfile(p)).profile.backup, { date: '2026-11-22', right: 30 });
  const bad = (backup) => importProfile(exportProfile({ ...p, backup })).profile.backup;
  assert.deepEqual(bad('x'), { date: '', right: 0 });
  assert.deepEqual(bad({ date: '<b>', right: -4 }), { date: '', right: 0 });
  assert.deepEqual(bad({ date: '2026-01-02', right: 1e300 }), { date: '2026-01-02', right: 1_000_000_000 });
});

test('Code-Rundreise: exportCode -> importProfileFromCode ergibt dasselbe Profil mit neuer id', () => {
  const p = markBackedUp(withRight(12, { coins: 77, owned: ['hut'] }), '2026-11-22');
  const code = exportCode(p);
  assert.match(code, /^BM2-/);
  assert.ok(!code.includes('Mia'));
  const res = importProfileFromCode(code, () => 'neu1');
  assert.equal(res.ok, true);
  assert.equal(res.profile.id, 'neu1');
  const { id: _a, ...rest } = res.profile;
  const { id: _b, ...orig } = p;
  assert.deepEqual(rest, orig);
});

test('Code-Import lehnt Muell und Veraenderungen mit klaren Gruenden ab', () => {
  assert.equal(importProfileFromCode('hallo').reason, 'kein-code');
  const code = exportCode(defaultProfile('Mia', 'p1'));
  assert.equal(importProfileFromCode(code.slice(0, 20) + (code[20] === 'A' ? 'B' : 'A') + code.slice(21)).reason, 'verfaelscht');
  assert.equal(importProfileFromCode(null).reason, 'kein-code');
});
