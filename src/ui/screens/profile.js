// Profil-Bildschirm: waehlen, anlegen, importieren, exportieren, loeschen (mit Rueckfrage im UI).
import { h, button, announce } from '../dom.js';
import { exportProfile, importProfile } from '../../core/storage.js';
import { monsterColor } from '../monster/preview.js';

const IMPORT_FEHLER = {
  'kein-json': 'Das ist keine Spielstand-Datei.',
  'falsches-format': 'Diese Datei gehört zu einem anderen Programm.',
  'zu-neu': 'Dieser Spielstand ist von einer neueren Bruchmonster-Version.',
  beschaedigt: 'Die Datei ist beschädigt.',
};

function download(profile) {
  const safe = profile.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'monster';
  const url = URL.createObjectURL(new Blob([exportProfile(profile)], { type: 'application/json' }));
  const a = h('a', { href: url, download: `bruchmonster-${safe}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function renderProfile(root, _params, app) {
  const { store } = app;
  let confirming = null; // id des Profils, dessen Loeschen gerade nachgefragt wird
  let message = '';

  function open(id) {
    const p = store.load(id);
    if (!p) {
      message = 'Dieser Spielstand lässt sich nicht lesen.';
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

  function create(ev) {
    ev.preventDefault();
    const input = root.querySelector('#neuer-name');
    const { profile, saved } = store.createProfile(input.value);
    if (!saved.ok) app.toast('Speichern hat nicht geklappt. Exportiere den Spielstand, damit nichts verloren geht.');
    app.openProfile(profile);
  }

  function onFile(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importProfile(String(reader.result));
      if (!res.ok) return say(IMPORT_FEHLER[res.reason] ?? IMPORT_FEHLER.beschaedigt);
      const saved = store.save(res.profile);
      if (!saved.ok) app.toast('Speichern hat nicht geklappt. Exportiere den Spielstand, damit nichts verloren geht.');
      else app.toast(`Spielstand von ${res.profile.name} ist da.`);
      app.openProfile(res.profile);
    };
    reader.onerror = () => say(IMPORT_FEHLER.beschaedigt);
    reader.readAsText(file);
  }

  function row(entry) {
    const p = store.load(entry.id);
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
            button('Exportieren', { variant: 'ghost', onClick: () => p && download(p), 'aria-label': `${entry.name} exportieren` }),
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
        h('form', { class: 'card create', onsubmit: create },
          h('h2', { class: 'card__title' }, 'Neues Monster'),
          h('label', { for: 'neuer-name', class: 'field__label' }, 'Dein Name'),
          h('input', { id: 'neuer-name', class: 'field field--hint', type: 'text', maxlength: 20, autocomplete: 'off', placeholder: 'Zum Beispiel Mia', 'aria-describedby': 'name-hinweis' }),
          h('p', { id: 'name-hinweis', class: 'small field__hint' }, 'Ohne Namen heißt du Monsterfreund.'),
          h('button', { type: 'submit', class: 'btn btn--primary' }, h('span', null, 'Los geht’s'))),
        h('div', { class: 'card import' },
          h('h2', { class: 'card__title' }, 'Spielstand mitbringen'),
          h('p', { class: 'small' }, 'Hast du einen Spielstand als Datei? Hol ihn hier zurück.'),
          h('input', { id: 'import-datei', class: 'sr-only', type: 'file', accept: '.json,application/json', tabindex: -1, onchange: onFile }),
          button('Datei auswählen', { variant: 'secondary', onClick: () => root.querySelector('#import-datei').click() }))));
    const h1 = root.querySelector('h1');
    h1.setAttribute('tabindex', '-1');
    if (focusSel) (root.querySelector(focusSel) ?? h1).focus();
  }

  draw();
}
