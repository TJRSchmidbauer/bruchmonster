import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createStore, exportProfile, importProfile, defaultProfile,
} from '../src/core/storage.js';
import { seal } from '../src/core/seal.js';

const wrap = (profile) => seal({ profile, exportedAt: '2026-11-22T00:00:00.000Z' });

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
  assert.equal(parsed.version, 2);
  for (const klartext of ['Mia', 'coins', 'hut', 'orig', 'exportedAt']) assert.ok(!text.includes(klartext), `Datei verraet ${klartext}`);

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

test('importProfile nimmt keine Klartext-Datei an (altes Format, selbstgebaut), auch nicht mit Wunschwerten', () => {
  const text = JSON.stringify({ format: 'bruchmonster', version: 1, profile: { name: 'Schummler', coins: 999999 } });
  assert.deepEqual(importProfile(text), { ok: false, reason: 'falsches-format' });
  const text2 = JSON.stringify({ format: 'bruchmonster', version: 2, profile: { name: 'Schummler', coins: 999999 } });
  assert.deepEqual(importProfile(text2), { ok: false, reason: 'verfaelscht' });
});

test('importProfile erkennt jede Aenderung an der Datei als verfaelscht', () => {
  const p = defaultProfile('Mia', 'o');
  p.coins = 5;
  const text = exportProfile(p);
  const doc = JSON.parse(text);
  const edited = JSON.stringify({ ...doc, d: doc.d.slice(0, 4) + (doc.d[4] === 'A' ? 'B' : 'A') + doc.d.slice(5) });
  assert.deepEqual(importProfile(edited), { ok: false, reason: 'verfaelscht' });
  assert.deepEqual(importProfile(text.replace('"m":"', '"m":"0')), { ok: false, reason: 'verfaelscht' });
});

test('importProfile lehnt riesige Dateien ab, ohne sie zu verarbeiten', () => {
  assert.deepEqual(importProfile('x'.repeat(300_000)), { ok: false, reason: 'zu-gross' });
});

test('importProfile ergaenzt fehlende Felder mit Standardwerten', () => {
  const res = importProfile(wrap({ name: 'Alt', coins: 5 }));
  assert.equal(res.ok, true);
  assert.equal(res.profile.name, 'Alt');
  assert.equal(res.profile.coins, 5);
  assert.equal(res.profile.xp, 0);
  assert.deepEqual(res.profile.owned, []);
  assert.deepEqual(res.profile.streak, { days: 0, lastDate: '' });
  assert.equal(res.profile.color, 'kiwi');
  assert.equal(res.profile.version, 1);
});

test('importProfile repariert falsche Felder einzeln, solange das Siegel stimmt', () => {
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

test('importProfile lehnt Nicht-Objekt-Profile ab', () => {
  assert.equal(importProfile(wrap([])).reason, 'beschaedigt');
  assert.equal(importProfile(wrap('text')).reason, 'beschaedigt');
  assert.equal(importProfile(seal([1, 2])).reason, 'beschaedigt');
});

test('Grenzen: riesige Zahlen, Listen und seltsame Texte werden gekappt oder verworfen', () => {
  const prof = (over) => importProfile(wrap(over)).profile;
  assert.equal(prof({ coins: 1e300 }).coins, 1_000_000_000);
  assert.equal(prof({ coins: 12.9 }).coins, 12);
  assert.equal(prof({ owned: Array.from({ length: 5000 }, (_, i) => `a${i}`) }).owned.length, 300);
  assert.deepEqual(prof({ owned: ['ok', 'a'.repeat(200), '<img src=x onerror=alert(1)>', 'mit leerzeichen', "x';y"] }).owned, ['ok']);
  assert.equal(prof({ color: 'red;background:url(//evil)' }).color, 'kiwi');
  assert.equal(prof({ streak: { days: 1, lastDate: '<b>' } }).streak.lastDate, '');
  assert.deepEqual(prof({ daily: { a: { date: '2026-01-01', coins: 4 }, b: { date: 'gestern', coins: 4 } } }).daily, { a: { date: '2026-01-01', coins: 4 } });
  const many = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [`k${i}`, { right: 1, wrong: 0, last: 1 }]));
  assert.equal(Object.keys(prof({ mastery: many }).mastery).length, 200);
});

test('Grenzen: __proto__ und constructor in der Datei veraendern keine Objekte', () => {
  const evil = JSON.parse('{"name":"X","__proto__":{"polluted":1},"mastery":{"__proto__":{"right":1,"wrong":1,"last":1}},"wearing":{"__proto__":"a","constructor":"b"}}');
  const res = importProfile(wrap(evil));
  assert.equal(res.ok, true);
  assert.equal({}.polluted, undefined);
  assert.equal(res.profile.polluted, undefined);
  assert.equal(Object.getPrototypeOf(res.profile.wearing), Object.prototype);
  assert.equal(Object.getPrototypeOf(res.profile.mastery), Object.prototype);
  assert.equal(Object.keys(res.profile.mastery).includes('__proto__'), true, 'als gewoehnlicher Schluessel, nicht als Prototyp');
});

test('Namen: Steuer- und Schreibrichtungszeichen werden entfernt, Emojis und Umlaute bleiben', () => {
  assert.equal(defaultProfile('A\u202Eevil\u202C\u0000B\u200Fc', 'x').name, 'AevilBc');
  assert.equal(defaultProfile('Zoë 🦄', 'x').name, 'Zoë 🦄');
  assert.equal(defaultProfile('\u202E\u200F\u0001', 'x').name, 'Monsterfreund');
});

test('load repariert ein teilweise kaputtes Profil statt null zu liefern', () => {
  const backend = fakeBackend();
  const store = createStore(backend, { makeId: fixedIds() });
  const { profile: p } = store.createProfile('Mia');
  backend.setItem(`bruchmonster:profile:${p.id}`, seal({ ...p, coins: -5, xp: 40, owned: ['a', 3], cards: 'x', name: 'Mia' }));
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

test('Store: von Hand veraenderter oder im Klartext geschriebener Spielstand wird nicht geladen', () => {
  const backend = fakeBackend();
  const store = createStore(backend, { makeId: fixedIds() });
  const { profile: p } = store.createProfile('Mia');
  const key = `bruchmonster:profile:${p.id}`;
  const sealed = backend.getItem(key);
  for (const klartext of ['Mia', 'coins']) assert.ok(!sealed.includes(klartext), `Ablage verraet ${klartext}`);
  assert.equal(store.load(p.id).name, 'Mia');
  const doc = JSON.parse(sealed);
  backend.setItem(key, JSON.stringify({ ...doc, d: doc.d.slice(0, 6) + (doc.d[6] === 'A' ? 'B' : 'A') + doc.d.slice(7) }));
  assert.equal(store.load(p.id), null, 'veraendert');
  backend.setItem(key, JSON.stringify({ ...p, coins: 99999 }));
  assert.equal(store.load(p.id), null, 'Klartext');
});

test('Store: Index mit boesen ids und Namen wird gereinigt', () => {
  const backend = fakeBackend();
  backend.setItem('bruchmonster:profiles', JSON.stringify([
    { id: 'ok1', name: 'Gut\u202E' }, { id: '<script>', name: 'Boese' }, { id: 'a'.repeat(100), name: 'Lang' }, { id: 5, name: 'Zahl' },
  ]));
  assert.deepEqual(createStore(backend).listProfiles(), [{ id: 'ok1', name: 'Gut' }]);
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
    'bruchmonster:profile:a1': seal(p1),
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
  const ok = importProfile(wrap(noSeen));
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.profile.seen, []);
  const bad = importProfile(wrap({ ...base, seen: [1] }));
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

test('Siegel gehoert zu einer Profil-id: kopierter Eintrag unter anderer id wird nicht geladen', () => {
  const backend = fakeBackend();
  const store = createStore(backend, { makeId: fixedIds() });
  const a = store.createProfile('Eins').profile;
  const b = store.createProfile('Zwei').profile;
  backend.setItem(`bruchmonster:profile:${b.id}`, backend.getItem(`bruchmonster:profile:${a.id}`));
  assert.equal(store.load(b.id), null);
  assert.equal(store.load(a.id).name, 'Eins');
});

test('Namen aus unsichtbaren Zeichen werden zu Monsterfreund', () => {
  assert.equal(defaultProfile('\u200B\u200B\u3164\u2800', 'x').name, 'Monsterfreund');
  assert.equal(defaultProfile('Mi\u200Ba', 'x').name, 'Mia');
});

test('Index: riesiger oder ueberlanger Index wird begrenzt', () => {
  const backend = fakeBackend();
  backend.setItem('bruchmonster:profiles', JSON.stringify(Array.from({ length: 5000 }, (_, i) => ({ id: `p${i}`, name: 'x' }))));
  const t0 = Date.now();
  assert.ok(createStore(backend).listProfiles().length <= 100);
  assert.ok(Date.now() - t0 < 500);
});
