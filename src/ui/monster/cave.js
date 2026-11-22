// Die Wohnhoehle: Hintergrund und bis zu 8 Moebel auf festen Plaetzen (Platz = Index in p.cave).
// Plaetze 0-3 stehen vorn, 4-7 hinten. Wandstuecke haengen an der Rueckwand, Teppiche liegen flach davor.
import { h } from '../dom.js';
import { ITEMS, CAVE_MAX } from '../../core/economy.js';
import { INK, st } from './art-kit.js';
import { monsterSvg } from './art.js';
import { monsterStage } from '../../core/economy.js';
import { furnitureDraw } from './furniture-art.js';

export const CAVE_W = 440;
export const CAVE_H = 350;
const WALL_BASE = 150;

const FRONT_Y = 252;
const BACK_Y = 176;
const XS = [62, 167, 272, 377];

// x/y = Mitte der Standflaeche, scale = Groesse (hinten kleiner)
export const SLOTS = Array.from({ length: CAVE_MAX }, (_, i) => (
  i < 4 ? { x: XS[i], y: FRONT_Y, scale: 1 } : { x: XS[i - 4], y: BACK_Y, scale: 0.78 }
));

const nameOf = (id) => ITEMS.find((it) => it.id === id)?.name ?? id;

// Neue Reihenfolge, wenn das Moebel auf Platz `from` auf Platz `to` rutscht (Rest rueckt nach).
export function moveFurniture(cave, from, to) {
  if (from < 0 || from >= cave.length) return [...cave];
  const target = Math.max(0, Math.min(cave.length - 1, to));
  const next = [...cave];
  const [id] = next.splice(from, 1);
  next.splice(target, 0, id);
  return next;
}

function background() {
  const rock = '#5A3F8F';
  const rockLight = '#6F52A8';
  const drips = [[40, 34], [120, 52], [210, 28], [300, 56], [390, 38]];
  return [
    h('rect', { x: 0, y: 0, width: CAVE_W, height: CAVE_H, fill: '#F0E2BE' }),
    h('path', { d: `M0 0 L${CAVE_W} 0 L${CAVE_W} ${WALL_BASE} Q220 ${WALL_BASE + 12} 0 ${WALL_BASE} Z`, fill: rock }),
    h('path', { d: `M0 ${WALL_BASE} Q220 ${WALL_BASE + 12} ${CAVE_W} ${WALL_BASE}`, fill: 'none', ...st(3) }),
    h('path', { d: 'M30 96 Q60 70 96 94 M250 110 Q290 80 330 104 M150 80 Q176 66 200 84', fill: 'none', stroke: rockLight, 'stroke-width': 7, 'stroke-linecap': 'round' }),
    ...drips.map(([x, len]) => h('path', { d: `M${x - 16} 0 L${x} ${len} L${x + 16} 0 Z`, fill: rockLight, ...st(3) })),
    h('path', { d: `M0 ${CAVE_H - 4} L${CAVE_W} ${CAVE_H - 4}`, fill: 'none', ...st(3) }),
    h('path', { d: 'M20 196 Q36 188 50 196 M330 214 Q352 204 372 214 M190 190 Q206 184 220 190', fill: 'none', stroke: '#D4BC8A', 'stroke-width': 5, 'stroke-linecap': 'round' }),
    h('path', { d: 'M400 160 L408 132 L416 160 Z M414 160 L424 138 L432 160 Z', fill: '#14A9BD', ...st(2.5) }),
  ];
}

// Alle Moebel eines Profils in Zeichenreihenfolge: Wand, Teppiche, dann Boden von hinten nach vorn.
function ordered(cave) {
  const entries = cave.map((id, slot) => ({ id, slot, art: furnitureDraw(id), s: SLOTS[slot] })).filter((e) => e.art && e.s);
  const rank = (e) => (e.art.where === 'wall' ? 0 : e.art.where === 'rug' ? 1 : 2);
  return entries.sort((a, b) => rank(a) - rank(b) || (rank(a) === 2 ? a.s.y - b.s.y : 0) || a.slot - b.slot);
}

// Das eigene Monster steht im Vordergrund und verdeckt keinen Platz.
function home(p) {
  if (!p) return null;
  const m = monsterSvg({ stage: monsterStage(p.xp ?? 0), color: p.color, wearing: p.wearing ?? {}, mood: 'happy', cls: 'cave-monster' });
  m.setAttribute('x', CAVE_W / 2 - 52);
  m.setAttribute('y', 252);
  m.setAttribute('width', 104);
  m.setAttribute('height', 98);
  m.setAttribute('pointer-events', 'none');
  return m;
}

// opts.interactive: Plaetze als Zeiger-/Tastaturziele markieren (Handler haengt cave-tab.js an)
export function caveSvg(p, opts = {}) {
  const cave = p?.cave ?? [];
  const items = ordered(cave).map((e) => {
    const wall = e.art.where === 'wall';
    const x = e.s.x;
    const y = wall ? WALL_BASE : e.s.y;
    const sc = wall ? 0.95 : e.s.scale;
    const g = h('g', {
      class: `cave-item cave-item--${e.art.where}`, 'data-slot': e.slot, 'data-id': e.id,
      transform: `translate(${x} ${y}) scale(${sc})`,
    }, e.art.draw());
    if (opts.interactive) {
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-label', `Platz ${e.slot + 1} von ${cave.length}: ${nameOf(e.id)}. Pfeiltasten verschieben, Entfernen räumt weg.`);
      g.append(h('rect', { class: 'cave-hit', x: -56, y: wall ? -156 : -96, width: 112, height: wall ? 122 : 100, fill: 'transparent', stroke: 'none' }),
        h('rect', { class: 'cave-ring', x: -56, y: wall ? -156 : -96, width: 112, height: wall ? 122 : 100, rx: 8, fill: 'none', stroke: 'none' }));
    }
    return g;
  });
  const empties = opts.interactive
    ? SLOTS.slice(cave.length).map((s, i) => h('ellipse', {
      class: 'cave-slot', 'data-empty': cave.length + i, cx: s.x, cy: s.y - 2, rx: 44 * s.scale, ry: 11 * s.scale,
      fill: 'none', stroke: INK, 'stroke-width': 2.5, 'stroke-dasharray': '6 6', opacity: 0.45, 'aria-hidden': 'true',
    }))
    : [];
  return h('svg', {
    class: 'cave-svg', viewBox: `0 0 ${CAVE_W} ${CAVE_H}`, role: 'img',
    'aria-label': cave.length === 0 ? 'Deine Höhle ist noch leer' : `Deine Höhle mit ${cave.length} Möbelstücken: ${cave.map(nameOf).join(', ')}`,
  }, background(), empties, items, home(p));
}
