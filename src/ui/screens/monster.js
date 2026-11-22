// Monster-Bereich: Tabs Monster, Schrank, Hoehle, Shop, Karten. Alle Aenderungen laufen ueber app.setProfile.
import { h, button, announce } from '../dom.js';
import { go } from '../router.js';
import { ITEMS, monsterStage, STAGE_XP } from '../../core/economy.js';
import { monsterSvg, STAGE_NAMES } from '../monster/art.js';
import { itemArt } from '../monster/thumbs.js';
import { renderShop, purchase } from '../monster/shop.js';
import { renderWardrobe } from '../monster/wardrobe.js';
import { renderCaveTab } from '../monster/cave-tab.js';
import { renderCards } from '../monster/cards.js';
import { keyed, price, profileMonster, hop, plural } from '../monster/kit.js';

const TABS = [
  ['monster', 'Monster'],
  ['schrank', 'Schrank'],
  ['hoehle', 'Höhle'],
  ['shop', 'Shop'],
  ['karten', 'Karten'],
];
const TITLES = { schrank: 'Kleiderschrank', hoehle: 'Deine Höhle', shop: 'Shop', karten: 'Sammelkarten' };
let screenNo = 0;

function progress(xp) {
  const stage = monsterStage(xp);
  if (stage >= 4) return null;
  const from = STAGE_XP[stage];
  const span = STAGE_XP[stage + 1] - from;
  return { now: xp - from, span, next: STAGE_NAMES[stage + 1], missing: STAGE_XP[stage + 1] - xp };
}

function levelUpOverlay(ctx, stage) {
  const key = ctx.focusKey;
  ctx.focusKey = null;
  const id = `lvl-${screenNo}`;
  const ok = button('Weiter', { variant: 'primary' });
  const close = () => {
    dlg.remove();
    ctx.overlay = null;
    ctx.focusKey = key;
    ctx.rerender();
  };
  ok.addEventListener('click', close);
  const sparks = Array.from({ length: 8 }, (_, i) => h('span', { class: 'spark', style: `--i:${i}`, 'aria-hidden': 'true' }));
  const dlg = h('div', {
    class: 'overlay', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id,
    onkeydown: (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'Tab') { e.preventDefault(); ok.focus(); }
    },
  },
  h('div', { class: 'overlay__card' },
    sparks,
    monsterSvg({ stage, color: ctx.app.profile.color, wearing: ctx.app.profile.wearing, mood: 'happy', fit: true, cls: 'overlay__monster' }),
    h('h2', { class: 'overlay__title', id }, 'Dein Monster ist gewachsen!'),
    h('p', { class: 'overlay__stage' }, `Jetzt bist du: ${STAGE_NAMES[stage]}`),
    ok));
  ctx.root.append(dlg);
  ctx.overlay = dlg;
  ok.focus();
  announce(`Dein Monster ist gewachsen! Jetzt: ${STAGE_NAMES[stage]}`);
}

function renderMonsterTab(ctx) {
  const p = ctx.app.profile;
  const stage = monsterStage(p.xp);
  const prog = progress(p.xp);
  const mood = ctx.mood ?? (p.xp === 0 ? 'hungry' : 'neutral');
  const greeting = p.xp === 0 ? 'Mir knurrt der Magen. Hast du was Rundes?' : stage === 4 ? 'Größer geht’s nicht. Ich bin jetzt offiziell riesig.' : 'Hunger! Du weißt schon, wonach.';
  const days = p.streak.days;
  const toCard = 3 - (days % 3);
  const foods = ITEMS.filter((it) => it.kind === 'futter');

  const feedRow = (f) => {
    const missing = f.price - p.coins;
    const locked = Date.now() < (ctx.lockUntil ?? 0);
    return h('li', { class: 'feed', 'data-item': f.id },
      h('div', { class: 'feed__art' }, itemArt(f)),
      h('div', { class: 'feed__body' },
        h('span', { class: 'feed__name' }, f.name),
        h('span', { class: 'feed__meta' }, price(f.price), h('span', null, `+${f.xp} Wachstum`))),
      missing > 0
        ? keyed(`buy:${f.id}`, `Noch ${missing}`, { variant: 'secondary', disabled: true, 'aria-label': `${f.name}: noch ${plural(missing, 'Münze', 'Münzen')} nötig` }, () => {})
        : keyed(`buy:${f.id}`, 'Füttern', { variant: 'primary', disabled: locked, 'aria-label': `${f.name} füttern für ${f.price} Münzen` }, (b) => purchase(ctx, f, b)));
  };

  return h('div', { class: 'monstertab' },
    h('div', { class: 'monstertab__hero' },
      h('div', { class: 'stage stage--big' }, profileMonster(p, mood)),
      h('div', { class: 'bubble monstertab__bubble', role: 'status' }, h('p', { class: 'bubble__text' }, ctx.message ?? greeting))),
    h('section', { class: 'growth', 'aria-label': 'Wachstum' },
      h('h2', { class: 'growth__stage' }, STAGE_NAMES[stage]),
      prog
        ? [h('div', {
          class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': prog.span, 'aria-valuenow': prog.now,
          'aria-valuetext': `${prog.now} von ${prog.span} Wachstumspunkten bis ${prog.next}`, 'aria-label': 'Wachstum bis zur nächsten Stufe',
        }, prog.now > 0 ? h('div', { class: 'meter__fill', style: `width:${Math.round((prog.now / prog.span) * 100)}%` }) : null),
        h('p', { class: 'growth__text' }, `Noch ${prog.missing} Wachstum bis ${prog.next}.`)]
        : h('p', { class: 'growth__text' }, 'Ausgewachsen. Mehr Futter macht jetzt nur noch glücklich.')),
    h('p', { class: 'streakline' },
      h('span', { class: 'streakline__big' }, days > 0 ? `${plural(days, 'Tag', 'Tage')} in Folge` : 'Noch keine Serie'),
      h('span', null, days > 0 ? `Noch ${plural(toCard, 'Tag', 'Tage')} bis zur nächsten Karte, wenn du dranbleibst.` : 'Komm morgen wieder, dann geht die Serie los.')),
    h('section', { class: 'feedlist', 'aria-label': 'Futter' },
      h('h2', { class: 'section-title' }, 'Füttern'),
      h('ul', { class: 'feeds' }, foods.map(feedRow))));
}

export function renderMonster(root, params, app) {
  screenNo += 1;
  const uid = `mon${screenNo}`;
  const ctx = {
    app, root, shopCat: params?.cat ?? 'futter', message: null, mood: null, focusKey: null, lockUntil: 0, overlay: null,
  };
  let current = TABS.some(([k]) => k === params?.tab) ? params.tab : 'monster';
  let timer = null;

  const panel = h('div', { class: 'tabpanel', role: 'tabpanel', id: `${uid}-panel`, tabindex: '-1' });
  const tabEls = new Map();

  const renderTab = () => {
    const body = { monster: renderMonsterTab, schrank: renderWardrobe, hoehle: renderCaveTab, shop: renderShop, karten: renderCards }[current](ctx);
    return current === 'monster' ? body : h('div', { class: `panel panel--${current}` }, h('h2', { class: 'panel__title' }, TITLES[current]), body);
  };
  const restoreFocus = () => {
    if (!ctx.focusKey) return;
    const el = panel.querySelector(`[data-key="${ctx.focusKey}"]`);
    if (el && !el.disabled && typeof el.focus === 'function') el.focus({ preventScroll: true });
  };
  ctx.rerender = () => {
    panel.setAttribute('aria-labelledby', `${uid}-tab-${current}`);
    panel.replaceChildren(renderTab());
    restoreFocus();
  };
  ctx.say = (text) => { ctx.message = text; announce(text); };
  ctx.unlockLater = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ctx.rerender(), 480);
    timer.unref?.();
  };
  ctx.onFed = (before, after, item, line) => {
    ctx.mood = 'happy';
    ctx.say(`Mampf! ${line}`);
    ctx.rerender();
    hop(panel.querySelector('.monster-svg'));
    const was = monsterStage(before.xp);
    const now = monsterStage(after.xp);
    if (now > was) levelUpOverlay(ctx, now);
  };

  const select = (name, focus = false) => {
    current = name;
    ctx.message = null;
    ctx.mood = null;
    ctx.focusKey = null;
    for (const [k, el] of tabEls) {
      const on = k === name;
      el.setAttribute('aria-selected', String(on));
      el.setAttribute('tabindex', on ? '0' : '-1');
    }
    ctx.rerender();
    if (focus) tabEls.get(name).focus();
  };
  ctx.goTab = (name, opts = {}) => {
    if (opts.cat) ctx.shopCat = opts.cat;
    select(name, true);
  };

  const names = TABS.map(([k]) => k);
  const onKey = (e) => {
    const i = names.indexOf(current);
    const to = { ArrowRight: (i + 1) % names.length, ArrowLeft: (i + names.length - 1) % names.length, Home: 0, End: names.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    select(names[to], true);
  };
  const tablist = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Monster-Bereiche', onkeydown: onKey },
    TABS.map(([k, label]) => {
      const el = h('button', {
        type: 'button', class: 'tab', role: 'tab', id: `${uid}-tab-${k}`, 'data-tab': k,
        'aria-selected': String(k === current), 'aria-controls': `${uid}-panel`, tabindex: k === current ? '0' : '-1',
        onclick: () => select(k),
      }, label);
      tabEls.set(k, el);
      return el;
    }));

  root.append(h('div', { class: 'screen screen--monster' },
    h('div', { class: 'monster__head' },
      button('Zurück', { variant: 'ghost', onClick: () => go('hub') }),
      h('h1', { class: 'title' }, 'Mein Monster')),
    tablist, panel,
    button('Spielstand sichern', { variant: 'ghost', 'data-act': 'export', onClick: () => app.exportProfile?.() })));
  ctx.rerender();

  return () => {
    clearTimeout(timer);
    ctx.overlay?.remove();
  };
}
