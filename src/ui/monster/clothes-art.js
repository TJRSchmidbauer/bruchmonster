// Kleidung: je Item eine Zeichnung im lokalen Koordinatensystem seines Slots.
//  kopf:    Ursprung = Kopfoberseite, nach oben negativ y
//  koerper: absolute Monsterkoordinaten (wird an der Koerperform abgeschnitten)
//  hand:    Ursprung = rechte Hand, ctx.arm = Vektor von der Hand zum Arm (linke Hand wird gespiegelt)
//  fuss:    Ursprung = Fussmitte auf dem Boden
import { h } from '../dom.js';
import { st } from './art-kit.js';

const GOLD = '#FFD43B';
const WOOD = '#8A5A2B';

const kopf = {
  zaehlerkrone: ({ sw }) => [
    h('path', { d: 'M-28 5 L-31 -22 L-15 -10 L0 -31 L15 -10 L31 -22 L28 5 Z', fill: GOLD, ...st(sw) }),
    h('path', { d: 'M-28 -3 L28 -3', fill: 'none', ...st(sw * 0.7) }),
    h('circle', { cx: 0, cy: -9, r: 4, fill: '#D93D73', ...st(sw * 0.7) }),
    h('circle', { cx: -16, cy: -4, r: 2.6, fill: '#14A9BD', ...st(sw * 0.6) }),
    h('circle', { cx: 16, cy: -4, r: 2.6, fill: '#14A9BD', ...st(sw * 0.6) }),
    h('circle', { cx: 0, cy: -33, r: 3.2, fill: GOLD, ...st(sw * 0.7) }),
  ],
  'halbe-halbe-muetze': ({ sw }) => [
    h('path', { d: 'M-30 6 Q-33 -31 0 -33 L0 6 Z', fill: '#FF8A1F', ...st(sw) }),
    h('path', { d: 'M0 -33 Q33 -31 30 6 L0 6 Z', fill: '#22A866', ...st(sw) }),
    h('rect', { x: -33, y: -3, width: 66, height: 13, rx: 6, fill: '#FFFFFF', ...st(sw) }),
    h('path', { d: 'M-18 -2 L-18 9 M-6 -2 L-6 9 M6 -2 L6 9 M18 -2 L18 9', fill: 'none', ...st(sw * 0.6) }),
    h('circle', { cx: 0, cy: -38, r: 7, fill: GOLD, ...st(sw) }),
  ],
  'dreiviertel-zylinder': ({ sw }) => [
    h('rect', { x: -22, y: -46, width: 44, height: 50, rx: 4, fill: '#4B3470', ...st(sw) }),
    h('ellipse', { cx: 0, cy: 4, rx: 34, ry: 7, fill: '#4B3470', ...st(sw) }),
    ...[0, 1, 2, 3].map((i) => h('rect', { x: -22 + i * 11, y: -16, width: 11, height: 11, fill: i < 3 ? GOLD : '#FFFFFF', ...st(sw * 0.7) })),
  ],
};

const koerper = {
  dreiviertelhose: ({ sw }) => [
    h('rect', { x: -10, y: 140, width: 220, height: 60, fill: '#3A66B0', ...st(sw) }),
    h('rect', { x: -10, y: 140, width: 220, height: 9, fill: '#2E5090', ...st(sw) }),
    h('path', { d: 'M100 149 L100 200', fill: 'none', ...st(sw) }),
    h('rect', { x: 44, y: 112, width: 10, height: 32, fill: '#2E5090', ...st(sw) }),
    h('rect', { x: 146, y: 112, width: 10, height: 32, fill: '#2E5090', ...st(sw) }),
    h('circle', { cx: 49, cy: 144, r: 3.5, fill: GOLD, ...st(sw * 0.7) }),
    h('circle', { cx: 151, cy: 144, r: 3.5, fill: GOLD, ...st(sw * 0.7) }),
    h('rect', { x: 118, y: 158, width: 18, height: 14, rx: 2, fill: GOLD, ...st(sw * 0.8) }),
    h('path', { d: 'M121 165 L133 165', fill: 'none', ...st(sw * 0.6, { 'stroke-dasharray': '2 2' }) }),
  ],
  achtelweste: ({ sw }) => [
    h('path', { d: 'M-10 136 L92 136 L103 200 L-10 200 Z', fill: '#7B5CFF', ...st(sw) }),
    h('path', { d: 'M210 136 L108 136 L97 200 L210 200 Z', fill: '#7B5CFF', ...st(sw) }),
    ...[22, 38, 54, 70].map((x) => h('path', { d: `M${x} 142 L${x} 196 M${200 - x} 142 L${200 - x} 196`, fill: 'none', stroke: '#C9BBFF', 'stroke-width': 2.2 })),
    h('circle', { cx: 92, cy: 156, r: 3.5, fill: GOLD, ...st(sw * 0.7) }),
    h('circle', { cx: 94, cy: 176, r: 3.5, fill: GOLD, ...st(sw * 0.7) }),
  ],
  'gebrochen-shirt': ({ sw }) => [
    h('path', { d: 'M-10 134 Q100 150 210 134 L210 200 L-10 200 Z', fill: '#FFFFFF', ...st(sw) }),
    ...[150, 164, 178, 192].map((y) => h('path', { d: `M-10 ${y} L210 ${y}`, fill: 'none', stroke: '#FF9DBD', 'stroke-width': 6 })),
    h('path', { d: 'M-10 134 Q100 150 210 134', fill: 'none', ...st(sw) }),
    h('path', { d: 'M16 168 L48 154 L62 170 L88 152 L104 172 L128 154 L146 170 L186 156', fill: 'none', ...st(sw) }),
    h('rect', { x: 142, y: 142, width: 22, height: 10, rx: 4, fill: '#FFC9A8', transform: 'rotate(-18 153 147)', ...st(sw * 0.7) }),
  ],
};

const hand = {
  halbhandschuhe: ({ sw }) => [
    h('path', { d: 'M-12 0 A12 12 0 0 0 12 0 Z', fill: '#D93D73', ...st(sw) }),
    h('rect', { x: -13, y: -5, width: 26, height: 7, rx: 3, fill: '#FFFFFF', ...st(sw * 0.8) }),
  ],
  'teiler-faeustlinge': ({ sw }) => [
    h('ellipse', { cx: -5, cy: -9, rx: 5, ry: 7, fill: '#3A7BD5', ...st(sw) }),
    h('circle', { cx: 0, cy: 0, r: 14, fill: '#3A7BD5', ...st(sw) }),
    h('path', { d: 'M-6 0 L6 0', fill: 'none', ...st(2.6, { stroke: '#FFFFFF' }) }),
    h('circle', { cx: 0, cy: -5.5, r: 1.8, fill: '#FFFFFF' }),
    h('circle', { cx: 0, cy: 5.5, r: 1.8, fill: '#FFFFFF' }),
  ],
  'bruchband-armreif': ({ sw, arm }) => {
    const [ax, ay] = arm;
    const deg = (Math.atan2(ay, ax) * 180) / Math.PI;
    return [h('g', { transform: `translate(${ax * 0.5} ${ay * 0.5}) rotate(${deg})` },
      h('rect', { x: -4.5, y: -10, width: 9, height: 20, rx: 2, fill: '#FF8A1F', ...st(sw) }),
      h('path', { d: 'M-4.5 0 L4.5 0', fill: 'none', ...st(2, { stroke: '#FFFFFF' }) }))];
  },
};

const fuss = {
  'nenner-gummistiefel': ({ sw }) => [
    h('path', { d: 'M-15 -20 L15 -20 L15 -3 Q30 -3 30 5 Q30 11 18 11 L-15 11 Q-19 11 -19 6 L-19 -14 Q-19 -20 -15 -20 Z', fill: GOLD, ...st(sw) }),
    h('rect', { x: -19, y: -20, width: 34, height: 7, fill: '#F39C12', ...st(sw * 0.8) }),
    h('path', { d: 'M-19 6 L24 6', fill: 'none', ...st(sw * 0.7) }),
  ],
  'kuerz-sneaker': ({ sw }) => [
    h('path', { d: 'M-18 2 L-18 -9 Q-8 -13 2 -6 Q10 -1 24 -1 Q31 0 30 5 L-18 5 Z', fill: '#FFFFFF', ...st(sw) }),
    h('path', { d: 'M-22 4 L30 4 L30 9 Q30 13 24 13 L-16 13 Q-22 13 -22 8 Z', fill: '#D93D73', ...st(sw) }),
    h('path', { d: 'M-12 -4 L-4 -1 M-8 -8 L0 -4', fill: 'none', ...st(sw * 0.6) }),
  ],
  'halbe-socken': ({ sw }) => [
    h('path', { d: 'M-13 -18 L13 -18 L13 -2 Q26 -2 26 5 Q26 10 16 10 L-13 10 Q-17 10 -17 5 L-17 -12 Q-17 -18 -13 -18 Z', fill: '#FFFFFF', ...st(sw) }),
    h('path', { d: 'M-17 -13 L13 -13 M-17 -7 L13 -7', fill: 'none', ...st(sw * 0.9, { stroke: '#D93D73' }) }),
    h('path', { d: 'M14 4 Q22 4 23 8', fill: 'none', ...st(sw * 0.7) }),
  ],
};

export const CLOTHES = { kopf, koerper, hand, fuss };

export const clothingDraw = (slot, id) => CLOTHES[slot]?.[id] ?? null;
