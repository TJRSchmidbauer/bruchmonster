// Profile und Speicher: Anlegen, Laden, Speichern, Export/Import.
// Reine Logik ohne UI. Standard-Backend ist localStorage, Fallback ist der Speicher im Arbeitsspeicher.

import { seal, unseal, toCode, unsealCode } from './seal.js';

const INDEX_KEY = 'bruchmonster:profiles';
const INDEX_BAK_KEY = 'bruchmonster:profiles.bak';
const PROFILE_PREFIX = 'bruchmonster:profile:';
const profileKey = (id) => `${PROFILE_PREFIX}${id}`;
const DEFAULT_NAME = 'Monsterfreund';

export function newId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Steuerzeichen und Zeichen, die die Schreibrichtung umkehren oder Text verstecken, haben in Namen nichts verloren.
// Dazu zaehlen auch unsichtbare Zeichen (Nullbreiten-Leerzeichen, Fueller), mit denen sich ein "leerer" Name tarnen liesse.
const BAD_CHARS = /[\p{Cc}\u00AD\u061C\u115F\u1160\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\u2800\u3164\uFEFF\uFFA0\u2028\u2029]/gu;
const VISIBLE = /[\p{L}\p{N}\p{P}\p{S}]/u;

// Name trimmen, auf 20 Zeichen kuerzen, leer ergibt "Monsterfreund".
function normalizeName(name) {
  if (typeof name !== 'string') return DEFAULT_NAME;
  const t = name.replace(BAD_CHARS, '').trim();
  if (t === '' || !VISIBLE.test(t)) return DEFAULT_NAME;
  return Array.from(t).slice(0, 20).join('');
}

export function defaultProfile(name, id = newId(), createdAt = new Date().toISOString()) {
  return {
    id,
    name: normalizeName(name),
    version: 1,
    coins: 0,
    xp: 0,
    owned: [],
    wearing: {},
    cave: [],
    cards: [],
    seen: [],
    mastery: {},
    daily: {},
    streak: { days: 0, lastDate: '' },
    backup: { date: '', right: 0 },
    color: 'kiwi',
    createdAt,
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonNeg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// Grenzen fuer alles, was aus Datei oder Speicher kommt: nichts darf riesig oder seltsam sein.
const MAX_NUM = 1_000_000_000;
const MAX_PROFILES = 100;
const MAX_INDEX_CHARS = 20_000;
const MAX_LIST = 300;
const MAX_MAP = 200;
const isId = (v) => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,48}$/.test(v);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v) => Math.min(Math.floor(v), MAX_NUM);
const capEntries = (o) => Object.entries(o).slice(0, MAX_MAP);

// Repariert jedes Feld einzeln: Fehlende oder kaputte Felder kommen aus den Standardwerten,
// kaputte Listeneintraege werden verworfen. Nur ein Nicht-Objekt ergibt null.
function fillProfile(raw, id, createdAt) {
  if (!isObj(raw)) return null;
  const out = defaultProfile('', id, createdAt);

  if (typeof raw.name === 'string') out.name = normalizeName(raw.name);
  for (const k of ['coins', 'xp']) if (isNonNeg(raw[k])) out[k] = num(raw[k]);
  for (const k of ['owned', 'cave', 'cards', 'seen']) {
    if (Array.isArray(raw[k])) out[k] = raw[k].filter(isId).slice(0, MAX_LIST);
  }
  if (isObj(raw.wearing)) {
    out.wearing = Object.fromEntries(capEntries(raw.wearing).filter(([k, v]) => isId(k) && isId(v)));
  }
  if (isObj(raw.mastery)) {
    out.mastery = Object.fromEntries(capEntries(raw.mastery).filter(([k, m]) =>
      isId(k) && isObj(m) && isNonNeg(m.right) && isNonNeg(m.wrong) && isNonNeg(m.last))
      .map(([k, m]) => [k, { right: num(m.right), wrong: num(m.wrong), last: m.last }]));
  }
  if (isObj(raw.daily)) {
    out.daily = Object.fromEntries(capEntries(raw.daily).filter(([k, d]) =>
      isId(k) && isObj(d) && isDate(d.date) && isNonNeg(d.coins))
      .map(([k, d]) => [k, { date: d.date, coins: num(d.coins) }]));
  }
  if (isObj(raw.streak)) {
    out.streak = {
      days: isNonNeg(raw.streak.days) ? num(raw.streak.days) : 0,
      lastDate: isDate(raw.streak.lastDate) ? raw.streak.lastDate : '',
    };
  }
  if (isObj(raw.backup)) {
    out.backup = {
      date: isDate(raw.backup.date) ? raw.backup.date : '',
      right: isNonNeg(raw.backup.right) ? num(raw.backup.right) : 0,
    };
  }
  if (isId(raw.color)) out.color = raw.color;
  if (typeof raw.createdAt === 'string' && raw.createdAt.length <= 40) out.createdAt = raw.createdAt;
  out.id = id;
  out.version = 1;
  return out;
}

function memoryBackend() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    removeItem: (k) => { data.delete(k); },
  };
}

// Backend pruefen, nur lesend: Geht das Lesen, bleibt das echte Backend (auch wenn es voll ist).
// Wirft schon das Lesen oder fehlt das Backend, faellt der Store auf den Speicher zurueck.
function resolveBackend(backend) {
  try {
    const target = backend === undefined ? globalThis.localStorage : backend;
    if (!target) throw new Error('kein Speicher');
    target.getItem(INDEX_KEY);
    return { be: target, persistent: true };
  } catch {
    return { be: memoryBackend(), persistent: false };
  }
}

export function createStore(backend, { makeId = newId, now = () => new Date().toISOString() } = {}) {
  const { be, persistent } = resolveBackend(backend);

  // Liest den Index. Ist er vorhanden, aber unlesbar, kommt die Liste aus den Profil-Schluesseln
  // (wenn das Backend Schluessel aufzaehlen kann); `corruptRaw` merkt sich den Rohtext fuers Backup.
  function readIndexState() {
    let raw = null;
    try {
      raw = be.getItem(INDEX_KEY);
      if (raw == null) return { list: [], corruptRaw: null };
      if (raw.length > MAX_INDEX_CHARS) throw new Error('zu gross');
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('kein Array');
      return {
        list: arr
          .filter((e) => isObj(e) && isId(e.id) && typeof e.name === 'string')
          .slice(0, MAX_PROFILES)
          .map((e) => ({ id: e.id, name: normalizeName(e.name) })),
        corruptRaw: null,
      };
    } catch {
      return { list: rebuildIndex(), corruptRaw: typeof raw === 'string' ? raw : '' };
    }
  }

  function rebuildIndex() {
    const list = [];
    try {
      if (typeof be.key !== 'function' || typeof be.length !== 'number') return list;
      for (let i = 0; i < be.length; i++) {
        const k = be.key(i);
        if (typeof k !== 'string' || !k.startsWith(PROFILE_PREFIX)) continue;
        const id = k.slice(PROFILE_PREFIX.length);
        const opened = unseal(be.getItem(k));
        const p = opened.ok && opened.value?.id === id ? fillProfile(opened.value, id, now()) : null;
        if (p) list.push({ id, name: p.name });
      }
    } catch {
      // Aufzaehlen klappt nicht; es bleibt bei dem, was gefunden wurde.
    }
    return list;
  }

  // Vor dem ersten Schreiben eines unlesbaren Index den alten Text sichern.
  function backupCorrupt(state) {
    if (state.corruptRaw == null) return;
    try {
      be.setItem(INDEX_BAK_KEY, state.corruptRaw);
    } catch {
      // Backup schlaegt fehl; das Schreiben des Index passiert trotzdem.
    }
  }

  const readIndex = () => readIndexState().list;

  function listProfiles() {
    return readIndex();
  }

  function load(id) {
    try {
      const raw = be.getItem(profileKey(id));
      if (raw == null) return null;
      const opened = unseal(raw);
      // Das Siegel gehoert zu genau diesem Profil: ein kopierter Eintrag unter anderer id wird nicht geladen.
      return opened.ok && opened.value?.id === id ? fillProfile(opened.value, id, now()) : null;
    } catch {
      return null;
    }
  }

  // Index zuerst, dann Profil. Schlaegt das Profil fehl, wird der alte Index zurueckgeschrieben,
  // so dass der Index nie ein gespeichertes Profil auslaesst.
  function save(p) {
    const stored = { ...p, name: normalizeName(p.name) };
    let prevIndex = null;
    try {
      prevIndex = be.getItem(INDEX_KEY);
    } catch {
      return { ok: false, reason: 'voll' };
    }
    const state = readIndexState();
    const list = state.list;
    const i = list.findIndex((e) => e.id === stored.id);
    const entry = { id: stored.id, name: stored.name };
    if (i >= 0) list[i] = entry;
    else list.push(entry);
    backupCorrupt(state);
    try {
      be.setItem(INDEX_KEY, JSON.stringify(list));
    } catch {
      return { ok: false, reason: 'voll' };
    }
    try {
      be.setItem(profileKey(stored.id), seal(stored));
      return { ok: true };
    } catch {
      try {
        if (prevIndex == null) be.removeItem(INDEX_KEY);
        else be.setItem(INDEX_KEY, prevIndex);
      } catch {
        // Zurueckschreiben schlaegt fehl; der Index bleibt wie er ist.
      }
      return { ok: false, reason: 'voll' };
    }
  }

  function createProfile(name) {
    const profile = defaultProfile(name, makeId(), now());
    const saved = save(profile);
    return { profile, saved };
  }

  function remove(id) {
    try {
      const state = readIndexState();
      backupCorrupt(state);
      be.setItem(INDEX_KEY, JSON.stringify(state.list.filter((e) => e.id !== id)));
      be.removeItem(profileKey(id));
    } catch {
      // Entfernen schlaegt still fehl; die App bleibt benutzbar.
    }
  }

  return { persistent, listProfiles, createProfile, load, save, remove };
}

// Export: ein Siegel (verschluesselt und mit Pruefsumme), das sich nicht von Hand aendern laesst.
export function exportProfile(p) {
  return seal({ profile: p, exportedAt: new Date().toISOString() });
}

// Dasselbe Siegel als kurzer Text zum Kopieren und Einfuegen (siehe seal.js).
export function exportCode(p) {
  return toCode(exportProfile(p));
}

// Macht aus einem geoeffneten Siegel ein Profil mit neuer id. Noch nicht gespeichert.
function profileFromOpened(opened, makeId) {
  const fail = (reason) => ({ ok: false, reason });
  if (!opened.ok) return fail(opened.reason);
  if (!isObj(opened.value) || !isObj(opened.value.profile)) return fail('beschaedigt');
  const profile = fillProfile(opened.value.profile, makeId(), new Date().toISOString());
  if (!profile) return fail('beschaedigt');
  return { ok: true, profile };
}

// Liest eine Export-Datei. Das Ergebnis bekommt immer eine neue id und ist noch nicht gespeichert.
// Gruende: kein-json, falsches-format (auch das alte Klartext-Format), verfaelscht, zu-gross, beschaedigt.
export function importProfile(text, makeId = newId) {
  return profileFromOpened(unseal(text), makeId);
}

// Liest einen eingefuegten Spielstand-Code. Gruende wie oben, dazu kein-code.
export function importProfileFromCode(code, makeId = newId) {
  return profileFromOpened(unsealCode(code), makeId);
}
