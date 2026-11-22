// Kleine Helfer fuer alle Zeichnungen: Tintenfarbe, Farbmischung, Kontur-Attribute.
export const INK = '#2B1B3D';

function parse(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Mischt zwei Hex-Farben: t = 0 ergibt a, t = 1 ergibt b.
export function mix(a, b, t) {
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return a;
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export const shade = (hex, t) => mix(hex, INK, t);
export const tint = (hex, t) => mix(hex, '#FFFFFF', t);

// Tinten-Kontur fuer Formen (sw = Strichstaerke im lokalen Koordinatensystem).
export const st = (sw = 3, extra = {}) => ({
  stroke: INK, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra,
});
