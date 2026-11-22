import { createStore } from './core/storage.js';
import { makeRng } from './core/rng.js';
import { createUnsaved } from './core/unsaved.js';
import { downloadProfile } from './ui/download.js';
import { saveAsFile, copyCode } from './ui/backup.js';
import { markBackedUp } from './core/backup.js';
import { h, button } from './ui/dom.js';
import { startRouter, registerScreen, go } from './ui/router.js';
import { renderProfile } from './ui/screens/profile.js';
import { renderHub } from './ui/screens/hub.js';
import { renderWorld } from './ui/screens/world.js';
import { renderMonster } from './ui/screens/monster.js';
import { renderRecht } from './ui/screens/recht.js';

const LAST_KEY = 'bruchmonster:last';

const store = createStore();
const pad = (n) => String(n).padStart(2, '0');

function readLast() {
  try { return localStorage.getItem(LAST_KEY); } catch { return null; }
}
function writeLast(id) {
  try {
    if (id) localStorage.setItem(LAST_KEY, id);
    else localStorage.removeItem(LAST_KEY);
  } catch { /* ohne Speicher geht es auch */ }
}

const coinsEl = h('span', { class: 'coins', 'data-coins': '0' }, h('span', { class: 'coin-icon', 'aria-hidden': 'true' }), h('span', { class: 'coins__n' }, '0'), h('span', { class: 'sr-only' }, ' Münzen'));
const streakEl = h('span', { class: 'streak' });
const nameBtn = button('', { variant: 'ghost', onClick: () => go('profile') });
nameBtn.classList.add('topbar__name');
const header = h('header', { class: 'topbar', hidden: true },
  nameBtn,
  h('div', { class: 'topbar__stats' }, streakEl, coinsEl));
const toastEl = h('div', { class: 'toast', role: 'status', hidden: true });
let toastTimer = null;
const unsaved = createUnsaved();
const saveBanner = h('div', { class: 'savebanner', role: 'alert', hidden: true },
  h('p', null, 'Speichern klappt gerade nicht – sichere deinen Spielstand als Datei.'),
  button('Als Datei sichern', { variant: 'primary', onClick: () => { const p = unsaved.get(); if (p) downloadProfile(p); } }));

const app = {
  store,
  unsaved,
  profile: null,
  rng: makeRng(Date.now()),
  today() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  setProfile(p) {
    app.profile = p;
    app.updateHeader();
    const res = store.save(p);
    app.noteSave(p, res);
    return res;
  },
  // Merkt Speicherfehler; das Banner bleibt, bis das Speichern wieder klappt.
  noteSave(p, res) {
    unsaved.note(p, res);
    saveBanner.hidden = unsaved.get() === null;
  },
  // Merkt, dass dieses Profil gerade gesichert wird (Datum und Stand), und speichert es. Gibt das Profil zurueck.
  recordBackup(p) {
    const marked = markBackedUp(p, app.today());
    if (app.profile?.id === marked.id) app.setProfile(marked);
    else app.noteSave(marked, store.save(marked));
    return marked;
  },
  // Sichern des aktiven Profils aus dem Arbeitsspeicher (immer der aktuelle Stand): als Datei oder als Code.
  exportProfile() {
    if (app.profile) saveAsFile(app, app.profile);
  },
  copyCode(mount) {
    return app.profile ? copyCode(app, app.profile, mount) : Promise.resolve(false);
  },
  openProfile(p) {
    app.profile = p;
    writeLast(p.id);
    app.updateHeader();
    go('hub');
  },
  forget(id) {
    if (app.profile?.id === id) {
      app.profile = null;
      app.updateHeader();
    }
    if (readLast() === id) writeLast(null);
  },
  updateHeader() {
    const p = app.profile;
    header.hidden = !p;
    if (!p) return;
    nameBtn.querySelector('span').textContent = p.name;
    nameBtn.setAttribute('aria-label', `${p.name}, Profil wechseln`);
    coinsEl.setAttribute('data-coins', String(p.coins));
    coinsEl.querySelector('.coins__n').textContent = String(p.coins);
    const days = p.streak.days;
    streakEl.textContent = days > 0 ? `${days} ${days === 1 ? 'Tag' : 'Tage'} in Folge` : '';
    streakEl.hidden = days === 0;
  },
  toast(text) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 6000);
  },
};

const main = h('main', { id: 'screen', class: 'main' });
document.getElementById('app').append(header, saveBanner, main, toastEl);
startRouter(main, app);
registerScreen('profile', (root, params, a) => {
  a.profile = null;
  a.updateHeader();
  return renderProfile(root, params, a);
});
registerScreen('hub', renderHub);
registerScreen('world', renderWorld);
registerScreen('monster', renderMonster);
registerScreen('recht', renderRecht);

const profiles = store.listProfiles();
const last = readLast();
const start = profiles.length === 1 && profiles[0].id === last ? store.load(last) : null;
if (start) app.openProfile(start);
else go('profile');
