// Profile und Speicher: Anlegen, Laden, Speichern, Export/Import.
// Reine Logik ohne UI. Standard-Backend ist localStorage, Fallback ist der Speicher im Arbeitsspeicher.

const INDEX_KEY = 'bruchmonster:profiles';
const profileKey = (id) => `bruchmonster:profile:${id}`;
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
    mastery: {},
    daily: {},
    streak: { days: 0, lastDate: '' },
    color: 'kiwi',
    createdAt,
  };
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonNeg = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isStrArr = (v) => Array.isArray(v) && v.every((s) => typeof s === 'string');

// Prueft alle Felder. Fehlende Felder kommen aus den Standardwerten, falsche Typen ergeben null.
function fillProfile(raw, id, createdAt) {
  if (!isObj(raw)) return null;
  const base = defaultProfile('', id, createdAt);
  const out = { ...base };

  if (raw.name !== undefined) {
    if (typeof raw.name !== 'string') return null;
    out.name = normalizeName(raw.name);
  }
  for (const k of ['coins', 'xp']) {
    if (raw[k] !== undefined) {
      if (!isNonNeg(raw[k])) return null;
      out[k] = raw[k];
    }
  }
  for (const k of ['owned', 'cave', 'cards']) {
    if (raw[k] !== undefined) {
      if (!isStrArr(raw[k])) return null;
      out[k] = raw[k];
    }
  }
  if (raw.wearing !== undefined) {
    if (!isObj(raw.wearing) || !Object.values(raw.wearing).every((v) => typeof v === 'string')) return null;
    out.wearing = raw.wearing;
  }
  if (raw.mastery !== undefined) {
    const ok = isObj(raw.mastery) && Object.values(raw.mastery).every((m) =>
      isObj(m) && isNonNeg(m.right) && isNonNeg(m.wrong) && isNonNeg(m.last));
    if (!ok) return null;
    out.mastery = raw.mastery;
  }
  if (raw.daily !== undefined) {
    const ok = isObj(raw.daily) && Object.values(raw.daily).every((d) =>
      isObj(d) && typeof d.date === 'string' && isNonNeg(d.coins));
    if (!ok) return null;
    out.daily = raw.daily;
  }
  if (raw.streak !== undefined) {
    const s = raw.streak;
    if (!isObj(s)) return null;
    const days = s.days ?? 0;
    const lastDate = s.lastDate ?? '';
    if (!isNonNeg(days) || typeof lastDate !== 'string') return null;
    out.streak = { days, lastDate };
  }
  if (raw.color !== undefined) {
    if (typeof raw.color !== 'string') return null;
    out.color = raw.color;
  }
  if (raw.createdAt !== undefined) {
    if (typeof raw.createdAt !== 'string') return null;
    out.createdAt = raw.createdAt;
  }
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

  function readIndex() {
    try {
      const arr = JSON.parse(be.getItem(INDEX_KEY) ?? 'null');
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((e) => isObj(e) && typeof e.id === 'string' && typeof e.name === 'string')
        .map((e) => ({ id: e.id, name: e.name }));
    } catch {
      return [];
    }
  }

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
    const list = readIndex();
    const i = list.findIndex((e) => e.id === stored.id);
    const entry = { id: stored.id, name: stored.name };
    if (i >= 0) list[i] = entry;
    else list.push(entry);
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
      be.setItem(INDEX_KEY, JSON.stringify(readIndex().filter((e) => e.id !== id)));
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
