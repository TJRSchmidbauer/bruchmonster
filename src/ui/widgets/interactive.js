// Antwort-Widgets fuer Zahlenstrahl und Streifen, im gleichen Format wie basic.js:
// { el, getValue(), reset(), focus(), setDisabled(bool), emptyText }.
import { h } from '../dom.js';
import { frac } from '../../core/fractions.js';
import { numberline } from './numberline.js';
import { strips } from './strips.js';

// Zahlenstrahl: getValue() ist die Position x oder null, solange der Punkt nicht gesetzt wurde.
export function numberlineWidget(data, onSubmit) {
  const svg = numberline({ ...data, draggable: true });
  const pin = svg.querySelector('[role="slider"]');
  pin.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    }
  });
  const el = h('div', { class: 'answer answer--line' }, svg,
    h('p', { class: 'field__hint small' }, 'Zieh den Punkt, tipp auf den Strahl oder nimm die Pfeiltasten.'));
  return {
    el,
    svg,
    emptyText: 'Setz erst den Punkt auf den Strahl.',
    getValue: () => svg.getValue(),
    reset: () => svg.clearGhost(),
    focus: () => svg.focusPin(),
    setDisabled: (b) => svg.lock(b),
    showGhost: (x) => svg.ghost(x),
  };
}

// Streifen zum Einfaerben: getValue() ist der Bruch filled/parts oder null, wenn nichts gefaerbt ist.
export function stripsWidget(data, onSubmit) {
  const rows = data.rows.map((r) => ({ ...r, filled: 0 }));
  const strip = strips({ rows, interactive: 'fill' });
  const el = h('div', { class: 'answer answer--strips' }, strip,
    h('p', { class: 'field__hint small' }, 'Tipp die Stücke an oder zieh darüber. Mit der Tastatur: Pfeiltasten und Leertaste.'));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target?.getAttribute?.('role') === 'button' && e.ctrlKey) onSubmit?.();
  });
  return {
    el,
    emptyText: 'Färbe erst ein paar Stücke ein.',
    getValue() {
      const s = strip.getState();
      return s.filled === 0 ? null : frac(s.filled, s.parts);
    },
    reset() {},
    focus: () => strip.focusFirst(),
    setDisabled: (b) => strip.lock(b),
  };
}
