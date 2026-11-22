// Monster-Vorschau. Platzhalter: freundlicher Blob in der Profilfarbe (Task 11 ersetzt ihn).
import { h } from '../dom.js';

export const MONSTER_COLORS = {
  kiwi: '#7DB82F',
  tuerkis: '#14A9BD',
  kuerbis: '#FF8A1F',
  violett: '#7B5CFF',
  himbeere: '#D93D73',
};

export const monsterColor = (name) => MONSTER_COLORS[name] ?? MONSTER_COLORS.kiwi;

export function monsterPreview(profile) {
  const fill = monsterColor(profile?.color);
  const ink = '#2B1B3D';
  const st = { stroke: ink, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  return h('svg', { class: 'monster-preview', viewBox: '0 0 200 180', role: 'img', 'aria-label': 'Dein Monster' },
    h('ellipse', { cx: 100, cy: 164, rx: 62, ry: 9, fill: ink, opacity: 0.18 }),
    h('path', { d: 'M40 150 Q18 96 56 54 Q74 22 100 22 Q126 22 144 54 Q182 96 160 150 Q100 166 40 150 Z', fill, ...st }),
    h('path', { d: 'M62 38 L52 12 L82 28 M138 38 L148 12 L118 28', fill, ...st }),
    h('circle', { cx: 78, cy: 80, r: 17, fill: '#FFFFFF', ...st }),
    h('circle', { cx: 124, cy: 80, r: 17, fill: '#FFFFFF', ...st }),
    h('circle', { cx: 82, cy: 83, r: 7, fill: ink }),
    h('circle', { cx: 120, cy: 83, r: 7, fill: ink }),
    h('path', { d: 'M70 116 Q100 142 130 116 Z', fill: '#FFFFFF', ...st }),
    h('path', { d: 'M86 120 L90 130 L96 121 M104 121 L110 130 L114 120', fill: 'none', ...st, 'stroke-width': 3 }));
}
