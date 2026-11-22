// Profile und Speicher: Anlegen, Laden, Speichern, Export/Import.
// Reine Logik ohne UI. Standard-Backend ist localStorage, Fallback ist der Speicher im Arbeitsspeicher.

const INDEX_KEY = 'bruchmonster:profiles';
const INDEX_BAK_KEY = 'bruchmonster:profiles.bak';
const PROFILE_PREFIX = 'bruchmonster:profile:';
const profileKey = (id) => `${PROFILE_PREFIX}${id}`;
const DEFAULT_NAME = 'Monsterfreund';

export function newId() {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Name trimmen, auf 20 Zeichen kuerzen, leer ergibt "Monsterfreund".
function normalizeName(name) {
  if (typeof name !== 'string') return DEFAULT_NAME;
  const t = name.trim();
  if (t === '') return DEFAULT_NAME;
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
    color: 'kiwi',
    createdAt,
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonNeg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

// Repariert jedes Feld einzeln: Fehlende oder kaputte Felder kommen aus den Standardwerten,
// kaputte Listeneintraege werden verworfen. Nur ein Nicht-Objekt ergibt null.
function fillProfile(raw, id, createdAt) {
  if (!isObj(raw)) return null;
  const out = defaultProfile('', id, createdAt);

  if (typeof raw.name === 'string') out.name = normalizeName(raw.name);
  for (const k of ['coins', 'xp']) if (isNonNeg(raw[k])) out[k] = raw[k];
  for (const k of ['owned', 'cave', 'cards', 'seen']) {
    if (Array.isArray(raw[k])) out[k] = raw[k].filter((x) => typeof x === 'string');
  }
  if (isObj(raw.wearing)) {
    out.wearing = Object.fromEntries(Object.entries(raw.wearing).filter(([, v]) => typeof v === 'string'));
  }
  if (isObj(raw.mastery)) {
    out.mastery = Object.fromEntries(Object.entries(raw.mastery).filter(([, m]) =>
      isObj(m) && isNonNeg(m.right) && isNonNeg(m.wrong) && isNonNeg(m.last)));
  }
  if (isObj(raw.daily)) {
    out.daily = Object.fromEntries(Object.entries(raw.daily).filter(([, d]) =>
      isObj(d) && typeof d.date === 'string' && isNonNeg(d.coins)));
  }
  if (isObj(raw.streak)) {
    out.streak = {
      days: isNonNeg(raw.streak.days) ? raw.streak.days : 0,
      lastDate: typeof raw.streak.lastDate === 'string' ? raw.streak.lastDate : '',
    };
  }
  if (typeof raw.color === 'string') out.color = raw.color;
  if (typeof raw.createdAt === 'string') out.createdAt = raw.createdAt;
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
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) throw new Error('kein Array');
      return {
        list: arr
          .filter((e) => isObj(e) && typeof e.id === 'string' && typeof e.name === 'string')
          .map((e) => ({ id: e.id, name: e.name })),
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
        const p = fillProfile(JSON.parse(be.getItem(k)), id, now());
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
      return fillProfile(JSON.parse(raw), id, now());
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
      be.setItem(profileKey(stored.id), JSON.stringify(stored));
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

export function exportProfile(p) {
  return JSON.stringify(
    { format: 'bruchmonster', version: 1, exportedAt: new Date().toISOString(), profile: p },
    null,
    2,
  );
}

// Liest eine Export-Datei. Das Ergebnis bekommt immer eine neue id und ist noch nicht gespeichert.
export function importProfile(text, makeId = newId) {
  const fail = (reason) => ({ ok: false, reason });
  if (typeof text !== 'string') return fail('kein-json');
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return fail('kein-json');
  }
  if (!isObj(doc) || doc.format !== 'bruchmonster' || !isObj(doc.profile)) return fail('falsches-format');
  const v = doc.version ?? 1;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) return fail('beschaedigt');
  if (v > 1) return fail('zu-neu');
  const profile = fillProfile(doc.profile, makeId(), new Date().toISOString());
  if (!profile) return fail('beschaedigt');
  return { ok: true, profile };
}
