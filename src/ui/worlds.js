// Die vier Welten: Name, Farbe, kurze Beschreibung und ein eigenes SVG-Motiv.
import { h } from './dom.js';

export const WORLDS = [
  { key: 'strahl', name: 'Zahlenstrahl-Labor', color: '#14A9BD', blurb: 'Brüche auf den Strahl setzen, schätzen und vergleichen.' },
  { key: 'streifen', name: 'Bruchstreifen-Werkstatt', color: '#FF8A1F', blurb: 'Streifen zerschneiden, erweitern, kürzen und zusammenlegen.' },
  { key: 'alltag', name: 'Alltag und Rezepte', color: '#7DB82F', blurb: 'Pizza teilen, Rezepte umrechnen, Anteile ausrechnen.' },
  { key: 'detektiv', name: 'Fehler-Detektiv', color: '#7B5CFF', blurb: 'Finde den Fehler, bevor er das Monster verwirrt.' },
];

export const KIND_LABELS = {
  platzieren: 'Brüche platzieren',
  schaetzen: 'Brüche schätzen',
  vergleichen: 'Brüche vergleichen',
  dazwischen: 'Brüche dazwischen finden',
  darstellen: 'Brüche darstellen',
  erweitern: 'Brüche erweitern',
  kuerzen: 'Brüche kürzen',
  addieren: 'Brüche addieren',
  subtrahieren: 'Brüche subtrahieren',
  'bruchteil-vom-bruchteil': 'Bruchteil vom Bruchteil',
  'anteil-von-groesse': 'Anteile von Größen',
  rezept: 'Rezepte umrechnen',
  'teilen-durch-nat': 'Brüche teilen',
  'fehler-finden': 'Fehler finden',
  'regel-entdecken': 'Regeln entdecken',
};

export const WHY_TEXT = {
  fehler: 'Das hat zuletzt noch gehakt.',
  neu: 'Das hast du noch nie probiert.',
  'lange-her': 'Das ist schon eine Weile her.',
};

export const worldByKey = (key) => WORLDS.find((w) => w.key === key);

const INK = '#2B1B3D';
const S = { stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

const MOTIFS = {
  strahl: () => [
    h('line', { x1: 8, y1: 46, x2: 92, y2: 46, ...S }),
    ...[14, 36, 58, 80].map((x) => h('line', { x1: x, y1: 38, x2: x, y2: 54, ...S })),
    h('path', { d: 'M58 14 L58 32 M50 26 L58 34 L66 26', fill: 'none', ...S }),
  ],
  streifen: () => [
    h('rect', { x: 10, y: 14, width: 80, height: 16, rx: 5, fill: '#FFFFFF', ...S }),
    h('rect', { x: 10, y: 38, width: 40, height: 16, rx: 5, fill: '#FFD43B', ...S }),
    h('rect', { x: 50, y: 38, width: 40, height: 16, rx: 5, fill: '#FFFFFF', ...S }),
    h('rect', { x: 10, y: 62, width: 26, height: 16, rx: 5, fill: '#FFD43B', ...S }),
  ],
  alltag: () => [
    h('path', { d: 'M18 40 H82 V62 Q82 78 66 78 H34 Q18 78 18 62 Z', fill: '#FFFFFF', ...S }),
    h('path', { d: 'M12 40 H88', ...S }),
    h('path', { d: 'M34 30 Q30 22 36 16 M50 30 Q46 22 52 16 M66 30 Q62 22 68 16', fill: 'none', ...S }),
  ],
  detektiv: () => [
    h('circle', { cx: 42, cy: 42, r: 22, fill: '#FFFFFF', ...S }),
    h('path', { d: 'M58 58 L82 82', ...S, 'stroke-width': 8 }),
    h('path', { d: 'M33 42 H51 M42 33 V51', ...S }),
  ],
};

export function motif(key) {
  return h('svg', { class: 'tile__motif', viewBox: '0 0 100 90', 'aria-hidden': 'true', focusable: 'false' }, MOTIFS[key]());
}
