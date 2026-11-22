import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let renderProfile;
before(async () => {
  const { document, window } = parseHTML('<!doctype html><html><body><main id="root"></main></body></html>');
  globalThis.document = document;
  globalThis.window = window;
  globalThis.Event = window.Event;
  globalThis.KeyboardEvent = window.KeyboardEvent ?? window.Event;
  ({ renderProfile } = await import('../src/ui/screens/profile.js'));
});

function setup() {
  const root = document.getElementById('root');
  root.replaceChildren();
  const opened = [];
  const app = {
    store: {
      persistent: true,
      listProfiles: () => [],
      load: () => null,
      createProfile: (name) => ({ profile: { id: 'p1', name: name || 'Monsterfreund' }, saved: { ok: true } }),
    },
    noteSave() {},
    openProfile: (p) => opened.push(p.name),
  };
  renderProfile(root, {}, app);
  return { root, opened };
}

// Im abgeschotteten Vorschau-Rahmen (sandbox ohne allow-forms) blockiert der Browser jedes
// Formular-Absenden. "Los geht's" darf deshalb nicht von submit abhaengen.
test('"Los geht\'s" legt das Profil per Klick an, ganz ohne Formular-Absenden', () => {
  const { root, opened } = setup();
  assert.ok(!root.querySelector('form'), 'kein <form> auf dem Profil-Bildschirm');
  root.querySelector('#neuer-name').value = 'Mia';
  const btn = root.querySelector('[data-act="create"]');
  assert.ok(btn, 'Knopf data-act="create" vorhanden');
  btn.dispatchEvent(new window.Event('click', { bubbles: true }));
  assert.deepEqual(opened, ['Mia']);
});

test('Enter im Namensfeld legt genau ein Profil an', () => {
  const { root, opened } = setup();
  const input = root.querySelector('#neuer-name');
  input.value = 'Ben';
  const ev = new window.Event('keydown', { bubbles: true });
  ev.key = 'Enter';
  input.dispatchEvent(ev);
  assert.deepEqual(opened, ['Ben']);
});
