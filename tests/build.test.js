import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from '../build.mjs';

test('build erzeugt eine eigenständige Datei', async () => {
  await build();
  const html = readFileSync(new URL('../dist/bruchmonster.html', import.meta.url), 'utf8');
  assert.match(html, /<style>[\s\S]*<\/style>/);
  assert.match(html, /<script>[\s\S]*<\/script>/);
  assert.doesNotMatch(html, /(src|href)=["']https?:\/\//);
  assert.doesNotMatch(html, /@import/);
  assert.doesNotMatch(html, /url\(\s*["']?http/);
  assert.doesNotMatch(html, /<!--(CSS|JS)-->/);
});

test('gebaute Datei fragt nichts im Netz an', async () => {
  await build();
  const html = readFileSync(new URL('../dist/bruchmonster.html', import.meta.url), 'utf8');
  for (const bad of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource']) {
    assert.equal(html.includes(bad), false, `enthält ${bad}`);
  }
  const allowed = new Set([
    'http://www.w3.org/2000/svg',
    'http://www.w3.org/1999/xlink',
    'http://www.w3.org/XML/1998/namespace',
  ]);
  const urls = html.match(/https?:\/\/[^\s"'<>)\\]+/g) ?? [];
  const bad = urls.filter((u) => !allowed.has(u));
  assert.deepEqual(bad, []);
});
