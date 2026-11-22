// Erklaerzeichnung zu task.explain bzw. dem Gegenbeispiel eines typischen Fehlers.
import { stripsStatic } from './strips.js';
import { numberlineStatic } from './numberline.js';

// explain: { type: 'strips' | 'numberline', data }. Gibt ein SVG-Element zurueck.
// Die Einfaerbe-Animation ist reine CSS-Animation und faellt bei reduzierter Bewegung weg.
export function explainView(explain, opts = {}) {
  const animate = opts.animate !== false;
  if (explain?.type === 'strips') return stripsStatic(explain.data, { animate });
  if (explain?.type === 'numberline') return numberlineStatic(explain.data);
  throw new Error(`Unbekannte Erklaerzeichnung: ${explain?.type}`);
}
