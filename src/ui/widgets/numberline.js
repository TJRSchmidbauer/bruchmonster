// Zahlenstrahl: statische Zeichnung (Task 8) und bedienbarer Strahl mit Schieber (Task 9).
import { h, spokenFrac } from '../dom.js';
import { format, frac, simplify } from '../../core/fractions.js';

const INK = '#2B1B3D';
const DOT = '#FF8A1F';
const W = 400;
const PAD = 24;
const LINE_Y = 66;
const FONT = 'Grandstander, system-ui, sans-serif';

export function numberlineDescription({ from, to, marks }) {
  const base = `Zahlenstrahl von ${from} bis ${to}`;
  if (!marks.length) return base;
  return `${base}, Markierungen bei ${marks.map(format).join(' und ')}`;
}

function fracLabel(f, x, cy) {
  const common = { 'text-anchor': 'middle', 'font-family': FONT, 'font-weight': 900, 'font-size': 17, fill: INK };
  const w = Math.max(String(f.n).length, String(f.d).length) * 11 + 6;
  return h('g', null,
    h('text', { ...common, x, y: cy - 4 }, f.n),
    h('line', { x1: x - w / 2, y1: cy, x2: x + w / 2, y2: cy, stroke: INK, 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
    h('text', { ...common, x, y: cy + 16 }, f.d));
}

// Gemeinsame Zeichnung: Linie, Striche, Ganze, Marken. Gibt Elemente, Hoehe und die Umrechnung x(v) zurueck.
function layout({ from, to, ticks = 0, marks = [] }) {
  const span = to - from;
  const X = (v) => PAD + ((v - from) / span) * (W - 2 * PAD);
  const kids = [h('line', { x1: PAD - 8, y1: LINE_Y, x2: W - PAD + 8, y2: LINE_Y, stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' })];

  if (ticks > 0) {
    const count = span * ticks;
    for (let i = 0; i <= count; i++) {
      if (i % ticks === 0) continue;
      kids.push(h('line', { x1: X(from + i / ticks), y1: LINE_Y - 7, x2: X(from + i / ticks), y2: LINE_Y + 7, stroke: INK, 'stroke-width': count > 40 ? 1.5 : 2.5, 'stroke-linecap': 'round' }));
    }
  }
  for (let v = from; v <= to; v++) {
    kids.push(h('line', { x1: X(v), y1: LINE_Y - 12, x2: X(v), y2: LINE_Y + 12, stroke: INK, 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    kids.push(h('text', { x: X(v), y: LINE_Y + 36, 'text-anchor': 'middle', 'font-family': FONT, 'font-weight': 900, 'font-size': 18, fill: INK }, v));
  }

  // Marken: nahe beieinander liegende Beschriftungen wechseln zwischen oben und unten.
  const sorted = marks.map((f) => ({ f, x: X(f.n / f.d) })).sort((a, b) => a.x - b.x);
  let prevX = -Infinity;
  let below = false;
  let anyBelow = false;
  for (const m of sorted) {
    below = m.x - prevX < 40 ? !below : false;
    prevX = m.x;
    anyBelow = anyBelow || below;
    const cy = below ? LINE_Y + 70 : 28;
    kids.push(h('line', { x1: m.x, y1: below ? LINE_Y + 8 : cy + 22, x2: m.x, y2: below ? cy - 20 : LINE_Y - 8, stroke: INK, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }));
    kids.push(fracLabel(m.f, m.x, cy));
    kids.push(h('circle', { cx: m.x, cy: LINE_Y, r: 8, fill: DOT, stroke: INK, 'stroke-width': 3 }));
  }
  const height = anyBelow ? LINE_Y + 98 : LINE_Y + 46;
  return { kids, height, X };
}

export function numberlineStatic({ from, to, ticks = 0, marks = [] }) {
  const { kids, height } = layout({ from, to, ticks, marks });
  return h('svg', {
    class: 'drawing drawing--line', viewBox: `0 0 ${W} ${height}`, role: 'img',
    'aria-label': numberlineDescription({ from, to, marks }), focusable: 'false',
  }, kids);
}

const round9 = (v) => Math.round(v * 1e9) / 1e9;

// Naechster Bruch zum Wert x fuer die Sprachausgabe ("etwa 3 Viertel").
function valueText(x, ticks) {
  const D = ticks > 0 ? ticks : 8;
  const f = simplify(frac(Math.max(0, Math.round(x * D)), D));
  return `etwa ${spokenFrac(f)}`;
}

// Bedienbarer Zahlenstrahl. opts: { from, to, ticks, marks, draggable, onPlace, value, step }.
// Gibt das SVG zurueck; Zusatzfunktionen haengen am Element: getValue, setValue, isTouched, lock, ghost, clearGhost.
export function numberline(opts) {
  const { from, to, ticks = 0, marks = [], draggable = true, onPlace } = opts;
  if (!draggable) return numberlineStatic({ from, to, ticks, marks });
  const span = to - from;
  const step = opts.step ?? (ticks > 0 ? 1 / ticks : 1 / 24);
  const { kids, height, X } = layout({ from, to, ticks, marks });
  const clamp = (v) => round9(Math.min(to, Math.max(from, v)));
  let value = clamp(opts.value ?? from);
  let touched = opts.value !== undefined;
  let locked = false;

  const ring = h('circle', { class: 'nl-ring', cx: 0, cy: 0, r: 22, fill: 'none', stroke: '#FFD43B', 'stroke-width': 6 });
  const ringInk = h('circle', { class: 'nl-ring', cx: 0, cy: 0, r: 25, fill: 'none', stroke: INK, 'stroke-width': 2 });
  const dot = h('circle', { class: 'nl-dot', cx: 0, cy: 0, r: 11, fill: DOT, stroke: INK, 'stroke-width': 3.5 });
  const hit = h('circle', { cx: 0, cy: 0, r: 32, fill: 'transparent' });
  const pin = h('g', {
    class: 'nl-pin', role: 'slider', tabindex: '0',
    'aria-label': 'Punkt auf dem Zahlenstrahl', 'aria-orientation': 'horizontal',
    'aria-valuemin': String(from), 'aria-valuemax': String(to),
  }, hit, ring, ringInk, dot);
  const ghostEl = h('g', { class: 'nl-ghost', hidden: true, 'aria-hidden': 'true' },
    h('circle', { cx: 0, cy: 0, r: 11, fill: 'none', stroke: INK, 'stroke-width': 3, 'stroke-dasharray': '4 3' }));
  const track = h('rect', { class: 'nl-track', x: 0, y: LINE_Y - 34, width: W, height: 68, fill: 'transparent' });

  const svg = h('svg', {
    class: 'drawing drawing--line nl-live', viewBox: `0 0 ${W} ${height}`, role: 'group', focusable: 'false',
    'aria-label': `Zahlenstrahl von ${from} bis ${to}. Setze den Punkt mit Ziehen, Tippen oder den Pfeiltasten.`,
  }, track, kids, ghostEl, pin);

  function paint() {
    pin.setAttribute('transform', `translate(${X(value)} ${LINE_Y})`);
    pin.setAttribute('aria-valuenow', String(Math.round(value * 1e6) / 1e6));
    pin.setAttribute('aria-valuetext', touched ? valueText(value, ticks) : 'noch nicht gesetzt');
    pin.classList.toggle('nl-pin--idle', !touched);
  }

  function setValue(v, { silent = false, user = false } = {}) {
    const nv = clamp(v);
    if (user) touched = true;
    if (nv === value && !user) { paint(); return; }
    value = nv;
    paint();
    if (!silent && onPlace) onPlace(value);
  }

  function fromPointer(e) {
    const r = svg.getBoundingClientRect();
    if (!r.width) return value;
    const vx = ((e.clientX - r.left) / r.width) * W;
    return from + ((vx - PAD) / (W - 2 * PAD)) * span;
  }

  let dragging = false;
  svg.addEventListener('pointerdown', (e) => {
    if (locked || (e.button !== undefined && e.button > 0)) return;
    dragging = true;
    try { svg.setPointerCapture?.(e.pointerId); } catch { /* ohne Capture geht es auch */ }
    setValue(fromPointer(e), { user: true });
    pin.focus?.({ preventScroll: true });
    e.preventDefault?.();
  });
  svg.addEventListener('pointermove', (e) => {
    if (dragging) setValue(fromPointer(e), { user: true });
  });
  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    try { svg.releasePointerCapture?.(e.pointerId); } catch { /* egal */ }
  };
  svg.addEventListener('pointerup', stop);
  svg.addEventListener('pointercancel', stop);

  pin.addEventListener('keydown', (e) => {
    if (locked) return;
    const k = e.key;
    const q = span / 4;
    let next = null;
    if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowLeft' || k === 'ArrowDown') {
      const dir = k === 'ArrowRight' || k === 'ArrowUp' ? 1 : -1;
      // value ist auf 9 Stellen gerundet; die Toleranz muss groesser sein, sonst bleibt der Punkt bei Strichen wie 1/11 haengen.
      const g = value / step;
      next = (dir > 0 ? Math.floor(g + 1e-6) + 1 : Math.ceil(g - 1e-6) - 1) * step;
    } else if (k === 'Home') next = from;
    else if (k === 'End') next = to;
    else if (k === 'PageUp') next = value + q;
    else if (k === 'PageDown') next = value - q;
    if (next === null) return;
    e.preventDefault?.();
    setValue(next, { user: true });
  });

  svg.getValue = () => (touched ? value : null);
  svg.setValue = (v) => setValue(v, { user: true });
  svg.isTouched = () => touched;
  svg.lock = (b) => {
    locked = !!b;
    pin.setAttribute('aria-disabled', String(locked));
    pin.setAttribute('tabindex', locked ? '-1' : '0');
    svg.classList.toggle('nl-live--locked', locked);
  };
  svg.ghost = (x) => {
    ghostEl.setAttribute('transform', `translate(${X(Math.min(to, Math.max(from, x)))} ${LINE_Y})`);
    ghostEl.removeAttribute('hidden');
  };
  svg.clearGhost = () => ghostEl.setAttribute('hidden', '');
  svg.focusPin = () => pin.focus?.();
  paint();
  return svg;
}
