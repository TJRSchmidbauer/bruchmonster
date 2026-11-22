// Futter (Ursprung oben links, 100 x 100) und Sammelkarten-Zeichnungen.
import { h } from '../dom.js';
import { INK, st } from './art-kit.js';

const SW = 3;

export const FOOD = {
  bruchkekse: () => [
    h('path', { d: 'M12 52 A30 30 0 0 1 50 24 L44 50 L50 78 A30 30 0 0 1 12 52 Z', fill: '#E0A458', ...st(SW) }),
    h('path', { d: 'M56 22 A30 30 0 0 1 82 62 A30 30 0 0 1 56 78 L62 52 Z', fill: '#E0A458', ...st(SW) }),
    ...[[26, 44], [24, 62], [72, 40], [70, 62], [78, 52]].map(([x, y]) => h('circle', { cx: x, cy: y, r: 3.6, fill: '#6B3A1E' })),
    h('circle', { cx: 52, cy: 88, r: 2, fill: '#E0A458' }), h('circle', { cx: 60, cy: 90, r: 1.6, fill: '#E0A458' }), h('circle', { cx: 44, cy: 90, r: 1.4, fill: '#E0A458' }),
  ],
  'zaehler-zimtschnecke': () => [
    h('circle', { cx: 50, cy: 52, r: 38, fill: '#E3B070', ...st(SW) }),
    h('path', { d: 'M50 52 Q58 46 58 56 Q56 66 44 64 Q32 60 34 46 Q38 32 54 32 Q72 34 72 54 Q70 74 50 74', fill: 'none', ...st(5, { stroke: '#8A4B22' }) }),
    h('path', { d: 'M22 40 Q30 28 44 26 L40 36 Q36 44 28 50 Z', fill: '#FFFFFF', ...st(2.5) }),
    h('path', { d: 'M62 74 Q72 72 78 62 L82 70 Q74 82 66 82 Z', fill: '#FFFFFF', ...st(2.5) }),
  ],
  'nenner-nudeln': () => [
    h('path', { d: 'M16 50 Q22 40 34 42 Q38 30 50 38 Q60 28 68 40 Q82 38 84 50 Z', fill: '#FFD43B', ...st(SW) }),
    h('path', { d: 'M28 48 Q34 40 40 48 M48 48 Q54 40 60 48 M64 46 Q70 40 76 47', fill: 'none', ...st(2.2) }),
    h('path', { d: 'M10 50 L90 50 Q88 86 50 88 Q12 86 10 50 Z', fill: '#FF8A1F', ...st(SW) }),
    h('path', { d: 'M40 66 L60 66', fill: 'none', ...st(4, { stroke: '#FFFFFF' }) }),
    h('path', { d: 'M30 24 Q26 16 32 10 M48 22 Q44 14 50 8 M66 24 Q62 16 68 10', fill: 'none', ...st(2.4, { opacity: 0.5 }) }),
  ],
  'halbe-halbe-melone': () => [
    h('path', { d: 'M8 44 A42 42 0 0 0 92 44 Z', fill: '#22A866', ...st(SW) }),
    h('path', { d: 'M15 44 A35 35 0 0 0 85 44 Z', fill: '#F1F7E0', stroke: 'none' }),
    h('path', { d: 'M20 44 A30 30 0 0 0 80 44 Z', fill: '#E8456B', ...st(2) }),
    ...[[36, 54], [50, 62], [64, 54], [44, 50], [58, 49]].map(([x, y]) => h('ellipse', { cx: x, cy: y, rx: 2.2, ry: 3.4, fill: INK })),
  ],
  'viertelpfund-pudding': () => [
    h('ellipse', { cx: 50, cy: 84, rx: 40, ry: 8, fill: '#FFFFFF', ...st(SW) }),
    h('path', { d: 'M24 78 L30 36 Q50 26 70 36 L76 78 Q50 86 24 78 Z', fill: '#F5C16C', ...st(SW) }),
    h('path', { d: 'M30 36 Q50 26 70 36 Q72 46 66 46 Q64 54 58 46 Q52 52 48 44 Q42 52 38 44 Q30 46 30 36 Z', fill: '#7A3E1A', ...st(2.5) }),
    h('circle', { cx: 50, cy: 28, r: 8, fill: '#D93D73', ...st(2.5) }),
    h('path', { d: 'M50 22 Q52 14 58 12', fill: 'none', ...st(2.5) }),
  ],
  'hauptnenner-torte': () => [
    h('rect', { x: 14, y: 56, width: 72, height: 30, rx: 6, fill: '#FF9DBD', ...st(SW) }),
    h('rect', { x: 24, y: 34, width: 52, height: 24, rx: 6, fill: '#FFF1CC', ...st(SW) }),
    h('path', { d: 'M14 62 Q22 72 30 62 Q38 74 46 62 Q54 74 62 62 Q70 74 78 62 L86 62', fill: 'none', ...st(2.5, { stroke: '#FFFFFF' }) }),
    h('path', { d: 'M50 34 L50 14', fill: 'none', ...st(2.5) }),
    h('path', { d: 'M50 14 L72 20 L50 26 Z', fill: '#FFD43B', ...st(2) }),
    h('path', { d: 'M56 20 L66 20', fill: 'none', ...st(2) }),
    ...[34, 66].map((x) => h('rect', { x: x - 3, y: 24, width: 6, height: 10, fill: '#14A9BD', ...st(2) })),
  ],
};

const RARITY_COLOR = { normal: '#FFFFFF', selten: '#BFE9FF', legendaer: '#FFD43B' };

// Karte als Bildchen (Ursprung oben links, 100 x 130): Rahmen nach Seltenheit, Zeichen in der Mitte.
export function cardArt(item) {
  const fill = RARITY_COLOR[item.rarity] ?? '#FFFFFF';
  const icon = item.rarity === 'legendaer'
    ? h('path', { d: 'M30 82 L26 50 L40 62 L50 42 L60 62 L74 50 L70 82 Z', fill: '#FF8A1F', ...st(SW) })
    : item.rarity === 'selten'
      ? h('polygon', { points: '50,40 57,58 76,58 61,69 67,86 50,76 33,86 39,69 24,58 43,58', fill: '#7B5CFF', ...st(SW) })
      : h('circle', { cx: 50, cy: 64, r: 22, fill: '#22A866', ...st(SW) });
  return [
    h('rect', { x: 6, y: 6, width: 88, height: 118, rx: 10, fill, ...st(SW) }),
    h('rect', { x: 14, y: 14, width: 72, height: 80, rx: 6, fill: '#FFFFFF', ...st(2) }),
    icon,
    h('path', { d: 'M22 106 L78 106 M30 114 L70 114', fill: 'none', ...st(2.5) }),
  ];
}
