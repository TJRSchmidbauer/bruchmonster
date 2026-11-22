import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/core/rng.js';
import { KINDS, checkAnswer, pickTask, generate } from '../src/tasks/generators.js';
import { HANDWRITTEN } from '../src/tasks/handwritten.js';
import { answerText } from '../src/ui/runner.js';

function* stringsIn(o) {
  if (typeof o === 'string') yield o;
  else if (o && typeof o === 'object') for (const v of Object.values(o)) yield* stringsIn(v);
}

const of = (world) => HANDWRITTEN.filter((t) => t.world === world);

test('handwritten: Anzahlen je Welt und Stufe', () => {
  assert.ok(of('alltag').length >= 20, `alltag: ${of('alltag').length}`);
  assert.ok(of('detektiv').length >= 15, `detektiv: ${of('detektiv').length}`);
  for (const world of ['alltag', 'detektiv']) {
    for (const level of [1, 2, 3]) {
      assert.ok(of(world).filter((t) => t.level === level).length >= 3, `${world} L${level}`);
    }
  }
  for (const k of KINDS.alltag) assert.ok(HANDWRITTEN.filter((t) => t.kind === k).length >= 5, k);
  for (const k of KINDS.detektiv) assert.ok(HANDWRITTEN.filter((t) => t.kind === k).length >= 6, k);
});

test('handwritten: eindeutige id, Art passt zur Welt, 3 Tipps, Stufe', () => {
  const ids = new Set();
  for (const t of HANDWRITTEN) {
    assert.match(t.id, /^hw-(alltag|detektiv)-[a-z-]+-\d\d$/, t.id);
    assert.ok(!ids.has(t.id), `doppelte id ${t.id}`);
    ids.add(t.id);
    assert.ok(['alltag', 'detektiv'].includes(t.world), t.id);
    assert.ok(KINDS[t.world].includes(t.kind), `${t.id}: Art ${t.kind}`);
    assert.ok([1, 2, 3].includes(t.level), t.id);
    assert.equal(t.hints.length, 3, t.id);
    for (const h of t.hints) assert.ok(typeof h === 'string' && h.trim(), t.id);
    assert.ok(t.explain && ['strips', 'numberline'].includes(t.explain.type), t.id);
    assert.ok(t.meta && typeof t.meta === 'object', t.id);
  }
});

test('handwritten: Eigenprobe, die hinterlegte Antwort ist richtig, Nachbarn sind es nicht', () => {
  for (const t of HANDWRITTEN) {
    const a = t.answer;
    if (a.type === 'frac') {
      assert.equal(checkAnswer(t, a.value).correct, true, t.id);
      assert.equal(checkAnswer(t, { n: a.value.n + 1, d: a.value.d }).correct, false, t.id);
    } else {
      assert.ok(a.type === 'choice' || a.type === 'marks', t.id);
      const count = a.type === 'choice' ? t.widget.data.options.length : t.widget.data.steps.length;
      assert.ok(a.value >= 0 && a.value < count, `${t.id}: Index ausserhalb`);
      assert.equal(checkAnswer(t, a.value).correct, true, t.id);
      for (let i = 0; i < count; i++) assert.equal(checkAnswer(t, i).correct, i === a.value, `${t.id} ${i}`);
    }
    assert.ok(answerText(t).length > 0, t.id);
  }
});

test('handwritten: Widget-Form je Art', () => {
  for (const t of HANDWRITTEN) {
    if (t.kind === 'fehler-finden') {
      assert.equal(t.widget.type, 'mark', t.id);
      assert.ok(t.widget.data.steps.length >= 3 && t.widget.data.steps.length <= 4, t.id);
      assert.equal(t.meta.isReasoning, true, t.id);
    } else if (t.kind === 'regel-entdecken') {
      assert.equal(t.widget.type, 'choice', t.id);
      const o = t.widget.data.options;
      assert.ok(o.length >= 3 && o.length <= 4 && new Set(o).size === o.length, t.id);
      assert.equal(t.meta.isReasoning, true, t.id);
    } else {
      assert.equal(t.widget.type, 'input', t.id);
      assert.equal(t.answer.type, 'frac', t.id);
    }
  }
});

test('handwritten: kein Text ueber 280 Zeichen, Nenner <= 60, keine Dezimalzahlen', () => {
  for (const t of HANDWRITTEN) {
    for (const s of [t.prompt, ...t.hints, ...stringsIn(t.widget.data)]) {
      const ctx = `${t.id}: "${s}"`;
      assert.ok(s.length <= 280, `${ctx}: ${s.length} Zeichen`);
      for (const m of s.matchAll(/(\d+)\s*\/\s*(\d+)/g)) assert.ok(Number(m[2]) <= 60, `${ctx}: Nenner ${m[2]}`);
      assert.ok(!/\d,\d/.test(s) && !/\d\.\d/.test(s), `${ctx}: Dezimalzahl`);
    }
  }
});

test('handwritten: keine doppelten Aufgaben (Prompt plus Rechnung verschieden)', () => {
  const key = (t) => t.prompt + JSON.stringify(t.widget.data);
  assert.equal(new Set(HANDWRITTEN.map(key)).size, HANDWRITTEN.length);
});

test('pickTask: liefert handwritten und generierte Aufgaben, nie dieselbe handwritten-id zweimal hintereinander', () => {
  for (const kind of [...KINDS.alltag, ...KINDS.detektiv]) {
    for (const level of [1, 2, 3]) {
      const rng = makeRng(7 + level);
      let last = null;
      let hw = 0;
      let gen = 0;
      for (let i = 0; i < 200; i++) {
        const t = pickTask(kind, level, rng);
        assert.equal(t.kind, kind);
        assert.equal(t.level, level);
        if (t.id.startsWith('hw-')) {
          hw++;
          assert.notEqual(t.id, last, `${kind} L${level}: ${t.id} zweimal hintereinander`);
        } else gen++;
        last = t.id;
      }
      assert.ok(hw > 20 && gen > 20, `${kind} L${level}: hw ${hw}, gen ${gen}`);
    }
  }
});

test('pickTask: andere Arten wie generate, deterministisch, Kopien statt gemeinsamer Objekte', () => {
  for (const kind of [...KINDS.strahl, ...KINDS.streifen]) {
    assert.deepEqual(pickTask(kind, 2, makeRng(3)), generate(kind, 2, makeRng(3)), kind);
  }
  const a = pickTask('rezept', 1, makeRng(5));
  const b = pickTask('rezept', 1, makeRng(5));
  assert.deepEqual(a.prompt, b.prompt);
  const t = pickTask('fehler-finden', 1, makeRng(1));
  t.hints.length = 0;
  for (const h of HANDWRITTEN) assert.equal(h.hints.length, 3);
});
