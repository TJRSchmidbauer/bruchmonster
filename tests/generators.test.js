import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, randInt, pick } from '../src/core/rng.js';
import { frac, compare, format, parseAnswer, isSimplified } from '../src/core/fractions.js';
import { KINDS, generate, checkAnswer } from '../src/tasks/generators.js';

const SEEDS = 200;
const LEVELS = [1, 2, 3];
const ALL = Object.entries(KINDS).flatMap(([world, kinds]) => kinds.map((kind) => [world, kind]));

const WIDGET = {
  platzieren: 'numberline', schaetzen: 'numberline', vergleichen: 'choice', dazwischen: 'input',
  darstellen: 'strips', erweitern: 'input', kuerzen: 'input', addieren: 'input', subtrahieren: 'input',
  'bruchteil-vom-bruchteil': 'input', 'anteil-von-groesse': 'input', rezept: 'input',
  'teilen-durch-nat': 'input', 'fehler-finden': 'mark', 'regel-entdecken': 'choice',
};
const ANSWER = {
  platzieren: 'position', schaetzen: 'position', vergleichen: 'choice', 'fehler-finden': 'marks',
  'regel-entdecken': 'choice',
};

function* fracsIn(o) {
  if (o && typeof o === 'object') {
    const keys = Object.keys(o);
    if (keys.length === 2 && keys.includes('n') && keys.includes('d') && Number.isInteger(o.n)) yield o;
    else for (const v of Object.values(o)) yield* fracsIn(v);
  }
}

test('rng: deterministisch, in [0,1), randInt/pick im Bereich', () => {
  const a = makeRng(42), b = makeRng(42), c = makeRng(43);
  const sa = [a(), a(), a()], sb = [b(), b(), b()];
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, [c(), c(), c()]);
  const r = makeRng(1);
  for (let i = 0; i < 1000; i++) {
    const x = r();
    assert.ok(x >= 0 && x < 1);
    const k = randInt(r, 3, 5);
    assert.ok(Number.isInteger(k) && k >= 3 && k <= 5);
    assert.ok(['a', 'b'].includes(pick(r, ['a', 'b'])));
  }
});

test('KINDS entspricht der Spezifikation', () => {
  assert.deepEqual(KINDS.strahl, ['platzieren', 'schaetzen', 'vergleichen', 'dazwischen']);
  assert.deepEqual(KINDS.streifen, ['darstellen', 'erweitern', 'kuerzen', 'addieren', 'subtrahieren', 'bruchteil-vom-bruchteil']);
  assert.deepEqual(KINDS.alltag, ['anteil-von-groesse', 'rezept', 'teilen-durch-nat']);
  assert.deepEqual(KINDS.detektiv, ['fehler-finden', 'regel-entdecken']);
});

for (const [world, kind] of ALL) {
  for (const level of LEVELS) {
    test(`${world}/${kind} L${level}: ${SEEDS} Seeds gueltig und loesbar`, () => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const t = generate(kind, level, makeRng(seed));
        const ctx = `${kind} L${level} seed ${seed}`;
        assert.equal(t.world, world, ctx);
        assert.equal(t.kind, kind, ctx);
        assert.equal(t.level, level, ctx);
        assert.equal(typeof t.id, 'string', ctx);
        assert.ok(t.prompt.length > 0 && t.prompt.length <= 200, `${ctx}: Prompt-Laenge ${t.prompt.length}`);
        assert.equal(t.widget.type, WIDGET[kind], ctx);
        assert.equal(t.answer.type, ANSWER[kind] ?? 'frac', ctx);
        assert.equal(t.hints.length, 3, ctx);
        for (const h of t.hints) assert.ok(typeof h === 'string' && h.trim().length > 0, ctx);
        assert.ok(['strips', 'numberline'].includes(t.explain.type), ctx);
        for (const f of fracsIn(t)) {
          assert.ok(f.d >= 1 && f.d <= 60, `${ctx}: Nenner ${f.d}`);
          assert.ok(f.n >= 0 && f.n / f.d <= 12, `${ctx}: Ergebnis ${f.n}/${f.d} > 12`);
        }
        const res = checkAnswer(t, t.answer.value);
        assert.equal(res.correct, true, `${ctx}: Eigenprobe fehlgeschlagen ${JSON.stringify(t.answer)}`);
        if (t.answer.type === 'frac' && t.answer.accept !== 'between' && t.answer.accept !== 'exact') {
          const text = format(t.answer.value);
          assert.equal(checkAnswer(t, text).correct, true, `${ctx}: String-Eigenprobe ${text}`);
        }
      }
    });
  }
}

test('gleicher Seed erzeugt gleiche Aufgabe', () => {
  for (const [, kind] of ALL) {
    for (const level of LEVELS) {
      assert.deepEqual(generate(kind, level, makeRng(7)), generate(kind, level, makeRng(7)));
    }
  }
});

test('verschiedene Seeds erzeugen Abwechslung', () => {
  for (const [, kind] of ALL) {
    const prompts = new Set();
    for (let s = 1; s <= 50; s++) { const t = generate(kind, 2, makeRng(s)); prompts.add(t.prompt + JSON.stringify(t.widget.data)); };
    assert.ok(prompts.size >= 10, `${kind}: nur ${prompts.size} verschiedene Aufgaben`);
  }
});

test('unbekannte Art wirft', () => {
  assert.throws(() => generate('quatsch', 1, makeRng(1)));
});

test('kuerzen L2: 2/4 bei Loesung 1/2 ist nicht-gekuerzt', () => {
  const t = generate('kuerzen', 2, makeRng(3));
  const task = { ...t, answer: { ...t.answer, value: frac(1, 2) } };
  assert.deepEqual(checkAnswer(task, '2/4'), { correct: false, note: 'nicht-gekuerzt' });
  assert.deepEqual(checkAnswer(task, '1/2'), { correct: true });
  assert.equal(checkAnswer(task, '1/3').correct, false);
  assert.equal(checkAnswer(task, '1/3').note, undefined);
});

test('erweitern: exakter Nenner verlangt', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const t = generate('erweitern', 2, makeRng(seed));
    assert.equal(t.answer.accept, 'exact');
    const v = t.answer.value;
    assert.equal(checkAnswer(t, `${v.n}/${v.d}`).correct, true);
    assert.equal(checkAnswer(t, `${v.n * 2}/${v.d * 2}`).correct, false);
    assert.equal(checkAnswer(t, `${v.n + 1}/${v.d}`).correct, false);
  }
});

test('kuerzen: mustBeSimplified und Aufgabe ist wirklich kuerzbar', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 100; seed++) {
      const t = generate('kuerzen', level, makeRng(seed));
      assert.equal(t.answer.mustBeSimplified, true);
      assert.ok(t.meta.a.n > t.answer.value.n || t.meta.a.d > t.answer.value.d);
      const v = t.answer.value;
      assert.deepEqual(checkAnswer(t, `${v.n * 2}/${v.d * 2}`), { correct: false, note: 'nicht-gekuerzt' });
    }
  }
});

test('subtrahieren: nie negativ, nie null', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const t = generate('subtrahieren', level, makeRng(seed));
      assert.ok(t.answer.value.n > 0, `L${level} seed ${seed}`);
      assert.equal(compare(t.meta.a, t.meta.b), 1);
      assert.equal(t.meta.op, 'sub');
    }
  }
});

test('Stufen: L1 gleichnamig <= 12, L2 ungleichnamig <= 20', () => {
  for (const kind of ['addieren', 'subtrahieren']) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const t1 = generate(kind, 1, makeRng(seed));
      assert.equal(t1.meta.a.d, t1.meta.b.d);
      assert.ok(t1.meta.a.d <= 12);
      const t2 = generate(kind, 2, makeRng(seed));
      assert.notEqual(t2.meta.a.d, t2.meta.b.d);
      assert.ok(t2.meta.a.d <= 20 && t2.meta.b.d <= 20);
    }
  }
});

test('dazwischen: Bereich offen, Randwerte falsch', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 100; seed++) {
      const t = generate('dazwischen', level, makeRng(seed));
      const [lo, hi] = t.answer.range;
      assert.equal(t.answer.accept, 'between');
      assert.equal(compare(lo, hi), -1);
      assert.equal(checkAnswer(t, format(lo)).correct, false);
      assert.equal(checkAnswer(t, format(hi)).correct, false);
    }
  }
});

test('Positionsaufgaben: Toleranz', () => {
  const t = generate('platzieren', 1, makeRng(5));
  const x = t.answer.value.n / t.answer.value.d;
  assert.equal(checkAnswer(t, x + t.answer.tolerance * 0.9).correct, true);
  assert.equal(checkAnswer(t, x + t.answer.tolerance * 1.5).correct, false);
  assert.equal(t.answer.tolerance, 1 / (2 * t.widget.data.ticks));
  const s = generate('schaetzen', 3, makeRng(5));
  assert.equal(s.answer.tolerance, 0.05);
  assert.equal(s.widget.data.ticks, 0);
});

test('checkAnswer: ungueltige Eingaben werfen nie', () => {
  const t = generate('addieren', 1, makeRng(1));
  assert.deepEqual(checkAnswer(t, ''), { correct: false, invalid: 'leer' });
  assert.deepEqual(checkAnswer(t, '1/0'), { correct: false, invalid: 'nenner-null' });
  assert.deepEqual(checkAnswer(t, '-1/2'), { correct: false, invalid: 'negativ' });
  assert.deepEqual(checkAnswer(t, 'abc'), { correct: false, invalid: 'format' });
  assert.deepEqual(checkAnswer(t, 5), { correct: false, invalid: 'format' });
  assert.deepEqual(checkAnswer(t, null), { correct: false, invalid: 'format' });
  assert.deepEqual(checkAnswer(t, undefined), { correct: false, invalid: 'format' });
  const c = generate('vergleichen', 1, makeRng(1));
  assert.equal(checkAnswer(c, 'x').invalid, 'format');
  assert.equal(checkAnswer(c, (c.answer.value + 1) % 3).correct, false);
});

test('vergleichen: Index passt zu <, =, >', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 100; seed++) {
      const t = generate('vergleichen', level, makeRng(seed));
      assert.deepEqual(t.widget.data.options, ['<', '=', '>']);
      assert.equal(t.answer.value, compare(t.meta.a, t.meta.b) + 1);
    }
  }
});

test('Detektiv: Zeilen 3-4, Index im Bereich, Optionen 3-4', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const f = generate('fehler-finden', level, makeRng(seed));
      const n = f.widget.data.steps.length;
      assert.ok(n >= 3 && n <= 4, `${n} Zeilen`);
      assert.ok(f.answer.value >= 1 && f.answer.value < n);
      const r = generate('regel-entdecken', level, makeRng(seed));
      const o = r.widget.data.options;
      assert.ok(o.length >= 3 && o.length <= 4);
      assert.equal(new Set(o).size, o.length);
      assert.ok(r.answer.value >= 0 && r.answer.value < o.length);
    }
  }
});

function* stringsIn(o) {
  if (typeof o === 'string') yield o;
  else if (o && typeof o === 'object') for (const v of Object.values(o)) yield* stringsIn(v);
}

test('Texte: alle Nenner <= 60, keine Dezimalzahlen', () => {
  for (const [, kind] of ALL) {
    for (const level of LEVELS) {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const t = generate(kind, level, makeRng(seed));
        const texts = [t.prompt, ...t.hints, ...stringsIn(t.widget.data)];
        for (const s of texts) {
          const ctx = `${kind} L${level} seed ${seed}: "${s}"`;
          for (const m of s.matchAll(/(\d+)\s*\/\s*(\d+)/g)) {
            assert.ok(Number(m[2]) <= 60, `${ctx}: Nenner ${m[2]}`);
          }
          assert.ok(!/\d,\d/.test(s) && !/\d\.\d/.test(s), `${ctx}: Dezimalzahl`);
        }
      }
    }
  }
});

test('schaetzen: Tipp 3 hat verschiedene, gekuerzte Endpunkte oder "genau bei"', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= SEEDS; seed++) {
      const h = generate('schaetzen', level, makeRng(seed)).hints[2];
      const m = /zwischen (.+?) und (.+?)\. /.exec(h);
      if (!m) { assert.match(h, /genau auf einem Viertel-Strich/, h); continue; }
      assert.notEqual(m[1], m[2], h);
      for (const e of [m[1], m[2]]) {
        const p = parseAnswer(e);
        assert.ok(p.ok && isSimplified(p.value), `${h}: Endpunkt ${e}`);
      }
    }
  }
});
