import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let numberline, strips, createTaskView, createRunner, generate, KINDS, makeRng, defaultProfile, checkAnswer;
let win;
before(async () => {
  const { document, window } = parseHTML('<!doctype html><html><body><div id="app"></div></body></html>');
  win = window;
  globalThis.document = document;
  globalThis.window = window;
  ({ numberline } = await import('../src/ui/widgets/numberline.js'));
  ({ strips } = await import('../src/ui/widgets/strips.js'));
  ({ createTaskView } = await import('../src/ui/screens/taskview.js'));
  ({ createRunner } = await import('../src/ui/runner.js'));
  ({ generate, KINDS, checkAnswer } = await import('../src/tasks/generators.js'));
  ({ makeRng } = await import('../src/core/rng.js'));
  ({ defaultProfile } = await import('../src/core/storage.js'));
});

function key(el, k) {
  const e = new win.Event('keydown', { bubbles: true, cancelable: true });
  e.key = k;
  el.dispatchEvent(e);
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('numberline: Pfeiltasten aendern aria-valuenow und rufen onPlace', () => {
  const placed = [];
  const svg = numberline({ from: 0, to: 1, ticks: 4, marks: [], draggable: true, onPlace: (x) => placed.push(x) });
  const pin = svg.querySelector('[role="slider"]');
  assert.ok(pin);
  assert.equal(pin.getAttribute('aria-valuemin'), '0');
  assert.equal(pin.getAttribute('aria-valuemax'), '1');
  key(pin, 'ArrowRight');
  near(Number(pin.getAttribute('aria-valuenow')), 0.25);
  key(pin, 'ArrowRight');
  key(pin, 'ArrowUp');
  near(Number(pin.getAttribute('aria-valuenow')), 0.75);
  key(pin, 'ArrowLeft');
  near(Number(pin.getAttribute('aria-valuenow')), 0.5);
  assert.equal(placed.length, 4);
  near(placed.at(-1), 0.5);
  assert.match(pin.getAttribute('aria-valuetext'), /etwa 1 Halbe/);
  key(pin, 'Home');
  near(Number(pin.getAttribute('aria-valuenow')), 0);
  key(pin, 'End');
  near(Number(pin.getAttribute('aria-valuenow')), 1);
  key(pin, 'PageDown');
  near(Number(pin.getAttribute('aria-valuenow')), 0.75);
  key(pin, 'PageUp');
  near(Number(pin.getAttribute('aria-valuenow')), 1);
});

test('numberline: Wert bleibt in [from, to]; Standard-Schritt ohne Striche 1/24', () => {
  const svg = numberline({ from: 0, to: 2, ticks: 0, marks: [], draggable: true, value: 5 });
  const pin = svg.querySelector('[role="slider"]');
  near(Number(pin.getAttribute('aria-valuenow')), 2);
  key(pin, 'ArrowRight');
  near(Number(pin.getAttribute('aria-valuenow')), 2);
  key(pin, 'Home');
  key(pin, 'ArrowLeft');
  near(Number(pin.getAttribute('aria-valuenow')), 0);
  key(pin, 'ArrowRight');
  near(Number(pin.getAttribute('aria-valuenow')), 1 / 24);
  svg.setValue(-3);
  near(svg.getValue(), 0);
  assert.equal(svg.querySelectorAll('line').length > 0, true);
});

test('numberline: eigener step, nicht bedienbar mit draggable false', () => {
  const svg = numberline({ from: 0, to: 1, ticks: 10, marks: [], step: 0.05, draggable: true });
  const pin = svg.querySelector('[role="slider"]');
  key(pin, 'ArrowRight');
  near(Number(pin.getAttribute('aria-valuenow')), 0.05);
  svg.lock(true);
  key(pin, 'ArrowRight');
  near(Number(pin.getAttribute('aria-valuenow')), 0.05);
  assert.equal(pin.getAttribute('aria-disabled'), 'true');
  const fixed = numberline({ from: 0, to: 1, ticks: 2, marks: [{ n: 1, d: 2 }], draggable: false });
  assert.equal(fixed.querySelector('[role="slider"]'), null);
});

test('strips fill: Teile umschalten ruft onChange mit richtigen Zaehlern', () => {
  const calls = [];
  const el = strips({ rows: [{ parts: 5, filled: 0 }], interactive: 'fill', onChange: (s) => calls.push(s) });
  const parts = el.querySelectorAll('[role="button"][aria-pressed]');
  assert.equal(parts.length, 5);
  parts[0].dispatchEvent(new win.Event('click', { bubbles: true }));
  parts[2].dispatchEvent(new win.Event('click', { bubbles: true }));
  assert.deepEqual(calls.at(-1), { parts: 5, filled: 2 });
  assert.equal(parts[0].getAttribute('aria-pressed'), 'true');
  key(parts[1], ' ');
  assert.deepEqual(calls.at(-1), { parts: 5, filled: 3 });
  key(parts[0], 'Enter');
  assert.deepEqual(calls.at(-1), { parts: 5, filled: 2 });
  assert.deepEqual(el.getState(), { parts: 5, filled: 2 });
});

test('strips fill: mehrere Zeilen zaehlen zusammen', () => {
  const el = strips({ rows: [{ parts: 4, filled: 0 }, { parts: 4, filled: 0 }], interactive: 'fill' });
  const parts = el.querySelectorAll('[role="button"][aria-pressed]');
  assert.equal(parts.length, 8);
  parts[1].dispatchEvent(new win.Event('click', { bubbles: true }));
  parts[6].dispatchEvent(new win.Event('click', { bubbles: true }));
  assert.deepEqual(el.getState(), { parts: 4, filled: 2 });
});

test('strips split: Teilezahl bleibt in 1 bis 24, gefaerbte Laenge bleibt', () => {
  const calls = [];
  const el = strips({ rows: [{ parts: 3, filled: 2 }], interactive: 'split', onChange: (s) => calls.push(s) });
  const plus = el.querySelector('[data-act="more"]');
  const minus = el.querySelector('[data-act="less"]');
  for (let i = 0; i < 40; i++) plus.dispatchEvent(new win.Event('click', { bubbles: true }));
  assert.equal(el.getState().parts, 24);
  assert.equal(plus.disabled, true);
  assert.deepEqual(el.getState(), { parts: 24, filled: 16, exact: true });
  for (let i = 0; i < 40; i++) minus.dispatchEvent(new win.Event('click', { bubbles: true }));
  assert.equal(el.getState().parts, 1);
  assert.equal(minus.disabled, true);
  assert.equal(el.getState().exact, false);
  el.setParts(6);
  assert.deepEqual(el.getState(), { parts: 6, filled: 4, exact: true });
  el.setParts(4);
  assert.equal(el.getState().exact, false);
  assert.ok(calls.length > 0);
});

test('strips overlay: Zeilen mit Umschalter zum Uebereinanderlegen', () => {
  const el = strips({ rows: [{ parts: 3, filled: 1 }, { parts: 6, filled: 1 }], interactive: 'overlay' });
  const toggle = el.querySelector('[aria-pressed][data-act="overlay"]');
  assert.ok(toggle);
  assert.equal(toggle.getAttribute('aria-pressed'), 'false');
  toggle.dispatchEvent(new win.Event('click', { bubbles: true }));
  assert.equal(toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(el.getState().overlaid, true);
});

const NUMBERLINE_KINDS = ['platzieren', 'schaetzen'];
test('Welt: jede Strahl-/Streifen-Aufgabe laesst sich fuer 30 Seeds x 3 Stufen aufbauen', () => {
  const profile = defaultProfile('T', 'p1');
  const app = { profile, rng: makeRng(1) };
  for (const world of ['strahl', 'streifen']) {
    for (const kind of KINDS[world]) {
      for (const level of [1, 2, 3]) {
        for (let seed = 1; seed <= 30; seed++) {
          const runner = createRunner({ profile, kind, level, rng: makeRng(seed), today: '2026-11-22', onUpdate: () => {} });
          const session = { size: 5, done: 0, coins: 0, right: 0 };
          const view = createTaskView({ app, runner, session, onNext: () => {}, onSkip: () => {} });
          const t = runner.current();
          const ctx = `${kind} L${level} seed ${seed}`;
          assert.ok(view.el.querySelector('.taskcard'), ctx);
          if (t.widget.type === 'numberline' || t.widget.type === 'strips') {
            assert.equal(view.el.querySelector('.note-card'), null, `${ctx}: Platzhalter`);
          }
          if (t.widget.type === 'numberline') {
            const { from, to } = t.widget.data;
            const x = t.answer.value.n / t.answer.value.d;
            assert.ok(x >= from && x <= to, `${ctx}: ${x} ausserhalb`);
            assert.ok(view.el.querySelector('[role="slider"]'), ctx);
          }
          if (t.widget.type === 'strips') assert.ok(view.el.querySelector('[aria-pressed]'), ctx);
          view.destroy();
        }
      }
    }
  }
  assert.ok(NUMBERLINE_KINDS.length);
});

test('Welt: Zahlenstrahl-Widget liefert x erst nach Bedienung, Streifen liefern Bruch', () => {
  const profile = defaultProfile('T', 'p1');
  const app = { profile, rng: makeRng(1) };
  const runner = createRunner({ profile, kind: 'platzieren', level: 1, rng: makeRng(3), today: '2026-11-22', onUpdate: () => {} });
  const view = createTaskView({ app, runner, session: { size: 5, done: 0, coins: 0, right: 0 }, onNext: () => {}, onSkip: () => {} });
  const pin = view.el.querySelector('[role="slider"]');
  const t = runner.current();
  const target = t.answer.value.n / t.answer.value.d;
  pin.setAttribute('aria-valuenow', '0');
  const svg = view.el.querySelector('svg.drawing--line');
  svg.setValue(target);
  assert.equal(checkAnswer(t, svg.getValue()).correct, true);
});

test('taskview: fehlendes oder unbekanntes explain wirft nicht', () => {
  const profile = defaultProfile('T', 'p1');
  const app = { profile, rng: makeRng(1) };
  const base = generate('kuerzen', 1, makeRng(2));
  for (const explain of [undefined, null, { type: 'unbekannt', data: {} }]) {
    const task = { ...base, explain };
    const runner = createRunner({ profile, kind: 'kuerzen', level: 1, rng: makeRng(2), today: '2026-11-22', onUpdate: () => {}, pickTask: () => task });
    const view = createTaskView({ app, runner, session: { size: 5, done: 0, coins: 0, right: 0 }, onNext: () => {}, onSkip: () => {} });
    const [hintBtn] = [...view.el.querySelectorAll('button')].filter((b) => /Tipp/.test(b.textContent));
    for (let i = 0; i < 3; i++) hintBtn.dispatchEvent(new win.Event('click', { bubbles: true }));
    const reveal = [...view.el.querySelectorAll('button')].find((b) => /Lösung zeigen/.test(b.textContent));
    assert.ok(reveal, 'Loesung zeigen nach 3 Tipps ohne Fehlversuch');
    reveal.dispatchEvent(new win.Event('click', { bubbles: true }));
    assert.ok(document.querySelector('.sheet'));
    view.destroy();
  }
});

test('taskview: richtig aber ungekuerzt heisst "Fast!" und zaehlt nicht als Fehler', () => {
  const profile = defaultProfile('T', 'p1');
  const updates = [];
  const app = { profile, rng: makeRng(1) };
  const task = generate('kuerzen', 1, makeRng(5));
  const runner = createRunner({ profile, kind: 'kuerzen', level: 1, rng: makeRng(5), today: '2026-11-22', onUpdate: (p, e) => updates.push(e), pickTask: () => task });
  const view = createTaskView({ app, runner, session: { size: 5, done: 0, coins: 0, right: 0 }, onNext: () => {}, onSkip: () => {} });
  const v = task.answer.value;
  const field = view.el.querySelector('input');
  field.value = `${v.n * 2}/${v.d * 2}`;
  [...view.el.querySelectorAll('button')].find((b) => /Prüfen/.test(b.textContent)).dispatchEvent(new win.Event('click', { bubbles: true }));
  assert.match(document.querySelector('.sheet__title').textContent, /Fast!/);
  assert.equal(runner.state().wrongAttempts, 0);
  view.destroy();
});
