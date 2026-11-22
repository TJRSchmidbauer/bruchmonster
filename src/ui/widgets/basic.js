// Einfache Antwort-Widgets: Eingabefeld, Auswahl, Zeile antippen.
// Jedes liefert { el, getValue(), reset(), focus(), setDisabled(bool), emptyText }.
// getValue(): Eingabe fuer runner.submit(), bei Auswahl ohne Wahl null.
import { h } from '../dom.js';
import { richText } from '../richtext.js';

export function inputWidget(onSubmit) {
  const id = `ans-${Math.random().toString(36).slice(2, 7)}`;
  const field = h('input', {
    id, class: 'field answer__field', type: 'text', maxlength: 40, inputmode: 'text', autocomplete: 'off',
    autocapitalize: 'none', spellcheck: 'false', enterkeyhint: 'done', 'aria-describedby': `${id}-help`,
    onkeydown: (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      }
    },
  });

  // Auf Tablets ohne Bruchstrich-Taste: "/" und Leerzeichen einfuegen.
  const insert = (txt) => {
    const s = field.selectionStart ?? field.value.length;
    const e = field.selectionEnd ?? s;
    field.value = field.value.slice(0, s) + txt + field.value.slice(e);
    field.focus();
    field.setSelectionRange?.(s + txt.length, s + txt.length);
  };
  const key = (label, aria, txt) => h('button', {
    type: 'button', class: 'keycap', 'aria-label': aria, onclick: () => insert(txt),
  }, label);
  const keys = [key('/', 'Bruchstrich einfügen', '/'), key('␣', 'Leerzeichen einfügen', ' ')];

  const el = h('div', { class: 'answer answer--input' },
    h('label', { class: 'field__label', for: id }, 'Deine Antwort'),
    h('div', { class: 'answer__row' }, field, h('div', { class: 'answer__keys' }, keys)),
    h('p', { class: 'field__hint small', id: `${id}-help` }, 'Schreib einen Bruch wie 3/4, auch gemischt wie 1 1/2.'));

  return {
    el,
    emptyText: 'Da steht ja noch nichts.',
    getValue: () => field.value,
    reset: () => { field.value = ''; },
    focus: () => field.focus(),
    setDisabled(b) {
      field.disabled = b;
      for (const k of keys) k.disabled = b;
    },
  };
}

// Gemeinsame Bauweise fuer "eine von mehreren Zeilen waehlen".
function pickList(className, items, label, emptyText) {
  let selected = null;
  const buttons = items.map((content, i) => {
    const b = h('button', {
      type: 'button', class: `pick ${className}`, 'aria-pressed': 'false',
      onclick: () => {
        selected = i;
        buttons.forEach((x, j) => x.setAttribute('aria-pressed', String(j === i)));
      },
    }, content);
    return b;
  });
  const el = h('div', { class: 'answer', role: 'group', 'aria-label': label }, buttons);
  return {
    el,
    emptyText,
    getValue: () => selected,
    reset() {
      selected = null;
      buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    },
    focus: () => buttons[selected ?? 0]?.focus(),
    setDisabled: (b) => buttons.forEach((x) => { x.disabled = b; }),
  };
}

export function choiceWidget(options) {
  const items = options.map((o) => h('span', { class: 'pick__text' }, richText(o)));
  return pickList('pick--choice', items, 'Antworten', 'Wähle erst eine Antwort aus.');
}

export function markWidget(steps) {
  const items = steps.map((s, i) => [
    h('span', { class: 'pick__no', 'aria-hidden': 'true' }, i + 1),
    h('span', { class: 'sr-only' }, `Zeile ${i + 1}: `),
    h('span', { class: 'pick__text' }, richText(s)),
  ]);
  return pickList('pick--mark', items, 'Rechnung, tippe die falsche Zeile an', 'Tippe zuerst die Zeile mit dem Fehler an.');
}
