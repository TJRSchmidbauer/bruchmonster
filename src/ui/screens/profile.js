// Profil-Bildschirm: waehlen, anlegen, importieren, exportieren, loeschen (mit Rueckfrage im UI).
import { h, button, announce } from '../dom.js';
import { importProfile, importProfileFromCode } from '../../core/storage.js';
import { backupLabel } from '../../core/backup.js';
import { saveAsFile, copyCode } from '../backup.js';
import { legalFooter } from '../legal.js';
import { monsterColor } from '../monster/preview.js';

const IMPORT_FEHLER = {
  'kein-json': 'Das ist keine Spielstand-Datei.',
  'falsches-format': 'Diese Datei gehört nicht zu Bruchmonster.',
  verfaelscht: 'Diese Datei wurde verändert und lässt sich nicht öffnen. Nimm die Sicherung, wie sie gespeichert wurde.',
  'zu-gross': 'Diese Datei ist viel zu groß für einen Spielstand.',
  beschaedigt: 'Die Datei ist beschädigt.',
};
const CODE_FEHLER = {
  'kein-code': 'Das sieht nicht nach einem Spielstand-Code aus. Er beginnt mit BM2-. Kopiere ihn noch einmal ganz.',
  verfaelscht: 'Dieser Code ist unvollständig oder wurde verändert. Kopiere ihn noch einmal ganz.',
  'zu-gross': 'Dieser Text ist viel zu lang für einen Spielstand-Code.',
  beschaedigt: 'Der Code ist beschädigt.',
};
const MAX_DATEI_BYTES = 200_000;

export function renderProfile(root, _params, app) {
  const { store } = app;
  let confirming = null; // id des Profils, dessen Loeschen gerade nachgefragt wird
  let message = '';
  let codeDraft = ''; // eingefuegter Code bleibt nach einer Fehlermeldung stehen

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

  // Uebernimmt ein gelesenes Profil: speichern, melden, oeffnen.
  function adopt(res, fehler) {
    if (!res.ok) return say(fehler[res.reason] ?? fehler.beschaedigt);
    const saved = store.save(res.profile);
    app.noteSave?.(res.profile, saved);
    if (saved.ok) app.toast(`Spielstand von ${res.profile.name} ist da.`);
    app.openProfile(res.profile);
  }

  // Eine Sicherungsdatei, per Dialog gewaehlt oder auf die Seite gezogen.
  function handleFile(file) {
    if (!file) return;
    if (file.size > MAX_DATEI_BYTES) return say(IMPORT_FEHLER['zu-gross']);
    const reader = new FileReader();
    reader.onload = () => adopt(importProfile(String(reader.result)), IMPORT_FEHLER);
    reader.onerror = () => say(IMPORT_FEHLER.beschaedigt);
    reader.readAsText(file);
  }

  function onFile(ev) {
    const file = ev.target.files[0];
    ev.target.value = '';
    handleFile(file);
  }

  function onCode() {
    codeDraft = root.querySelector('#import-code')?.value ?? '';
    adopt(importProfileFromCode(codeDraft), CODE_FEHLER);
  }

  // Ziehen und Ablegen: gilt fuer die ganze Seite, damit eine daneben fallengelassene Datei nicht
  // den Browser zum Oeffnen der Datei bringt und die App verlaesst.
  const hasFiles = (ev) => Array.from(ev.dataTransfer?.types ?? []).includes('Files');
  let dragDepth = 0;
  const zone = () => root.querySelector('.dropzone');
  const onDragEnter = (ev) => { if (!hasFiles(ev)) return; dragDepth += 1; zone()?.classList.add('dropzone--over'); };
  const onDragLeave = (ev) => { if (!hasFiles(ev)) return; dragDepth = Math.max(0, dragDepth - 1); if (dragDepth === 0) zone()?.classList.remove('dropzone--over'); };
  const onDragOver = (ev) => { if (hasFiles(ev)) ev.preventDefault(); };
  const onDrop = (ev) => {
    if (!hasFiles(ev)) return;
    ev.preventDefault();
    dragDepth = 0;
    zone()?.classList.remove('dropzone--over');
    handleFile(ev.dataTransfer.files[0]);
  };
  const dragEvents = [['dragenter', onDragEnter], ['dragleave', onDragLeave], ['dragover', onDragOver], ['drop', onDrop]];
  for (const [name, fn] of dragEvents) document.addEventListener(name, fn);

  function row(entry) {
    const p = app.unsaved?.pendingFor(entry.id) ?? store.load(entry.id);
    const asking = confirming === entry.id;
    const mount = h('div', { class: 'profile-row__code' });
    const backupEl = p ? h('span', { class: 'profile-row__backup small' }, backupLabel(p, app.today?.() ?? '')) : null;
    // Nach dem Sichern nur die Beschriftung auffrischen (die Zeile bleibt stehen, damit ein Codefeld nicht verschwindet).
    const refreshBackup = () => {
      const now = app.unsaved?.pendingFor(entry.id) ?? store.load(entry.id);
      if (now && backupEl) backupEl.textContent = backupLabel(now, app.today?.() ?? '');
    };
    return h('li', { class: 'card profile-row' },
      h('div', { class: 'profile-row__info' },
        h('span', { class: 'dot', style: `background:${monsterColor(p?.color)}`, 'aria-hidden': 'true' }),
        h('span', { class: 'profile-row__name' }, entry.name),
        h('span', { class: 'coins coins--small' }, h('span', { class: 'coin-icon', 'aria-hidden': 'true' }), `${p?.coins ?? 0}`,
          h('span', { class: 'sr-only' }, ' Münzen')),
        backupEl),
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
            button('Als Datei sichern', { variant: 'ghost', onClick: () => { if (p) { saveAsFile(app, p); refreshBackup(); } }, 'aria-label': `${entry.name} als Datei sichern` }),
            button('Code kopieren', { variant: 'ghost', 'data-act': 'copy-code', onClick: async () => { if (p) { await copyCode(app, p, mount); refreshBackup(); } }, 'aria-label': `${entry.name}: Code kopieren` }),
            button('Löschen', { variant: 'ghost', 'data-del': entry.id, onClick: () => { confirming = entry.id; draw('[data-act="cancel"]'); }, 'aria-label': `${entry.name} löschen` })),
      mount);
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
          h('div', { class: 'dropzone' },
            h('p', { class: 'dropzone__hint small' }, 'Zieh deine Sicherung hierher, oder wähle sie aus.'),
            h('input', { id: 'import-datei', class: 'sr-only', type: 'file', accept: '.json,application/json', tabindex: -1, onchange: onFile }),
            button('Datei auswählen', { variant: 'secondary', onClick: () => root.querySelector('#import-datei').click() })),
          h('label', { for: 'import-code', class: 'field__label' }, 'Oder füge deinen Spielstand-Code ein'),
          h('textarea', { id: 'import-code', class: 'field codebox__text', rows: 3, spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', placeholder: 'BM2-…' }, codeDraft),
          button('Code laden', { variant: 'secondary', 'data-act': 'load-code', onClick: onCode })),
        legalFooter('profile')));
    const h1 = root.querySelector('h1');
    h1.setAttribute('tabindex', '-1');
    if (focusSel) (root.querySelector(focusSel) ?? h1).focus();
  }

  draw();
  return () => { for (const [name, fn] of dragEvents) document.removeEventListener(name, fn); };
}
