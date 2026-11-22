import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile } from '../src/core/storage.js';
import { makeRng } from '../src/core/rng.js';
import {
  ITEMS, DAILY_LIMIT, CAVE_MAX,
  reward, applyResult, buy, equip, placeFurniture, touchStreak, awardCard, cardDue, monsterStage,
} from '../src/core/economy.js';

const DAY = 86400000;
const NOW = Date.UTC(2026, 10, 22, 10, 0, 0);
const TODAY = '2026-11-22';

const profile = (over = {}) => ({ ...defaultProfile('Test', 'p1', '2026-11-01T00:00:00.000Z'), ...over });
const item = (id) => ITEMS.find((it) => it.id === id);
const ofKind = (kind) => ITEMS.filter((it) => it.kind === kind);
const task = (kind = 'kuerzen', level = 2) => ({ id: 't1', kind, level, world: 'streifen' });
const correct = (over = {}) => ({ correct: true, hintsUsed: 0, explained: false, ...over });
const wrong = (over = {}) => ({ correct: false, hintsUsed: 0, explained: false, ...over });

// ---------- ITEMS ----------

test('ITEMS: genug Eintraege je Art', () => {
  assert.ok(ofKind('futter').length >= 6);
  assert.ok(ofKind('kleidung').length >= 12);
  assert.ok(ofKind('farbe').length >= 4);
  assert.ok(ofKind('moebel').length >= 10);
  assert.ok(ofKind('karte').length >= 8);
});

test('ITEMS: ids eindeutig, Namen nicht leer', () => {
  const ids = ITEMS.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const it of ITEMS) assert.ok(typeof it.name === 'string' && it.name.trim().length > 0, it.id);
});

test('ITEMS: Futter hat Preis 3-30 und xp', () => {
  for (const it of ofKind('futter')) {
    assert.ok(it.price >= 3 && it.price <= 30, it.id);
    assert.ok(it.xp > 0, it.id);
  }
  assert.equal(item('bruchkekse').price, 3);
  assert.equal(item('bruchkekse').xp, 6);
});

test('ITEMS: Kleidung verteilt auf alle vier Slots, Preis 10-80', () => {
  const slots = new Set(ofKind('kleidung').map((it) => it.slot));
  assert.deepEqual([...slots].sort(), ['fuss', 'hand', 'koerper', 'kopf']);
  for (const it of ofKind('kleidung')) assert.ok(it.price >= 10 && it.price <= 80, it.id);
});

test('ITEMS: Farben mit Hex, Preis 15-40, nicht kiwi', () => {
  for (const it of ofKind('farbe')) {
    assert.match(it.color, /^#[0-9A-Fa-f]{6}$/, it.id);
    assert.ok(it.price >= 15 && it.price <= 40, it.id);
    assert.notEqual(it.id, 'kiwi');
  }
});

test('ITEMS: Moebel Preis 10-60', () => {
  for (const it of ofKind('moebel')) assert.ok(it.price >= 10 && it.price <= 60, it.id);
});

test('ITEMS: Karten nicht kaeuflich, mit Seltenheit und Text', () => {
  for (const it of ofKind('karte')) {
    assert.equal(it.price, null, it.id);
    assert.ok(['normal', 'selten', 'legendaer'].includes(it.rarity), it.id);
    assert.ok(typeof it.text === 'string' && it.text.length > 0, it.id);
  }
});

// ---------- reward ----------

test('reward: Grundwerte je Stufe 2/3/5', () => {
  assert.equal(reward({ level: 1, hintsUsed: 0, streak: 0, explained: false }), 2);
  assert.equal(reward({ level: 2, hintsUsed: 0, streak: 0, explained: false }), 3);
  assert.equal(reward({ level: 3, hintsUsed: 0, streak: 0, explained: false }), 5);
});

test('reward: je Tipp -1, mindestens 1', () => {
  assert.equal(reward({ level: 3, hintsUsed: 2, streak: 0, explained: false }), 3);
  assert.equal(reward({ level: 2, hintsUsed: 1, streak: 0, explained: false }), 2);
  assert.equal(reward({ level: 1, hintsUsed: 3, streak: 0, explained: false }), 1);
});

test('reward: Serie ab 3 richtigen +1', () => {
  assert.equal(reward({ level: 2, hintsUsed: 0, streak: 2, explained: false }), 3);
  assert.equal(reward({ level: 2, hintsUsed: 0, streak: 3, explained: false }), 4);
});

test('reward: Begruendung +2, alles zusammen', () => {
  assert.equal(reward({ level: 2, hintsUsed: 0, streak: 0, explained: true }), 5);
  assert.equal(reward({ level: 3, hintsUsed: 1, streak: 4, explained: true }), 4 + 1 + 2);
});

// ---------- applyResult ----------

test('applyResult: richtige Antwort zahlt Belohnung, erhoeht right und setzt last', () => {
  const p = profile({ coins: 10 });
  const res = applyResult(p, task('kuerzen', 2), correct(), TODAY, NOW);
  assert.equal(res.coins, 3);
  assert.equal(res.capped, false);
  assert.equal(res.profile.coins, 13);
  assert.deepEqual(res.profile.mastery.kuerzen, { right: 1, wrong: 0, last: NOW });
});

test('applyResult: falsche Antwort gibt 0, nie negativ, erhoeht wrong', () => {
  const p = profile({ coins: 4 });
  const res = applyResult(p, task('kuerzen', 3), wrong(), TODAY, NOW);
  assert.equal(res.coins, 0);
  assert.equal(res.capped, false);
  assert.equal(res.profile.coins, 4);
  assert.deepEqual(res.profile.mastery.kuerzen, { right: 0, wrong: 1, last: NOW });
});

test('applyResult: Serie und Begruendung kommen aus r', () => {
  const p = profile();
  const res = applyResult(p, task('kuerzen', 1), correct({ explained: true, streak: 3 }), TODAY, NOW);
  assert.equal(res.coins, 2 + 1 + 2);
});

test('applyResult: Tageslimit je Art greift, dann 0 und capped', () => {
  const p = profile({ daily: { [`${TODAY}|kuerzen`]: { date: TODAY, coins: DAILY_LIMIT } } });
  const res = applyResult(p, task('kuerzen', 3), correct(), TODAY, NOW);
  assert.equal(res.coins, 0);
  assert.equal(res.capped, true);
  assert.equal(res.profile.coins, p.coins);
});

test('applyResult: Teilbetrag bis zum Limit, Rest verfaellt', () => {
  const p = profile({ coins: 0, daily: { [`${TODAY}|kuerzen`]: { date: TODAY, coins: 36 } } });
  const res = applyResult(p, task('kuerzen', 3), correct(), TODAY, NOW);
  assert.equal(res.coins, 4);
  assert.equal(res.capped, true);
  assert.deepEqual(res.profile.daily[`${TODAY}|kuerzen`], { date: TODAY, coins: 40 });
});

test('applyResult: Limit gilt je Art, nicht insgesamt', () => {
  const p = profile({ daily: { [`${TODAY}|kuerzen`]: { date: TODAY, coins: DAILY_LIMIT } } });
  const res = applyResult(p, task('addieren', 3), correct(), TODAY, NOW);
  assert.equal(res.coins, 5);
  assert.equal(res.capped, false);
});

test('applyResult: am naechsten Tag wieder volles Limit, alte Eintraege werden entfernt', () => {
  const p = profile({ daily: { [`2026-11-21|kuerzen`]: { date: '2026-11-21', coins: DAILY_LIMIT } } });
  const res = applyResult(p, task('kuerzen', 3), correct(), TODAY, NOW);
  assert.equal(res.coins, 5);
  assert.equal(res.capped, false);
  assert.equal(res.profile.daily['2026-11-21|kuerzen'], undefined);
  assert.deepEqual(res.profile.daily[`${TODAY}|kuerzen`], { date: TODAY, coins: 5 });
});

test('applyResult: nowMs faellt auf Date.now() zurueck', () => {
  const before = Date.now();
  const res = applyResult(profile(), task(), wrong(), TODAY);
  const after = Date.now();
  assert.ok(res.profile.mastery.kuerzen.last >= before && res.profile.mastery.kuerzen.last <= after);
});

test('applyResult: Eingabe wird nicht veraendert', () => {
  const p = profile({
    coins: 10,
    mastery: { kuerzen: { right: 2, wrong: 1, last: 5 } },
    daily: { [`${TODAY}|kuerzen`]: { date: TODAY, coins: 6 } },
  });
  const snapshot = structuredClone(p);
  const t = task();
  const r = correct();
  const tSnap = structuredClone(t);
  const rSnap = structuredClone(r);
  applyResult(p, t, r, TODAY, NOW);
  assert.deepEqual(p, snapshot);
  assert.deepEqual(t, tSnap);
  assert.deepEqual(r, rSnap);
});

// ---------- buy ----------

test('buy: Kleidung kostet Münzen und landet in owned', () => {
  const p = profile({ coins: 50 });
  const res = buy(p, 'halbe-socken');
  assert.equal(res.ok, true);
  assert.equal(res.profile.coins, 40);
  assert.ok(res.profile.owned.includes('halbe-socken'));
});

test('buy: zu wenig Münzen, Münzen unveraendert', () => {
  const p = profile({ coins: 5 });
  const res = buy(p, 'nenner-gummistiefel');
  assert.deepEqual(res, { ok: false, reason: 'zu-wenig' });
  assert.equal(p.coins, 5);
});

test('buy: genau der Preis reicht, Münzen werden nie negativ', () => {
  const res = buy(profile({ coins: 10 }), 'halbe-socken');
  assert.equal(res.ok, true);
  assert.equal(res.profile.coins, 0);
  assert.deepEqual(buy(profile({ coins: 9 }), 'halbe-socken'), { ok: false, reason: 'zu-wenig' });
});

test('buy: zweiter Kauf eines Nicht-Futters ist schon-besessen (Doppelklick)', () => {
  const first = buy(profile({ coins: 100 }), 'halbe-socken');
  const second = buy(first.profile, 'halbe-socken');
  assert.deepEqual(second, { ok: false, reason: 'schon-besessen' });
  assert.equal(first.profile.coins, 90);
});

test('buy: Futter kann mehrfach gekauft werden, xp steigt, owned bleibt leer', () => {
  const first = buy(profile({ coins: 20 }), 'bruchkekse');
  const second = buy(first.profile, 'bruchkekse');
  assert.equal(second.ok, true);
  assert.equal(second.profile.coins, 14);
  assert.equal(second.profile.xp, 12);
  assert.deepEqual(second.profile.owned, []);
});

test('buy: unbekannte id und Karte ist nicht kaeuflich', () => {
  assert.deepEqual(buy(profile({ coins: 99 }), 'gibt-es-nicht'), { ok: false, reason: 'unbekannt' });
  assert.deepEqual(buy(profile({ coins: 99 }), 'karte-gleiche-zahlen'), { ok: false, reason: 'nicht-kaeuflich' });
});

test('buy: Eingabe wird nicht veraendert', () => {
  const p = profile({ coins: 50, owned: ['x'] });
  const snap = structuredClone(p);
  buy(p, 'halbe-socken');
  buy(p, 'bruchkekse');
  assert.deepEqual(p, snap);
});

// ---------- equip ----------

test('equip: Kleidung setzt den Slot, zweites equip legt ab', () => {
  const p = profile({ owned: ['halbe-socken'] });
  const on = equip(p, 'halbe-socken');
  assert.equal(on.ok, true);
  assert.equal(on.profile.wearing.fuss, 'halbe-socken');
  const off = equip(on.profile, 'halbe-socken');
  assert.equal(off.profile.wearing.fuss, undefined);
});

test('equip: anderes Teil im selben Slot ersetzt das alte', () => {
  const p = profile({ owned: ['halbe-socken', 'kuerz-sneaker'], wearing: { fuss: 'halbe-socken' } });
  const res = equip(p, 'kuerz-sneaker');
  assert.equal(res.profile.wearing.fuss, 'kuerz-sneaker');
});

test('equip: Farbe setzt p.color, kiwi ist immer verfuegbar', () => {
  const p = profile({ owned: ['farbe-ozean'] });
  assert.equal(equip(p, 'farbe-ozean').profile.color, 'farbe-ozean');
  assert.equal(equip(profile({ color: 'farbe-ozean' }), 'kiwi').profile.color, 'kiwi');
});

test('equip: nicht besessen, Profil unveraendert', () => {
  const p = profile();
  assert.deepEqual(equip(p, 'halbe-socken'), { ok: false, reason: 'nicht-besessen' });
  assert.deepEqual(equip(p, 'gibt-es-nicht'), { ok: false, reason: 'nicht-besessen' });
  assert.deepEqual(p.wearing, {});
});

test('equip: Eingabe wird nicht veraendert', () => {
  const p = profile({ owned: ['halbe-socken'], wearing: { kopf: 'halbe-halbe-muetze' } });
  const snap = structuredClone(p);
  equip(p, 'halbe-socken');
  equip(p, 'halbe-socken');
  assert.deepEqual(p, snap);
});

// ---------- placeFurniture ----------

test('placeFurniture: besessenes Moebel aufstellen und entfernen', () => {
  const p = profile({ owned: ['dreibein-hocker'] });
  const on = placeFurniture(p, 'dreibein-hocker', true);
  assert.deepEqual(on, { ok: true, profile: { ...p, cave: ['dreibein-hocker'] } });
  const off = placeFurniture(on.profile, 'dreibein-hocker', false);
  assert.deepEqual(off.profile.cave, []);
});

test('placeFurniture: nicht besessen geht nicht', () => {
  assert.deepEqual(placeFurniture(profile(), 'dreibein-hocker', true), { ok: false, reason: 'nicht-besessen' });
});

test('placeFurniture: hoehle hat hoechstens 8 Plaetze', () => {
  const ids = ofKind('moebel').slice(0, CAVE_MAX + 1).map((it) => it.id);
  let p = profile({ owned: ids });
  for (const id of ids.slice(0, CAVE_MAX)) p = placeFurniture(p, id, true).profile;
  assert.equal(p.cave.length, CAVE_MAX);
  assert.deepEqual(placeFurniture(p, ids[CAVE_MAX], true), { ok: false, reason: 'hoehle-voll' });
});

test('placeFurniture: doppelt aufstellen ist idempotent', () => {
  const p = profile({ owned: ['dreibein-hocker'], cave: ['dreibein-hocker'] });
  assert.deepEqual(placeFurniture(p, 'dreibein-hocker', true).profile.cave, ['dreibein-hocker']);
});

test('placeFurniture: Eingabe wird nicht veraendert', () => {
  const p = profile({ owned: ['dreibein-hocker'], cave: [] });
  const snap = structuredClone(p);
  placeFurniture(p, 'dreibein-hocker', true);
  assert.deepEqual(p, snap);
});

// ---------- touchStreak ----------

test('touchStreak: gleicher Tag bleibt unveraendert', () => {
  const p = profile({ streak: { days: 4, lastDate: TODAY } });
  const res = touchStreak(p, TODAY);
  assert.equal(res.isNewDay, false);
  assert.deepEqual(res.profile.streak, { days: 4, lastDate: TODAY });
});

test('touchStreak: Folgetag zaehlt hoch, auch ueber Monatsgrenze', () => {
  const res = touchStreak(profile({ streak: { days: 4, lastDate: '2026-10-31' } }), '2026-11-01');
  assert.equal(res.isNewDay, true);
  assert.deepEqual(res.profile.streak, { days: 5, lastDate: '2026-11-01' });
});

test('touchStreak: Luecke setzt auf 1', () => {
  const res = touchStreak(profile({ streak: { days: 9, lastDate: '2026-11-19' } }), TODAY);
  assert.equal(res.isNewDay, true);
  assert.deepEqual(res.profile.streak, { days: 1, lastDate: TODAY });
});

test('touchStreak: leeres Datum ergibt 1', () => {
  const res = touchStreak(profile(), TODAY);
  assert.deepEqual(res.profile.streak, { days: 1, lastDate: TODAY });
});

test('touchStreak: Eingabe wird nicht veraendert', () => {
  const p = profile({ streak: { days: 2, lastDate: '2026-11-21' } });
  const snap = structuredClone(p);
  touchStreak(p, TODAY);
  assert.deepEqual(p, snap);
});

// ---------- awardCard ----------

test('awardCard: gibt eine noch nicht gesammelte Karte und merkt sie sich', () => {
  const p = profile({ cards: ['karte-gleiche-zahlen'] });
  const res = awardCard(p, makeRng(7));
  assert.equal(res.card.kind, 'karte');
  assert.notEqual(res.card.id, 'karte-gleiche-zahlen');
  assert.deepEqual(res.profile.cards, ['karte-gleiche-zahlen', res.card.id]);
});

test('awardCard: alle gesammelt ergibt null', () => {
  const all = ofKind('karte').map((it) => it.id);
  const res = awardCard(profile({ cards: all }), makeRng(1));
  assert.equal(res.card, null);
  assert.deepEqual(res.profile.cards, all);
});

test('awardCard: seltene Karten kommen seltener (Gewichte 6/3/1)', () => {
  const rng = makeRng(42);
  const count = { normal: 0, selten: 0, legendaer: 0 };
  const draws = 3000;
  for (let i = 0; i < draws; i++) count[awardCard(profile(), rng).card.rarity]++;
  assert.ok(count.normal / draws > 0.5 && count.normal / draws < 0.7, JSON.stringify(count));
  assert.ok(count.selten / draws > 0.2 && count.selten / draws < 0.4, JSON.stringify(count));
  assert.ok(count.legendaer / draws > 0.05 && count.legendaer / draws < 0.15, JSON.stringify(count));
});

test('awardCard: Eingabe wird nicht veraendert', () => {
  const p = profile({ cards: ['karte-gleiche-zahlen'] });
  const snap = structuredClone(p);
  awardCard(p, makeRng(3));
  assert.deepEqual(p, snap);
});

// ---------- cardDue ----------

test('cardDue: jede 5. richtige Antwort in Folge', () => {
  assert.equal(cardDue({ sessionStreak: 5, isNewDay: false, streakDays: 1 }), true);
  assert.equal(cardDue({ sessionStreak: 10, isNewDay: false, streakDays: 1 }), true);
  assert.equal(cardDue({ sessionStreak: 3, isNewDay: false, streakDays: 1 }), false);
  assert.equal(cardDue({ sessionStreak: 0, isNewDay: false, streakDays: 1 }), false);
});

test('cardDue: neuer Tag bei Serie durch 3 teilbar', () => {
  assert.equal(cardDue({ sessionStreak: 1, isNewDay: true, streakDays: 3 }), true);
  assert.equal(cardDue({ sessionStreak: 1, isNewDay: true, streakDays: 6 }), true);
  assert.equal(cardDue({ sessionStreak: 1, isNewDay: true, streakDays: 4 }), false);
  assert.equal(cardDue({ sessionStreak: 1, isNewDay: false, streakDays: 3 }), false);
});

// ---------- monsterStage ----------

test('monsterStage: Grenzen 0, 30, 100, 250, 500', () => {
  assert.equal(monsterStage(0), 0);
  assert.equal(monsterStage(29), 0);
  assert.equal(monsterStage(30), 1);
  assert.equal(monsterStage(99), 1);
  assert.equal(monsterStage(100), 2);
  assert.equal(monsterStage(249), 2);
  assert.equal(monsterStage(250), 3);
  assert.equal(monsterStage(499), 3);
  assert.equal(monsterStage(500), 4);
  assert.equal(monsterStage(9999), 4);
});
