// Eine Darstellung fuer jedes Item: Kleidung am Monster (zugeschnitten), Farben als Monster, Futter, Moebel, Karten.
import { h } from '../dom.js';
import { monsterSvg } from './art.js';
import { furnitureDraw } from './furniture-art.js';
import { FOOD, cardArt } from './food-art.js';

// Zuschnitt (viewBox) je Kleidungs-Slot, damit das Stueck gross zu sehen ist.
const SLOT_VIEW = {
  kopf: '30 -14 140 110',
  koerper: '20 100 160 100',
  hand: '146 100 60 60',
  fuss: '28 140 144 56',
};

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
    return monsterSvg({ stage: 4, color: opts.color, wearing: { [item.slot]: item.id }, view: SLOT_VIEW[item.slot], label: item.name, cls });
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
