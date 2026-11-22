// Belohnung, Kaeufe, Ausruestung, Hoehle, Serie, Karten, Monsterstufe.
// Reine Logik ohne UI. Alle Funktionen geben neue Profile zurueck und veraendern die Eingaben nicht.

export const DAILY_LIMIT = 40;
export const CAVE_MAX = 8;
export const DEFAULT_COLOR = 'kiwi';

const BASE_REWARD = { 1: 2, 2: 3, 3: 5 };
const STAGE_XP = [0, 30, 100, 250, 500];
const CARD_WEIGHT = { normal: 6, selten: 3, legendaer: 1 };
const DAY_MS = 86400000;

const ITEM_LIST = [
  // Futter: Verbrauchsgut, xp ungefaehr 2x Preis
  { id: 'bruchkekse', kind: 'futter', price: 3, xp: 6, name: 'Bruchkekse' },
  { id: 'zaehler-zimtschnecke', kind: 'futter', price: 5, xp: 10, name: 'Zähler-Zimtschnecke' },
  { id: 'nenner-nudeln', kind: 'futter', price: 8, xp: 16, name: 'Nenner-Nudeln' },
  { id: 'halbe-halbe-melone', kind: 'futter', price: 12, xp: 24, name: 'Halbe-Halbe-Melone' },
  { id: 'viertelpfund-pudding', kind: 'futter', price: 18, xp: 36, name: 'Viertelpfund-Pudding' },
  { id: 'hauptnenner-torte', kind: 'futter', price: 30, xp: 70, name: 'Hauptnenner-Torte' },

  // Kleidung: je drei pro Slot
  { id: 'zaehlerkrone', kind: 'kleidung', slot: 'kopf', price: 70, name: 'Zählerkrone' },
  { id: 'halbe-halbe-muetze', kind: 'kleidung', slot: 'kopf', price: 20, name: 'Halbe-Halbe-Mütze' },
  { id: 'dreiviertel-zylinder', kind: 'kleidung', slot: 'kopf', price: 45, name: 'Dreiviertel-Zylinder' },
  { id: 'dreiviertelhose', kind: 'kleidung', slot: 'koerper', price: 25, name: 'Dreiviertelhose' },
  { id: 'achtelweste', kind: 'kleidung', slot: 'koerper', price: 35, name: 'Achtelweste' },
  { id: 'gebrochen-shirt', kind: 'kleidung', slot: 'koerper', price: 18, name: 'Gebrochen-Shirt' },
  { id: 'halbhandschuhe', kind: 'kleidung', slot: 'hand', price: 12, name: 'Halbhandschuhe' },
  { id: 'teiler-faeustlinge', kind: 'kleidung', slot: 'hand', price: 28, name: 'Teiler-Fäustlinge' },
  { id: 'bruchband-armreif', kind: 'kleidung', slot: 'hand', price: 50, name: 'Bruchband-Armreif' },
  { id: 'nenner-gummistiefel', kind: 'kleidung', slot: 'fuss', price: 30, name: 'Nenner-Gummistiefel' },
  { id: 'kuerz-sneaker', kind: 'kleidung', slot: 'fuss', price: 40, name: 'Kürz-Sneaker' },
  { id: 'halbe-socken', kind: 'kleidung', slot: 'fuss', price: 10, name: 'Halbe Socken' },

  // Farben: id wird in p.color gespeichert, color ist der Farbton fuer die Anzeige
  { id: 'farbe-ozean', kind: 'farbe', color: '#3A7BD5', price: 15, name: 'Ozeanblau' },
  { id: 'farbe-minze', kind: 'farbe', color: '#2ECC9A', price: 20, name: 'Minzgrün' },
  { id: 'farbe-lakritz', kind: 'farbe', color: '#6C3483', price: 25, name: 'Lakritzlila' },
  { id: 'farbe-halbe-orange', kind: 'farbe', color: '#F39C12', price: 30, name: 'Halbe Orange' },
  { id: 'farbe-neon', kind: 'farbe', color: '#FF4FA3', price: 40, name: 'Neon-Nenner-Pink' },

  // Moebel
  { id: 'dreibein-hocker', kind: 'moebel', price: 10, name: 'Dreibeiniger Hocker' },
  { id: 'stachel-kaktus', kind: 'moebel', price: 12, name: 'Stachel-Kaktus' },
  { id: 'halbrunder-teppich', kind: 'moebel', price: 15, name: 'Halbrunder Teppich' },
  { id: 'bruchsack-kissen', kind: 'moebel', price: 18, name: 'Bruchsack-Kissen' },
  { id: 'dreiviertel-gemaelde', kind: 'moebel', price: 22, name: 'Dreiviertel-Gemälde' },
  { id: 'zaehlerregal', kind: 'moebel', price: 20, name: 'Zählerregal' },
  { id: 'viertelmond-lampe', kind: 'moebel', price: 25, name: 'Viertelmond-Lampe' },
  { id: 'nenner-esstisch', kind: 'moebel', price: 30, name: 'Nenner-Esstisch' },
  { id: 'halbbogenfenster', kind: 'moebel', price: 35, name: 'Halbbogenfenster' },
  { id: 'zweidrittel-sofa', kind: 'moebel', price: 40, name: 'Zweidrittel-Sofa' },
  { id: 'schatztruhe', kind: 'moebel', price: 60, name: 'Schatztruhe mit Schloss' },

  // Karten: nicht kaeuflich, werden per awardCard gezogen
  { id: 'karte-gleiche-zahlen', kind: 'karte', price: null, rarity: 'normal', name: 'Gleiche Zahlen',
    text: 'Ein Bruch mit gleichem Zähler und Nenner ist genau ein Ganzes. Nicht mehr, nicht weniger.' },
  { id: 'karte-zaehler-nenner', kind: 'karte', price: null, rarity: 'normal', name: 'Oben und unten',
    text: 'Der Nenner sagt, in wie viele Teile geteilt wird. Der Zähler sagt, wie viele du nimmst.' },
  { id: 'karte-null-fuenftel', kind: 'karte', price: null, rarity: 'normal', name: 'Null ist null',
    text: 'Null Fünftel sind null. Egal wie groß der Nenner ist.' },
  { id: 'karte-addieren-falsch', kind: 'karte', price: null, rarity: 'selten', name: 'Nicht so addieren',
    text: '1/2 + 1/3 ist nicht 2/5. Das Ergebnis ist 5/6, und die Monster sind fassungslos.' },
  { id: 'karte-erweitern', kind: 'karte', price: null, rarity: 'selten', name: 'Tarnung',
    text: '3/4 = 6/8 = 9/12. Erweitern ändert den Wert nicht, nur das Aussehen.' },
  { id: 'karte-kuerzen', kind: 'karte', price: null, rarity: 'selten', name: 'Abspecken',
    text: '12/18 wird zu 2/3, wenn man Zähler und Nenner durch 6 teilt.' },
  { id: 'karte-eins-unendlich', kind: 'karte', price: null, rarity: 'legendaer', name: 'Die große Eins',
    text: 'Die Eins hat unendlich viele Brüche, die genau sie ergeben: 2/2, 3/3, 100/100 und so weiter.' },
  { id: 'karte-aegypter', kind: 'karte', price: null, rarity: 'legendaer', name: 'Uralte Stammbrüche',
    text: 'Schon die alten Ägypter rechneten mit Stammbrüchen wie 1/2, 1/3 und 1/4. Das Monster ist beeindruckt.' },
  { id: 'karte-hauptnenner', kind: 'karte', price: null, rarity: 'legendaer', name: 'Der Friedensvertrag',
    text: 'Zwei Brüche addiert man nur mit gleichem Nenner. Der Hauptnenner ist der Friedensvertrag.' },
];

export const ITEMS = Object.freeze(ITEM_LIST.map((it) => Object.freeze(it)));

const byId = (id) => ITEMS.find((it) => it.id === id) ?? null;
const dailyKey = (today, kind) => `${today}|${kind}`;

function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

// Belohnung fuer eine richtige Antwort. r.streak = Serie richtiger Antworten inkl. dieser.
export function reward({ level, hintsUsed = 0, streak = 0, explained = false }) {
  const base = BASE_REWARD[level];
  if (base === undefined) throw new Error(`Unbekannte Stufe: ${level}`);
  let coins = Math.max(1, base - hintsUsed);
  if (streak >= 3) coins += 1;
  if (explained) coins += 2;
  return coins;
}

// Wertet eine Antwort aus: Muenzen (mit Tageslimit je Art), Meisterschaft je Art.
// Falsch gibt 0 Muenzen. Die Meisterschaft zaehlt in jedem Fall.
export function applyResult(p, task, r, today, nowMs = Date.now()) {
  const correct = r.correct === true;
  const hintsUsed = r.hintsUsed ?? 0;
  const explained = r.explained ?? false;
  const streak = r.streak ?? 0;

  const prev = p.mastery[task.kind] ?? { right: 0, wrong: 0, last: 0 };
  const mastery = {
    ...p.mastery,
    [task.kind]: {
      right: prev.right + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
      last: nowMs,
    },
  };

  // Alte Tage werden entfernt, es bleibt nur der heutige Stand.
  const daily = {};
  for (const [k, v] of Object.entries(p.daily)) if (v.date === today) daily[k] = { ...v };

  const key = dailyKey(today, task.kind);
  const used = daily[key]?.coins ?? 0;
  const want = correct ? reward({ level: task.level, hintsUsed, streak, explained }) : 0;
  const coins = Math.min(want, Math.max(0, DAILY_LIMIT - used));
  const capped = coins < want;
  if (coins > 0) daily[key] = { date: today, coins: used + coins };

  return {
    profile: { ...p, coins: p.coins + coins, mastery, daily },
    coins,
    capped,
  };
}

// Kauf. Futter ist beliebig oft kaufbar und erhoeht xp, alles andere landet in owned.
export function buy(p, itemId) {
  const item = byId(itemId);
  if (!item) return { ok: false, reason: 'unbekannt' };
  if (item.kind === 'karte') return { ok: false, reason: 'nicht-kaeuflich' };
  if (item.kind !== 'futter' && p.owned.includes(itemId)) return { ok: false, reason: 'schon-besessen' };
  if (p.coins < item.price) return { ok: false, reason: 'zu-wenig' };

  const profile = { ...p, coins: p.coins - item.price };
  if (item.kind === 'futter') profile.xp = p.xp + item.xp;
  else profile.owned = [...p.owned, itemId];
  return { ok: true, profile };
}

// Anziehen (Kleidung, zweites Mal wieder ablegen) oder Farbe waehlen.
export function equip(p, itemId) {
  if (itemId === DEFAULT_COLOR) return { ok: true, profile: { ...p, color: DEFAULT_COLOR } };
  const item = byId(itemId);
  if (!item || !p.owned.includes(itemId)) return { ok: false, reason: 'nicht-besessen' };

  if (item.kind === 'kleidung') {
    const wearing = { ...p.wearing };
    if (wearing[item.slot] === itemId) delete wearing[item.slot];
    else wearing[item.slot] = itemId;
    return { ok: true, profile: { ...p, wearing } };
  }
  if (item.kind === 'farbe') return { ok: true, profile: { ...p, color: itemId } };
  return { ok: false, reason: 'nicht-ausruestbar' };
}

// Moebel in die Hoehle stellen (on = true) oder herausnehmen (on = false).
export function placeFurniture(p, itemId, on) {
  const item = byId(itemId);
  if (!item || !p.owned.includes(itemId)) return { ok: false, reason: 'nicht-besessen' };
  if (item.kind !== 'moebel') return { ok: false, reason: 'kein-moebel' };

  if (!on) return { ok: true, profile: { ...p, cave: p.cave.filter((id) => id !== itemId) } };
  if (p.cave.includes(itemId)) return { ok: true, profile: { ...p, cave: [...p.cave] } };
  if (p.cave.length >= CAVE_MAX) return { ok: false, reason: 'hoehle-voll' };
  return { ok: true, profile: { ...p, cave: [...p.cave, itemId] } };
}

// Tageserie: gleicher Tag unveraendert, Folgetag +1, sonst wieder 1.
export function touchStreak(p, today) {
  const last = p.streak.lastDate;
  if (last === today) return { profile: { ...p, streak: { ...p.streak } }, isNewDay: false };
  const consecutive = last !== '' && daysBetween(last, today) === 1;
  const days = consecutive ? p.streak.days + 1 : 1;
  return { profile: { ...p, streak: { days, lastDate: today } }, isNewDay: true };
}

// Zieht eine noch nicht gesammelte Karte, seltene seltener (Gewichte 6/3/1).
export function awardCard(p, rng) {
  const open = ITEMS.filter((it) => it.kind === 'karte' && !p.cards.includes(it.id));
  if (open.length === 0) return { profile: { ...p, cards: [...p.cards] }, card: null };

  const weights = open.map((c) => CARD_WEIGHT[c.rarity]);
  let x = rng() * weights.reduce((s, w) => s + w, 0);
  let card = open[open.length - 1];
  for (let i = 0; i < open.length; i++) {
    x -= weights[i];
    if (x < 0) {
      card = open[i];
      break;
    }
  }
  return { profile: { ...p, cards: [...p.cards, card.id] }, card };
}

// Soll nach dieser Antwort eine Karte gezogen werden?
export function cardDue({ sessionStreak, isNewDay, streakDays }) {
  if (sessionStreak > 0 && sessionStreak % 5 === 0) return true;
  return Boolean(isNewDay) && streakDays % 3 === 0;
}

// Monsterstufe 0-4 aus der xp-Summe.
export function monsterStage(xp) {
  let stage = 0;
  for (let i = 1; i < STAGE_XP.length; i++) if (xp >= STAGE_XP[i]) stage = i;
  return stage;
}
