// Text mit Bruechen: "a/b" wird als gestapelter Bruch (fracView) gesetzt, der Rest bleibt Text.
import { h, fracView } from './dom.js';

const TOKEN = /(\d+)\/(\d+)/g;

// Gibt ein <span class="rich"> zurueck. Nenner 0 oder zu grosse Zahlen bleiben Text.
export function richText(str, opts = {}) {
  const size = opts.size ?? 's';
  const text = String(str ?? '');
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const n = Number(m[1]);
    const d = Number(m[2]);
    if (d === 0 || !Number.isSafeInteger(n) || !Number.isSafeInteger(d)) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(fracView({ n, d }, { size }));
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return h('span', { class: 'rich' }, parts);
}
