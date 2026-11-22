import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
    // Nur anklickbare Verweise im Fuss der Startseite (Namensnennung); nichts wird automatisch geladen.
    'https://creativecommons.org/licenses/by-nc/4.0/deed.de',
    'https://schmidbauer.io',
  ]);
  const urls = html.match(/https?:\/\/[^\s"'<>)\\]+/g) ?? [];
  const bad = urls.filter((u) => !allowed.has(u));
  assert.deepEqual(bad, []);
});

test('gebaute Datei hat eine strenge Content-Security-Policy mit passenden Hashes', async () => {
  await build();
  const html = readFileSync(new URL('../dist/bruchmonster.html', import.meta.url), 'utf8');
  const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(html);
  assert.ok(meta, 'CSP-Meta vorhanden');
  assert.ok(html.indexOf(meta[0]) < html.indexOf('<style>') && html.indexOf(meta[0]) < html.indexOf('<script>'), 'CSP steht vor Stil und Skript');
  const policy = Object.fromEntries(meta[1].split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v.join(' ')]));
  const hash = (t) => `'sha256-${createHash('sha256').update(t, 'utf8').digest('base64')}'`;
  assert.equal(policy['script-src'], hash(/<script>([\s\S]*?)<\/script>/.exec(html)[1]), 'Skript-Hash stimmt');
  assert.equal(policy['style-src'], hash(/<style>([\s\S]*?)<\/style>/.exec(html)[1]), 'Stil-Hash stimmt');
  assert.equal(policy['default-src'], "'none'");
  for (const k of ['connect-src', 'object-src', 'frame-src', 'worker-src', 'base-uri', 'form-action']) assert.equal(policy[k], "'none'", k);
  assert.equal(policy['require-trusted-types-for'], "'script'");
  assert.ok(!/unsafe-(inline|eval)/.test(`${policy['script-src']} ${policy['style-src']} ${policy['default-src']}`), 'kein unsafe-* bei Skript und Stil');
  assert.equal(policy['img-src'], "'none'");
  assert.equal(policy['trusted-types'], "'none'");
  assert.equal(policy['font-src'], 'data:');
  assert.equal((html.match(/<script/g) ?? []).length, 1, 'genau ein Skript');
});

test('Quelltext benutzt keine gefaehrlichen DOM-Senken', async () => {
  const { readdirSync, statSync } = await import('node:fs');
  const files = [];
  const walk = (dir) => { for (const f of readdirSync(dir)) { const p = `${dir}/${f}`; statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } };
  walk(new URL('../src', import.meta.url).pathname);
  const bad = /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval|new Function|createContextualFragment|srcdoc)\b|setAttribute\(\s*['"]on|\.setAttribute\(\s*['"](href|src)['"]/;
  const hits = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => [f, i + 1, l]).filter(([, , l]) => bad.test(l)));
  assert.deepEqual(hits.map(([f, n, l]) => `${f}:${n}: ${l.trim()}`), []);
});
