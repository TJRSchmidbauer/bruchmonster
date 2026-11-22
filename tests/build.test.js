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
