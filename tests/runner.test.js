import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProfile } from '../src/core/storage.js';
import { makeRng } from '../src/core/rng.js';
import { createRunner } from '../src/ui/runner.js';
import { format } from '../src/core/fractions.js';
import { ITEMS } from '../src/core/economy.js';

const TODAY = '2026-11-22';
const NOW = Date.UTC(2026, 10, 22, 10, 0, 0);
const profile = (over = {}) => ({ ...defaultProfile('Test', 'p1', '2026-11-01T00:00:00.000Z'), streak: { days: 1, lastDate: TODAY }, ...over });

function make(kind, level = 2, over = {}) {
  const updates = [];
  const r = createRunner({
    profile: over.profile ?? profile(), kind, level, rng: makeRng(over.seed ?? 7), today: TODAY, nowMs: NOW,
    onUpdate: (p, e) => updates.push({ p, e }), ...over.extra,
  });
  return { r, updates, last: () => updates.at(-1)?.p };
}

const rightInput = (t) => {
  if (t.answer.type === 'frac') return t.answer.accept === 'between' ? format(t.answer.range[0]) : format(t.answer.value);
  return t.answer.value;
};
const wrongInput = (t) => {
  if (t.answer.type === 'frac') return '99/1';
  return t.answer.value === 0 ? 1 : 0;
};

test('Doppelklick: gleiche richtige Antwort zweimal vergibt Muenzen nur einmal', () => {
  const { r, updates, last } = make('kuerzen');
  const t = r.current();
  const a = r.submit(rightInput(t));
  assert.equal(a.correct, true);
  assert.ok(a.coins >= 1);
  const coins = last().coins;
  const n = updates.length;
  const b = r.submit(rightInput(t));
  assert.equal(b.already, true);
  assert.equal(b.correct, true);
  assert.equal(b.coins, a.coins);
  assert.equal(last().coins, coins);
  assert.equal(updates.length, n);
  assert.equal(a.already, false);
});

test('hint(): Tipp 1, 2, 3, danach null', () => {
  const { r } = make('addieren');
  const t = r.current();
  assert.equal(r.hint(), t.hints[0]);
  assert.equal(r.hint(), t.hints[1]);
  assert.equal(r.hint(), t.hints[2]);
  assert.equal(r.hint(), null);
  assert.equal(r.state().hintsUsed, 3);
});

test('falsche Antwort mit erkennbarem Fehler liefert mistake', () => {
  const { r } = make('addieren', 2, { seed: 3 });
  const t = r.current();
  const m = t.meta;
  assert.ok(m.a && m.b && m.a.d !== m.b.d);
  const bad = `${m.op === 'sub' ? m.a.n - m.b.n : m.a.n + m.b.n}/${m.a.d + m.b.d}`;
  const res = r.submit(bad);
  assert.equal(res.correct, false);
  assert.equal(res.mistake, 'nenner-addiert');
  assert.equal(res.coins, 0);
});

test('nach 3 Tipps und Loesung sind Muenzen >= 1', () => {
  const { r, last } = make('kuerzen', 1);
  r.hint(); r.hint(); r.hint();
  const res = r.submit(rightInput(r.current()));
  assert.equal(res.correct, true);
  assert.ok(res.coins >= 1);
  assert.ok(last().coins >= 1);
});

test('ungueltige Eingabe zaehlt nicht als falscher Versuch', () => {
  const { r, updates } = make('kuerzen');
  const res = r.submit('');
  assert.equal(res.invalid, 'leer');
  assert.equal(res.correct, false);
  assert.equal(r.state().wrongAttempts, 0);
  assert.equal(updates.length, 0);
  assert.equal(r.submit('3/0').invalid, 'nenner-null');
  assert.equal(r.state().wrongAttempts, 0);
  assert.equal(r.state().solved, false);
});

test('falsch: wrongAttempts++, applyResult nur beim ersten Fehler, onUpdate einmal je Aenderung', () => {
  const { r, updates, last } = make('kuerzen');
  const t = r.current();
  r.submit(wrongInput(t));
  assert.equal(updates.length, 1);
  assert.equal(last().mastery.kuerzen.wrong, 1);
  r.submit('98/1');
  assert.equal(r.state().wrongAttempts, 2);
  assert.equal(updates.length, 1, 'zweiter Fehler aendert das Profil nicht');
  assert.equal(last().mastery.kuerzen.wrong, 1);
});

test('richtig nach Fehler: Muenzen mit Abzug, Meisterschaft right und wrong', () => {
  const { r, last } = make('kuerzen', 3);
  const t = r.current();
  r.submit(wrongInput(t));
  const res = r.submit(rightInput(t));
  assert.equal(res.correct, true);
  assert.equal(res.coins, 4); // Stufe 3 = 5, minus 1 wegen eines Fehlversuchs
  assert.equal(last().mastery.kuerzen.right, 1);
  assert.equal(last().mastery.kuerzen.wrong, 1);
});

test('Anti-Raten: choice nach Fehlversuch bringt 0 Muenzen, zaehlt aber als geloest', () => {
  const { r } = make('vergleichen');
  const t = r.current();
  assert.equal(t.answer.type, 'choice');
  r.submit(wrongInput(t));
  const res = r.submit(rightInput(t));
  assert.equal(res.correct, true);
  assert.equal(res.coins, 0);
  assert.equal(r.state().solved, true);
  assert.equal(r.submit(rightInput(t)).already, true);
});

test('Anti-Raten: marks nach Fehlversuch bringt 0 Muenzen', () => {
  const { r } = make('fehler-finden');
  const t = r.current();
  assert.equal(t.answer.type, 'marks');
  r.submit(wrongInput(t));
  assert.equal(r.submit(rightInput(t)).coins, 0);
});

test('choice direkt richtig gibt Muenzen', () => {
  const { r } = make('regel-entdecken');
  const res = r.submit(rightInput(r.current()));
  assert.ok(res.coins >= 1);
});

test('Fehler-Detektiv (isReasoning) gibt Erklaer-Bonus', () => {
  const { r } = make('fehler-finden', 1);
  const t = r.current();
  assert.equal(t.meta.isReasoning, true);
  const res = r.submit(rightInput(t));
  assert.ok(res.coins >= 1 + 2);
});

test('sessionStreak: waechst ohne Fehler und Tipp, Fehler oder Tipp setzen zurueck', () => {
  const { r } = make('kuerzen');
  r.submit(rightInput(r.current()));
  assert.equal(r.state().sessionStreak, 1);
  r.next();
  r.submit(rightInput(r.current()));
  assert.equal(r.state().sessionStreak, 2);
  r.next();
  r.hint();
  r.submit(rightInput(r.current()));
  assert.equal(r.state().sessionStreak, 2, 'mit Tipp: Serie bleibt, waechst aber nicht');
  r.next();
  r.submit(wrongInput(r.current()));
  assert.equal(r.state().sessionStreak, 0);
});

test('Karte nach 5 richtigen in Folge, in derselben Aktualisierung', () => {
  const { r, updates, last } = make('kuerzen');
  let res;
  for (let i = 0; i < 5; i++) {
    res = r.submit(rightInput(r.current()));
    if (i < 4) r.next();
  }
  assert.ok(res.card);
  assert.equal(res.card.kind, 'karte');
  assert.equal(last().cards.length, 1);
  assert.equal(updates.length, 5);
});

test('reveal: erst nach 2 Fehlversuchen oder 3 Tipps, dann geloest mit 0 Muenzen', () => {
  const { r, last } = make('kuerzen');
  const t = r.current();
  assert.equal(r.canReveal(), false);
  assert.equal(r.reveal(), null);
  r.submit(wrongInput(t));
  assert.equal(r.canReveal(), false);
  r.submit('98/1');
  assert.equal(r.canReveal(), true);
  const coins = last().coins;
  const rev = r.reveal();
  assert.ok(rev.answerText.length > 0);
  assert.equal(rev.steps, t.hints[2]);
  assert.equal(r.state().revealed, true);
  assert.equal(r.state().solved, false);
  assert.equal(last().coins, coins);
  const again = r.submit(rightInput(t));
  assert.equal(again.already, true);
  assert.equal(again.coins, 0);
});

test('reveal nach 3 Tipps zaehlt einmal als falsch', () => {
  const { r, updates, last } = make('kuerzen');
  r.hint(); r.hint();
  assert.equal(r.canReveal(), false);
  r.hint();
  assert.equal(r.canReveal(), true);
  r.reveal();
  assert.equal(updates.length, 1);
  assert.equal(last().mastery.kuerzen.wrong, 1);
  assert.equal(r.state().sessionStreak, 0);
});

test('next(): neue Aufgabe, Zaehler zurueckgesetzt, Streak bleibt', () => {
  const { r } = make('kuerzen');
  const t1 = r.current();
  r.hint();
  r.submit(wrongInput(t1));
  const t2 = r.next();
  assert.notEqual(t2.id, t1.id);
  assert.equal(r.current(), t2);
  const s = r.state();
  assert.equal(s.hintsUsed, 0);
  assert.equal(s.wrongAttempts, 0);
  assert.equal(s.solved, false);
  assert.equal(s.revealed, false);
});

test('Erstellung: neuer Tag setzt Serie, onUpdate meldet; gleicher Tag nicht', () => {
  const fresh = { ...profile(), streak: { days: 0, lastDate: '' } };
  const a = make('kuerzen', 1, { profile: fresh });
  assert.equal(a.updates.length, 1);
  assert.equal(a.last().streak.days, 1);
  assert.equal(a.last().streak.lastDate, TODAY);
  const b = make('kuerzen', 1);
  assert.equal(b.updates.length, 0);
});

test('Erstellung: Serientag durch 3 teilbar gibt eine Karte', () => {
  const p = { ...profile(), streak: { days: 2, lastDate: '2026-11-21' } };
  const { updates, last, r } = make('kuerzen', 1, { profile: p });
  assert.equal(updates.length, 1);
  assert.equal(last().streak.days, 3);
  assert.equal(last().cards.length, 1);
  assert.equal(updates[0].e.card.kind, 'karte');
  assert.ok(r.state().newDayCard);
});

test('Runner veraendert das uebergebene Profil nicht', () => {
  const p = profile();
  const snap = JSON.stringify(p);
  const { r } = make('kuerzen', 1, { profile: p });
  r.submit(rightInput(r.current()));
  assert.equal(JSON.stringify(p), snap);
});

test('pickTask kann ersetzt werden', () => {
  const calls = [];
  const { r } = make('kuerzen', 1, { extra: { pickTask: (k, l, rng) => { calls.push([k, l]); return pickReal(k, l, rng); } } });
  r.next();
  assert.deepEqual(calls, [['kuerzen', 1], ['kuerzen', 1]]);
});

import { generate as pickReal } from '../src/tasks/generators.js';

test('Tageslimit: capped wird durchgereicht', () => {
  const p = profile({ daily: { [`${TODAY}|kuerzen`]: { date: TODAY, coins: 40 } } });
  const { r } = make('kuerzen', 1, { profile: p });
  const res = r.submit(rightInput(r.current()));
  assert.equal(res.coins, 0);
  assert.equal(res.capped, true);
  assert.equal(r.state().solved, true);
});

test('nicht-gekuerzt: richtig aber ungekuerzt ist kein Fehlversuch', () => {
  const { r, updates } = make('kuerzen', 1);
  const t = r.current();
  const v = t.answer.value;
  const n = updates.length;
  const res = r.submit(`${v.n * 2}/${v.d * 2}`);
  assert.equal(res.correct, false);
  assert.equal(res.note, 'nicht-gekuerzt');
  assert.equal(res.coins, 0);
  assert.equal(r.state().wrongAttempts, 0);
  assert.equal(r.state().sessionStreak, 0);
  assert.equal(updates.length, n, 'keine Profilaenderung');
  const ok = r.submit(format(v));
  assert.equal(ok.correct, true);
  assert.ok(ok.coins >= 1);
});

test('nicht-gekuerzt: Serie bleibt erhalten und Mastery zaehlt keinen Fehler', () => {
  const { r, last } = make('kuerzen', 1);
  const t1 = r.current();
  r.submit(format(t1.answer.value));
  r.next();
  const t2 = r.current();
  const streak = r.state().sessionStreak;
  const v = t2.answer.value;
  r.submit(`${v.n * 2}/${v.d * 2}`);
  assert.equal(r.state().sessionStreak, streak);
  assert.equal(last().mastery.kuerzen.wrong, 0);
});

test('Anti-Raten: position nach Fehlversuch bringt 0 Muenzen', () => {
  for (const kind of ['platzieren', 'schaetzen']) {
    const { r } = make(kind, 1);
    const t = r.current();
    assert.equal(t.answer.type, 'position');
    const wrong = t.answer.value.n / t.answer.value.d > 0.5 ? 0.02 : 0.98;
    assert.equal(r.submit(wrong).correct, false, kind);
    const res = r.submit(t.answer.value.n / t.answer.value.d);
    assert.equal(res.correct, true, kind);
    assert.equal(res.coins, 0, kind);
  }
});

test('Anti-Raten: Streifen faerben (darstellen) nach Fehlversuch bringt 0 Muenzen', () => {
  const { r } = make('darstellen', 1);
  const t = r.current();
  assert.equal(t.widget.type, 'strips');
  r.submit('99/1');
  const res = r.submit(rightInput(t));
  assert.equal(res.correct, true);
  assert.equal(res.coins, 0);
});
