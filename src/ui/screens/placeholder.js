// Platzhalter fuer Bildschirme, die spaetere Tasks ersetzen.
import { h, button } from '../dom.js';
import { go } from '../router.js';

export function placeholder(title) {
  return (root) => {
    root.append(h('div', { class: 'screen' },
      h('h1', { class: 'title' }, title),
      h('p', { class: 'lead' }, 'Kommt gleich. Das Monster baut noch.'),
      button('Zurück', { variant: 'secondary', onClick: () => go('hub') })));
  };
}
