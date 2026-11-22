// Hoehle-Tab: Hoehle mit Moebeln, Aufstellen/Wegraeumen, Verschieben per Zeiger, Tastatur und Knoepfen.
import { h, announce } from '../dom.js';
import { ITEMS, placeFurniture } from '../../core/economy.js';
import { itemArt } from './thumbs.js';
import { caveSvg, moveFurniture, SLOTS, CAVE_W, CAVE_H } from './cave.js';
import { keyed, plural } from './kit.js';

const nameOf = (id) => ITEMS.find((it) => it.id === id)?.name ?? id;
const ROW = 4;

function commit(ctx, cave, focusSlot, text) {
  const p = ctx.app.profile;
  ctx.app.setProfile({ ...p, cave });
  ctx.focusKey = focusSlot == null ? null : `slot:${focusSlot}`;
  if (text) announce(text);
  ctx.rerender();
}

// Zeiger: Moebel mit Maus, Stift oder Finger auf einen anderen Platz ziehen.
function attachDrag(ctx, svg) {
  let drag = null;
  const toSvg = (e) => {
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / (r.width || 1)) * CAVE_W, y: ((e.clientY - r.top) / (r.height || 1)) * CAVE_H };
  };
  svg.addEventListener('pointerdown', (e) => {
    const g = e.target.closest?.('.cave-item');
    if (!g || (e.button !== undefined && e.button > 0)) return;
    drag = { g, from: Number(g.getAttribute('data-slot')), start: toSvg(e), moved: false, base: g.getAttribute('transform') };
    svg.setPointerCapture?.(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const pt = toSvg(e);
    const dx = pt.x - drag.start.x;
    const dy = pt.y - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    drag.g.setAttribute('transform', `translate(${dx} ${dy}) ${drag.base}`);
  });
  const end = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    const pt = toSvg(e);
    let best = 0;
    let bestD = Infinity;
    SLOTS.forEach((s, i) => {
      const dist = Math.hypot(s.x - pt.x, s.y - 30 - pt.y);
      if (dist < bestD) { bestD = dist; best = i; }
    });
    const cave = ctx.app.profile.cave;
    const to = Math.min(best, cave.length - 1);
    if (to === d.from) { d.g.setAttribute('transform', d.base); return; }
    commit(ctx, moveFurniture(cave, d.from, to), to, `${nameOf(cave[d.from])} steht jetzt auf Platz ${to + 1}.`);
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', () => {
    if (!drag) return;
    drag.g.setAttribute('transform', drag.base);
    drag = null;
  });
}

function attachKeys(ctx, svg) {
  svg.addEventListener('keydown', (e) => {
    const g = e.target.closest?.('.cave-item');
    if (!g) return;
    const cave = ctx.app.profile.cave;
    const from = Number(g.getAttribute('data-slot'));
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -ROW, ArrowDown: ROW }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      const to = Math.max(0, Math.min(cave.length - 1, from + step));
      if (to === from) return;
      commit(ctx, moveFurniture(cave, from, to), to, `${nameOf(cave[from])} steht jetzt auf Platz ${to + 1}.`);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const res = placeFurniture(ctx.app.profile, cave[from], false);
      if (res.ok) {
        ctx.app.setProfile(res.profile);
        ctx.focusKey = null;
        announce(`${nameOf(cave[from])} ist weggeräumt.`);
        ctx.rerender();
      }
    }
  });
}

function furnitureRow(ctx, item) {
  const p = ctx.app.profile;
  const idx = p.cave.indexOf(item.id);
  const placed = idx >= 0;
  const toggle = (b) => {
    if (b.disabled) return;
    b.disabled = true;
    ctx.focusKey = b.getAttribute('data-key');
    const res = placeFurniture(p, item.id, !placed);
    if (res.ok) {
      ctx.app.setProfile(res.profile);
      ctx.mood = 'happy';
      ctx.say(placed ? `${item.name} ist weggeräumt.` : `${item.name} steht jetzt in der Höhle.`);
    } else ctx.say('Die Höhle ist voll (8 von 8). Räum erst etwas weg, dann passt wieder was rein.');
    ctx.rerender();
  };
  const move = (dir, label) => keyed(`${dir > 0 ? 'right' : 'left'}:${item.id}`, label, {
    variant: 'secondary', 'aria-label': `${item.name} ${dir > 0 ? 'nach rechts' : 'nach links'} schieben`, disabled: dir < 0 ? idx === 0 : idx === p.cave.length - 1,
  }, (b) => {
    if (b.disabled) return;
    const to = idx + dir;
    commit(ctx, moveFurniture(p.cave, idx, to), to, `${item.name} steht jetzt auf Platz ${to + 1}.`);
  });
  return h('li', { class: `wardrobe__item${placed ? ' wardrobe__item--on' : ''}`, 'data-item': item.id },
    h('div', { class: 'wardrobe__art' }, itemArt(item)),
    h('div', { class: 'wardrobe__body' },
      h('h4', { class: 'wardrobe__name' }, item.name, placed ? h('span', { class: 'wardrobe__pos' }, ` · Platz ${idx + 1}`) : null),
      h('div', { class: 'wardrobe__actions' },
        keyed(`place:${item.id}`, placed ? 'Wegräumen' : 'Aufstellen', { variant: placed ? 'secondary' : 'primary', 'aria-label': `${item.name} ${placed ? 'wegräumen' : 'aufstellen'}` }, toggle),
        placed ? [move(-1, '←'), move(1, '→')] : null)));
}

export function renderCaveTab(ctx) {
  const p = ctx.app.profile;
  const mine = ITEMS.filter((it) => it.kind === 'moebel' && p.owned.includes(it.id));
  const open = ITEMS.filter((it) => it.kind === 'moebel').length - mine.length;
  const svg = caveSvg(p, { interactive: true });
  attachDrag(ctx, svg);
  attachKeys(ctx, svg);
  svg.querySelectorAll('.cave-item').forEach((g) => g.setAttribute('data-key', `slot:${g.getAttribute('data-slot')}`));
  return h('div', { class: 'cavetab' },
    h('div', { class: 'cave' }, svg),
    h('p', { class: 'cave__count', role: 'status' }, ctx.message ?? `Platz belegt: ${p.cave.length} von 8`),
    h('p', { class: 'small cave__hint' }, 'Zum Verschieben ein Möbelstück ziehen, oder mit Tab anwählen und die Pfeiltasten benutzen. Entfernen räumt es weg.'),
    mine.length
      ? h('ul', { class: 'wardrobe__list' }, mine.map((m) => furnitureRow(ctx, m)))
      : h('p', { class: 'wardrobe__empty' }, 'Noch keine Möbel. Der Shop hat welche.'),
    open > 0 ? h('button', { type: 'button', class: 'linkbtn', onclick: () => ctx.goTab('shop', { cat: 'moebel' }) }, `Noch ${plural(open, 'Möbelstück', 'Möbelstücke')} im Shop`) : null);
}
