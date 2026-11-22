// Zahlenstrahl: statische Zeichnung (Task 8). Task 9 ergaenzt hier den bedienbaren Strahl.
import { h } from '../dom.js';
import { format } from '../../core/fractions.js';

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

export function numberlineStatic({ from, to, ticks = 0, marks = [] }) {
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
  return h('svg', {
    class: 'drawing drawing--line', viewBox: `0 0 ${W} ${height}`, role: 'img',
    'aria-label': numberlineDescription({ from, to, marks }), focusable: 'false',
  }, kids);
}
