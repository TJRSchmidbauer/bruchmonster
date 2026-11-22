// "Ausprobieren zuerst": je neues Thema ein kleiner Versuch, eine Frage und dann erst die Regel-Karte.
// Experiment = { title, intro, build(onReady) -> HTMLElement, question: { prompt, options, correct }, rule }.
import { h, button, announce } from './dom.js';
import { richText } from './richtext.js';
import { numberline } from './widgets/numberline.js';
import { strips, stripsStatic } from './widgets/strips.js';
import { simplify } from '../core/fractions.js';

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
      // Der Punkt rastet an den Strichen ein, damit "bei k/n" stimmt.
      onPlace: (v) => {
        const snapped = Math.round(v * n) / n;
        x = snapped;
        if (Math.abs(v - snapped) > 1e-9) svg.setValue(snapped);
        say();
        ready();
      },
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
    for (let i = 1; i < n; i++) {
      if (i * 4 > n && i * 2 < n) {
        const r = simplify({ n: i, d: n });
        const t = `${r.n}/${r.d}`;
        if (!between.includes(t)) between.push(t);
      }
    }
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
function splitPlay(start, nice, limits = {}) {
  return (onReady) => {
    const ready = once(onReady);
    const caption = h('p', { class: 'experiment__caption', 'aria-live': 'polite' });
    const say = (s) => {
      const extra = nice(s);
      caption.replaceChildren(richText(s.exact
        ? `${start.filled}/${start.parts} = ${s.filled}/${s.parts}.${extra ? ` ${extra}` : ''}`
        : `Bei ${s.parts} Teilen geht die Färbung mitten durch ein Stück. Probier eine andere Teilung.`));
    };
    const el = strips({ rows: [start], interactive: 'split', ...limits, onChange: (s) => { say(s); ready(); } });
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

// Allgemeiner Schritt-fuer-Schritt-Versuch. step = { text, btn, rows?, line?, node?, width? }.
// rows: Streifen, line: Zahlenstrahl, node: eigene Zeichnung (Funktion), width: schmale Zeichnung (z. B. '55%').
function stepper(STEPS) {
  return (onReady) => {
    const ready = once(onReady);
    let at = 0;
    const host = h('div', { class: 'experiment__stage' });
    const caption = h('p', { class: 'experiment__caption', 'aria-live': 'polite' });
    const next = button(STEPS[0].btn, { onClick: () => { at = (at + 1) % STEPS.length; draw(); if (at >= 1) ready(); } });
    const drawing = (st) => {
      if (st.node) return st.node();
      if (st.line) return numberline({ from: 0, to: 1, ticks: st.line.ticks, marks: st.line.marks, draggable: false });
      return stripsStatic({ rows: st.rows }, { animate: true });
    };
    function draw() {
      const st = STEPS[at];
      const blocks = (st.extra ?? []).map((w) => h('div', { class: 'experiment__narrow', style: `width:${w.width}` }, stripsStatic({ rows: w.rows })));
      host.replaceChildren(drawing(st), ...blocks);
      caption.replaceChildren(richText(st.text));
      next.querySelector('span').textContent = st.btn;
    }
    draw();
    return h('div', { class: 'experiment__play' }, host, caption, h('div', { class: 'experiment__controls' }, next));
  };
}

// Gummibaerchen als Punkte: mode 0 lose, 1 in Gruppen, 2 Gruppen, davon 3 (bzw. 2) genommen.
function gummis(mode, taken = 3) {
  const kids = [];
  const dot = (cx, cy, on) => h('circle', { cx, cy, r: 15, fill: on ? PUMPKIN : '#FFFFFF', stroke: '#1B1B3A', 'stroke-width': 3 });
  if (mode === 0) {
    for (let i = 0; i < 12; i++) kids.push(dot(36 + (i % 6) * 54, 36 + Math.floor(i / 6) * 56, false));
  } else {
    for (let g = 0; g < 4; g++) {
      const bx = 8 + (g % 2) * 164;
      const by = 6 + Math.floor(g / 2) * 70;
      const on = mode === 2 && g < taken;
      kids.push(h('rect', { x: bx, y: by, width: 150, height: 56, rx: 12, fill: on ? '#FFE3C2' : 'none', stroke: '#1B1B3A', 'stroke-width': 3, 'stroke-dasharray': on ? '' : '6 5' }));
      for (let i = 0; i < 3; i++) kids.push(dot(bx + 30 + i * 45, by + 28, on));
    }
  }
  return h('svg', { class: 'drawing', viewBox: '0 0 330 146', role: 'img', focusable: 'false',
    'aria-label': mode === 0 ? '12 Gummibärchen' : mode === 1 ? '12 Gummibärchen in 4 Gruppen zu je 3' : `12 Gummibärchen in 4 Gruppen, ${taken} Gruppen genommen` }, kids);
}

export const EXPERIMENTS = {
  platzieren: {
    title: 'Teile die Strecke',
    intro: 'Das Monster hat die Strecke von 0 bis 1 in gleiche Teile zerschnitten. Du bestimmst, in wie viele. Zieh den Punkt und lies ab, wo er steht.',
    build: platzieren,
    question: {
      prompt: 'Die Strecke von 0 bis 1 hat 8 gleiche Teile. Wo liegt 3/8?',
      options: ['Genau in der Mitte', 'Beim 8. Strich, dann 3 zurück', 'Beim 3. Strich nach der 0'],
      correct: 2,
    },
    rule: 'Der Nenner sagt, in wie viele gleiche Teile die Strecke von 0 bis 1 geschnitten wird. Der Zähler sagt, den wievielten Strich du von der 0 aus ansteuerst. 3/8 liegt also beim 3. Strich.',
  },
  vergleichen: {
    title: 'Streifen übereinanderlegen',
    intro: 'Zwei Brüche, gleicher Zähler, verschiedene Nenner. Leg die Streifen aufeinander und schau, wer weiter reicht.',
    build: vergleichen,
    question: {
      prompt: 'Zwei Brüche haben denselben Zähler. Welcher ist größer?',
      options: ['Sie sind immer gleich groß', 'Der mit dem kleineren Nenner', 'Der mit dem größeren Nenner'],
      correct: 1,
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
    build: splitPlay({ parts: 3, filled: 2 }, (s) => (s.parts % 3 === 0 && s.parts > 3 ? `Du hast mit ${s.parts / 3} erweitert.` : ''), { minParts: 3, maxParts: 12 }),
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
    build: splitPlay({ parts: 8, filled: 6 }, (s) => (s.parts < 8 && 8 % s.parts === 0 ? `Gröber geteilt: ${8 / s.parts} Achtel passen in ein Stück.` : ''), { minParts: 2, maxParts: 8 }),
    question: {
      prompt: 'Du teilst den Streifen 6/8 in nur 4 Teile. Wie viele davon sind gefärbt?',
      options: ['3 von 4', '2 von 4', '4 von 4'],
      correct: 0,
    },
    rule: 'Kürzen heißt: Zähler und Nenner durch dieselbe Zahl teilen. 6/8 wird zu 3/4. Die Stücke werden größer, die Länge bleibt gleich.',
  },
  addieren: {
    title: 'Erst gleich große Stücke, dann zusammenlegen',
    intro: 'Ein halber und ein drittel Streifen: Wie viel ist das zusammen? Teile erst um, dann leg zusammen.',
    build: addieren,
    question: {
      prompt: 'Du willst 1/2 + 1/3 rechnen. In welche Stücke teilst du beide um?',
      options: ['In Fünftel', 'In Drittel', 'In Sechstel'],
      correct: 2,
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

  schaetzen: {
    title: 'Erst die Mitte, dann die Viertel',
    intro: 'Auf diesem Zahlenstrahl gibt es keine Striche zum Ablesen. Zum Schätzen brauchst du Anker: erst die Mitte, dann halbiert man die Hälften.',
    build: stepper([
      { text: 'Von 0 bis 1 ist nichts markiert. Wo liegt zum Beispiel 3/4?', btn: 'Mitte einzeichnen', line: { ticks: 0, marks: [] } },
      { text: 'Die Mitte ist 1/2. Das ist dein erster Anker.', btn: 'Viertel einzeichnen', line: { ticks: 0, marks: [{ n: 1, d: 2 }] } },
      { text: 'Halbiere jede Hälfte: 1/4, 1/2 und 3/4. Jetzt kannst du auch Brüche dazwischen grob einordnen.', btn: 'Nochmal von vorn', line: { ticks: 4, marks: [{ n: 1, d: 4 }, { n: 1, d: 2 }, { n: 3, d: 4 }] } },
    ]),
    question: {
      prompt: 'Wo liegt 3/4 auf dem Strahl von 0 bis 1?',
      options: ['Genau in der Mitte', 'Auf halbem Weg zwischen der Mitte und 1', 'Ganz nah bei 0'],
      correct: 1,
    },
    rule: 'Zum Schätzen findest du erst die Mitte (1/2) und halbierst dann die Hälften: 1/4, 1/2, 3/4. Ein Bruch, der knapp unter der Mitte liegt, hat einen Zähler etwas kleiner als der halbe Nenner.',
  },
  darstellen: {
    title: 'Gleicher Bruch, anderes Ganzes',
    intro: 'Das Monster hat zwei Streifen: einen großen und einen kleinen. Bei beiden färbt es die Hälfte. Ist das gleich viel?',
    build: stepper([
      { text: 'Ein großer Streifen, die Hälfte ist gefärbt: 1/2.', btn: 'Kleinen Streifen dazu', rows: [{ parts: 2, filled: 1 }] },
      { text: 'Auch beim kleinen Streifen ist die Hälfte gefärbt: 1/2. Aber diese Hälfte ist viel kürzer. Der Bruch sagt nur, wie viel vom jeweiligen Ganzen, nicht wie viel in Zentimetern.', btn: 'Nochmal von vorn', rows: [{ parts: 2, filled: 1 }], extra: [{ rows: [{ parts: 2, filled: 1 }], width: '55%' }] },
    ]),
    question: {
      prompt: 'Du isst 1/2 einer Mini-Pizza, deine Freundin 1/2 einer Riesen-Pizza. Habt ihr gleich viel gegessen?',
      options: ['Ja, 1/2 ist immer gleich viel', 'Nur wenn beide Pizzen gleich groß sind', 'Nein, die Mini-Pizza zählt doppelt'],
      correct: 1,
    },
    rule: 'Ein Bruch sagt, welcher Anteil vom Ganzen gemeint ist. Wie viel das tatsächlich ist, hängt vom Ganzen ab: 1/2 von 200 g ist weniger als 1/2 von 1000 g. Brüche vergleichen darfst du nur, wenn das Ganze gleich ist.',
  },
  subtrahieren: {
    title: 'Erst gleich große Stücke, dann abziehen',
    intro: 'Das Monster hat 3/4 Schokolade und knabbert 1/3 ab. Wie viel bleibt? Wieder gilt: Nur gleich große Stücke kann man zählen.',
    build: stepper([
      { text: '3/4 und 1/3: Viertel und Drittel sind verschieden große Stücke. Abziehen geht so nicht.', btn: 'Auf Zwölftel umteilen', rows: [{ parts: 4, filled: 3 }, { parts: 3, filled: 1 }] },
      { text: 'In Zwölftel umgeteilt: 9/12 und 4/12. Jetzt sind alle Stücke gleich groß.', btn: 'Abziehen', rows: [{ parts: 12, filled: 9 }, { parts: 12, filled: 4 }] },
      { text: 'Abgezogen: 9/12 - 4/12 = 5/12. Der Nenner bleibt, nur die Stücke werden gezählt.', btn: 'Nochmal von vorn', rows: [{ parts: 12, filled: 9 }, { parts: 12, filled: 4 }, { parts: 12, filled: 5, color: ALGAE }] },
    ]),
    question: {
      prompt: 'Du rechnest 3/4 - 1/3. In welche Stücke teilst du beide um?',
      options: ['In Siebtel', 'In Zwölftel', 'In Drittel'],
      correct: 1,
    },
    rule: 'Subtrahieren geht wie Addieren: erst gleichnamig machen (Hauptnenner suchen), dann nur die Zähler abziehen. Der Nenner bleibt: 9/12 - 4/12 = 5/12.',
  },
  'anteil-von-groesse': {
    title: 'Bruchteil von 12 Gummibärchen',
    intro: 'Das Monster hat 12 Gummibärchen und gibt dir 3/4 davon. Wie viele sind das? Teile erst in gleiche Gruppen, dann nimm einige.',
    build: stepper([
      { text: '12 Gummibärchen. Du sollst 3/4 davon bekommen.', btn: 'In 4 Gruppen teilen', node: () => gummis(0) },
      { text: 'Der Nenner 4 sagt: 4 gleiche Gruppen. In jeder sind 12 : 4 = 3 Gummibärchen.', btn: '3 Gruppen nehmen', node: () => gummis(1) },
      { text: 'Der Zähler 3 sagt: Nimm 3 Gruppen. Das sind 3 · 3 = 9 Gummibärchen.', btn: 'Nochmal von vorn', node: () => gummis(2, 3) },
    ]),
    question: {
      prompt: 'Wie viele Gummibärchen sind 2/3 von 12?',
      options: ['6', '8', '9'],
      correct: 1,
    },
    rule: 'Ein Bruchteil einer Menge: erst durch den Nenner teilen (so viele gleiche Gruppen), dann mal den Zähler (so viele Gruppen nimmst du). 3/4 von 12: 12 : 4 = 3, dann 3 · 3 = 9.',
  },
  rezept: {
    title: 'Rezept für mehr Leute',
    intro: 'Pfannkuchen für 4 Personen brauchen 1/2 Liter Milch. Aber es kommen 6! Rechne erst auf eine Person herunter, dann hoch.',
    build: stepper([
      { text: 'Das Rezept für 4 Personen braucht 1/2 Liter Milch.', btn: 'Auf eine Person herunterrechnen', rows: [{ parts: 2, filled: 1 }] },
      { text: '1/2 ist dasselbe wie 4/8. Auf 4 Personen verteilt: 1/8 Liter für eine Person.', btn: 'Für 6 Personen hochrechnen', rows: [{ parts: 2, filled: 1 }, { parts: 8, filled: 4 }, { parts: 8, filled: 1, color: PUMPKIN }] },
      { text: 'Für 6 Personen: 6 · 1/8 = 6/8 = 3/4 Liter Milch.', btn: 'Nochmal von vorn', rows: [{ parts: 8, filled: 1 }, { parts: 8, filled: 6, color: ALGAE }] },
    ]),
    question: {
      prompt: 'Rezept für 4 Personen: 1/2 Liter Milch. Wie viel brauchst du für 2 Personen?',
      options: ['1/4 Liter', '1 Liter', '1/2 Liter'],
      correct: 0,
    },
    rule: 'Bei Rezepten rechnest du erst auf eine Person herunter (durch die Personenzahl teilen) und dann auf die neue Personenzahl hoch (mal nehmen). Weniger Gäste heißt weniger Zutat, mehr Gäste heißt mehr.',
  },
  'teilen-durch-nat': {
    title: 'Einen Bruch in gleiche Teile schneiden',
    intro: 'Das Monster hat 3/4 eines Streifens und will sie unter 3 Freunden aufteilen. Dann kommt eine schwierigere Teilung.',
    build: stepper([
      { text: 'Du hast 3/4 eines Streifens. Er soll in 3 gleiche Teile geschnitten werden.', btn: 'Schneiden', rows: [{ parts: 4, filled: 3 }] },
      { text: 'Jedes der 3 Stücke ist ein Viertel. 3/4 : 3 = 1/4. Das ging glatt auf.', btn: 'Jetzt 1/2 durch 3', rows: [{ parts: 4, filled: 3 }, { parts: 4, filled: 1, color: PUMPKIN }] },
      { text: 'Die Hälfte lässt sich nicht gut in 3 Stücke schneiden, die Teilung passt nicht. Teile den Streifen feiner.', btn: 'Teilung verfeinern', rows: [{ parts: 2, filled: 1 }] },
      { text: 'Feiner geteilt ist 1/2 = 3/6. Durch 3 geteilt bleibt ein Sechstel: 1/2 : 3 = 1/6.', btn: 'Nochmal von vorn', rows: [{ parts: 2, filled: 1 }, { parts: 6, filled: 3 }, { parts: 6, filled: 1, color: PUMPKIN }] },
    ]),
    question: {
      prompt: 'Was ist 2/5 : 2?',
      options: ['1/5', '1/10', '2/3'],
      correct: 0,
    },
    rule: 'Durch eine natürliche Zahl teilen heißt: jedes Stück in so viele kleinere Stücke zerschneiden. Der Nenner wird mal diese Zahl genommen: 1/2 : 3 = 1/6. Geht der Zähler glatt auf, kannst du auch den Zähler teilen: 3/4 : 3 = 1/4.',
  },
  'fehler-finden': {
    title: 'So arbeitet ein Detektiv',
    intro: 'Ein Detektiv glaubt nichts, er prüft. Hier ein Fall: 1/3 + 1/3 = 2/6. Das Monster sagt, das stimmt. Prüf es nach.',
    build: stepper([
      { text: 'Die Behauptung: 1/3 + 1/3 = 2/6. Erste Prüfung: Wenn du zu 1/3 noch etwas dazulegst, muss mehr als 1/3 herauskommen. Aber 2/6 ist genauso groß wie 1/3.', btn: 'Mit Streifen prüfen', rows: [{ parts: 3, filled: 1 }, { parts: 3, filled: 1 }] },
      { text: 'Die Probe: Die beiden Drittel zusammen sind länger als 2/6. Das passt nicht zusammen.', btn: 'Den Fehler finden', rows: [{ parts: 3, filled: 1 }, { parts: 3, filled: 1 }, { parts: 6, filled: 2 }] },
      { text: 'Fehler gefunden: Die Nenner wurden addiert. Beim Addieren bleibt der Nenner, nur die Zähler zählen: 1/3 + 1/3 = 2/3.', btn: 'Nochmal von vorn', rows: [{ parts: 3, filled: 1 }, { parts: 3, filled: 1 }, { parts: 3, filled: 2, color: ALGAE }] },
    ]),
    question: {
      prompt: 'Das Monster rechnet 1/4 + 1/4 = 2/8. Was ist der Fehler?',
      options: ['Alles richtig', 'Die Nenner wurden addiert, es sind 2/4', 'Es müssen 3/4 sein'],
      correct: 1,
    },
    rule: 'Ein Detektiv prüft Zeile für Zeile, schätzt (passt die Größe?) und macht Proben mit Bildern. Den ersten Fehler markierst du, alles danach folgt nur aus ihm.',
  },
  'regel-entdecken': {
    title: 'Beispiele sammeln, Muster erkennen',
    intro: 'Mathe-Regeln fallen nicht vom Himmel, man entdeckt sie. Sammle Beispiele, finde das Muster und stell eine Vermutung auf.',
    build: stepper([
      { text: 'Beispiel 1: 1/2 = 2/4. Der gefärbte Teil ist gleich lang.', btn: 'Nächstes Beispiel', rows: [{ parts: 2, filled: 1 }, { parts: 4, filled: 2 }] },
      { text: 'Beispiel 2: 1/3 = 2/6. Wieder gleich lang.', btn: 'Noch ein Beispiel', rows: [{ parts: 3, filled: 1 }, { parts: 6, filled: 2 }] },
      { text: 'Beispiel 3: 2/3 = 4/6. Immer wurden Zähler und Nenner mit 2 malgenommen und der Wert blieb gleich. Das ist deine Vermutung. Erst wenn du weißt, warum, ist es eine Regel.', btn: 'Nochmal von vorn', rows: [{ parts: 3, filled: 2 }, { parts: 6, filled: 4 }] },
    ]),
    question: {
      prompt: 'Welche Vermutung passt zu den drei Beispielen?',
      options: ['Beim Erweitern wird der Bruch größer', 'Beim Erweitern bleibt der Wert gleich', 'Das hängt vom Zufall ab'],
      correct: 1,
    },
    rule: 'Regeln entdecken: Beispiele sammeln, Muster erkennen, Vermutung aufstellen, mit Bild oder Rechnung begründen. Hier: Beim Erweitern mit derselben Zahl (Zähler und Nenner) bleibt der Wert gleich.',
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
