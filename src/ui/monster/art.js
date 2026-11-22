// Das Bruchmonster: ein runder, birnenfoermiger Blob mit zwei Hoernern, grossen Augen und frechem Grinsen.
// Es waechst in fuenf Stufen. Alle Stufen teilen dieselben Ankerpunkte (nur Ei und Hoerner unterscheiden sich),
// daher sitzt jedes Kleidungsstueck in jeder Stufe richtig: die ganze Figur wird nur skaliert.
import { h } from '../dom.js';
import { ITEMS, DEFAULT_COLOR } from '../../core/economy.js';
import { INK, mix, shade, tint, st } from './art-kit.js';
import { clothingDraw } from './clothes-art.js';

export const MONSTER_COLORS = {
  kiwi: '#7DB82F',
  tuerkis: '#14A9BD',
  kuerbis: '#FF8A1F',
  violett: '#7B5CFF',
  himbeere: '#D93D73',
};

// Farbname, Farb-Item-id oder Hex-Wert ergibt immer eine gueltige Hex-Farbe.
export function resolveColor(id) {
  if (typeof id === 'string') {
    if (/^#[0-9a-f]{6}$/i.test(id)) return id;
    const item = ITEMS.find((it) => it.kind === 'farbe' && it.id === id);
    if (item) return item.color;
    if (MONSTER_COLORS[id]) return MONSTER_COLORS[id];
  }
  return MONSTER_COLORS[DEFAULT_COLOR];
}

export const STAGE_NAMES = ['Ei mit Augen', 'Baby-Monster', 'Monsterkind', 'Monster-Teen', 'Großes Monster'];

const PEAR = 'M38 166 Q14 108 52 62 Q72 28 100 28 Q128 28 148 62 Q186 108 162 166 Q100 184 38 166 Z';
const EGG = 'M100 40 Q160 40 166 112 Q170 176 100 178 Q30 176 34 112 Q40 40 100 40 Z';
const PIVOT = [100, 184];
const mirror = (x) => 200 - x;

// s: Skalierung der ganzen Figur, eye/pupil: Augen, hornTip: Spitze des linken Horns (null = keins)
const STAGES = [
  { s: 0.8, body: EGG, hat: [100, 48], eyes: [83, 114], eyeR: 12, hand: [172, 140], arm: [152, 130], feet: [78, 122], hornTip: null },
  { s: 0.64, body: PEAR, hat: [100, 36], eyes: [76, 86], eyeR: 20, hand: [180, 136], arm: [160, 126], feet: [68, 132], hornTip: null },
  { s: 0.78, body: PEAR, hat: [100, 36], eyes: [76, 84], eyeR: 18, hand: [180, 136], arm: [160, 126], feet: [68, 132], hornTip: [58, 31] },
  { s: 0.9, body: PEAR, hat: [100, 36], eyes: [76, 84], eyeR: 17, hand: [180, 136], arm: [160, 126], feet: [68, 132], hornTip: [54, 20] },
  { s: 1, body: PEAR, hat: [100, 36], eyes: [76, 84], eyeR: 17, hand: [180, 136], arm: [160, 126], feet: [68, 132], hornTip: [50, 8] },
];

let uid = 0;

// Zuschnitt auf die Figur (nur oben), damit kleine Stufen nicht in leerem Raum schweben.
function fitView(spec, idx, hat) {
  const top = hat ? spec.hat[1] - 54 : idx === 4 ? 6 : idx >= 2 ? 20 : spec.hat[1] - 10;
  const y0 = Math.floor(Math.min(PIVOT[1] - (PIVOT[1] - top) * spec.s - 24, 150));
  return `-8 ${y0} 216 ${200 - y0}`;
}

const dot = (cx, cy, r, fill, extra = {}) => h('circle', { cx, cy, r, fill, ...extra });

function face(spec, mood, line) {
  const [ex, ey] = spec.eyes;
  const r = spec.eyeR;
  const out = [];
  const pupil = mood === 'hungry' ? [0, 6] : [4, 3];
  for (const side of [-1, 1]) {
    const cx = side < 0 ? ex : mirror(ex);
    if (mood === 'happy') {
      out.push(h('path', { d: `M${cx - r * 0.8} ${ey + 4} Q${cx} ${ey - r * 0.9} ${cx + r * 0.8} ${ey + 4}`, fill: 'none', ...st(line + 1.2) }));
    } else {
      out.push(dot(cx, ey, r, '#FFFFFF', st(line)),
        dot(cx - side * pupil[0], ey + pupil[1], r * 0.42, INK),
        dot(cx - side * pupil[0] - 2, ey + pupil[1] - 2.5, r * 0.13, '#FFFFFF'));
    }
  }
  if (spec.body === EGG) {
    out.push(h('path', { d: 'M91 141 Q100 149 109 141', fill: 'none', ...st(line + 0.5) }));
    return out;
  }
  if (mood === 'happy') {
    out.push(dot(54, 108, 8, '#FF6FA0', { opacity: 0.45 }), dot(146, 108, 8, '#FF6FA0', { opacity: 0.45 }),
      h('path', { d: 'M66 108 Q100 150 134 108 Z', fill: '#FFFFFF', ...st(line) }),
      h('path', { d: 'M82 130 Q100 118 118 130 Q100 144 82 130 Z', fill: '#E8588A', stroke: 'none' }),
      h('path', { d: 'M84 112 L88 122 L94 111 M106 111 L112 122 L116 112', fill: 'none', ...st(line * 0.9) }));
  } else if (mood === 'hungry') {
    out.push(h('path', { d: 'M88 112 Q100 104 112 112 Q116 132 100 134 Q84 132 88 112 Z', fill: INK, ...st(line) }),
      h('path', { d: 'M92 126 Q100 120 108 126 Q106 134 100 134 Q94 134 92 126 Z', fill: '#E8588A', stroke: 'none' }),
      h('path', { d: 'M114 124 Q120 132 114 138 Q108 132 114 124 Z', fill: '#9AD8FF', ...st(line * 0.7) }));
  } else {
    out.push(h('path', { d: 'M72 112 Q100 138 128 112 Z', fill: '#FFFFFF', ...st(line) }),
      h('path', { d: 'M86 116 L90 126 L96 117 M104 117 L110 126 L114 116', fill: 'none', ...st(line * 0.9) }));
  }
  return out;
}

function eggShell(spec, fill, dark, line) {
  const zig = 'M36 100 L58 88 L72 98 L90 82 L104 96 L122 82 L138 96 L164 86';
  const cap = `${zig} Q158 46 100 40 Q46 46 36 100 Z`;
  return {
    inside: h('path', { d: `${zig} L162 104 L38 106 Z`, fill: shade(fill, 0.4), ...st(line) }),
    cap: h('g', { class: 'egg-cap', transform: 'translate(-2 -9) rotate(-5 100 70)' },
      h('path', { d: cap, fill, ...st(line) }),
      h('path', { d: 'M70 58 Q82 50 96 50', fill: 'none', stroke: tint(fill, 0.5), 'stroke-width': 4, 'stroke-linecap': 'round' })),
  };
}

function wings(fill, line) {
  const wing = (side) => {
    const x = (v) => (side < 0 ? v : mirror(v));
    return h('path', {
      d: `M${x(52)} 80 Q${x(8)} 40 ${x(6)} 92 Q${x(14)} 78 ${x(22)} 94 Q${x(30)} 82 ${x(40)} 100 Z`,
      fill, ...st(line),
    });
  };
  return [wing(-1), wing(1)];
}

function slotGroup(slot, attrs, children) {
  return h('g', { class: `slot slot--${slot}`, 'data-slot': slot, ...attrs }, children);
}

export function monsterSvg({ stage = 1, color = DEFAULT_COLOR, wearing = {}, mood = 'neutral', view, fit = false, label, cls = 'monster-svg' } = {}) {
  const idx = Math.max(0, Math.min(4, Math.trunc(Number(stage)) || 0));
  const spec = STAGES[idx];
  const fill = resolveColor(color);
  const dark = shade(fill, 0.16);
  const darker = shade(fill, 0.3);
  const horn = mix(fill, '#FFF1CC', 0.7);
  const line = 3 / spec.s;
  const clipId = `ms-clip-${++uid}`;
  const [hx, hy] = spec.hand;
  const [ax, ay] = spec.arm;
  const arm = [ax - hx, ay - hy];
  const egg = idx === 0;
  const shell = egg ? eggShell(spec, fill, dark, line) : null;
  const bodyStroke = h('path', { d: spec.body, fill: 'none', ...st(line) });

  // Rueckwaertige Teile: Fluegel, Schwanz, Hoerner, Arme, Fuesse
  const back = [];
  if (idx === 4) {
    back.push(...wings(darker, line));
    back.push(h('path', { d: 'M158 160 Q188 170 190 146', fill: 'none', stroke: INK, 'stroke-width': 8 + line * 2, 'stroke-linecap': 'round' }),
      h('path', { d: 'M158 160 Q188 170 190 146', fill: 'none', stroke: dark, 'stroke-width': 8, 'stroke-linecap': 'round' }),
      h('path', { d: 'M190 148 L182 130 L191 137 L196 122 L199 140 Z', fill: darker, ...st(line) }));
  }
  if (spec.hornTip) {
    const [tx, ty] = spec.hornTip;
    const big = idx === 4 ? 1.15 : 1;
    for (const side of [-1, 1]) {
      const x = (v) => (side < 0 ? v : mirror(v));
      back.push(h('path', {
        d: `M${x(54)} ${60} Q${x(tx - 4 * big)} ${ty + 22} ${x(tx)} ${ty} Q${x(tx + 20)} ${ty + 6 * big} ${x(86)} 36 Z`,
        fill: horn, ...st(line),
      }));
    }
  }
  for (const side of [-1, 1]) {
    const x = (v) => (side < 0 ? v : mirror(v));
    back.push(
      h('path', { d: `M${x(ax)} ${ay} L${x(hx)} ${hy}`, fill: 'none', stroke: INK, 'stroke-width': 13 + line * 2, 'stroke-linecap': 'round' }),
      h('path', { d: `M${x(ax)} ${ay} L${x(hx)} ${hy}`, fill: 'none', stroke: fill, 'stroke-width': 13, 'stroke-linecap': 'round' }),
      dot(x(hx), hy, 10, fill, st(line)));
  }
  for (const fx of spec.feet) back.push(h('ellipse', { cx: fx, cy: 177, rx: 20, ry: 9, fill: dark, ...st(line) }));

  // Koerper, Muster, Kleidung
  const bodyParts = [h('path', { d: spec.body, fill, stroke: 'none' })];
  if (egg) {
    bodyParts.push(...[[60, 140, 6], [138, 150, 7], [112, 164, 5], [74, 162, 4], [150, 126, 4]].map(([x, y, r]) => dot(x, y, r, dark)));
    bodyParts.push(shell.inside);
  } else {
    bodyParts.push(h('ellipse', { cx: 100, cy: 152, rx: 34, ry: 20, fill: dark }));
    if (idx >= 3) {
      bodyParts.push(...[[48, 122, 6], [152, 118, 7], [84, 48, 4], [120, 46, 5], [62, 150, 4]].map(([x, y, r]) => dot(x, y, r, darker)));
    }
  }
  const skin = h('g', { class: 'skin', 'clip-path': `url(#${clipId})` }, bodyParts);
  const worn = (slot) => (wearing ?? {})[slot];
  const kd = clothingDraw('koerper', worn('koerper'));
  const shirt = slotGroup('koerper', { 'clip-path': `url(#${clipId})` }, kd ? kd({ sw: line }) : []);

  // Kleidung an Kopf, Haenden und Fuessen
  const ctx = { sw: line, arm };
  const headDraw = clothingDraw('kopf', worn('kopf'));
  const hatT = egg ? `translate(${spec.hat[0] - 2} ${spec.hat[1] - 9}) rotate(-5)` : `translate(${spec.hat[0]} ${spec.hat[1]})`;
  const kopfG = slotGroup('kopf', { transform: hatT }, headDraw ? headDraw(ctx) : []);

  const handDraw = clothingDraw('hand', worn('hand'));
  const handG = slotGroup('hand', {}, handDraw ? [-1, 1].map((side) => h('g', {
    transform: side > 0 ? `translate(${hx} ${hy})` : `translate(${mirror(hx)} ${hy}) scale(-1 1)`,
  }, handDraw(ctx))) : []);

  const footDraw = clothingDraw('fuss', worn('fuss'));
  const fussG = slotGroup('fuss', {}, footDraw ? spec.feet.map((fx) => h('g', { transform: `translate(${fx} 177)` }, footDraw(ctx))) : []);

  const tuft = idx === 4 ? h('path', { d: 'M92 32 L93 14 L100 27 L107 12 L108 32 Z', fill: darker, ...st(line) }) : null;

  const svg = h('svg', {
    class: cls,
    viewBox: view ?? (fit ? fitView(spec, idx, !!clothingDraw('kopf', worn('kopf'))) : '-8 -26 216 226'),
    role: 'img',
    'aria-label': label ?? `Dein Monster, ${STAGE_NAMES[idx]}`,
    'data-stage': idx,
  },
  h('defs', null, h('clipPath', { id: clipId }, h('path', { d: spec.body }))),
  h('ellipse', { cx: 100, cy: 184, rx: 72, ry: 7, fill: INK, opacity: 0.18 }),
  h('g', { class: 'monster-body', transform: `translate(${PIVOT[0]} ${PIVOT[1]}) scale(${spec.s}) translate(${-PIVOT[0]} ${-PIVOT[1]})` },
    h('g', { class: 'layer layer--back' }, back),
    skin, shirt, bodyStroke,
    fussG, handG,
    h('g', { class: 'layer layer--face' }, face(spec, mood, line)),
    tuft,
    egg ? shell.cap : null,
    kopfG));
  return svg;
}
