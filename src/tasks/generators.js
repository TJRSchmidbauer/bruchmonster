// Aufgabengeneratoren: eine kleine Funktion je Art (siehe src/tasks/gen/<welt>.js).
import { KINDS, checkAnswer } from './types.js';
import * as strahl from './gen/strahl.js';
import * as streifen from './gen/streifen.js';
import * as alltag from './gen/alltag.js';
import * as detektiv from './gen/detektiv.js';
import { HANDWRITTEN } from './handwritten.js';

export { KINDS, checkAnswer };

const REGISTRY = {
  platzieren: strahl.platzieren,
  schaetzen: strahl.schaetzen,
  vergleichen: strahl.vergleichen,
  dazwischen: strahl.dazwischen,
  darstellen: streifen.darstellen,
  erweitern: streifen.erweitern,
  kuerzen: streifen.kuerzen,
  addieren: streifen.addieren,
  subtrahieren: streifen.subtrahieren,
  'bruchteil-vom-bruchteil': streifen.bruchteilVomBruchteil,
  'anteil-von-groesse': alltag.anteilVonGroesse,
  rezept: alltag.rezept,
  'teilen-durch-nat': alltag.teilenDurchNat,
  'fehler-finden': detektiv.fehlerFinden,
  'regel-entdecken': detektiv.regelEntdecken,
};

export function generate(kind, level, rng) {
  const fn = REGISTRY[kind];
  if (!fn) throw new Error(`Unbekannte Aufgabenart: ${kind}`);
  if (![1, 2, 3].includes(level)) throw new Error(`Unbekannte Stufe: ${level}`);
  return fn(level, rng);
}

// Aufgabenmischer: fuer Alltag und Detektiv mischt er handgeschriebene Aufgaben (40 %) unter die generierten.
const HW_SHARE = 0.4;
const HW_MEMORY = 5;
const recent = {};
const lastId = {};

// Gibt eine Kopie zurueck, damit niemand die Vorlage veraendert. Nie dieselbe handgeschriebene id kurz hintereinander.
export function pickTask(kind, level, rng) {
  const pool = HANDWRITTEN.filter((t) => t.kind === kind && t.level === level);
  if (pool.length === 0) return generate(kind, level, rng);
  const key = `${kind}:${level}`;
  const seen = recent[key] ?? (recent[key] = []);
  const free = pool.filter((t) => t.id !== lastId[key] && !seen.includes(t.id));
  if (rng() >= HW_SHARE || free.length === 0) {
    lastId[key] = null;
    return generate(kind, level, rng);
  }
  const t = free[Math.floor(rng() * free.length)];
  lastId[key] = t.id;
  seen.push(t.id);
  if (seen.length > Math.min(HW_MEMORY, pool.length - 1)) seen.shift();
  return structuredClone(t);
}
