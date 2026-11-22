// Hub: Monster, Empfehlung, vier Welten, Weg zum Monster-Bereich.
import { h, button } from '../dom.js';
import { go } from '../router.js';
import { recommend } from '../../core/recommend.js';
import { KINDS } from '../../tasks/generators.js';
import { WORLDS, worldByKey, motif, KIND_LABELS, WHY_TEXT } from '../worlds.js';
import { monsterPreview } from '../monster/preview.js';
import { backupButtons, backupHint } from '../backup.js';

// Ein Stern pro Aufgabenart mit mindestens 5 richtigen Antworten.
function stars(profile, key) {
  const kinds = KINDS[key];
  const got = kinds.filter((k) => (profile.mastery[k]?.right ?? 0) >= 5).length;
  return { got, total: kinds.length };
}

function star(filled) {
  return h('svg', { class: filled ? 'star star--on' : 'star', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('polygon', { points: '12,2.5 14.9,8.6 21.5,9.4 16.6,14 17.9,20.6 12,17.3 6.1,20.6 7.4,14 2.5,9.4 9.1,8.6' }));
}

export function renderHub(root, _params, app) {
  const p = app.profile;
  const rec = recommend(p, Date.now());
  const recWorld = worldByKey(rec.world);

  const tiles = WORLDS.map((w) => {
    const s = stars(p, w.key);
    return h('li', null,
      h('button', { type: 'button', class: 'tile', style: `--tile:${w.color}`, onclick: () => go('world', { world: w.key }) },
        h('span', { class: 'tile__art' }, motif(w.key)),
        h('span', { class: 'tile__body' },
          h('span', { class: 'tile__name' }, w.name),
          h('span', { class: 'tile__blurb' }, w.blurb),
          h('span', { class: 'tile__stars' },
            Array.from({ length: s.total }, (_, i) => star(i < s.got)),
            h('span', { class: 'sr-only' }, `${s.got} von ${s.total} Sternen`)))));
  });

  root.append(
    h('div', { class: 'screen screen--hub' },
      h('h1', { class: 'sr-only' }, `Hallo ${p.name}`),
      h('section', { class: 'hub__monster', 'aria-label': 'Dein Monster' },
        h('div', { class: 'stage' }, monsterPreview(p)),
        h('div', { class: 'bubble' },
          h('p', { class: 'bubble__text' }, `Heute hab ich Hunger auf: ${KIND_LABELS[rec.kind] ?? rec.kind} im ${recWorld.name}.`),
          h('p', { class: 'bubble__reason' }, WHY_TEXT[rec.why] ?? ''),
          button('Los geht’s', { variant: 'primary', onClick: () => go('world', { world: rec.world, kind: rec.kind }) }))),
      backupHint(app, p),
      h('section', { class: 'hub__worlds', 'aria-label': 'Welten' },
        h('h2', { class: 'section-title' }, 'Wohin heute?'),
        h('ul', { class: 'tiles' }, tiles),
        button('Zum Monster', { variant: 'secondary', onClick: () => go('monster') }),
        ...backupButtons(app))));
}
