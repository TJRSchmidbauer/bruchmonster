import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let router;
before(async () => {
  const { document, window } = parseHTML('<!doctype html><html><body><main id="root"></main></body></html>');
  globalThis.document = document;
  globalThis.window = window;
  router = await import('../src/ui/router.js');
});

test('go rendert Bildschirm, ruft Cleanup und fokussiert h1', () => {
  const root = document.getElementById('root');
  const log = [];
  router.startRouter(root, { id: 'app' });
  router.registerScreen('a', (r, params, app) => {
    log.push(['a', params, app.id]);
    r.append(Object.assign(document.createElement('h1'), { textContent: 'A' }));
    return () => log.push('cleanup-a');
  });
  router.registerScreen('b', (r) => {
    r.append(Object.assign(document.createElement('h1'), { textContent: 'B' }));
  });
  router.go('a', { x: 1 });
  assert.deepEqual(log[0], ['a', { x: 1 }, 'app']);
  assert.equal(root.querySelector('h1').getAttribute('tabindex'), '-1');
  router.go('b');
  assert.equal(log[1], 'cleanup-a');
  assert.equal(root.querySelector('h1').textContent, 'B');
  assert.equal(root.children.length, 1);
});

test('go auf unbekannten Bildschirm wirft', () => {
  assert.throws(() => router.go('nix'), /nix/);
});
