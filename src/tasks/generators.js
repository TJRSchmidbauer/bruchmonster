// Aufgabengeneratoren: eine kleine Funktion je Art (siehe src/tasks/gen/<welt>.js).
import { KINDS, checkAnswer } from './types.js';
import * as strahl from './gen/strahl.js';
import * as streifen from './gen/streifen.js';
import * as alltag from './gen/alltag.js';
import * as detektiv from './gen/detektiv.js';

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
