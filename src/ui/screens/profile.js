// Profil-Bildschirm: waehlen, anlegen, importieren, exportieren, loeschen (mit Rueckfrage im UI).
import { h, button, announce } from '../dom.js';
import { importProfile } from '../../core/storage.js';
import { downloadProfile } from '../download.js';
import { monsterColor } from '../monster/preview.js';

const IMPORT_FEHLER = {
  'kein-json': 'Das ist keine Spielstand-Datei.',
  'falsches-format': 'Diese Datei gehört nicht zu Bruchmonster.',
  verfaelscht: 'Diese Datei wurde verändert und lässt sich nicht öffnen. Nimm die Sicherung, wie sie gespeichert wurde.',
  'zu-gross': 'Diese Datei ist viel zu groß für einen Spielstand.',
  beschaedigt: 'Die Datei ist beschädigt.',
};
const MAX_DATEI_BYTES = 200_000;

export function renderProfile(root, _params, app) {
  const { store } = app;
  let confirming = null; // id des Profils, dessen Loeschen gerade nachgefragt wird
  let message = '';

  function open(id) {
    const p = app.unsaved?.pendingFor(id) ?? store.load(id);
    if (!p) {
      message = 'Dieser Spielstand ist kaputt oder wurde verändert und lässt sich nicht öffnen. Lösche ihn und lade deine Sicherung, oder fang neu an.';
      draw('#meldung');
      return;
    }
    app.openProfile(p);
  }

  function say(text) {
    message = text;
    announce(text);
    draw('#meldung');
  }

  // Bewusst kein <form>: In abgeschotteten Rahmen (z.B. Vorschau im Chat, eingebettete Seiten ohne
  // "allow-forms") blockiert der Browser jedes Formular-Absenden stillschweigend.
  function create() {
    const input = root.querySelector('#neuer-name');
    const { profile, saved } = store.createProfile(input.value);
    app.noteSave?.(profile, saved);
    app.openProfile(profile);
  }

  function onFile(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    if (file.size > MAX_DATEI_BYTES) { ev.target.value = ''; return say(IMPORT_FEHLER['zu-gross']); }
    const reader = new FileReader();
    reader.onload = () => {
      const res = importProfile(String(reader.result));
      if (!res.ok) return say(IMPORT_FEHLER[res.reason] ?? IMPORT_FEHLER.beschaedigt);
      const saved = store.save(res.profile);
      app.noteSave?.(res.profile, saved);
      if (saved.ok) app.toast(`Spielstand von ${res.profile.name} ist da.`);
      app.openProfile(res.profile);
    };
    reader.onerror = () => say(IMPORT_FEHLER.beschaedigt);
    reader.readAsText(file);
  }

  function row(entry) {
    const p = app.unsaved?.pendingFor(entry.id) ?? store.load(entry.id);
    const asking = confirming === entry.id;
    return h('li', { class: 'card profile-row' },
      h('div', { class: 'profile-row__info' },
        h('span', { class: 'dot', style: `background:${monsterColor(p?.color)}`, 'aria-hidden': 'true' }),
        h('span', { class: 'profile-row__name' }, entry.name),
        h('span', { class: 'coins coins--small' }, h('span', { class: 'coin-icon', 'aria-hidden': 'true' }), `${p?.coins ?? 0}`,
          h('span', { class: 'sr-only' }, ' Münzen'))),
      asking
        ? h('div', { class: 'profile-row__actions', role: 'group', 'aria-label': `${entry.name} löschen?` },
            h('p', { class: 'profile-row__ask', id: 'rueckfrage' }, `${entry.name} wirklich löschen? Das geht nicht rückgängig.`),
            button('Ja, löschen', { variant: 'danger', onClick: () => {
              store.remove(entry.id);
              app.forget(entry.id);
              confirming = null;
              say(`${entry.name} ist gelöscht.`);
            } }),
            button('Doch nicht', { variant: 'ghost', 'data-act': 'cancel', 'aria-describedby': 'rueckfrage', onClick: () => { confirming = null; draw(`[data-del="${entry.id}"]`); } }))
        : h('div', { class: 'profile-row__actions' },
            button('Spielen', { variant: 'primary', onClick: () => open(entry.id), 'aria-label': `${entry.name} spielen` }),
            button('Exportieren', { variant: 'ghost', onClick: () => p && downloadProfile(p), 'aria-label': `${entry.name} exportieren` }),
            button('Löschen', { variant: 'ghost', 'data-del': entry.id, onClick: () => { confirming = entry.id; draw('[data-act="cancel"]'); }, 'aria-label': `${entry.name} löschen` })));
  }

  function draw(focusSel) {
    const list = store.listProfiles();
    root.replaceChildren(
      h('div', { class: 'screen screen--profile' },
        h('h1', { class: 'title' }, list.length ? 'Wer spielt heute?' : 'Hallo, Bruchfreund!'),
        h('p', { class: 'lead' }, list.length
          ? 'Such dir dein Monster aus oder zieh ein neues auf.'
          : 'Gib dir einen Namen, dann bekommst du dein eigenes Monster. Es hat immer Hunger.'),
        store.persistent ? null : h('p', { class: 'notice', role: 'note' },
          'Dein Browser speichert gerade nichts dauerhaft. Exportiere deinen Spielstand, bevor du das Fenster schließt.'),
        message ? h('p', { id: 'meldung', tabindex: -1, class: 'notice notice--error', role: 'alert' }, message) : null,
        list.length ? h('ul', { class: 'profile-list' }, list.map(row)) : null,
        h('div', { class: 'card create', role: 'group', 'aria-labelledby': 'neu-titel' },
          h('h2', { class: 'card__title', id: 'neu-titel' }, 'Neues Monster'),
          h('label', { for: 'neuer-name', class: 'field__label' }, 'Dein Name'),
          h('input', { id: 'neuer-name', class: 'field field--hint', type: 'text', maxlength: 20, autocomplete: 'off', placeholder: 'Zum Beispiel Mia', 'aria-describedby': 'name-hinweis',
            onkeydown: (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); create(); } } }),
          h('p', { id: 'name-hinweis', class: 'small field__hint' }, 'Ohne Namen heißt du Monsterfreund.'),
          h('button', { type: 'button', class: 'btn btn--primary', 'data-act': 'create', onclick: create }, h('span', null, 'Los geht’s'))),
        h('div', { class: 'card import' },
          h('h2', { class: 'card__title' }, 'Spielstand mitbringen'),
          h('p', { class: 'small' }, 'Hast du einen Spielstand als Datei? Hol ihn hier zurück.'),
          h('input', { id: 'import-datei', class: 'sr-only', type: 'file', accept: '.json,application/json', tabindex: -1, onchange: onFile }),
          button('Datei auswählen', { variant: 'secondary', onClick: () => root.querySelector('#import-datei').click() })),
        h('footer', { class: 'legal small' },
          h('p', null, '© 2026 Tobias Schmidbauer · ',
            h('a', { href: 'https://creativecommons.org/licenses/by-nc/4.0/deed.de', target: '_blank', rel: 'noopener noreferrer' }, 'CC BY-NC 4.0'),
            ' · ',
            h('a', { href: 'https://schmidbauer.io', target: '_blank', rel: 'noopener noreferrer' }, 'schmidbauer.io')),
          h('p', null, 'Mit KI-Unterstützung entwickelt. Die App selbst sendet nichts ins Netz.'))));
    const h1 = root.querySelector('h1');
    h1.setAttribute('tabindex', '-1');
    if (focusSel) (root.querySelector(focusSel) ?? h1).focus();
  }

  draw();
}
