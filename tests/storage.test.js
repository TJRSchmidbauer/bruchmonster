import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore, exportProfile, importProfile, defaultProfile,
} from '../src/core/storage.js';

// Einfaches Speicher-Backend im Speicher, Schreibfehler per Schalter.
function fakeBackend({ failWrite = false } = {}) {
  const data = new Map();
  const b = {
    failWrite,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem(k, v) {
      if (b.failWrite) throw new Error('QuotaExceededError');
      data.set(k, String(v));
    },
    removeItem: (k) => { data.delete(k); },
    raw: data,
  };
  return b;
}

// Backend, das schon beim Zugriff auf eine Methode wirft.
const brokenBackend = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('SecurityError'); },
  removeItem() { throw new Error('SecurityError'); },
};

const fixedIds = () => {
  let n = 0;
  return () => `t${++n}`;
};

test('defaultProfile liefert alle Felder mit Standardwerten', () => {
  const p = defaultProfile('Mia', 'p1');
  assert.equal(p.id, 'p1');
  assert.equal(p.name, 'Mia');
  assert.equal(p.version, 1);
  assert.equal(p.coins, 0);
  assert.equal(p.xp, 0);
  assert.deepEqual(p.owned, []);
  assert.deepEqual(p.wearing, {});
  assert.deepEqual(p.cave, []);
  assert.deepEqual(p.cards, []);
  assert.deepEqual(p.mastery, {});
  assert.deepEqual(p.daily, {});
  assert.deepEqual(p.streak, { days: 0, lastDate: '' });
  assert.equal(p.color, 'kiwi');
  assert.equal(typeof p.createdAt, 'string');
  assert.ok(!Number.isNaN(Date.parse(p.createdAt)));
});

test('defaultProfile normalisiert Namen: trimmen, 20 Zeichen, leer wird Monsterfreund', () => {
  assert.equal(defaultProfile('  Mia  ', 'x').name, 'Mia');
  assert.equal(defaultProfile('a'.repeat(30), 'x').name, 'a'.repeat(20));
  assert.equal(defaultProfile('   ', 'x').name, 'Monsterfreund');
  assert.equal(defaultProfile('', 'x').name, 'Monsterfreund');
});

test('Export und Import ergeben denselben Inhalt, aber eine neue id', () => {
  const p = defaultProfile('Mia', 'orig');
  p.coins = 12;
  p.owned = ['hut'];
  p.mastery = { 'br-1': { right: 3, wrong: 1, last: 1700000000000 } };
  const text = exportProfile(p);
  const parsed = JSON.parse(text);
  assert.equal(parsed.format, 'bruchmonster');
  assert.equal(parsed.version, 1);
  assert.equal(typeof parsed.exportedAt, 'string');

  const res = importProfile(text);
  assert.equal(res.ok, true);
  assert.notEqual(res.profile.id, 'orig');
  assert.equal(typeof res.profile.id, 'string');
  const { id: _a, ...rest } = res.profile;
  const { id: _b, ...orig } = p;
  assert.deepEqual(rest, orig);
});

test('importProfile meldet kein-json bei leerem oder kaputtem Text', () => {
  assert.deepEqual(importProfile(''), { ok: false, reason: 'kein-json' });
  assert.deepEqual(importProfile('{'), { ok: false, reason: 'kein-json' });
});

test('importProfile meldet falsches-format ohne Kennung oder ohne profile', () => {
  assert.deepEqual(importProfile('{"format":"x"}'), { ok: false, reason: 'falsches-format' });
  assert.deepEqual(importProfile('{"format":"bruchmonster"}'), { ok: false, reason: 'falsches-format' });
  assert.deepEqual(importProfile('null'), { ok: false, reason: 'falsches-format' });
});

test('importProfile meldet zu-neu bei version 99', () => {
  const text = JSON.stringify({ format: 'bruchmonster', version: 99, profile: { name: 'X' } });
  assert.deepEqual(importProfile(text), { ok: false, reason: 'zu-neu' });
});

test('importProfile ergaenzt fehlende Felder aus alter Datei mit Standardwerten', () => {
  const text = JSON.stringify({ format: 'bruchmonster', version: 1, profile: { name: 'Alt', coins: 5 } });
  const res = importProfile(text);
  assert.equal(res.ok, true);
  assert.equal(res.profile.name, 'Alt');
  assert.equal(res.profile.coins, 5);
  assert.equal(res.profile.xp, 0);
  assert.deepEqual(res.profile.owned, []);
  assert.deepEqual(res.profile.streak, { days: 0, lastDate: '' });
  assert.equal(res.profile.color, 'kiwi');
  assert.equal(res.profile.version, 1);
});

test('importProfile repariert falsche Felder einzeln, solange format und version stimmen', () => {
  const wrap = (profile) => JSON.stringify({ format: 'bruchmonster', version: 1, profile });
  const prof = (over) => importProfile(wrap(over)).profile;
  assert.equal(importProfile(wrap({ coins: -1 })).ok, true);
  assert.equal(prof({ coins: -1 }).coins, 0);
  assert.equal(prof({ coins: '5' }).coins, 0);
  assert.equal(prof({ coins: null }).coins, 0);
  assert.equal(prof({ xp: 7, coins: -3 }).xp, 7);
  assert.deepEqual(prof({ owned: [1, 'hut', 2] }).owned, ['hut']);
  assert.deepEqual(prof({ owned: 'hut' }).owned, []);
  assert.equal(prof({ name: 5 }).name, 'Monsterfreund');
  assert.deepEqual(prof({ streak: { days: 'x', lastDate: '2026-01-01' } }).streak, { days: 0, lastDate: '2026-01-01' });
  assert.deepEqual(prof({ wearing: { hat: 'a', shoe: 5 } }).wearing, { hat: 'a' });
  assert.deepEqual(prof({ mastery: { kuerzen: { right: 1, wrong: 0, last: 3 }, x: { right: -1 } } }).mastery,
    { kuerzen: { right: 1, wrong: 0, last: 3 } });
  assert.deepEqual(prof({ daily: 5 }).daily, {});
  assert.equal(prof({ coins: NaN, color: 7 }).color, 'kiwi');
});

test('importProfile lehnt Nicht-Objekt-Profile und falsche version weiter ab', () => {
  assert.equal(importProfile(JSON.stringify({ format: 'bruchmonster', version: 1, profile: [] })).reason, 'falsches-format');
  assert.equal(importProfile(JSON.stringify({ format: 'bruchmonster', version: 0, profile: {} })).reason, 'beschaedigt');
  assert.equal(importProfile(JSON.stringify({ format: 'bruchmonster', version: 2, profile: {} })).reason, 'zu-neu');
});

test('load repariert ein teilweise kaputtes Profil statt null zu liefern', () => {
  const backend = fakeBackend();
  const store = createStore(backend, { makeId: fixedIds() });
  const { profile: p } = store.createProfile('Mia');
  backend.setItem(`bruchmonster:profile:${p.id}`, JSON.stringify({ ...p, coins: -5, xp: 40, owned: ['a', 3], cards: 'x', name: 'Mia' }));
  const got = store.load(p.id);
  assert.ok(got);
  assert.equal(got.coins, 0);
  assert.equal(got.xp, 40);
  assert.deepEqual(got.owned, ['a']);
  assert.deepEqual(got.cards, []);
  assert.equal(got.name, 'Mia');
  assert.equal(got.id, p.id);
  backend.setItem(`bruchmonster:profile:${p.id}`, '"text"');
  assert.equal(store.load(p.id), null);
});

test('importProfile nimmt Profil-Id nicht aus der Datei und speichert nicht', () => {
  const store = createStore(fakeBackend());
  const { profile: p } = store.createProfile('Mia');
  const res = importProfile(exportProfile(p), fixedIds());
  assert.equal(res.ok, true);
  assert.notEqual(res.profile.id, p.id);
  assert.deepEqual(store.listProfiles().map((x) => x.id), [p.id]);
});

test('Store: anlegen, speichern, laden, listen, entfernen', () => {
  const backend = fakeBackend();
  const store = createStore(backend, { makeId: fixedIds() });
  assert.equal(store.persistent, true);
  const { profile: p, saved } = store.createProfile('  Leo  ');
  assert.deepEqual(saved, { ok: true });
  assert.equal(p.name, 'Leo');
  assert.deepEqual(store.listProfiles(), [{ id: p.id, name: 'Leo' }]);
  assert.deepEqual(store.load(p.id), p);

  p.coins = 7;
  assert.deepEqual(store.save(p), { ok: true });
  assert.equal(store.load(p.id).coins, 7);
  assert.equal(store.listProfiles().length, 1);

  store.remove(p.id);
  assert.equal(store.load(p.id), null);
  assert.deepEqual(store.listProfiles(), []);
});

test('Store nutzt die Schluessel bruchmonster:profiles und bruchmonster:profile:<id>', () => {
  const backend = fakeBackend();
  const store = createStore(backend, { makeId: fixedIds() });
  const { profile: p } = store.createProfile('Mia');
  assert.ok(backend.raw.has('bruchmonster:profiles'));
  assert.ok(backend.raw.has(`bruchmonster:profile:${p.id}`));
});

test('Store: Schreibfehler liefert voll, App bleibt benutzbar', () => {
  const backend = fakeBackend();
  const store = createStore(backend, { makeId: fixedIds() });
  const { profile: p } = store.createProfile('Mia');
  backend.failWrite = true;
  p.coins = 99;
  assert.deepEqual(store.save(p), { ok: false, reason: 'voll' });
  assert.equal(store.load(p.id).coins, 0);
  assert.deepEqual(store.listProfiles(), [{ id: p.id, name: 'Mia' }]);
  backend.failWrite = false;
  assert.deepEqual(store.save(p), { ok: true });
  assert.equal(store.load(p.id).coins, 99);
});

test('Store: Backend wirft beim Zugriff, persistent ist false und Speichern klappt im Speicher', () => {
  const store = createStore(brokenBackend, { makeId: fixedIds() });
  assert.equal(store.persistent, false);
  const { profile: p } = store.createProfile('Mia');
  assert.deepEqual(store.save(p), { ok: true });
  assert.equal(store.load(p.id).name, 'Mia');
  assert.deepEqual(store.listProfiles(), [{ id: p.id, name: 'Mia' }]);
});

test('Store ohne Backend und ohne localStorage faellt auf Speicher zurueck', () => {
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('SecurityError'); },
  });
  try {
    const store = createStore(undefined, { makeId: fixedIds() });
    assert.equal(store.persistent, false);
    const { profile: p } = store.createProfile('Mia');
    assert.deepEqual(store.save(p), { ok: true });
    assert.equal(store.load(p.id).name, 'Mia');
  } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had);
    else delete globalThis.localStorage;
  }
});

test('Store: kaputter Index ergibt leere Liste, kaputtes Profil ergibt null', () => {
  const backend = fakeBackend();
  backend.setItem('bruchmonster:profiles', '{nicht json');
  backend.setItem('bruchmonster:profile:xyz', '{kaputt');
  const store = createStore(backend);
  assert.deepEqual(store.listProfiles(), []);
  assert.equal(store.load('xyz'), null);
  assert.equal(store.load('gibtsnicht'), null);
});

// Backend, dessen Lesen geht, dessen Schreiben aber immer wirft (z.B. vollstaendiger localStorage).
function fullBackend(seed) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem() { throw new Error('QuotaExceededError'); },
    removeItem() { throw new Error('QuotaExceededError'); },
  };
}

// Backend, das nur auf einen bestimmten Schluessel beim Schreiben wirft.
function throwOnKey(key) {
  const data = new Map();
  return {
    raw: data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem(k, v) {
      if (k === key) throw new Error('QuotaExceededError');
      data.set(k, String(v));
    },
    removeItem: (k) => { data.delete(k); },
  };
}

test('Store bei vollem Speicher: Lesen geht, persistent bleibt true, Speichern meldet voll', () => {
  const p1 = defaultProfile('Alt', 'a1');
  const backend = fullBackend({
    'bruchmonster:profiles': JSON.stringify([{ id: 'a1', name: 'Alt' }]),
    'bruchmonster:profile:a1': JSON.stringify(p1),
  });
  const store = createStore(backend, { makeId: fixedIds() });
  assert.equal(store.persistent, true);
  assert.deepEqual(store.listProfiles(), [{ id: 'a1', name: 'Alt' }]);
  assert.equal(store.load('a1').name, 'Alt');
  assert.deepEqual(store.save(p1), { ok: false, reason: 'voll' });
});

test('createProfile liefert Profil und Speicherergebnis, auch bei Fehler', () => {
  const backend = fakeBackend();
  const store = createStore(backend, { makeId: fixedIds() });
  backend.failWrite = true;
  const res = store.createProfile('Mia');
  assert.equal(res.profile.name, 'Mia');
  assert.deepEqual(res.saved, { ok: false, reason: 'voll' });
  assert.deepEqual(store.listProfiles(), []);
});

test('save: Indexschreiben schlaegt fehl, dann fehlt das Profil im Index und in der Ablage', () => {
  const backend = throwOnKey('bruchmonster:profiles');
  const store = createStore(backend, { makeId: fixedIds() });
  const p = defaultProfile('Neu', 'n1');
  assert.deepEqual(store.save(p), { ok: false, reason: 'voll' });
  assert.deepEqual(store.listProfiles(), []);
  assert.equal(store.load('n1'), null);
});

test('save: Profilschreiben schlaegt nach dem Index fehl, Index wird zurueckgerollt', () => {
  const backend = throwOnKey('bruchmonster:profile:n1');
  const store = createStore(backend, { makeId: fixedIds() });
  const before = store.listProfiles();
  const p = defaultProfile('Neu', 'n1');
  assert.deepEqual(store.save(p), { ok: false, reason: 'voll' });
  assert.deepEqual(store.listProfiles(), before);
  assert.equal(store.load('n1'), null);
});

test('save ersetzt bestehenden Eintrag an Ort und Stelle und normalisiert den Namen', () => {
  const store = createStore(fakeBackend(), { makeId: fixedIds() });
  const a = store.createProfile('Eins').profile;
  const b = store.createProfile('Zwei').profile;
  const c = store.createProfile('Drei').profile;
  a.name = '  Umbenannt  ';
  assert.deepEqual(store.save(a), { ok: true });
  assert.deepEqual(store.listProfiles(), [
    { id: a.id, name: 'Umbenannt' },
    { id: b.id, name: 'Zwei' },
    { id: c.id, name: 'Drei' },
  ]);
  assert.equal(store.load(a.id).name, 'Umbenannt');
});

test('seen: Standard leer, fehlend wird [], falscher Typ wird repariert, bleibt beim Export erhalten', () => {
  assert.deepEqual(defaultProfile('Mia', 'p1').seen, []);
  const base = defaultProfile('Mia', 'p1');
  const { seen, ...noSeen } = base;
  const ok = importProfile(JSON.stringify({ format: 'bruchmonster', version: 1, profile: noSeen }));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.profile.seen, []);
  const bad = importProfile(JSON.stringify({ format: 'bruchmonster', version: 1, profile: { ...base, seen: [1] } }));
  assert.deepEqual(bad.profile.seen, []);
  const good = importProfile(exportProfile({ ...base, seen: ['platzieren'] }));
  assert.deepEqual(good.profile.seen, ['platzieren']);
});

// Backend mit Schluessel-Aufzaehlung wie localStorage.
function enumBackend() {
  const b = fakeBackend();
  Object.defineProperty(b, 'length', { get: () => b.raw.size });
  b.key = (i) => [...b.raw.keys()][i] ?? null;
  return b;
}

test('Index kaputt: Backup vor dem Ueberschreiben, Index wird aus Profil-Schluesseln neu aufgebaut', () => {
  const backend = enumBackend();
  const store0 = createStore(backend, { makeId: fixedIds() });
  const a = store0.createProfile('Eins').profile;
  const b = store0.createProfile('Zwei').profile;
  backend.setItem('bruchmonster:profiles', '{kaputt');
  const store = createStore(backend, { makeId: fixedIds() });
  const names = store.listProfiles().map((e) => e.name).sort();
  assert.deepEqual(names, ['Eins', 'Zwei']);
  assert.equal(backend.getItem('bruchmonster:profiles'), '{kaputt', 'Lesen veraendert nichts');
  const c = defaultProfile('Drei', 'c1');
  assert.deepEqual(store.save(c), { ok: true });
  assert.equal(backend.getItem('bruchmonster:profiles.bak'), '{kaputt');
  assert.deepEqual(store.listProfiles().map((e) => e.id).sort(), [a.id, b.id, 'c1'].sort());
});

test('Index kaputt ohne Aufzaehlung: leere Liste, Backup trotzdem vor dem Schreiben', () => {
  const backend = fakeBackend();
  backend.setItem('bruchmonster:profiles', 'xx');
  const store = createStore(backend);
  assert.deepEqual(store.listProfiles(), []);
  assert.deepEqual(store.save(defaultProfile('Neu', 'n1')), { ok: true });
  assert.equal(backend.getItem('bruchmonster:profiles.bak'), 'xx');
  assert.deepEqual(store.listProfiles(), [{ id: 'n1', name: 'Neu' }]);
});

test('Index fehlt oder ist gueltig: kein Backup', () => {
  const backend = enumBackend();
  const store = createStore(backend);
  store.createProfile('A');
  store.createProfile('B');
  assert.equal(backend.getItem('bruchmonster:profiles.bak'), null);
});
