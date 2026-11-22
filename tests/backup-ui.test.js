import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { defaultProfile } from '../src/core/storage.js';

let ui;
before(async () => {
  const { document, window } = parseHTML('<!doctype html><html><body></body></html>');
  globalThis.document = document;
  globalThis.window = window;
  // linkedom kennt select() nicht, ein echter Browser schon.
  window.HTMLTextAreaElement.prototype.select ??= function select() {};
  ui = await import('../src/ui/backup.js');
});

const setClipboard = (value) => Object.defineProperty(globalThis, 'navigator', { value: { clipboard: value }, configurable: true });
const profile = (right) => ({ ...defaultProfile('Mia', 'p1'), mastery: { kuerzen: { right, wrong: 0, last: 1 } } });
const fakeApp = () => {
  const calls = { file: 0, code: 0, toast: [] };
  return { calls, today: () => '2026-11-22', toast: (t) => calls.toast.push(t), exportProfile: () => { calls.file += 1; }, copyCode: async () => { calls.code += 1; return true; } };
};

test('copyToClipboard: true bei Erfolg, false ohne Zwischenablage oder bei Ablehnung, wirft nie', async () => {
  let written = null;
  setClipboard({ writeText: async (t) => { written = t; } });
  assert.equal(await ui.copyToClipboard('BM2-abc'), true);
  assert.equal(written, 'BM2-abc');
  setClipboard(undefined);
  assert.equal(await ui.copyToClipboard('x'), false);
  setClipboard({ writeText: async () => { throw new Error('NotAllowedError'); } });
  assert.equal(await ui.copyToClipboard('x'), false);
  setClipboard({});
  assert.equal(await ui.copyToClipboard('x'), false);
});

test('copyCode: bei gesperrter Zwischenablage erscheint das Codefeld, bei Erfolg wird es geleert', async () => {
  const app = fakeApp();
  app.recordBackup = (p) => p;
  const mount = document.createElement('div');
  setClipboard(undefined);
  assert.equal(await ui.copyCode(app, profile(3), mount), false);
  const area = mount.querySelector('textarea');
  assert.ok(area, 'Codefeld da');
  assert.match(area.textContent, /^BM2-/);
  assert.ok(area.hasAttribute('readonly'));
  setClipboard({ writeText: async () => {} });
  assert.equal(await ui.copyCode(app, profile(3), mount), true);
  assert.equal(mount.children.length, 0, 'Codefeld weg');
  assert.match(app.calls.toast.at(-1), /Code kopiert/);
});

test('copyCode merkt den Sicherungsstand (recordBackup) vor dem Kopieren', async () => {
  const app = fakeApp();
  const seen = [];
  app.recordBackup = (p) => { seen.push(p.id); return p; };
  setClipboard({ writeText: async () => {} });
  await ui.copyCode(app, profile(3), document.createElement('div'));
  assert.deepEqual(seen, ['p1']);
});

test('backupHint: nur nach genug neuen richtigen Antworten, Knoepfe rufen die App auf und raeumen die Erinnerung weg', async () => {
  const app = fakeApp();
  assert.equal(ui.backupHint(app, profile(19)), null);
  const hint = ui.backupHint(app, profile(20));
  assert.ok(hint);
  const host = document.createElement('div');
  host.append(hint);
  hint.querySelector('[data-act="hint-file"]').dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.equal(app.calls.file, 1);
  assert.equal(host.children.length, 0, 'Erinnerung entfernt');
  const hint2 = ui.backupHint(app, profile(20));
  host.append(hint2);
  hint2.querySelector('[data-act="hint-code"]').dispatchEvent(new window.Event('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(app.calls.code, 1);
  assert.equal(host.children.length, 0);
});
