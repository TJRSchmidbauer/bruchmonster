// Kleine DOM-Helfer: Elemente bauen, Ansagen fuer Screenreader, Bruchbauteil, Knopf.
import { toMixed } from '../core/fractions.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'path', 'rect', 'circle', 'g', 'line', 'text', 'ellipse', 'polygon', 'polyline', 'defs', 'clipPath', 'title', 'tspan']);

function append(el, child) {
  if (child == null || child === false) return;
  if (Array.isArray(child)) {
    for (const c of child) append(el, c);
    return;
  }
  el.append(typeof child === 'object' ? child : String(child));
}

// h('button', { class: 'x', onclick: fn }, 'Text', ...)
export function h(tag, attrs, ...children) {
  const el = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) append(el, c);
  return el;
}

// Eine einzige, unsichtbare Live-Region.
export function announce(text) {
  let region = document.getElementById('sr-announcer');
  if (!region) {
    region = h('div', { id: 'sr-announcer', class: 'sr-only', 'aria-live': 'polite', role: 'status' });
    document.body.append(region);
  }
  region.textContent = text;
}

const WORDS = {
  2: 'Halbe', 3: 'Drittel', 4: 'Viertel', 5: 'Fünftel', 6: 'Sechstel', 7: 'Siebtel', 8: 'Achtel',
  9: 'Neuntel', 10: 'Zehntel', 11: 'Elftel', 12: 'Zwölftel', 13: 'Dreizehntel', 14: 'Vierzehntel',
  15: 'Fünfzehntel', 16: 'Sechzehntel', 17: 'Siebzehntel', 18: 'Achtzehntel', 19: 'Neunzehntel',
};

function spoken(n, d) {
  if (d === 1) return `${n} Ganze`;
  return WORDS[d] ? `${n} ${WORDS[d]}` : `${n} von ${d}`;
}

// Gesprochener Bruch fuer aria-Texte: "3 Viertel", "1 Ganzes und 1 Halbe".
export function spokenFrac(f, mixed = true) {
  return label(f, mixed && f.d > 1);
}

function label(f, mixed) {
  if (!mixed || f.n < f.d) return spoken(f.n, f.d);
  const m = toMixed(f);
  const whole = m.whole === 1 ? '1 Ganzes' : `${m.whole} Ganze`;
  return m.n === 0 ? whole : `${whole} und ${spoken(m.n, m.d)}`;
}

function stack(n, d) {
  return h('span', { class: 'frac__stack', 'aria-hidden': 'true' },
    h('span', { class: 'frac__n' }, n),
    h('span', { class: 'frac__bar' }),
    h('span', { class: 'frac__d' }, d));
}

// Das Erkennungsmerkmal: Zaehler ueber dickem Bruchstrich ueber Nenner.
export function fracView(f, opts = {}) {
  const size = opts.size ?? 'm';
  const mixed = !!opts.mixed && f.n >= f.d && f.d > 1;
  const parts = [];
  if (mixed) {
    const m = toMixed(f);
    parts.push(h('span', { class: 'frac__whole', 'aria-hidden': 'true' }, m.whole));
    if (m.n > 0) parts.push(stack(m.n, m.d));
  } else if (f.d === 1) {
    parts.push(h('span', { class: 'frac__whole', 'aria-hidden': 'true' }, f.n));
  } else {
    parts.push(stack(f.n, f.d));
  }
  return h('span', { class: `frac frac--${size}`, role: 'img', 'aria-label': label(f, mixed) }, parts);
}

export function button(text, opts = {}) {
  const { variant = 'secondary', onClick, icon, ...rest } = opts;
  return h('button', { type: 'button', class: `btn btn--${variant}`, onclick: onClick, ...rest },
    icon ?? null, h('span', null, text));
}
