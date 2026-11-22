// Kleiderschrank: besessene Kleidung je Slot anziehen/ausziehen, Farben waehlen.
import { h } from '../dom.js';
import { ITEMS, equip, DEFAULT_COLOR } from '../../core/economy.js';
import { itemArt } from './thumbs.js';
import { resolveColor } from './art.js';
import { keyed, profileMonster, plural } from './kit.js';

const SLOTS = [['kopf', 'Kopf'], ['koerper', 'Körper'], ['hand', 'Hände'], ['fuss', 'Füße']];

function toggle(ctx, id, btn) {
  if (btn.disabled) return;
  btn.disabled = true;
  ctx.focusKey = btn.getAttribute('data-key');
  const res = equip(ctx.app.profile, id);
  if (res.ok) {
    ctx.app.setProfile(res.profile);
    ctx.mood = 'happy';
  } else ctx.say('Das kann ich nicht anziehen.');
  ctx.rerender();
}

function row(ctx, item) {
  const p = ctx.app.profile;
  const on = p.wearing[item.slot] === item.id;
  return h('li', { class: `wardrobe__item${on ? ' wardrobe__item--on' : ''}`, 'data-item': item.id },
    h('div', { class: 'wardrobe__art' }, itemArt(item, { color: p.color })),
    h('div', { class: 'wardrobe__body' },
      h('h4', { class: 'wardrobe__name' }, item.name),
      keyed(`equip:${item.id}`, on ? 'Ausziehen' : 'Anziehen', { variant: on ? 'secondary' : 'primary', 'aria-label': `${item.name} ${on ? 'ausziehen' : 'anziehen'}` }, (b) => toggle(ctx, item.id, b))));
}

function shopLink(ctx, cat, text) {
  return h('button', { type: 'button', class: 'linkbtn', 'data-key': `shoplink:${cat}`, onclick: () => ctx.goTab('shop', { cat }) }, text);
}

export function renderWardrobe(ctx) {
  const p = ctx.app.profile;
  const clothes = ITEMS.filter((it) => it.kind === 'kleidung');
  const groups = SLOTS.map(([slot, label]) => {
    const all = clothes.filter((c) => c.slot === slot);
    const mine = all.filter((c) => p.owned.includes(c.id));
    const open = all.length - mine.length;
    return h('section', { class: 'wardrobe__group', 'aria-label': label },
      h('h3', { class: 'wardrobe__slot' }, label),
      mine.length ? h('ul', { class: 'wardrobe__list' }, mine.map((c) => row(ctx, c))) : h('p', { class: 'wardrobe__empty' }, 'Hier hängt noch nichts.'),
      open > 0 ? shopLink(ctx, 'kleidung', `Noch ${plural(open, 'Stück', 'Stücke')} im Shop`) : null);
  });

  const colors = ITEMS.filter((it) => it.kind === 'farbe');
  const owned = colors.filter((c) => p.owned.includes(c.id));
  const swatch = (id, name) => keyed(`color:${id}`, name, {
    variant: 'secondary', 'aria-pressed': String(p.color === id), 'aria-label': `Farbe ${name}`,
  }, (b) => {
    if (b.disabled) return;
    b.disabled = true;
    ctx.focusKey = b.getAttribute('data-key');
    const res = equip(p, id);
    if (res.ok) ctx.app.setProfile(res.profile);
    ctx.rerender();
  });
  const swatches = [['kiwi', 'Kiwi', resolveColor(DEFAULT_COLOR)], ...owned.map((c) => [c.id, c.name, c.color])].map(([id, name, hex]) => {
    const b = swatch(id, name);
    b.classList.add('swatch');
    b.prepend(h('span', { class: 'swatch__dot', style: `background:${hex}`, 'aria-hidden': 'true' }));
    return h('li', null, b);
  });
  const openColors = colors.length - owned.length;

  return h('div', { class: 'wardrobe' },
    h('div', { class: 'wardrobe__mirror' },
      h('div', { class: 'stage stage--small' }, profileMonster(p, ctx.mood ?? 'neutral')),
      h('p', { class: 'wardrobe__line', role: 'status' }, ctx.message ?? 'Spiegel, Spiegel an der Wand. Wer ist das schönste Monster im Land?')),
    h('div', { class: 'wardrobe__lists' },
      ...groups,
      h('section', { class: 'wardrobe__group', 'aria-label': 'Farben' },
        h('h3', { class: 'wardrobe__slot' }, 'Farben'),
        h('ul', { class: 'swatches' }, swatches),
        openColors > 0 ? shopLink(ctx, 'farbe', `Noch ${plural(openColors, 'Farbe', 'Farben')} im Shop`) : null)));
}

