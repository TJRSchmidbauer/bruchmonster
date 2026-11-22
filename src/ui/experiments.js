// "Ausprobieren zuerst": je neues Thema ein kleiner Versuch, eine Frage und dann erst die Regel-Karte.
// Experiment = { title, intro, build(onReady) -> HTMLElement, question: { prompt, options, correct }, rule }.
import { h, button, announce } from './dom.js';
import { richText } from './richtext.js';
import { numberline } from './widgets/numberline.js';
import { strips, stripsStatic } from './widgets/strips.js';

const ALGAE = '#22A866';
const PUMPKIN = '#FF8A1F';

// Einmal-Ausloeser: onReady() hoechstens einmal.
const once = (fn) => {
  let done = false;
  return () => { if (!done) { done = true; fn(); } };
};

const stepButtons = (less, more) => h('div', { class: 'experiment__controls' }, less, more);

function platzieren(onReady) {
  const ready = once(onReady);
  let n = 4;
  let x = 0;
  const host = h('div', { class: 'experiment__stage' });
  const caption = h('p', { class: 'experiment__caption', 'aria-live': 'polite' });
  const less = button('Weniger Teile', { onClick: () => setN(n - 1) });
  const more = button('Mehr Teile', { onClick: () => setN(n + 1) });

  function say() {
    const k = Math.round(x * n);
    caption.replaceChildren(richText(`Die Strecke von 0 bis 1 hat ${n} gleiche Teile. Dein Punkt steht bei ${k}/${n}.`, { size: 's' }));
  }
  function draw() {
    const svg = numberline({
      from: 0, to: 1, ticks: n, marks: [], draggable: true, value: x,
      onPlace: (v) => { x = v; say(); ready(); },
    });
    host.replaceChildren(svg);
    less.disabled = n <= 2;
    more.disabled = n >= 12;
    say();
  }
  function setN(v) {
    n = Math.min(12, Math.max(2, v));
    x = Math.round(x * n) / n;
    draw();
    ready();
  }
  draw();
  return h('div', { class: 'experiment__play' }, host, caption, stepButtons(less, more));
}

const PAIRS = [
  [{ parts: 2, filled: 1 }, { parts: 4, filled: 1 }],
  [{ parts: 3, filled: 1 }, { parts: 6, filled: 1 }],
  [{ parts: 4, filled: 3 }, { parts: 8, filled: 3 }],
  [{ parts: 3, filled: 2 }, { parts: 5, filled: 2 }],
];

function vergleichen(onReady) {
  const ready = once(onReady);
  const seen = new Set();
  const host = h('div', { class: 'experiment__stage' });
  const caption = h('p', { class: 'experiment__caption' });
  let btns = [];

  function show(i) {
    const rows = PAIRS[i];
    host.replaceChildren(strips({ rows, interactive: 'overlay', onChange: () => ready() }));
    caption.replaceChildren(richText(`${rows[0].filled}/${rows[0].parts} und ${rows[1].filled}/${rows[1].parts}: Der Zähler ist gleich. Wer hat die größeren Stücke?`));
    btns.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    seen.add(i);
    if (seen.size >= 2) ready();
  }
  btns = PAIRS.map((rows, i) => h('button', {
    type: 'button', class: 'pick pick--small', 'aria-pressed': 'false', onclick: () => show(i),
  }, richText(`${rows[0].filled}/${rows[0].parts} und ${rows[1].filled}/${rows[1].parts}`)));
  show(0);
  return h('div', { class: 'experiment__play' },
    h('div', { class: 'experiment__pairs', role: 'group', 'aria-label': 'Welche Brüche vergleichen?' }, btns),
    host, caption);
}

function dazwischen(onReady) {
  const ready = once(onReady);
  const LEVELS = [4, 8, 16, 32];
  let at = 0;
  const host = h('div', { class: 'experiment__stage' });
  const caption = h('p', { class: 'experiment__caption', 'aria-live': 'polite' });
  const finer = button('Feiner teilen', { onClick: () => { at++; draw(); ready(); } });

  function draw() {
    const n = LEVELS[at];
    host.replaceChildren(stripsLine(n));
    const between = [];
    for (let i = 1; i < n; i++) if (i * 4 > n && i * 2 < n) between.push(`${i}/${n}`);
    caption.replaceChildren(richText(between.length
      ? `Bei ${n} Teilen liegen zwischen 1/4 und 1/2 schon: ${between.join(', ')}.`
      : `Bei ${n} Teilen liegt noch kein Strich zwischen 1/4 und 1/2.`));
    finer.disabled = at >= LEVELS.length - 1;
  }
  const stripsLine = (n) => numberline({ from: 0, to: 1, ticks: n, marks: [{ n: 1, d: 4 }, { n: 1, d: 2 }], draggable: false });
  draw();
  return h('div', { class: 'experiment__play' }, host, caption, h('div', { class: 'experiment__controls' }, finer));
}

// Streifen umteilen (Erweitern: feiner, Kuerzen: gröber).
function splitPlay(start, nice) {
  return (onReady) => {
    const ready = once(onReady);
    const caption = h('p', { class: 'experiment__caption', 'aria-live': 'polite' });
    const say = (s) => {
      caption.replaceChildren(richText(s.exact
        ? `${start.filled}/${start.parts} = ${s.filled}/${s.parts}. ${nice(s)}`
        : `Bei ${s.parts} Teilen geht die Färbung mitten durch ein Stück. Probier eine andere Teilung.`));
    };
    const el = strips({ rows: [start], interactive: 'split', onChange: (s) => { say(s); ready(); } });
    say(el.getState());
    return h('div', { class: 'experiment__play' }, h('div', { class: 'experiment__stage' }, el), caption);
  };
}

function addieren(onReady) {
  const ready = once(onReady);
  const STEPS = [
    { rows: [{ parts: 2, filled: 1 }, { parts: 3, filled: 1 }], text: '1/2 und 1/3: Die Stücke sind verschieden groß. So kann man sie nicht zusammenzählen.', btn: 'Auf Sechstel umteilen' },
    { rows: [{ parts: 6, filled: 3 }, { parts: 6, filled: 2 }], text: 'In Sechstel umgeteilt: 3/6 und 2/6. Jetzt sind alle Stücke gleich groß.', btn: 'Zusammenlegen' },
    { rows: [{ parts: 6, filled: 3 }, { parts: 6, filled: 2 }, { parts: 6, filled: 5, color: ALGAE }], text: 'Zusammengelegt: 3/6 + 2/6 = 5/6. Gezählt wurden nur die Stücke.', btn: 'Nochmal von vorn' },
  ];
  let at = 0;
  const host = h('div', { class: 'experiment__stage' });
  const caption = h('p', { class: 'experiment__caption', 'aria-live': 'polite' });
  const next = button(STEPS[0].btn, { onClick: () => { at = (at + 1) % STEPS.length; draw(); if (at >= 1) ready(); } });
  function draw() {
    host.replaceChildren(stripsStatic({ rows: STEPS[at].rows }, { animate: true }));
    caption.replaceChildren(richText(STEPS[at].text));
    next.querySelector('span').textContent = STEPS[at].btn;
  }
  draw();
  return h('div', { class: 'experiment__play' }, host, caption, h('div', { class: 'experiment__controls' }, next));
}

function bruchteil(onReady) {
  const ready = once(onReady);
  const STEPS = [
    { rows: [{ parts: 2, filled: 1 }], text: 'Ein Streifen, die Hälfte ist gefärbt: 1/2.', btn: 'Die Hälfte in 3 Teile teilen' },
    { rows: [{ parts: 2, filled: 1 }, { parts: 6, filled: 3 }], text: 'Die gefärbte Hälfte ist jetzt in 3 gleiche Teile geteilt. Jedes davon ist ein Sechstel vom ganzen Streifen.', btn: 'Davon ein Drittel färben' },
    { rows: [{ parts: 2, filled: 1 }, { parts: 6, filled: 3 }, { parts: 6, filled: 1, color: PUMPKIN }], text: 'Ein Drittel von 1/2 ist 1 Stück von 6: also 1/6 des ganzen Streifens.', btn: 'Nochmal von vorn' },
  ];
  let at = 0;
  const host = h('div', { class: 'experiment__stage' });
  const caption = h('p', { class: 'experiment__caption', 'aria-live': 'polite' });
  const next = button(STEPS[0].btn, { onClick: () => { at = (at + 1) % STEPS.length; draw(); if (at >= 1) ready(); } });
  function draw() {
    host.replaceChildren(stripsStatic({ rows: STEPS[at].rows }, { animate: true }));
    caption.replaceChildren(richText(STEPS[at].text));
    next.querySelector('span').textContent = STEPS[at].btn;
  }
  draw();
  return h('div', { class: 'experiment__play' }, host, caption, h('div', { class: 'experiment__controls' }, next));
}

export const EXPERIMENTS = {
  platzieren: {
    title: 'Teile die Strecke',
    intro: 'Das Monster hat die Strecke von 0 bis 1 in gleiche Teile zerschnitten. Du bestimmst, in wie viele. Zieh den Punkt und lies ab, wo er steht.',
    build: platzieren,
    question: {
      prompt: 'Die Strecke von 0 bis 1 hat 8 gleiche Teile. Wo liegt 3/8?',
      options: ['Beim 3. Strich nach der 0', 'Beim 8. Strich, dann 3 zurück', 'Genau in der Mitte'],
      correct: 0,
    },
    rule: 'Der Nenner sagt, in wie viele gleiche Teile die Strecke von 0 bis 1 geschnitten wird. Der Zähler sagt, den wievielten Strich du von der 0 aus ansteuerst. 3/8 liegt also beim 3. Strich.',
  },
  vergleichen: {
    title: 'Streifen übereinanderlegen',
    intro: 'Zwei Brüche, gleicher Zähler, verschiedene Nenner. Leg die Streifen aufeinander und schau, wer weiter reicht.',
    build: vergleichen,
    question: {
      prompt: 'Zwei Brüche haben denselben Zähler. Welcher ist größer?',
      options: ['Der mit dem kleineren Nenner', 'Der mit dem größeren Nenner', 'Sie sind immer gleich groß'],
      correct: 0,
    },
    rule: 'Mehr Stücke heißt kleinere Stücke. Bei gleichem Zähler ist der Bruch mit dem größeren Nenner kleiner: 1/4 ist weniger als 1/2.',
  },
  dazwischen: {
    title: 'Immer noch ein Strich dazwischen',
    intro: 'Zwischen 1/4 und 1/2 sitzt erst mal gar nichts. Teile feiner und schau, was auftaucht.',
    build: dazwischen,
    question: {
      prompt: 'Wie viele Brüche liegen zwischen 1/4 und 1/2?',
      options: ['Gar keine', 'Genau einen: 3/8', 'Unendlich viele, man kann immer feiner teilen'],
      correct: 2,
    },
    rule: 'Zwischen zwei Brüchen passt immer noch ein weiterer. Teile feiner (zum Beispiel mit größerem Nenner), dann bekommst du neue Striche dazwischen. Das geht ohne Ende.',
  },
  erweitern: {
    title: 'Feiner teilen, gleiche Länge',
    intro: 'Der Streifen ist 2/3 gefärbt. Teile ihn in mehr Stücke. Die Färbung bleibt gleich lang, nur die Striche ändern sich.',
    build: splitPlay({ parts: 3, filled: 2 }, (s) => (s.parts % 3 === 0 ? `Du hast mit ${s.parts / 3} erweitert.` : '')),
    question: {
      prompt: 'Du teilst den Streifen 2/3 in 6 Teile. Wie viele davon sind gefärbt?',
      options: ['2 von 6', '4 von 6', '5 von 6'],
      correct: 1,
    },
    rule: 'Erweitern heißt: Zähler und Nenner mit derselben Zahl malnehmen. 2/3 wird zu 4/6. Es sieht anders aus, ist aber gleich viel wert.',
  },
  kuerzen: {
    title: 'Gröber teilen, gleiche Länge',
    intro: 'Der Streifen ist 6/8 gefärbt. Mach die Teile größer, also weniger Stücke. Wo passt die Färbung genau an einen Strich?',
    build: splitPlay({ parts: 8, filled: 6 }, (s) => (s.parts < 8 ? `Gröber geteilt: ${8 / s.parts} Achtel passen in ein Stück.` : '')),
    question: {
      prompt: 'Du teilst den Streifen 6/8 in nur 4 Teile. Wie viele davon sind gefärbt?',
      options: ['2 von 4', '3 von 4', '4 von 4'],
      correct: 1,
    },
    rule: 'Kürzen heißt: Zähler und Nenner durch dieselbe Zahl teilen. 6/8 wird zu 3/4. Die Stücke werden größer, die Länge bleibt gleich.',
  },
  addieren: {
    title: 'Erst gleich große Stücke, dann zusammenlegen',
    intro: 'Ein halber und ein drittel Streifen: Wie viel ist das zusammen? Teile erst um, dann leg zusammen.',
    build: addieren,
    question: {
      prompt: 'Du willst 1/2 + 1/3 rechnen. In welche Stücke teilst du beide um?',
      options: ['In Fünftel', 'In Sechstel', 'In Drittel'],
      correct: 1,
    },
    rule: 'Addieren geht nur mit gleich großen Stücken. Mach die Brüche gleichnamig (hier Sechstel), dann zählst du nur die Zähler zusammen. Der Nenner bleibt: 3/6 + 2/6 = 5/6.',
  },
  'bruchteil-vom-bruchteil': {
    title: 'Ein Drittel von einem Halben',
    intro: 'Das Monster hat die Hälfte eines Streifens. Davon will es ein Drittel. Schau, wie viel vom ganzen Streifen das ist.',
    build: bruchteil,
    question: {
      prompt: 'Wie viel vom ganzen Streifen ist ein Drittel von 1/2?',
      options: ['1/5', '1/6', '2/3'],
      correct: 1,
    },
    rule: 'Ein Bruchteil von einem Bruchteil: Du malnimmst. 1/3 von 1/2 ist 1/3 · 1/2 = 1/6. Zähler mal Zähler, Nenner mal Nenner.',
  },
};

const WRONG = [
  'Knapp daneben, kein Drama. Die Regel unten erklärt es.',
  'Das war es nicht ganz, aber dafür probiert man ja. Lies die Regel.',
];
const RIGHT = ['Genau so!', 'Treffer! Das Monster ist beeindruckt.'];

// Der ganze Experiment-Bildschirm. onDone({ skipped }) kommt nach der Regel-Karte oder nach "Kenn ich schon".
export function experimentView(kind, { onDone }) {
  const exp = EXPERIMENTS[kind];
  if (!exp) return null;
  const title = h('h2', { class: 'card__title', tabindex: '-1' }, exp.title);
  const question = h('div', { class: 'experiment__question', hidden: true });
  const root = h('section', { class: 'experiment card', });
  const feedback = h('p', { class: 'experiment__feedback', role: 'status' });
  let answered = false;

  const options = exp.question.options.map((o, i) => h('button', {
    type: 'button', class: 'pick pick--choice', 'aria-pressed': 'false',
    onclick: () => choose(i),
  }, h('span', { class: 'pick__text' }, richText(o))));

  function choose(i) {
    if (answered) return;
    answered = true;
    const ok = i === exp.question.correct;
    options.forEach((b, j) => {
      b.disabled = true;
      b.setAttribute('aria-pressed', String(j === i));
      if (j === exp.question.correct) b.classList.add('pick--right');
      else if (j === i) b.classList.add('pick--wrong');
    });
    feedback.textContent = ok ? RIGHT[i % RIGHT.length] : WRONG[i % WRONG.length];
    const go = button('Weiter zu den Aufgaben', { variant: 'primary', onClick: () => onDone({ skipped: false }) });
    const card = h('div', { class: 'regel-karte', role: 'region', 'aria-label': 'Regel-Karte' },
      h('p', { class: 'regel-karte__title' }, 'Die Regel'),
      h('p', { class: 'regel-karte__text' }, richText(exp.rule)),
      go);
    root.append(card);
    announce(`${feedback.textContent} Die Regel: ${exp.rule}`);
    go.focus?.({ preventScroll: false });
  }

  const onReady = () => {
    if (!question.hidden) return;
    question.hidden = false;
    announce('Jetzt kommt eine Frage.');
  };
  question.append(
    h('p', { class: 'prompt' }, richText(exp.question.prompt)),
    h('div', { class: 'experiment__options', role: 'group', 'aria-label': 'Antworten' }, options),
    feedback);

  root.append(
    title,
    h('p', { class: 'lead' }, richText(exp.intro, { size: 's' })),
    exp.build(onReady),
    question,
    h('div', { class: 'experiment__actions' },
      button('Kenn ich schon', { variant: 'ghost', onClick: () => onDone({ skipped: true }) })));
  return root;
}
