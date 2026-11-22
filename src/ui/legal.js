// Fuss mit Urheber, Lizenz, Homepage sowie Wegen zu Impressum und Datenschutz.
import { h, button } from './dom.js';
import { go } from './router.js';

export const URLS = {
  lizenz: 'https://creativecommons.org/licenses/by-nc/4.0/deed.de',
  homepage: 'https://schmidbauer.io',
  github: 'https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement',
};

export function extLink(href, text) {
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, text);
}

export function legalFooter(back) {
  return h('footer', { class: 'legal small' },
    h('p', null, '© 2026 Tobias Schmidbauer · ', extLink(URLS.lizenz, 'CC BY-NC 4.0'), ' · ', extLink(URLS.homepage, 'schmidbauer.io')),
    h('p', { class: 'legal__links' },
      button('Impressum', { variant: 'ghost', 'data-act': 'impressum', onClick: () => go('recht', { back, part: 'impressum' }) }),
      button('Datenschutz', { variant: 'ghost', 'data-act': 'datenschutz', onClick: () => go('recht', { back, part: 'datenschutz' }) })),
    h('p', null, 'Mit KI-Unterstützung entwickelt. Die App selbst sendet nichts ins Netz.'));
}
