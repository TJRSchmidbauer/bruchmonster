import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createUnsaved } from '../src/core/unsaved.js';

test('Unsaved: Fehlschlag merkt den aktuellen Spielstand, Erfolg raeumt auf', () => {
  const u = createUnsaved();
  assert.equal(u.get(), null);
  const p1 = { id: 'a', coins: 1 };
  u.note(p1, { ok: false, reason: 'voll' });
  assert.equal(u.get(), p1);
  const p2 = { id: 'a', coins: 5 };
  u.note(p2, { ok: false, reason: 'voll' });
  assert.equal(u.get().coins, 5, 'immer der neueste Stand');
  assert.equal(u.pendingFor('a').coins, 5);
  assert.equal(u.pendingFor('b'), null);
  u.note({ id: 'b', coins: 0 }, { ok: true });
  assert.equal(u.get().id, 'a', 'Erfolg bei anderem Profil raeumt nicht auf');
  u.note({ id: 'a', coins: 6 }, { ok: true });
  assert.equal(u.get(), null);
});
