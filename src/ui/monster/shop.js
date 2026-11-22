// Shop: Futter, Kleidung, Farben, Moebel. Kaeufe sind gegen Doppelklick gesichert.
import { h } from '../dom.js';
import { ITEMS, buy } from '../../core/economy.js';
import { itemArt } from './thumbs.js';
import { keyed, price, coach } from './kit.js';

export const CATEGORIES = [
  ['futter', 'Futter'],
  ['kleidung', 'Kleidung'],
  ['farbe', 'Farben'],
  ['moebel', 'Möbel'],
];
const LOCK_MS = 450;
const BUY_LINES = {
  kleidung: (it) => `${it.name} gehört jetzt dir. Ab in den Kleiderschrank!`,
  farbe: (it) => `${it.name} ist deins. Im Kleiderschrank kannst du mich umfärben.`,
  moebel: (it) => `${it.name} gehört jetzt dir. Stell es in die Höhle!`,
};
const FEED_LINES = ['Schmatz! Mehr davon.', 'Mjam! Ich glaube, ich wachse.', 'Das war lecker. Ich hab sogar die Krümel gegessen.', 'Rülps. Pardon.'];
const REASONS = {
  'zu-wenig': 'Dafür fehlen noch Münzen. Ein paar Aufgaben, dann klappt es.',
  'schon-besessen': 'Das hast du schon.',
  unbekannt: 'Das gibt es nicht.',
  'nicht-kaeuflich': 'Das kann man nicht kaufen.',
};

const locked = (ctx) => Date.now() < (ctx.lockUntil ?? 0);

// Kauf eines Items. Erster Klick sperrt Knopf und Shop kurz, weitere Klicks tun nichts.
export function purchase(ctx, item, btn) {
  if (btn?.disabled || locked(ctx)) return;
  if (btn) btn.disabled = true;
  ctx.lockUntil = Date.now() + LOCK_MS;
  ctx.focusKey = btn?.getAttribute('data-key') ?? null;
  const app = ctx.app;
  const before = app.profile;
  const res = buy(before, item.id);
  if (!res.ok) {
    ctx.lockUntil = 0;
    ctx.say(REASONS[res.reason] ?? 'Das hat nicht geklappt.');
    ctx.rerender();
    return;
  }
  app.setProfile(res.profile);
  if (item.kind === 'futter') ctx.onFed(before, res.profile, item, FEED_LINES[Math.floor(app.rng() * FEED_LINES.length)]);
  else {
    ctx.mood = 'happy';
    ctx.say(BUY_LINES[item.kind](item));
    ctx.rerender();
  }
  ctx.unlockLater();
}

function itemCard(ctx, item) {
  const p = ctx.app.profile;
  const owned = item.kind !== 'futter' && p.owned.includes(item.id);
  const worn = item.kind === 'kleidung' ? p.wearing[item.slot] === item.id : item.kind === 'farbe' ? p.color === item.id : false;
  const placed = item.kind === 'moebel' && p.cave.includes(item.id);
  const missing = item.price - p.coins;

  let action;
  if (owned) {
    const state = worn ? 'Angezogen' : placed ? 'In der Höhle' : 'Gekauft';
    action = h('p', { class: 'shopcard__state' }, h('span', { class: 'shopcard__tick', 'aria-hidden': 'true' }, '✓'), state);
  } else if (missing > 0) {
    action = keyed(`buy:${item.id}`, `Noch ${missing} ${missing === 1 ? 'Münze' : 'Münzen'}`, { variant: 'secondary', disabled: true, 'aria-label': `${item.name}: noch ${missing} ${missing === 1 ? 'Münze' : 'Münzen'} nötig` }, () => {});
  } else {
    action = keyed(`buy:${item.id}`, item.kind === 'futter' ? 'Füttern' : 'Kaufen', {
      variant: 'primary', disabled: locked(ctx), 'aria-label': `${item.name} ${item.kind === 'futter' ? 'füttern' : 'kaufen'} für ${item.price} Münzen`,
    }, (b) => purchase(ctx, item, b));
  }
  return h('li', { class: `shopcard${owned ? ' shopcard--owned' : ''}`, 'data-item': item.id },
    h('div', { class: 'shopcard__art' }, itemArt(item, { color: p.color })),
    h('div', { class: 'shopcard__body' },
      h('h3', { class: 'shopcard__name' }, item.name),
      h('p', { class: 'shopcard__meta' }, price(item.price), item.kind === 'futter' ? h('span', { class: 'shopcard__xp' }, `+${item.xp} Wachstum`) : null),
      action));
}

export function renderShop(ctx) {
  const p = ctx.app.profile;
  const cat = ctx.shopCat;
  const items = ITEMS.filter((it) => it.kind === cat);
  return h('div', { class: 'shop' },
    coach(ctx, p.xp === 0 ? 'Mein Magen knurrt. Hast du was Rundes?' : 'Was darf es sein?'),
    h('div', { class: 'cats', role: 'group', 'aria-label': 'Kategorie' },
      CATEGORIES.map(([key, label]) => h('button', {
        type: 'button', class: 'cat', 'data-cat': key, 'aria-pressed': String(key === cat),
        onclick: () => { ctx.shopCat = key; ctx.focusKey = `cat:${key}`; ctx.rerender(); },
        'data-key': `cat:${key}`,
      }, label))),
    h('ul', { class: 'shopgrid' }, items.map((it) => itemCard(ctx, it))));
}
