// Bruchstreifen: statische Zeichnung (Task 8). Task 9 ergaenzt hier den bedienbaren Streifen.
import { h } from '../dom.js';
import { format } from '../../core/fractions.js';

const INK = '#2B1B3D';
const FILL = '#FFD43B';
const W = 400;
const LABEL_W = 64;
const BAR_X = LABEL_W + 6;
const BAR_W = W - BAR_X - 6;
const ROW_H = 36;
const GAP = 14;

export const STRIP_ROW_H = ROW_H + GAP;

export function stripsDescription(rows) {
  const items = rows.map((r) => `${r.filled} von ${r.parts} Teilen gefärbt`);
  return `Bruchstreifen: ${items.join('; ')}`;
}

// rows: { parts, filled }[]. opts.color = Fuellfarbe, opts.animate = Teile nacheinander einfaerben.
export function stripsStatic({ rows }, opts = {}) {
  const color = opts.color ?? FILL;
  const height = rows.length * ROW_H + (rows.length - 1) * GAP + 8;
  const totalFilled = rows.reduce((s, r) => s + r.filled, 0);
  const step = Math.min(70, Math.floor(1000 / Math.max(1, totalFilled)));
  let seq = 0;
  const kids = [];

  rows.forEach((row, ri) => {
    const y = 4 + ri * STRIP_ROW_H;
    const pw = BAR_W / row.parts;
    kids.push(h('rect', { x: BAR_X, y, width: BAR_W, height: ROW_H, rx: 8, fill: '#FFFFFF' }));
    for (let i = 0; i < row.filled; i++) {
      const attrs = { x: BAR_X + i * pw, y, width: pw, height: ROW_H, fill: color, class: 'strip-part' };
      if (opts.animate) {
        attrs.class = 'strip-part strip-part--anim';
        attrs.style = `animation-delay:${seq++ * step}ms`;
      }
      kids.push(h('rect', attrs));
    }
    // Teilungsstriche, dann Rahmen darueber, damit die Ecken sauber bleiben.
    for (let i = 1; i < row.parts; i++) {
      kids.push(h('line', { x1: BAR_X + i * pw, y1: y, x2: BAR_X + i * pw, y2: y + ROW_H, stroke: INK, 'stroke-width': row.parts > 24 ? 1 : 2 }));
    }
    kids.push(h('rect', { x: BAR_X, y, width: BAR_W, height: ROW_H, rx: 8, fill: 'none', stroke: INK, 'stroke-width': 3 }));
    kids.push(h('text', {
      x: LABEL_W - 4, y: y + ROW_H / 2 + 7, 'text-anchor': 'end', 'font-size': 20, 'font-weight': 900,
      'font-family': 'Grandstander, system-ui, sans-serif', fill: INK,
    }, format({ n: row.filled, d: row.parts })));
  });

  return h('svg', {
    class: 'drawing drawing--strips', viewBox: `0 0 ${W} ${height}`, role: 'img',
    'aria-label': stripsDescription(rows), focusable: 'false',
  }, kids);
}
