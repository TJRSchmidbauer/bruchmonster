// Sichern: als Datei oder als Code zum Kopieren. Beides merkt sich den Sicherungsstand im Profil.
import { h, button } from './dom.js';
import { downloadProfile } from './download.js';
import { exportCode } from '../core/storage.js';
import { backupDue } from '../core/backup.js';

// Legt Text in die Zwischenablage. Gibt true zurueck, wenn es geklappt hat. Wirft nie.
// Manche Browser erlauben das nicht (kein sicherer Kontext, eingebettete Seite): dann false.
export async function copyToClipboard(text) {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Ausweg, wenn das Kopieren gesperrt ist: der Code steht in einem Feld, das sich markieren laesst.
export function codeBox(code) {
  const area = h('textarea', {
    class: 'field codebox__text', readonly: true, rows: 4, spellcheck: 'false', autocomplete: 'off',
    'aria-label': 'Dein Spielstand-Code', onfocus: () => area.select(),
  }, code);
  const box = h('div', { class: 'codebox', role: 'group', 'aria-label': 'Spielstand-Code zum Kopieren' },
    h('p', { class: 'small' }, 'Dein Browser lässt das Kopieren nicht zu. Markiere den Code und kopiere ihn selbst.'),
    area,
    button('Alles markieren', { variant: 'secondary', onClick: () => { area.focus(); area.select(); } }));
  return { box, area };
}

// Speichert den Spielstand als Datei. `profile` ist das Profil, das gesichert wird.
export function saveAsFile(app, profile) {
  const marked = app.recordBackup ? app.recordBackup(profile) : profile;
  downloadProfile(marked);
}

// Kopiert den Spielstand-Code. Klappt die Zwischenablage nicht, erscheint das Feld in `mount`.
// Gibt true zurueck, wenn der Code kopiert wurde.
export async function copyCode(app, profile, mount) {
  const marked = app.recordBackup ? app.recordBackup(profile) : profile;
  const code = exportCode(marked);
  if (code == null) { app.toast?.('Der Code ließ sich nicht erstellen. Sichere den Spielstand als Datei.'); return false; }
  if (await copyToClipboard(code)) {
    mount?.replaceChildren();
    app.toast?.('Code kopiert. Füge ihn auf dem anderen Gerät bei „Spielstand mitbringen“ ein.');
    return true;
  }
  if (mount) {
    const { box, area } = codeBox(code);
    mount.replaceChildren(box);
    area.focus();
    area.select();
  }
  return false;
}

// Die zwei Knoepfe fuer Hub und Monster-Bereich plus Platz fuer den Ausweg beim Kopieren.
export function backupButtons(app) {
  const mount = h('div', { class: 'backup__mount' });
  return [
    button('Als Datei sichern', { variant: 'ghost', 'data-act': 'export', onClick: () => app.exportProfile?.() }),
    button('Code kopieren', { variant: 'ghost', 'data-act': 'copy-code', onClick: () => { app.copyCode?.(mount); } }),
    mount,
  ];
}

// Erinnerung im Hub: nur wenn seit der letzten Sicherung viel dazugekommen ist. Sonst null.
export function backupHint(app, profile) {
  if (!backupDue(profile)) return null;
  const mount = h('div', { class: 'backup__mount' });
  const hint = h('section', { class: 'card backup-hint', role: 'note', 'aria-label': 'Erinnerung zum Sichern' },
    h('h2', { class: 'card__title' }, 'Sichere dein Monster'),
    h('p', null, 'Du hast viel gelernt. Sichere dein Monster, falls dein Browser mal alles vergisst.'),
    h('div', { class: 'backup-hint__actions' },
      button('Als Datei sichern', { variant: 'primary', 'data-act': 'hint-file', onClick: () => { app.exportProfile?.(); hint.remove(); } }),
      button('Code kopieren', { variant: 'secondary', 'data-act': 'hint-code', onClick: async () => { if (await app.copyCode?.(mount)) hint.remove(); } })),
    mount);
  return hint;
}
