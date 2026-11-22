import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

let win, doc;
let monsterSvg, STAGE_NAMES, CLOTHES, FURNITURE, FOOD, itemArt, hasArt, caveSvg, moveFurniture, SLOTS;
let renderMonster, ITEMS, monsterStage, touchStreak, defaultProfile, makeRng;

before(async () => {
  const parsed = parseHTML('<!doctype html><html><body><div id="app"></div></body></html>');
  win = parsed.window;
  doc = parsed.document;
  globalThis.document = doc;
  globalThis.window = win;
  ({ monsterSvg, STAGE_NAMES } = await import('../src/ui/monster/art.js'));
  ({ CLOTHES } = await import('../src/ui/monster/clothes-art.js'));
  ({ FURNITURE } = await import('../src/ui/monster/furniture-art.js'));
  ({ FOOD } = await import('../src/ui/monster/food-art.js'));
  ({ itemArt, hasArt } = await import('../src/ui/monster/thumbs.js'));
  ({ caveSvg, moveFurniture, SLOTS } = await import('../src/ui/monster/cave.js'));
  ({ renderMonster } = await import('../src/ui/screens/monster.js'));
  ({ ITEMS, monsterStage, touchStreak } = await import('../src/core/economy.js'));
  ({ defaultProfile } = await import('../src/core/storage.js'));
  ({ makeRng } = await import('../src/core/rng.js'));
});

const SLOT_NAMES = ['kopf', 'koerper', 'hand', 'fuss'];
const ofKind = (kind) => ITEMS.filter((it) => it.kind === kind);
const profile = (over = {}) => ({ ...defaultProfile('Test', 'p1', '2026-11-01T00:00:00.000Z'), coins: 500, ...over });

function fakeApp(p) {
  const app = {
    profile: p, saved: 0, toasts: [],
    rng: makeRng(5),
    today: () => '2026-11-22',
    setProfile(next) { app.profile = next; app.saved += 1; return { ok: true }; },
    toast(t) { app.toasts.push(t); },
  };
  return app;
}

function open(p, params = {}) {
  const app = fakeApp(p);
  const root = doc.createElement('div');
  doc.body.append(root);
  const cleanup = renderMonster(root, params, app);
  return { app, root, cleanup };
}

const click = (el) => el.dispatchEvent(new win.Event('click', { bubbles: true }));
const key = (el, k) => {
  const e = new win.Event('keydown', { bubbles: true, cancelable: true });
  e.key = k;
  el.dispatchEvent(e);
  return e;
};
const byKey = (root, k) => root.querySelector(`[data-key="${k}"]`);
const tab = (root, name) => root.querySelector(`[role="tab"][data-tab="${name}"]`);

// ---------- Monster-Zeichnung ----------

test('monsterSvg: alle Stufen, Stimmungen und Farben rendern ohne Fehler', () => {
  for (let stage = 0; stage <= 4; stage++) {
    for (const mood of ['neutral', 'happy', 'hungry']) {
      for (const color of ['kiwi', 'farbe-ozean', '#FF4FA3']) {
        const svg = monsterSvg({ stage, color, wearing: {}, mood });
        assert.equal(svg.tagName.toLowerCase(), 'svg');
        assert.equal(svg.getAttribute('role'), 'img');
        assert.match(svg.getAttribute('aria-label'), new RegExp(STAGE_NAMES[stage]));
        for (const s of SLOT_NAMES) assert.ok(svg.querySelector(`[data-slot="${s}"]`), `${stage}/${s}`);
      }
    }
  }
});

test('monsterSvg: jedes Kleidungsstueck erscheint in genau seinem Slot, in jeder Stufe', () => {
  for (let stage = 0; stage <= 4; stage++) {
    for (const it of ofKind('kleidung')) {
      const svg = monsterSvg({ stage, color: 'kiwi', wearing: { [it.slot]: it.id } });
      for (const s of SLOT_NAMES) {
        const n = svg.querySelector(`[data-slot="${s}"]`).childNodes.length;
        if (s === it.slot) assert.ok(n > 0, `${it.id} stage ${stage} leer`);
        else assert.equal(n, 0, `${it.id} stage ${stage} zeichnet in ${s}`);
      }
    }
  }
});

test('monsterSvg: voller Anzug ueber alle Stufen, ungueltige Stufe faellt zurueck', () => {
  const wearing = { kopf: 'zaehlerkrone', koerper: 'achtelweste', hand: 'teiler-faeustlinge', fuss: 'kuerz-sneaker' };
  for (let stage = 0; stage <= 4; stage++) {
    const svg = monsterSvg({ stage, color: 'farbe-neon', wearing });
    for (const s of SLOT_NAMES) assert.ok(svg.querySelector(`[data-slot="${s}"]`).childNodes.length > 0);
  }
  assert.equal(monsterSvg({ stage: 99, wearing: { kopf: 'unbekannt' } }).tagName.toLowerCase(), 'svg');
  assert.ok(monsterSvg({ stage: 3 }).querySelectorAll('clipPath').length >= 1);
});

test('monsterSvg: Hoerner erst ab Stufe 2, Fluegel nur in Stufe 4', () => {
  const paths = (stage) => monsterSvg({ stage }).querySelector('.layer--back').childNodes.length;
  assert.ok(paths(1) < paths(2));
  assert.ok(paths(3) <= paths(4));
  assert.ok(paths(4) > paths(3));
});

// ---------- Darstellungen ----------

test('jedes Item aus ITEMS hat eine Darstellung', () => {
  for (const it of ITEMS) {
    assert.ok(hasArt(it), it.id);
    const svg = itemArt(it, { color: 'kiwi' });
    assert.equal(svg.tagName.toLowerCase(), 'svg', it.id);
    assert.ok(svg.childNodes.length > 0, it.id);
    assert.ok(svg.getAttribute('aria-label'), it.id);
  }
});

test('Zeichenfunktionen: Kleidung, Farben (ueber Item), Moebel, Futter', () => {
  for (const it of ofKind('kleidung')) assert.equal(typeof CLOTHES[it.slot][it.id], 'function', it.id);
  for (const it of ofKind('moebel')) assert.equal(typeof FURNITURE[it.id]?.draw, 'function', it.id);
  for (const it of ofKind('futter')) assert.equal(typeof FOOD[it.id], 'function', it.id);
  for (const it of ofKind('farbe')) assert.match(it.color, /^#[0-9a-f]{6}$/i);
});

// ---------- Hoehle ----------

test('caveSvg: leer und mit allen 8 Plaetzen', () => {
  assert.equal(caveSvg(profile()).querySelectorAll('.cave-item').length, 0);
  const ids = ofKind('moebel').slice(0, 8).map((m) => m.id);
  const svg = caveSvg(profile({ cave: ids }));
  assert.equal(svg.querySelectorAll('.cave-item').length, 8);
  assert.equal(SLOTS.length, 8);
  const slots = [...svg.querySelectorAll('.cave-item')].map((g) => g.getAttribute('data-slot')).sort();
  assert.deepEqual(slots, ['0', '1', '2', '3', '4', '5', '6', '7']);
  for (const m of ofKind('moebel')) assert.equal(caveSvg(profile({ cave: [m.id] })).querySelectorAll('.cave-item').length, 1, m.id);
});

test('moveFurniture: verschiebt, begrenzt, mutiert nicht', () => {
  const cave = ['a', 'b', 'c', 'd'];
  assert.deepEqual(moveFurniture(cave, 0, 2), ['b', 'c', 'a', 'd']);
  assert.deepEqual(moveFurniture(cave, 3, 0), ['d', 'a', 'b', 'c']);
  assert.deepEqual(moveFurniture(cave, 1, 99), ['a', 'c', 'd', 'b']);
  assert.deepEqual(moveFurniture(cave, 9, 0), cave);
  assert.deepEqual(cave, ['a', 'b', 'c', 'd']);
});

// ---------- Bildschirm ----------

test('Tabs: tablist, Rollen, Pfeiltasten, Home/End', () => {
  const { root } = open(profile());
  const list = root.querySelector('[role="tablist"]');
  assert.ok(list);
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  assert.equal(tabs.length, 5);
  assert.deepEqual(tabs.map((t) => t.getAttribute('data-tab')), ['monster', 'schrank', 'hoehle', 'shop', 'karten']);
  assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  assert.equal(tabs[0].getAttribute('tabindex'), '0');
  assert.equal(tabs[1].getAttribute('tabindex'), '-1');
  const panel = root.querySelector('[role="tabpanel"]');
  assert.equal(panel.getAttribute('aria-labelledby'), tabs[0].id);
  assert.equal(tabs[0].getAttribute('aria-controls'), panel.id);

  key(tab(root, 'monster'), 'ArrowRight');
  assert.equal(tab(root, 'schrank').getAttribute('aria-selected'), 'true');
  assert.equal(tab(root, 'monster').getAttribute('aria-selected'), 'false');
  key(tab(root, 'schrank'), 'ArrowLeft');
  key(tab(root, 'monster'), 'ArrowLeft');
  assert.equal(tab(root, 'karten').getAttribute('aria-selected'), 'true', 'Pfeil links vom ersten Tab springt ans Ende');
  key(tab(root, 'karten'), 'Home');
  assert.equal(tab(root, 'monster').getAttribute('aria-selected'), 'true');
  key(tab(root, 'monster'), 'End');
  assert.equal(tab(root, 'karten').getAttribute('aria-selected'), 'true');
  assert.equal(root.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby'), tab(root, 'karten').id);
});

test('Shop: Kauf per Doppelklick aendert Muenzen genau einmal (Kleidung)', () => {
  const { app, root } = open(profile({ coins: 100 }), { tab: 'shop' });
  root.querySelector('[data-cat="kleidung"]').dispatchEvent(new win.Event('click', { bubbles: true }));
  const btn = byKey(root, 'buy:halbe-socken');
  assert.ok(btn, 'Kaufknopf');
  click(btn);
  click(btn);
  assert.equal(app.profile.coins, 90);
  assert.deepEqual(app.profile.owned, ['halbe-socken']);
  assert.equal(app.saved, 1);
});

test('Shop: Futter per Doppelklick kauft nur einmal und erhoeht xp', () => {
  const { app, root } = open(profile({ coins: 100 }), { tab: 'shop' });
  const btn = byKey(root, 'buy:bruchkekse');
  click(btn);
  click(btn);
  assert.equal(app.profile.coins, 97);
  assert.equal(app.profile.xp, 6);
  assert.equal(app.saved, 1);
  // Auch der neu gezeichnete Knopf reagiert nicht sofort wieder (Sperre gegen echtes Doppelklicken)
  click(byKey(root, 'buy:bruchkekse'));
  assert.equal(app.profile.coins, 97);
});

test('Shop: zu wenig Muenzen ergibt gesperrten Knopf mit "Noch X Münzen"', () => {
  const { app, root } = open(profile({ coins: 5 }), { tab: 'shop' });
  const btn = byKey(root, 'buy:hauptnenner-torte');
  assert.equal(btn.hasAttribute('disabled'), true);
  assert.match(btn.textContent, /Noch 25 Münzen/);
  click(btn);
  assert.equal(app.profile.coins, 5);
  assert.equal(root.querySelectorAll('[role="alertdialog"]').length, 0);
});

test('Shop: Kategorien Futter, Kleidung, Farben, Moebel; gekaufte Dinge sind markiert', () => {
  const { root } = open(profile({ owned: ['halbe-socken'], wearing: { fuss: 'halbe-socken' } }), { tab: 'shop' });
  const cats = [...root.querySelectorAll('[data-cat]')].map((b) => b.getAttribute('data-cat'));
  assert.deepEqual(cats, ['futter', 'kleidung', 'farbe', 'moebel']);
  root.querySelector('[data-cat="kleidung"]').dispatchEvent(new win.Event('click', { bubbles: true }));
  assert.equal(root.querySelector('[data-cat="kleidung"]').getAttribute('aria-pressed'), 'true');
  assert.equal(root.querySelectorAll('[data-item]').length, ofKind('kleidung').length);
  assert.match(root.querySelector('[data-item="halbe-socken"]').textContent, /Angezogen/);
  assert.equal(byKey(root, 'buy:halbe-socken'), null);
});

test('Kleiderschrank: Anziehen und Ausziehen wechseln sichtbar und im Profil', () => {
  const { app, root } = open(profile({ owned: ['halbe-socken', 'zaehlerkrone'] }), { tab: 'schrank' });
  const btn = () => byKey(root, 'equip:halbe-socken');
  assert.match(btn().textContent, /Anziehen/);
  click(btn());
  assert.deepEqual(app.profile.wearing, { fuss: 'halbe-socken' });
  assert.match(btn().textContent, /Ausziehen/);
  assert.equal(root.querySelector('.monster-svg [data-slot="fuss"]').childNodes.length > 0, true);
  click(btn());
  assert.deepEqual(app.profile.wearing, {});
  assert.match(btn().textContent, /Anziehen/);
  assert.equal(byKey(root, 'equip:dreiviertel-zylinder'), null, 'nicht Besessenes erscheint nicht als Knopf');
});

test('Kleiderschrank: Farbe waehlen', () => {
  const { app, root } = open(profile({ owned: ['farbe-ozean'] }), { tab: 'schrank' });
  assert.equal(byKey(root, 'color:kiwi').getAttribute('aria-pressed'), 'true');
  click(byKey(root, 'color:farbe-ozean'));
  assert.equal(app.profile.color, 'farbe-ozean');
  assert.equal(byKey(root, 'color:farbe-ozean').getAttribute('aria-pressed'), 'true');
  assert.equal(byKey(root, 'color:kiwi').getAttribute('aria-pressed'), 'false');
  assert.equal(byKey(root, 'color:farbe-neon'), null);
});

test('Hoehle: aufstellen, wegraeumen, voll-Meldung bei 8', () => {
  const moebel = ofKind('moebel').map((m) => m.id);
  const { app, root } = open(profile({ owned: moebel }), { tab: 'hoehle' });
  click(byKey(root, `place:${moebel[0]}`));
  assert.deepEqual(app.profile.cave, [moebel[0]]);
  assert.match(byKey(root, `place:${moebel[0]}`).textContent, /Wegräumen/);
  for (let i = 1; i < 8; i++) click(byKey(root, `place:${moebel[i]}`));
  assert.equal(app.profile.cave.length, 8);
  click(byKey(root, `place:${moebel[8]}`));
  assert.equal(app.profile.cave.length, 8);
  assert.match(root.textContent, /Höhle ist voll/);
  click(byKey(root, `place:${moebel[0]}`));
  assert.equal(app.profile.cave.length, 7);
});

test('Hoehle: Tastatur verschiebt Moebel (Pfeile) und raeumt weg (Entf)', () => {
  const [a, b, c] = ofKind('moebel').map((m) => m.id);
  const { app, root } = open(profile({ owned: [a, b, c], cave: [a, b, c] }), { tab: 'hoehle' });
  const item = (slot) => root.querySelector(`.cave-item[data-slot="${slot}"]`);
  assert.equal(item(0).getAttribute('role'), 'button');
  assert.equal(item(0).getAttribute('tabindex'), '0');
  const e = key(item(0), 'ArrowRight');
  assert.equal(e.defaultPrevented, true);
  assert.deepEqual(app.profile.cave, [b, a, c]);
  key(item(1), 'ArrowRight');
  assert.deepEqual(app.profile.cave, [b, c, a]);
  key(item(2), 'ArrowRight');
  assert.deepEqual(app.profile.cave, [b, c, a], 'am Ende bleibt es stehen');
  key(item(0), 'Delete');
  assert.deepEqual(app.profile.cave, [c, a]);
});

test('Hoehle: Knoepfe nach links/rechts fuer Geraete ohne Ziehen', () => {
  const [a, b] = ofKind('moebel').map((m) => m.id);
  const { app, root } = open(profile({ owned: [a, b], cave: [a, b] }), { tab: 'hoehle' });
  click(byKey(root, `right:${a}`));
  assert.deepEqual(app.profile.cave, [b, a]);
  click(byKey(root, `left:${a}`));
  assert.deepEqual(app.profile.cave, [a, b]);
});

test('Futter: Stufenwechsel zeigt genau einmal die Glueckwunsch-Meldung', () => {
  const { app, root } = open(profile({ xp: 26, coins: 100 }));
  assert.equal(monsterStage(app.profile.xp), 0);
  click(byKey(root, 'buy:bruchkekse'));
  assert.equal(monsterStage(app.profile.xp), 1);
  const dlg = root.querySelector('[role="dialog"]');
  assert.ok(dlg);
  assert.match(dlg.textContent, /Dein Monster ist gewachsen!/);
  assert.match(dlg.textContent, new RegExp(STAGE_NAMES[1]));
  assert.equal(root.querySelectorAll('[role="dialog"]').length, 1);
  click(dlg.querySelector('button'));
  assert.equal(root.querySelector('[role="dialog"]'), null);
  assert.match(root.textContent, /Mampf!/);
});

test('Futter: ohne Stufenwechsel keine Glueckwunsch-Meldung', () => {
  const { root } = open(profile({ xp: 0, coins: 100 }));
  click(byKey(root, 'buy:bruchkekse'));
  assert.equal(root.querySelector('[role="dialog"]'), null);
  assert.match(root.textContent, /Mampf!/);
});

test('Monster-Tab: Fortschritt zur naechsten Stufe und Serie', () => {
  const { root } = open(profile({ xp: 40, streak: { days: 4, lastDate: '2026-11-22' } }));
  const bar = root.querySelector('[role="progressbar"]');
  assert.ok(bar);
  assert.equal(bar.getAttribute('aria-valuenow'), '10');
  assert.equal(bar.getAttribute('aria-valuemax'), '70');
  assert.ok(root.textContent.includes(STAGE_NAMES[1]));
  assert.match(root.textContent, /4 Tage in Folge/);
});

test('Serie erhoeht sich nur einmal pro Kalendertag', () => {
  let p = profile({ streak: { days: 2, lastDate: '2026-11-21' } });
  const a = touchStreak(p, '2026-11-22');
  assert.equal(a.profile.streak.days, 3);
  assert.equal(a.isNewDay, true);
  const b = touchStreak(a.profile, '2026-11-22');
  assert.equal(b.profile.streak.days, 3);
  assert.equal(b.isNewDay, false);
  const c = touchStreak(b.profile, '2026-11-24');
  assert.equal(c.profile.streak.days, 1);
});

test('Sammelkarten: gesammelte zeigen Text, fehlende ein Fragezeichen mit Anleitung', () => {
  const cards = ofKind('karte');
  const { root } = open(profile({ cards: [cards[0].id] }), { tab: 'karten' });
  const items = root.querySelectorAll('[data-card]');
  assert.equal(items.length, cards.length);
  const got = root.querySelector(`[data-card="${cards[0].id}"]`);
  assert.match(got.textContent, new RegExp(cards[0].name));
  assert.match(got.textContent, /Normal/);
  assert.match(got.textContent, new RegExp(cards[0].text.slice(0, 20)));
  const miss = root.querySelector(`[data-card="${cards[1].id}"]`);
  assert.match(miss.textContent, /\?/);
  assert.equal(miss.textContent.includes(cards[1].text.slice(0, 20)), false);
  assert.match(root.textContent, /Alle 5 richtigen Antworten in Folge und an jedem 3\. Tag in Folge gibt's eine Karte\./);
  assert.match(root.textContent, new RegExp(`1 von ${cards.length}`));
});

test('Bewegung: bei reduzierter Bewegung keine Hop-Animation', () => {
  win.matchMedia = () => ({ matches: true });
  let animated = 0;
  const proto = win.Element?.prototype ?? Object.getPrototypeOf(doc.createElement('div'));
  const had = Object.getOwnPropertyDescriptor(proto, 'animate');
  Object.defineProperty(proto, 'animate', { configurable: true, writable: true, value() { animated += 1; return { onfinish: null }; } });
  try {
    const { root } = open(profile({ coins: 100 }));
    click(byKey(root, 'buy:bruchkekse'));
    assert.equal(animated, 0);
    win.matchMedia = () => ({ matches: false });
    const next = open(profile({ coins: 100 }));
    click(byKey(next.root, 'buy:bruchkekse'));
    assert.ok(animated >= 1);
  } finally {
    if (had) Object.defineProperty(proto, 'animate', had); else delete proto.animate;
    delete win.matchMedia;
  }
});
