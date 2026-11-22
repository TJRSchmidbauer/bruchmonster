import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let EXPERIMENTS, experimentView, win;
before(async () => {
  const { document, window } = parseHTML('<!doctype html><html><body><div id="app"></div></body></html>');
  win = window;
  globalThis.document = document;
  globalThis.window = window;
  ({ EXPERIMENTS, experimentView } = await import('../src/ui/experiments.js'));
});

const KINDS = ['platzieren', 'vergleichen', 'dazwischen', 'erweitern', 'kuerzen', 'addieren', 'bruchteil-vom-bruchteil'];
const click = (el) => el.dispatchEvent(new win.Event('click', { bubbles: true }));

test('Experimente: alle sieben vorhanden, Frage hat genau eine richtige Option, Regel nicht leer', () => {
  for (const k of KINDS) {
    const e = EXPERIMENTS[k];
    assert.ok(e, k);
    assert.ok(e.title && e.intro, k);
    assert.ok(e.question.options.length >= 2, k);
    assert.ok(Number.isInteger(e.question.correct) && e.question.correct >= 0 && e.question.correct < e.question.options.length, k);
    assert.ok(e.rule.trim().length > 10, k);
    const el = e.build(() => {});
    assert.ok(el.querySelector('svg'), `${k}: Spielwiese ohne Zeichnung`);
  }
});

test('experimentView: Frage erscheint nach Ausprobieren, danach Regel-Karte, dann onDone', () => {
  for (const k of KINDS) {
    let done = null;
    const view = experimentView(k, { onDone: (r) => { done = r; } });
    document.body.append(view);
    assert.equal(view.querySelector('.regel-karte'), null);
    const play = view.querySelector('.experiment__play');
    assert.ok(play, k);
    // Frage ist zunaechst nicht bedienbar; Spielwiese loest onReady aus.
    for (const b of play.querySelectorAll('button')) click(b);
    const opts = [...view.querySelectorAll('.experiment__options .pick')];
    assert.equal(opts.length, EXPERIMENTS[k].question.options.length, k);
    click(opts[EXPERIMENTS[k].question.correct]);
    const card = view.querySelector('.regel-karte');
    assert.ok(card, `${k}: Regel-Karte`);
    assert.ok(card.textContent.length > 10);
    const go = [...view.querySelectorAll('button')].find((b) => /Weiter/.test(b.textContent));
    click(go);
    assert.deepEqual(done, { skipped: false }, k);
    view.remove();
  }
});

test('experimentView: falsche Antwort zeigt trotzdem die Regel; Kenn ich schon ueberspringt', () => {
  let done = null;
  const view = experimentView('vergleichen', { onDone: (r) => { done = r; } });
  for (const b of view.querySelectorAll('.experiment__play button')) click(b);
  const opts = [...view.querySelectorAll('.experiment__options .pick')];
  const wrong = opts.findIndex((_, i) => i !== EXPERIMENTS.vergleichen.question.correct);
  click(opts[wrong]);
  assert.ok(view.querySelector('.regel-karte'));
  const v2 = experimentView('kuerzen', { onDone: (r) => { done = r; } });
  click([...v2.querySelectorAll('button')].find((b) => /Kenn ich schon/.test(b.textContent)));
  assert.deepEqual(done, { skipped: true });
});

test('experimentView: unbekannte Art gibt null', () => {
  assert.equal(experimentView('gibtsnicht', { onDone() {} }), null);
});
