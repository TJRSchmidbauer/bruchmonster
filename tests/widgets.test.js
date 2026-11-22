import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let richText, stripsStatic, numberlineStatic, explainView, generate, KINDS, makeRng, describe, MISTAKES;
before(async () => {
  const { document, window } = parseHTML('<!doctype html><html><body><div id="app"></div></body></html>');
  globalThis.document = document;
  globalThis.window = window;
  ({ richText } = await import('../src/ui/richtext.js'));
  ({ stripsStatic } = await import('../src/ui/widgets/strips.js'));
  ({ numberlineStatic } = await import('../src/ui/widgets/numberline.js'));
  ({ explainView } = await import('../src/ui/widgets/explain.js'));
  ({ generate, KINDS } = await import('../src/tasks/generators.js'));
  ({ makeRng } = await import('../src/core/rng.js'));
  ({ describe, MISTAKES } = await import('../src/tasks/errors.js'));
});

test('richText: a/b wird zu Bruchbauteil, Rest bleibt Text', () => {
  const el = richText('Wer ist größer? 1/2 ? 6/7. Los!');
  const fr = el.querySelectorAll('.frac');
  assert.equal(fr.length, 2);
  assert.equal(fr[0].getAttribute('role'), 'img');
  assert.equal(fr[0].getAttribute('aria-label'), '1 Halbe');
  assert.equal(fr[1].getAttribute('aria-label'), '6 Siebtel');
  assert.match(el.textContent, /Wer ist größer\?/);
  assert.match(el.textContent, /Los!$/);
});

test('richText: Text ohne Bruch, Nenner 0, leere Eingabe', () => {
  assert.equal(richText('Nur Text').querySelectorAll('.frac').length, 0);
  assert.equal(richText('3/0 geht nicht').querySelectorAll('.frac').length, 0);
  assert.equal(richText('3/0 geht nicht').textContent, '3/0 geht nicht');
  assert.equal(richText('').textContent, '');
  assert.equal(richText(undefined).textContent, '');
});

test('richText: Bruch am Anfang und Ende, Ganze', () => {
  const el = richText('3/4 und 6/2');
  assert.equal(el.querySelectorAll('.frac').length, 2);
  assert.equal(el.childNodes[0].getAttribute('aria-label'), '3 Viertel');
});

test('stripsStatic: img mit aria-label, passende Teilezahl', () => {
  const svg = stripsStatic({ rows: [{ parts: 4, filled: 1 }, { parts: 8, filled: 2 }] });
  assert.equal(svg.getAttribute('role'), 'img');
  assert.match(svg.getAttribute('aria-label'), /1 von 4/);
  assert.match(svg.getAttribute('aria-label'), /2 von 8/);
  assert.equal(svg.querySelectorAll('.strip-part').length, 3);
  assert.equal(svg.querySelectorAll('line').length, 3 + 7);
});

test('stripsStatic: animate setzt Verzoegerungen, gesamt unter 1,2 s', () => {
  const svg = stripsStatic({ rows: [{ parts: 40, filled: 30 }] }, { animate: true });
  const parts = [...svg.querySelectorAll('.strip-part--anim')];
  assert.equal(parts.length, 30);
  const delays = parts.map((p) => Number(/animation-delay:(\d+)ms/.exec(p.getAttribute('style'))[1]));
  assert.ok(Math.max(...delays) <= 1000);
  const plain = stripsStatic({ rows: [{ parts: 4, filled: 1 }] });
  assert.equal(plain.querySelectorAll('.strip-part--anim').length, 0);
});

test('numberlineStatic: img, Beschriftung, Marken, Ticks', () => {
  const svg = numberlineStatic({ from: 0, to: 2, ticks: 4, marks: [{ n: 3, d: 4 }, { n: 7, d: 4 }] });
  assert.equal(svg.getAttribute('role'), 'img');
  assert.match(svg.getAttribute('aria-label'), /von 0 bis 2/);
  assert.match(svg.getAttribute('aria-label'), /3\/4/);
  assert.equal(svg.querySelectorAll('circle').length, 2);
  const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent);
  for (const l of ['0', '1', '2', '3', '4', '7']) assert.ok(texts.includes(l), l);
});

test('numberlineStatic: ohne Striche und ohne Marken', () => {
  const svg = numberlineStatic({ from: 0, to: 1, ticks: 0, marks: [] });
  assert.equal(svg.querySelectorAll('circle').length, 0);
  assert.equal(svg.getAttribute('aria-label'), 'Zahlenstrahl von 0 bis 1');
});

test('numberlineStatic: dicht liegende Marken werfen nicht', () => {
  const svg = numberlineStatic({ from: 0, to: 1, ticks: 30, marks: [{ n: 1, d: 6 }, { n: 8, d: 15 }, { n: 9, d: 10 }, { n: 1, d: 2 }, { n: 1, d: 2 }] });
  assert.equal(svg.querySelectorAll('circle').length, 5);
});

test('explainView verteilt auf beide Zeichnungen und wirft bei Unbekanntem', () => {
  assert.ok(explainView({ type: 'strips', data: { rows: [{ parts: 3, filled: 1 }] } }).classList.contains('drawing--strips'));
  assert.ok(explainView({ type: 'numberline', data: { from: 0, to: 1, ticks: 3, marks: [] } }).classList.contains('drawing--line'));
  assert.throws(() => explainView({ type: 'x' }));
});

test('alle task.explain aller Arten und Stufen lassen sich zeichnen', () => {
  const rng = makeRng(11);
  for (const kinds of Object.values(KINDS)) {
    for (const kind of kinds) {
      for (const level of [1, 2, 3]) {
        for (let i = 0; i < 5; i++) {
          const svg = explainView(generate(kind, level, rng).explain);
          assert.ok(svg.getAttribute('aria-label').length > 10, `${kind} ${level}`);
        }
      }
    }
  }
});

test('alle Gegenbeispiele der Fehlertypen lassen sich zeichnen', () => {
  for (const id of MISTAKES) {
    const svg = explainView(describe(id).counter);
    assert.equal(svg.getAttribute('role'), 'img', id);
  }
});

test('kindStars: Schwellen 3 / 10 / 25 mit 80 %', async () => {
  const { kindStars } = await import('../src/ui/worlds.js');
  assert.equal(kindStars(undefined), 0);
  assert.equal(kindStars({ right: 2, wrong: 0 }), 0);
  assert.equal(kindStars({ right: 3, wrong: 5 }), 1);
  assert.equal(kindStars({ right: 10, wrong: 30 }), 2);
  assert.equal(kindStars({ right: 25, wrong: 10 }), 2);
  assert.equal(kindStars({ right: 25, wrong: 6 }), 3);
});
