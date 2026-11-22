// Eine Darstellung fuer jedes Item: Kleidung am Monster (zugeschnitten), Farben als Monster, Futter, Moebel, Karten.
import { h } from '../dom.js';
import { monsterSvg, resolveColor, PEAR } from './art.js';
import { CLOTHES } from './clothes-art.js';
import { INK, shade, st } from './art-kit.js';
import { furnitureDraw } from './furniture-art.js';
import { FOOD, cardArt } from './food-art.js';

// Kleidung als eigenstaendiges Stueck: Kopf, Hand und Fuss einzeln gezeichnet, Koerperteile auf einem Rumpfstueck.
let uid = 0;
const SW = 3;
const THUMB_VIEW = { kopf: '-44 -58 88 76', koerper: '20 116 160 68', hand: '-34 -30 68 60', fuss: '-36 -30 72 50' };

function clothingThumb(item, color, cls) {
  const fill = resolveColor(color);
  const dark = shade(fill, 0.16);
  const draw = CLOTHES[item.slot][item.id];
  const ctx = { sw: SW, arm: [-20, -10] };
  let parts;
  if (item.slot === 'kopf') parts = draw(ctx);
  else if (item.slot === 'koerper') {
    const id = `thumb-clip-${++uid}`;
    parts = [h('defs', null, h('clipPath', { id }, h('path', { d: PEAR }))),
      h('path', { d: PEAR, fill, stroke: 'none' }),
      h('g', { 'clip-path': `url(#${id})` }, draw(ctx)),
      h('path', { d: PEAR, fill: 'none', ...st(SW) })];
  } else if (item.slot === 'hand') {
    parts = [h('path', { d: 'M-20 -10 L0 0', fill: 'none', stroke: INK, 'stroke-width': 19, 'stroke-linecap': 'round' }),
      h('path', { d: 'M-20 -10 L0 0', fill: 'none', stroke: fill, 'stroke-width': 13, 'stroke-linecap': 'round' }),
      h('circle', { cx: 0, cy: 0, r: 10, fill, ...st(SW) }), ...draw(ctx)];
  } else parts = [h('ellipse', { cx: 0, cy: 0, rx: 20, ry: 9, fill: dark, ...st(SW) }), ...draw(ctx)];
  return frame(THUMB_VIEW[item.slot], cls, item.name, parts);
}

const frame = (view, cls, label, children) => h('svg', {
  class: cls, viewBox: view, role: 'img', 'aria-label': label,
}, children);

export function hasArt(item) {
  if (!item) return false;
  if (item.kind === 'moebel') return !!furnitureDraw(item.id);
  if (item.kind === 'futter') return !!FOOD[item.id];
  return ['kleidung', 'farbe', 'karte'].includes(item.kind);
}

// opts.color: Monsterfarbe fuer Kleidungs- und Farbvorschau (Hex oder Id)
export function itemArt(item, opts = {}) {
  const cls = `thumb thumb--${item.kind}`;
  if (item.kind === 'kleidung') {
    return clothingThumb(item, opts.color, cls);
  }
  if (item.kind === 'farbe') {
    return monsterSvg({ stage: 3, color: item.color, view: '-8 20 216 180', label: item.name, cls });
  }
  if (item.kind === 'futter') return frame('0 0 100 100', cls, item.name, FOOD[item.id]());
  if (item.kind === 'moebel') {
    const f = furnitureDraw(item.id);
    const wall = f.where === 'wall';
    const view = wall ? '-56 -156 112 122' : '-62 -100 124 112';
    return frame(view, cls, item.name, [
      ...f.draw()]);
  }
  if (item.kind === 'karte') return frame('0 0 100 130', cls, item.name, cardArt(item));
  throw new Error(`Keine Darstellung fuer ${item.id}`);
}
