// Bruchstreifen: statische Zeichnung (Task 8) und bedienbare Streifen fill/split/overlay (Task 9).
import { h, button } from '../dom.js';
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
  const rowColor = (row) => row.color ?? color;
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
      const attrs = { x: BAR_X + i * pw, y, width: pw, height: ROW_H, fill: rowColor(row), class: 'strip-part' };
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

const OVERLAY_COLORS = ['#FFD43B', '#14A9BD', '#FF8A1F', '#7B5CFF'];
const TALL = 64;
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function wrapper(mode, svg, controls, label) {
  const el = h('div', { class: `strips-widget strips-widget--${mode}`, role: 'group', 'aria-label': label }, svg, controls);
  return el;
}

// Streifen zum Faerben: jeder Teil ist ein Umschalter (aria-pressed). Ziehen malt mehrere Teile.
function fillStrips({ rows, onChange }) {
  const cells = rows.map((r) => Array.from({ length: r.parts }, (_, i) => i < (r.filled ?? 0)));
  const parts = rows[0].parts;
  const rowH = TALL;
  const gap = 12;
  const height = rows.length * rowH + (rows.length - 1) * gap + 8;
  const rects = [];
  const kids = [];
  const live = h('span', { class: 'strips-widget__count', 'aria-live': 'polite' });
  const count = () => cells.reduce((s, r) => s + r.filter(Boolean).length, 0);
  const state = () => ({ parts, filled: count() });
  let current = [0, 0];

  rows.forEach((row, ri) => {
    const y = 4 + ri * (rowH + gap);
    const pw = BAR_W / row.parts;
    kids.push(h('rect', { x: BAR_X, y, width: BAR_W, height: rowH, rx: 8, fill: '#FFFFFF' }));
    rects[ri] = [];
    for (let i = 0; i < row.parts; i++) {
      const r = h('rect', {
        class: 'strip-cell', x: BAR_X + i * pw, y, width: pw, height: rowH, fill: FILL, role: 'button',
        tabindex: ri === 0 && i === 0 ? '0' : '-1', 'aria-pressed': 'false',
        'aria-label': `Teil ${i + 1} von ${row.parts}${rows.length > 1 ? `, Streifen ${ri + 1}` : ''}`,
        'data-row': ri, 'data-i': i,
      });
      rects[ri].push(r);
      kids.push(r);
    }
    for (let i = 1; i < row.parts; i++) {
      kids.push(h('line', { x1: BAR_X + i * pw, y1: y, x2: BAR_X + i * pw, y2: y + rowH, stroke: INK, 'stroke-width': row.parts > 24 ? 1 : 2, 'pointer-events': 'none' }));
    }
    kids.push(h('rect', { x: BAR_X, y, width: BAR_W, height: rowH, rx: 8, fill: 'none', stroke: INK, 'stroke-width': 3, 'pointer-events': 'none' }));
  });
  const svg = h('svg', {
    class: 'drawing drawing--strips strips-live', viewBox: `0 0 ${W} ${height}`, focusable: 'false',
  }, kids);
  const labelText = h('text', { x: LABEL_W - 4, y: 4 + rowH / 2 + 8, 'text-anchor': 'end', 'font-size': 20, 'font-weight': 900, 'font-family': 'Grandstander, system-ui, sans-serif', fill: INK, 'pointer-events': 'none' });
  svg.append(labelText);

  function paint() {
    rects.forEach((row, ri) => row.forEach((r, i) => {
      const on = cells[ri][i];
      r.setAttribute('fill', on ? FILL : '#FFFFFF');
      r.setAttribute('fill-opacity', on ? '1' : '0');
      r.setAttribute('aria-pressed', String(on));
    }));
    const n = count();
    labelText.textContent = `${n}/${parts}`;
    live.textContent = `${n} von ${parts} Teilen gefärbt`;
  }

  function set(ri, i, on, silent) {
    if (cells[ri][i] === on) return;
    cells[ri][i] = on;
    paint();
    if (!silent && onChange) onChange(state());
  }
  const toggle = (ri, i) => set(ri, i, !cells[ri][i]);

  const focusCell = (ri, i) => {
    rects.flat().forEach((r) => r.setAttribute('tabindex', '-1'));
    current = [ri, i];
    rects[ri][i].setAttribute('tabindex', '0');
    rects[ri][i].focus?.({ preventScroll: true });
  };

  svg.addEventListener('click', (e) => {
    const t = e.target;
    if (!t?.getAttribute || t.getAttribute('role') !== 'button' || suppressClick) return;
    toggle(Number(t.getAttribute('data-row')), Number(t.getAttribute('data-i')));
  });
  svg.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!t?.getAttribute || t.getAttribute('role') !== 'button') return;
    const ri = Number(t.getAttribute('data-row'));
    const i = Number(t.getAttribute('data-i'));
    let to = null;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'Spacebar') {
      e.preventDefault?.();
      toggle(ri, i);
      return;
    }
    if (e.key === 'ArrowRight') to = i + 1 < rows[ri].parts ? [ri, i + 1] : ri + 1 < rows.length ? [ri + 1, 0] : null;
    else if (e.key === 'ArrowLeft') to = i > 0 ? [ri, i - 1] : ri > 0 ? [ri - 1, rows[ri - 1].parts - 1] : null;
    else if (e.key === 'ArrowDown') to = ri + 1 < rows.length ? [ri + 1, Math.min(i, rows[ri + 1].parts - 1)] : null;
    else if (e.key === 'ArrowUp') to = ri > 0 ? [ri - 1, Math.min(i, rows[ri - 1].parts - 1)] : null;
    else if (e.key === 'Home') to = [ri, 0];
    else if (e.key === 'End') to = [ri, rows[ri].parts - 1];
    if (to) {
      e.preventDefault?.();
      focusCell(...to);
    }
  });

  // Ziehen: von der ersten Zelle bestimmt, ob gemalt oder geloescht wird.
  let painting = null;
  let suppressClick = false;
  const cellAt = (e) => {
    const r = svg.getBoundingClientRect();
    if (!r.width) return null;
    const vx = ((e.clientX - r.left) / r.width) * W;
    const vy = ((e.clientY - r.top) / r.height) * height;
    const ri = Math.floor((vy - 4) / (rowH + gap));
    if (ri < 0 || ri >= rows.length) return null;
    const i = Math.floor(((vx - BAR_X) / BAR_W) * rows[ri].parts);
    return i < 0 || i >= rows[ri].parts ? null : [ri, i];
  };
  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button > 0) return;
    const c = cellAt(e);
    if (!c) return;
    painting = { to: !cells[c[0]][c[1]], moved: false, start: c, id: e.pointerId };
  });
  svg.addEventListener('pointermove', (e) => {
    if (!painting) return;
    const c = cellAt(e);
    if (!c) return;
    if (c[0] !== painting.start[0] || c[1] !== painting.start[1]) {
      if (!painting.moved) {
        set(painting.start[0], painting.start[1], painting.to);
        try { svg.setPointerCapture?.(painting.id); } catch { /* egal */ }
      }
      painting.moved = true;
    }
    if (painting.moved) set(c[0], c[1], painting.to);
  });
  const endPaint = () => {
    if (!painting) return;
    if (painting.moved) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
    }
    painting = null;
  };
  svg.addEventListener('pointerup', endPaint);
  svg.addEventListener('pointercancel', endPaint);

  const controls = h('div', { class: 'strips-widget__controls' },
    button('Ein Stück weniger', { onClick: () => step(-1), 'data-act': 'less' }),
    button('Ein Stück mehr', { onClick: () => step(1), 'data-act': 'more' }));

  // Tastatur- und Touch-Alternative zum Einzelklicken bei vielen schmalen Teilen.
  function step(dir) {
    const flat = [];
    cells.forEach((row, ri) => row.forEach((_, i) => flat.push([ri, i])));
    const n = count();
    if (dir > 0 && n < flat.length) set(...flat[n], true);
    else if (dir < 0 && n > 0) set(...flat[n - 1], false);
  }

  const el = wrapper('fill', svg, controls, `Bruchstreifen mit ${parts} Teilen zum Einfärben`);
  el.append(live);
  el.getState = state;
  el.reset = () => { cells.forEach((r) => r.fill(false)); paint(); onChange?.(state()); };
  el.lock = (b) => {
    el.classList.toggle('strips-widget--locked', !!b);
    rects.flat().forEach((r) => r.setAttribute('aria-disabled', String(!!b)));
    for (const c of controls.querySelectorAll('button')) c.disabled = !!b;
    svg.style.pointerEvents = b ? 'none' : '';
    rects.flat().forEach((r) => { if (b) r.setAttribute('tabindex', '-1'); });
    if (!b) rects[current[0]][current[1]].setAttribute('tabindex', '0');
  };
  el.focusFirst = () => focusCell(...current);
  paint();
  return el;
}

// Einen Streifen umteilen: die gefaerbte Laenge bleibt, nur die Teilung aendert sich.
function splitStrips({ rows, onChange, minParts = 1, maxParts = 24 }) {
  const row = rows[0];
  const base = { n: row.filled, d: row.parts }; // gefaerbte Laenge n/d
  const lo = Math.max(1, minParts);
  const hi = Math.min(24, maxParts);
  let parts = Math.min(hi, Math.max(lo, row.parts));
  const kids = [];
  const y = 4;
  const rowH = TALL;
  const color = row.color ?? FILL;
  const fillRect = h('rect', { x: BAR_X, y, width: (BAR_W * base.n) / base.d, height: rowH, fill: color, class: 'strip-part' });
  const lines = h('g', { 'pointer-events': 'none' });
  const label = h('text', { x: LABEL_W - 4, y: y + rowH / 2 + 8, 'text-anchor': 'end', 'font-size': 20, 'font-weight': 900, 'font-family': 'Grandstander, system-ui, sans-serif', fill: INK });
  kids.push(h('rect', { x: BAR_X, y, width: BAR_W, height: rowH, rx: 8, fill: '#FFFFFF' }), fillRect, lines,
    h('rect', { x: BAR_X, y, width: BAR_W, height: rowH, rx: 8, fill: 'none', stroke: INK, 'stroke-width': 3 }), label);
  const svg = h('svg', { class: 'drawing drawing--strips', viewBox: `0 0 ${W} ${rowH + 8}`, role: 'img', focusable: 'false' }, kids);
  const status = h('span', { class: 'strips-widget__status', 'aria-live': 'polite' });
  const getState = () => {
    const f = (base.n * parts) / base.d;
    const exact = Number.isInteger(f);
    return { parts, filled: exact ? f : Math.round(f * 100) / 100, exact };
  };
  const less = button('Weniger Teile', { onClick: () => setParts(parts - 1), 'data-act': 'less' });
  const more = button('Mehr Teile', { onClick: () => setParts(parts + 1), 'data-act': 'more' });

  function paint() {
    lines.replaceChildren();
    const pw = BAR_W / parts;
    for (let i = 1; i < parts; i++) {
      lines.append(h('line', { x1: BAR_X + i * pw, y1: y, x2: BAR_X + i * pw, y2: y + rowH, stroke: INK, 'stroke-width': parts > 16 ? 1.5 : 2 }));
    }
    const s = getState();
    label.textContent = s.exact ? `${s.filled}/${parts}` : `?/${parts}`;
    const txt = s.exact ? `${s.filled} von ${parts} Teilen gefärbt` : `${parts} Teile, die Färbung geht mitten durch ein Stück`;
    svg.setAttribute('aria-label', `Streifen: ${txt}`);
    status.textContent = txt;
    less.disabled = parts <= lo;
    more.disabled = parts >= hi;
  }
  function setParts(n) {
    const np = Math.min(hi, Math.max(lo, Math.round(n)));
    if (np === parts) return;
    parts = np;
    paint();
    onChange?.(getState());
  }
  const el = wrapper('split', svg, h('div', { class: 'strips-widget__controls' }, less, status, more), 'Bruchstreifen zum Umteilen');
  el.getState = getState;
  el.setParts = setParts;
  paint();
  return el;
}

// Mehrere Streifen gleicher Breite untereinander; "Uebereinanderlegen" schiebt sie aufeinander.
// Aufeinander: der erste Streifen bleibt deckend, die weiteren sind durchscheinend mit gestricheltem Rahmen,
// die Beschriftung wandert in eine Legende unter dem Streifen.
function overlayStrips({ rows, onChange }) {
  const rowH = 40;
  const gap = 14;
  const legendH = 30;
  const height = rows.length * rowH + (rows.length - 1) * gap + 8;
  const stackedH = rowH + 8 + legendH;
  const ys = rows.map((_, i) => 4 + i * (rowH + gap));
  const colorOf = (row, ri) => row.color ?? OVERLAY_COLORS[ri % OVERLAY_COLORS.length];
  const FONT_D = 'Grandstander, system-ui, sans-serif';
  const groups = rows.map((row, ri) => {
    const pw = BAR_W / row.parts;
    const bg = h('rect', { x: BAR_X, y: 0, width: BAR_W, height: rowH, rx: 8, fill: '#FFFFFF', class: 'ov-bg' });
    const fill = h('rect', { x: BAR_X, y: 0, width: pw * row.filled, height: rowH, fill: colorOf(row, ri), 'fill-opacity': 1, class: 'strip-part ov-fill' });
    const ticks = h('g', { class: 'ov-ticks' });
    for (let i = 1; i < row.parts; i++) {
      ticks.append(h('line', { x1: BAR_X + i * pw, y1: 0, x2: BAR_X + i * pw, y2: rowH, stroke: INK, 'stroke-width': 2 }));
    }
    const frame = h('rect', { x: BAR_X, y: 0, width: BAR_W, height: rowH, rx: 8, fill: 'none', stroke: INK, 'stroke-width': 3, class: 'ov-frame' });
    const label = h('text', { x: LABEL_W - 4, y: rowH / 2 + 7, 'text-anchor': 'end', 'font-size': 20, 'font-weight': 900, 'font-family': FONT_D, fill: INK, class: 'ov-label' }, format({ n: row.filled, d: row.parts }));
    return h('g', { transform: `translate(0 ${ys[ri]})`, class: 'ov-row' }, bg, fill, ticks, frame, label);
  });
  const legend = h('g', { class: 'ov-legend', hidden: true, transform: `translate(0 ${rowH + 14})` },
    rows.map((row, ri) => {
      const x = BAR_X + ri * 130;
      return h('g', null,
        h('rect', { x, y: 0, width: 22, height: 18, rx: 4, fill: colorOf(row, ri), 'fill-opacity': ri === 0 ? 1 : 0.55, stroke: INK, 'stroke-width': 2, 'stroke-dasharray': ri === 0 ? null : '4 3' }),
        h('text', { x: x + 30, y: 15, 'font-size': 18, 'font-weight': 900, 'font-family': FONT_D, fill: INK }, format({ n: row.filled, d: row.parts })));
    }));
  const svg = h('svg', {
    class: 'drawing drawing--strips', viewBox: `0 0 ${W} ${height}`, role: 'img', focusable: 'false',
    'aria-label': stripsDescription(rows),
  }, groups, legend);
  let overlaid = false;
  const toggle = h('button', { type: 'button', class: 'btn btn--secondary', 'aria-pressed': 'false', 'data-act': 'overlay' },
    h('span', null, 'Übereinanderlegen'));
  const status = h('span', { class: 'strips-widget__status', 'aria-live': 'polite' });

  function style(g, ri) {
    const later = overlaid && ri > 0;
    const q = (c) => g.querySelector(c);
    q('.ov-bg').setAttribute('fill-opacity', later ? '0' : '1');
    q('.ov-fill').setAttribute('fill-opacity', later ? '0.55' : '1');
    q('.ov-ticks').setAttribute('opacity', later ? '0.4' : '1');
    q('.ov-frame').setAttribute('opacity', later ? '0' : '1');
    const f = q('.ov-fill');
    f.setAttribute('stroke', later ? INK : 'none');
    f.setAttribute('stroke-width', later ? '3' : '0');
    f.setAttribute('stroke-dasharray', later ? '7 4' : '');
    q('.ov-label').setAttribute('opacity', overlaid ? '0' : '1');
  }

  function place(animate) {
    groups.forEach((g, i) => {
      const y = overlaid ? ys[0] : ys[i];
      g.setAttribute('transform', `translate(0 ${y})`);
      style(g, i);
      if (animate && !reducedMotion() && typeof g.animate === 'function') {
        const from = overlaid ? ys[i] : ys[0];
        g.animate([{ transform: `translate(0px, ${from}px)` }, { transform: `translate(0px, ${y}px)` }], { duration: 320, easing: 'ease-out' });
      }
    });
    if (overlaid) legend.removeAttribute('hidden');
    else legend.setAttribute('hidden', '');
    svg.setAttribute('viewBox', `0 0 ${W} ${overlaid ? stackedH : height}`);
    toggle.setAttribute('aria-pressed', String(overlaid));
    toggle.querySelector('span').textContent = overlaid ? 'Wieder auseinander' : 'Übereinanderlegen';
    status.textContent = overlaid ? 'Die Streifen liegen aufeinander.' : '';
  }
  toggle.addEventListener('click', () => {
    overlaid = !overlaid;
    place(true);
    onChange?.({ overlaid });
  });
  const el = wrapper('overlay', svg, h('div', { class: 'strips-widget__controls' }, toggle, status), 'Bruchstreifen zum Vergleichen');
  el.getState = () => ({ overlaid });
  place(false);
  return el;
}

// Bedienbare Streifen. opts: { rows: { parts, filled, color? }[], interactive: 'fill'|'split'|'overlay', onChange }.
// Gibt ein <div class="strips-widget"> mit dem SVG und den Knoepfen zurueck; getState() liefert den Zustand.
export function strips(opts) {
  const { rows, interactive = 'fill', onChange } = opts;
  if (interactive === 'split') return splitStrips({ rows, onChange, minParts: opts.minParts, maxParts: opts.maxParts });
  if (interactive === 'overlay') return overlayStrips({ rows, onChange });
  return fillStrips({ rows, onChange });
}
