// Moebel fuer die Hoehle. Ursprung (0,0) = Mitte der Standflaeche auf dem Boden, nach oben negativ y.
// where: 'floor' steht auf dem Boden des Platzes, 'wall' haengt an der Rueckwand, 'rug' liegt flach davor.
import { h } from '../dom.js';
import { INK, st } from './art-kit.js';

const SW = 3;
const WOOD = '#B9783A';
const WOOD_D = '#8A5A2B';
const GOLD = '#FFD43B';

const leg = (x1, y1, x2, y2, w = 7) => [
  h('path', { d: `M${x1} ${y1} L${x2} ${y2}`, fill: 'none', stroke: INK, 'stroke-width': w + SW * 2, 'stroke-linecap': 'round' }),
  h('path', { d: `M${x1} ${y1} L${x2} ${y2}`, fill: 'none', stroke: WOOD_D, 'stroke-width': w, 'stroke-linecap': 'round' }),
];

export const FURNITURE = {
  'dreibein-hocker': { where: 'floor', draw: () => [
    ...leg(-18, -30, -26, -3), ...leg(18, -30, 26, -3), ...leg(0, -28, 0, -2),
    h('ellipse', { cx: 0, cy: -34, rx: 30, ry: 9, fill: WOOD, ...st(SW) }),
    h('path', { d: 'M-18 -35 Q0 -31 18 -35', fill: 'none', ...st(2) }),
  ] },
  'stachel-kaktus': { where: 'floor', draw: () => [
    h('path', { d: 'M-12 -72 Q-12 -80 0 -80 Q12 -80 12 -72 L12 -24 L-12 -24 Z', fill: '#3FA34D', ...st(SW) }),
    h('path', { d: 'M-12 -50 L-22 -50 Q-30 -50 -30 -58 L-30 -66 Q-30 -72 -24 -72 Q-18 -72 -18 -66 L-18 -58 L-12 -58', fill: '#3FA34D', ...st(SW) }),
    h('path', { d: 'M12 -44 L22 -44 Q28 -44 28 -50 L28 -58', fill: 'none', stroke: INK, 'stroke-width': 17, 'stroke-linecap': 'round' }),
    h('path', { d: 'M12 -44 L22 -44 Q28 -44 28 -50 L28 -58', fill: 'none', stroke: '#3FA34D', 'stroke-width': 11, 'stroke-linecap': 'round' }),
    h('path', { d: 'M-4 -66 L-4 -62 M5 -58 L5 -54 M-3 -46 L-3 -42 M4 -38 L4 -34 M-24 -62 L-24 -58 M26 -54 L26 -52', fill: 'none', ...st(2, { stroke: '#FFFFFF' }) }),
    h('circle', { cx: 0, cy: -84, r: 6, fill: '#FF4FA3', ...st(2.5) }),
    h('path', { d: 'M-20 -26 L20 -26 L16 0 L-16 0 Z', fill: '#D2693E', ...st(SW) }),
    h('rect', { x: -22, y: -30, width: 44, height: 8, rx: 3, fill: '#E0794C', ...st(SW) }),
  ] },
  'halbrunder-teppich': { where: 'rug', draw: () => [
    h('path', { d: 'M-52 0 A52 22 0 0 1 52 0 Z', fill: '#D93D73', ...st(SW) }),
    h('path', { d: 'M-36 0 A36 14 0 0 1 36 0 Z', fill: GOLD, ...st(2.5) }),
    h('path', { d: 'M-20 0 A20 7 0 0 1 20 0 Z', fill: '#FFFFFF', ...st(2.5) }),
    h('path', { d: 'M-52 3 L52 3', fill: 'none', ...st(5, { 'stroke-dasharray': '1 7' }) }),
  ] },
  'bruchsack-kissen': { where: 'floor', draw: () => [
    h('path', { d: 'M-38 0 Q-46 -30 -12 -36 Q10 -44 32 -30 Q46 -12 38 0 Q0 6 -38 0 Z', fill: '#7B5CFF', ...st(SW) }),
    h('path', { d: 'M-20 -30 Q0 -24 22 -30', fill: 'none', ...st(2, { 'stroke-dasharray': '4 4' }) }),
    h('path', { d: 'M-8 -14 L8 -14', fill: 'none', ...st(3, { stroke: '#FFFFFF' }) }),
    h('circle', { cx: 0, cy: -21, r: 1.9, fill: '#FFFFFF' }),
    h('circle', { cx: 0, cy: -7, r: 1.9, fill: '#FFFFFF' }),
  ] },
  'dreiviertel-gemaelde': { where: 'wall', draw: () => [
    h('rect', { x: -32, y: -104, width: 64, height: 50, rx: 3, fill: WOOD, ...st(SW) }),
    h('rect', { x: -26, y: -98, width: 52, height: 38, fill: '#FFF1CC', ...st(2.5) }),
    h('circle', { cx: 0, cy: -79, r: 15, fill: '#FFFFFF', ...st(2.5) }),
    h('path', { d: 'M0 -79 L0 -94 A15 15 0 1 1 -15 -79 Z', fill: '#FF8A1F', ...st(2.5) }),
  ] },
  zaehlerregal: { where: 'wall', draw: () => [
    h('rect', { x: -40, y: -74, width: 80, height: 8, rx: 2, fill: WOOD, ...st(SW) }),
    h('path', { d: 'M-30 -66 L-30 -56 L-20 -66 M30 -66 L30 -56 L20 -66', fill: 'none', ...st(SW) }),
    h('rect', { x: -32, y: -96, width: 16, height: 22, rx: 2, fill: '#14A9BD', ...st(2.5) }),
    h('rect', { x: -14, y: -104, width: 16, height: 30, rx: 2, fill: '#FF8A1F', ...st(2.5) }),
    h('rect', { x: 4, y: -92, width: 16, height: 18, rx: 2, fill: '#D93D73', ...st(2.5) }),
    ...[['1', -24, -80], ['2', -6, -86], ['3', 12, -79]].map(([t, x, y]) => h('text', { x, y, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 900, 'font-family': 'Grandstander, system-ui, sans-serif', fill: '#FFFFFF' }, t)),
    h('path', { d: 'M24 -74 Q22 -88 30 -90 Q38 -88 36 -74 Z', fill: '#D2693E', ...st(2.5) }),
    h('circle', { cx: 30, cy: -94, r: 6, fill: '#3FA34D', ...st(2.5) }),
  ] },
  'viertelmond-lampe': { where: 'wall', draw: () => [
    h('path', { d: 'M0 -150 L0 -110', fill: 'none', ...st(2.5) }),
    h('circle', { cx: 0, cy: -84, r: 34, fill: GOLD, opacity: 0.28 }),
    h('path', { d: 'M-4 -112 A24 24 0 1 0 22 -76 A19 19 0 1 1 -4 -112 Z', fill: GOLD, ...st(SW) }),
    h('circle', { cx: 4, cy: -92, r: 2.6, fill: INK }),
    h('path', { d: 'M-2 -84 Q4 -80 8 -85', fill: 'none', ...st(2) }),
  ] },
  'nenner-esstisch': { where: 'floor', draw: () => [
    h('rect', { x: -40, y: -34, width: 9, height: 34, rx: 2, fill: WOOD_D, ...st(SW) }),
    h('rect', { x: 31, y: -34, width: 9, height: 34, rx: 2, fill: WOOD_D, ...st(SW) }),
    h('rect', { x: -50, y: -44, width: 100, height: 12, rx: 4, fill: WOOD, ...st(SW) }),
    h('ellipse', { cx: -4, cy: -46, rx: 22, ry: 5, fill: '#FFFFFF', ...st(2.5) }),
    h('path', { d: 'M-10 -48 A12 7 0 0 1 8 -48 Z', fill: '#FF8A1F', ...st(2) }),
    h('path', { d: 'M24 -46 L24 -62 L40 -54 Z', fill: '#D93D73', ...st(2) }),
    h('path', { d: 'M24 -62 L24 -46', fill: 'none', ...st(2.5) }),
  ] },
  halbbogenfenster: { where: 'wall', draw: () => [
    h('path', { d: 'M-26 -52 L-26 -92 A26 26 0 0 1 26 -92 L26 -52 Z', fill: '#BFE9FF', ...st(SW + 1) }),
    h('path', { d: 'M0 -118 L0 -52 M-26 -80 L26 -80', fill: 'none', ...st(2.5) }),
    h('path', { d: 'M12 -100 L14 -95 L19 -95 L15 -92 L17 -87 L12 -90 L7 -87 L9 -92 L5 -95 L10 -95 Z', fill: GOLD, ...st(1.5) }),
    h('rect', { x: -32, y: -52, width: 64, height: 8, rx: 3, fill: WOOD, ...st(SW) }),
  ] },
  'zweidrittel-sofa': { where: 'floor', draw: () => [
    h('rect', { x: -46, y: -58, width: 92, height: 38, rx: 14, fill: '#22A866', ...st(SW) }),
    h('rect', { x: -58, y: -34, width: 22, height: 34, rx: 10, fill: '#1B8A54', ...st(SW) }),
    h('rect', { x: 36, y: -34, width: 22, height: 34, rx: 10, fill: '#1B8A54', ...st(SW) }),
    h('rect', { x: -38, y: -30, width: 76, height: 24, rx: 8, fill: '#2FC27C', ...st(SW) }),
    h('path', { d: 'M-13 -30 L-13 -6 M13 -30 L13 -6', fill: 'none', ...st(2.5) }),
    h('rect', { x: -28, y: -52, width: 18, height: 18, rx: 5, fill: GOLD, ...st(2.5) }),
    h('rect', { x: 10, y: -52, width: 18, height: 18, rx: 5, fill: '#FFFFFF', ...st(2.5) }),
    h('rect', { x: -46, y: -2, width: 9, height: 6, rx: 2, fill: WOOD_D, ...st(2) }),
    h('rect', { x: 37, y: -2, width: 9, height: 6, rx: 2, fill: WOOD_D, ...st(2) }),
  ] },
  schatztruhe: { where: 'floor', draw: () => [
    h('path', { d: 'M-36 -30 Q-36 -56 0 -56 Q36 -56 36 -30 Z', fill: WOOD, ...st(SW) }),
    h('rect', { x: -36, y: -32, width: 72, height: 32, rx: 3, fill: '#A0642E', ...st(SW) }),
    h('path', { d: 'M-18 -54 L-18 0 M18 -54 L18 0', fill: 'none', ...st(5, { stroke: '#7C8A99' }) }),
    h('path', { d: 'M-18 -54 L-18 0 M18 -54 L18 0', fill: 'none', ...st(1.5, { stroke: '#C9D3DC' }) }),
    h('rect', { x: -8, y: -42, width: 16, height: 16, rx: 3, fill: GOLD, ...st(2.5) }),
    h('circle', { cx: 0, cy: -36, r: 2.4, fill: INK }),
    h('path', { d: 'M0 -36 L0 -30', fill: 'none', ...st(2.5) }),
  ] },
};

export const furnitureDraw = (id) => FURNITURE[id] ?? null;
