// Welt-Bildschirm: Stufenwahl, Aufgabenarten mit Sternen, dann Runden zu je 5 Aufgaben.
import { h, button } from '../dom.js';
import { go } from '../router.js';
import { KINDS, pickTask } from '../../tasks/generators.js';
import { worldByKey, KIND_LABELS, LEVELS, kindStars } from '../worlds.js';
import { createRunner } from '../runner.js';
import { createTaskView } from './taskview.js';
import { EXPERIMENTS, experimentView } from '../experiments.js';

const ROUND = 5;
const levelMemory = {};

function stars(n) {
  return h('span', { class: 'kind__stars' },
    Array.from({ length: 3 }, (_, i) => h('svg', { class: i < n ? 'star star--on' : 'star', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
      h('polygon', { points: '12,2.5 14.9,8.6 21.5,9.4 16.6,14 17.9,20.6 12,17.3 6.1,20.6 7.4,14 2.5,9.4 9.1,8.6' }))),
    h('span', { class: 'sr-only' }, `${n} von 3 Sternen`));
}

export function renderWorld(root, params, app) {
  const w = worldByKey(params.world) ?? worldByKey('strahl');
  let level = levelMemory[w.key] ?? 1;
  let runner = null;
  let view = null;
  let session = null;
  let kind = null;
  let mode = 'list';

  const body = h('div', { class: 'world__body' });
  const title = h('h1', { class: 'title world__title' }, w.name);
  const back = button('Zurück', { variant: 'ghost', onClick: () => (mode === 'list' ? go('hub') : showList()) });
  const backLabel = back.querySelector('span');
  root.append(h('div', { class: 'screen screen--world', style: `--world:${w.color}` },
    h('header', { class: 'world__head' }, back, title), body));

  function showList() {
    view?.destroy();
    runner = null;
    view = null;
    mode = 'list';
    backLabel.textContent = 'Zur Karte';
    const p = app.profile;
    const levelBtns = LEVELS.map((l) => h('button', {
      type: 'button', class: 'level', 'aria-pressed': String(l.n === level),
      onclick: () => {
        level = l.n;
        levelMemory[w.key] = l.n;
        levelBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(LEVELS[i].n === level)));
      },
    }, h('span', { class: 'level__n' }, `Stufe ${l.n}`), h('span', { class: 'level__name' }, l.name)));

    body.replaceChildren(
      h('p', { class: 'lead' }, w.blurb),
      h('section', { 'aria-labelledby': 'lvl-h' },
        h('h2', { class: 'section-title', id: 'lvl-h' }, 'Wie schwer?'),
        h('div', { class: 'levels', role: 'group', 'aria-labelledby': 'lvl-h' }, levelBtns)),
      h('section', { 'aria-labelledby': 'kind-h' },
        h('h2', { class: 'section-title', id: 'kind-h' }, 'Was üben wir?'),
        h('ul', { class: 'kinds' }, KINDS[w.key].map((k) => h('li', { class: 'kinds__item' },
          h('button', { type: 'button', class: 'kind', onclick: () => open(k) },
            h('span', { class: 'kind__name' }, KIND_LABELS[k] ?? k),
            stars(kindStars(p.mastery[k]))),
          EXPERIMENTS[k]
            ? h('button', { type: 'button', class: 'linkbtn', 'aria-label': `Experiment nochmal: ${KIND_LABELS[k] ?? k}`, onclick: () => showExperiment(k) }, 'Experiment nochmal')
            : null)))));
  }

  // Neues Thema mit Experiment: erst ausprobieren, dann die Aufgaben.
  function open(k) {
    if (EXPERIMENTS[k] && !(app.profile.seen ?? []).includes(k)) showExperiment(k);
    else start(k);
  }

  function showExperiment(k) {
    view?.destroy();
    runner = null;
    view = null;
    mode = 'experiment';
    kind = k;
    backLabel.textContent = 'Zur Liste';
    const el = experimentView(k, {
      onDone: () => {
        const seen = app.profile.seen ?? [];
        if (!seen.includes(k)) app.setProfile({ ...app.profile, seen: [...seen, k] });
        start(k);
      },
    });
    body.replaceChildren(h('p', { class: 'world__sub' }, `${KIND_LABELS[k] ?? k} · Ausprobieren`), el);
    el.querySelector('h2')?.focus();
  }

  function start(k) {
    mode = 'tasks';
    kind = k;
    levelMemory[w.key] = level;
    session = { size: ROUND, done: 0, coins: 0, right: 0 };
    runner = createRunner({
      profile: app.profile, kind: k, level, rng: app.rng, today: app.today(), pickTask,
      onUpdate: (p, ev) => {
        app.setProfile(p);
        if (ev?.card) app.toast(`Neue Sammelkarte: ${ev.card.name}`);
      },
    });
    backLabel.textContent = 'Andere Aufgabe';
    mountTask();
  }

  function mountTask() {
    view = createTaskView({ app, runner, session, onNext: next, onSkip: skip });
    body.replaceChildren(
      h('p', { class: 'world__sub' }, `${KIND_LABELS[kind] ?? kind} · Stufe ${level}, ${LEVELS[level - 1].name}`),
      view.el);
  }

  function skip() {
    runner.next();
    view.show();
  }

  function next() {
    session.done++;
    if (session.done % session.size === 0) {
      summary();
      return;
    }
    runner.next();
    view.show();
  }

  function summary() {
    view.destroy();
    const lines = session.right === session.size
      ? 'Alle richtig. Das Monster wird größenwahnsinnig.'
      : session.right >= 3 ? 'Ordentlich! Das Monster ist satt, aber nicht ganz.' : 'Das Monster mag dich trotzdem. Übung macht Fresser.';
    body.replaceChildren(h('div', { class: 'card summary' },
      h('h2', { class: 'card__title', tabindex: '-1', id: 'sum-h' }, 'Runde geschafft!'),
      h('p', { class: 'lead' }, `${session.right} von ${session.size} richtig, ${session.coins} ${session.coins === 1 ? 'Münze' : 'Münzen'} gesammelt.`),
      h('p', null, lines),
      h('div', { class: 'summary__actions' },
        button('Weiter', { variant: 'primary', onClick: () => { session.coins = 0; session.right = 0; runner.next(); mountTask(); } }),
        button('Zurück zur Karte', { onClick: () => go('hub') }))));
    body.querySelector('#sum-h')?.focus();
  }

  if (params.kind && KINDS[w.key].includes(params.kind)) open(params.kind);
  else showList();
  return () => view?.destroy();
}
