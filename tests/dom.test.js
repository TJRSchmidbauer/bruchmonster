import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let dom;
before(async () => {
  const { document, window } = parseHTML('<!doctype html><html><body><div id="app"></div></body></html>');
  globalThis.document = document;
  globalThis.window = window;
  dom = await import('../src/ui/dom.js');
});

test('h baut Element mit Klasse und Text', () => {
  const el = dom.h('button', { class: 'x' }, 'Hi');
  assert.equal(el.tagName, 'BUTTON');
  assert.equal(el.getAttribute('class'), 'x');
  assert.equal(el.textContent, 'Hi');
});

test('h: Kinder (Arrays, Knoten) und null/false werden behandelt', () => {
  const el = dom.h('p', null, 'a', null, false, ['b', dom.h('i', null, 'c')], 0);
  assert.equal(el.textContent, 'abc0');
  assert.equal(el.children.length, 1);
});

test('h: Attribute, Handler, boolesche Attribute', () => {
  let clicked = 0;
  const el = dom.h('button', { onclick: () => clicked++, 'aria-label': 'L', 'data-x': '1', disabled: true, hidden: false, style: 'color:red' });
  el.click();
  assert.equal(clicked, 1);
  assert.equal(el.getAttribute('aria-label'), 'L');
  assert.equal(el.getAttribute('data-x'), '1');
  assert.ok(el.hasAttribute('disabled'));
  assert.ok(!el.hasAttribute('hidden'));
  assert.equal(el.getAttribute('style'), 'color:red');
});

test('h: SVG-Tags bekommen den SVG-Namespace', () => {
  const s = dom.h('svg', { viewBox: '0 0 10 10' }, dom.h('circle', { cx: 5, cy: 5, r: 4 }));
  assert.equal(s.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(s.firstChild.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(s.firstChild.getAttribute('r'), '4');
});

test('announce schreibt in genau eine aria-live-Region', () => {
  dom.announce('Hallo');
  dom.announce('Zweiter Text');
  const regions = document.querySelectorAll('[aria-live="polite"]');
  assert.equal(regions.length, 1);
  assert.equal(regions[0].textContent, 'Zweiter Text');
});

test('fracView: gestapelter Bruch mit deutschem aria-label', () => {
  const el = dom.fracView({ n: 3, d: 4 });
  assert.equal(el.getAttribute('aria-label'), '3 Viertel');
  assert.match(el.textContent, /3/);
  assert.match(el.textContent, /4/);
  assert.equal(dom.fracView({ n: 1, d: 2 }).getAttribute('aria-label'), '1 Halbe');
  assert.equal(dom.fracView({ n: 5, d: 12 }).getAttribute('aria-label'), '5 Zwölftel');
  assert.equal(dom.fracView({ n: 3, d: 25 }).getAttribute('aria-label'), '3 von 25');
  assert.equal(dom.fracView({ n: 4, d: 1 }).getAttribute('aria-label'), '4 Ganze');
});

test('fracView mixed: gemischte Zahl', () => {
  assert.equal(dom.fracView({ n: 7, d: 4 }, { mixed: true }).getAttribute('aria-label'), '1 Ganzes und 3 Viertel');
  assert.equal(dom.fracView({ n: 11, d: 4 }, { mixed: true }).getAttribute('aria-label'), '2 Ganze und 3 Viertel');
  assert.equal(dom.fracView({ n: 8, d: 4 }, { mixed: true }).getAttribute('aria-label'), '2 Ganze');
});

test('fracView: Größenklasse', () => {
  assert.match(dom.fracView({ n: 1, d: 2 }, { size: 'xl' }).getAttribute('class'), /frac--xl/);
});

test('button: Varianten, Label, Klick', () => {
  let n = 0;
  const b = dom.button('Prüfen', { variant: 'primary', onClick: () => n++ });
  assert.equal(b.tagName, 'BUTTON');
  assert.equal(b.getAttribute('type'), 'button');
  assert.match(b.getAttribute('class'), /btn--primary/);
  assert.match(b.textContent, /Prüfen/);
  b.click();
  assert.equal(n, 1);
  assert.match(dom.button('x').getAttribute('class'), /btn--secondary/);
});
