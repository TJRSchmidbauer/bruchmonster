// Aufgabenansicht: Fortschritt, Aufgabe, Widget, Monster-Sprechblase, Tipp/Pruefen, Rueckmeldeblatt.
import { h, button, announce } from '../dom.js';
import { richText } from '../richtext.js';
import { explainView } from '../widgets/explain.js';
import { inputWidget, choiceWidget, markWidget } from '../widgets/basic.js';
import { numberlineWidget, stripsWidget } from '../widgets/interactive.js';
import { monsterPreview } from '../monster/preview.js';
import { describe } from '../../tasks/errors.js';

// Richtung (und grobe Naehe) fuer eine falsche Zahlenstrahl-Antwort, ohne die Loesung zu zeigen.
export function positionFeedback(task, sent) {
  const a = task.answer;
  if (a.type !== 'position' || typeof sent !== 'number') return null;
  const x = a.value.n / a.value.d;
  const side = sent < x ? 'Etwas zu weit links' : 'Etwas zu weit rechts';
  const near = Math.abs(sent - x) <= 2 * (a.tolerance ?? 0);
  return near ? `${side}, aber ziemlich nah dran. Probier es noch mal.` : `${side}. Probier es noch mal.`;
}

export const SUPPORTED = new Set(['input', 'choice', 'mark', 'numberline', 'strips']);

export const INVALID_TEXT = {
  leer: 'Da steht ja noch nichts.',
  'nenner-null': 'Unten steht eine 0 – durch null teilen kann nicht mal ein Monster.',
  format: 'Schreib es als Bruch, zum Beispiel 3/4 oder 1 1/2.',
  negativ: 'Minus gibt’s hier nicht – Monster essen keine Schulden.',
};
export const NOTE_TEXT = { 'nicht-gekuerzt': 'Stimmt – aber da geht noch was: kürze weiter!' };

const RIGHT_TITLES = ['Richtig!', 'Sauber!', 'Volltreffer!', 'Genau so!', 'Stimmt!'];
const RIGHT_LINES = [
  'Das Monster nickt so heftig, dass die Ohren wackeln.',
  'Mampf, mampf. Das schmeckt nach Mathe.',
  'Das Monster ist beeindruckt und gibt es nur nicht zu.',
  'So sieht ein Bruch aus, der weiß, wo er hingehört.',
  'Das Monster schnurrt. Oder knurrt. Auf jeden Fall freundlich.',
];
const WRONG_LINES = [
  'Das war es noch nicht, aber das Monster glaubt an dich.',
  'Daneben, aber kein Drama. Schau noch mal hin.',
  'Noch nicht. Ein Tipp kostet nur ein bisschen Ehre.',
  'Hoppla, das Monster hat sich verschluckt. Nochmal?',
];
const IDLE = 'Na los, ich knurre schon vor Hunger.';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
// Erklaerzeichnung oder null: fehlt explain oder ist es unbekannt, wird einfach nichts gezeichnet.
function safeExplain(explain, opts) {
  if (!explain || (explain.type !== 'strips' && explain.type !== 'numberline') || !explain.data) return null;
  try {
    return explainView(explain, opts);
  } catch {
    return null;
  }
}
const pickFrom = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function makeWidget(task, onSubmit) {
  switch (task.widget.type) {
    case 'input': return inputWidget(onSubmit);
    case 'choice': return choiceWidget(task.widget.data.options);
    case 'mark': return markWidget(task.widget.data.steps);
    case 'numberline': return numberlineWidget(task.widget.data, onSubmit);
    case 'strips': return stripsWidget(task.widget.data, onSubmit);
    default: return null;
  }
}

// ctx: { app, runner, session: { size, done, coins, right }, onNext, onSkip }
export function createTaskView(ctx) {
  const { app, runner, session } = ctx;
  const el = h('div', { class: 'taskview' });
  let widget = null;
  let busy = false;
  let sheetEl = null;

  const dots = () => {
    const at = session.done % session.size;
    return h('ol', { class: 'dots', 'aria-label': `Aufgabe ${at + 1} von ${session.size}` },
      Array.from({ length: session.size }, (_, i) => h('li', { class: i < at ? 'dot2 dot2--done' : i === at ? 'dot2 dot2--now' : 'dot2' })));
  };

  function closeSheet() {
    sheetEl?.remove();
    sheetEl = null;
    document.removeEventListener('keydown', onSheetKey, true);
  }

  // Leichte Fokusfalle: Tab bleibt im Blatt, solange es offen ist. Esc gibt bei einem Fehlversuch
  // die Aufgabe wieder frei (wie "Nochmal versuchen"); bei richtig/Loesung bleibt das Blatt, sonst
  // stuende man vor einer gesperrten Aufgabe ohne Weg weiter.
  function onSheetKey(e) {
    if (!sheetEl) return;
    if (e.key === 'Escape' && (sheetEl.classList.contains('sheet--wrong') || sheetEl.dataset.retry === '1')) {
      e.preventDefault();
      retry();
      return;
    }
    if (e.key !== 'Tab') return;
    const f = [...sheetEl.querySelectorAll('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])')];
    if (f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (!sheetEl.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openSheet({ tone, title, text, extra, buttons, retry: canRetry = false }) {
    closeSheet();
    sheetEl = h('div', { class: `sheet sheet--${tone}`, role: 'status', 'data-retry': canRetry ? '1' : null },
      h('div', { class: 'sheet__inner' },
        h('p', { class: 'sheet__title' }, title),
        text ? h('p', { class: 'sheet__text' }, richText(text)) : null,
        extra ?? null,
        h('div', { class: 'sheet__actions' }, buttons)));
    document.body.append(sheetEl);
    document.addEventListener('keydown', onSheetKey, true);
    sheetEl.querySelector('.btn--primary, .btn')?.focus({ preventScroll: true });
  }

  const nextBtn = () => button('Nächste Aufgabe', { variant: 'primary', onClick: () => { closeSheet(); ctx.onNext(); } });
  const retryBtn = () => button('Nochmal versuchen', { variant: 'primary', onClick: retry });

  function retry() {
    closeSheet();
    busy = false;
    widget.reset?.();
    setControls(false);
    widget.focus();
  }

  let checkBtn;
  let hintBtn;
  let bubble;
  let monsterEl;
  let nudge;

  function setControls(disabled) {
    checkBtn.disabled = disabled;
    hintBtn.disabled = disabled || runner.state().hintsUsed >= 3;
    widget.setDisabled(disabled);
  }

  // Nach dem dritten Tipp ohne Fehlversuch bleibt sonst nur Raten: hier gibt es die Loesung.
  function revealLink() {
    if (!runner.canReveal()) return null;
    return h('p', { class: 'bubble__more' }, button('Lösung zeigen', { variant: 'ghost', onClick: reveal }));
  }

  function updateHintButton() {
    const used = runner.state().hintsUsed;
    hintBtn.querySelector('span').textContent = used >= 3 ? 'Kein Tipp mehr' : used === 0 ? 'Tipp' : `Tipp ${used + 1}`;
    hintBtn.disabled = used >= 3 || busy;
  }

  function celebrate(coins) {
    if (reduced() || typeof monsterEl.animate !== 'function') return;
    monsterEl.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(-22px) rotate(-4deg)' }, { transform: 'translateY(0)' }],
      { duration: 420, easing: 'ease-out' });
    const target = document.querySelector('[data-coins]');
    if (!target || coins <= 0) return;
    const a = monsterEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    for (let i = 0; i < Math.min(coins, 6); i++) {
      const c = h('span', { class: 'coin-icon coin-fly', 'aria-hidden': 'true', style: `left:${a.left + a.width / 2 - 10}px;top:${a.top + a.height / 3}px` });
      document.body.append(c);
      const anim = c.animate(
        [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(0.5)`, opacity: 0.9 }],
        { duration: 560, delay: i * 25, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'backwards' });
      anim.onfinish = () => c.remove();
    }
  }

  function coinLine(res) {
    if (res.coins > 0) return `+${res.coins} ${res.coins === 1 ? 'Münze' : 'Münzen'}`;
    if (res.capped) return 'Die Münzen für diese Aufgabenart sind für heute voll. Üben lohnt sich trotzdem.';
    return 'Diesmal keine Münzen: Nach einem Fehlversuch gibt es bei dieser Aufgabenart keine. Die nächste Aufgabe klappt.';
  }

  function showCorrect(res) {
    session.coins += res.coins;
    session.right++;
    const title = pickFrom(app.rng, RIGHT_TITLES);
    const extra = h('div', { class: 'sheet__extra' },
      h('p', { class: res.coins > 0 ? 'coins coins--small' : 'sheet__note' },
        res.coins > 0 ? h('span', { class: 'coin-icon', 'aria-hidden': 'true' }) : null, coinLine(res)),
      res.card ? h('p', { class: 'sheet__card' }, h('strong', null, `Neue Sammelkarte: ${res.card.name}. `), res.card.text) : null);
    openSheet({ tone: 'right', title, text: pickFrom(app.rng, RIGHT_LINES), extra, buttons: [nextBtn()] });
    celebrate(res.coins);
    announce(`${title} ${res.coins > 0 ? `${res.coins} Münzen.` : ''}`);
  }

  function showWrong(res, sent) {
    const task = runner.current();
    let text = NOTE_TEXT[res.note] ?? pickFrom(app.rng, WRONG_LINES);
    let extra = null;
    if (res.mistake) {
      const info = describe(res.mistake);
      text = info.text;
      const drawing = safeExplain(info.counter);
      extra = drawing ? h('div', { class: 'sheet__drawing' }, drawing) : null;
    } else if (!res.note && task.answer.type === 'position') {
      // Falsche Position: nur die Richtung verraten, die richtige Stelle nicht zeichnen
      // (sonst waere Nachklicken ein Muenzen-Trick). Die Zeichnung gibt es mit Tipp 2 oder bei "Lösung zeigen".
      text = positionFeedback(task, sent) ?? text;
    }
    const buttons = [retryBtn()];
    if (runner.canReveal()) buttons.push(button('Lösung zeigen', { onClick: reveal }));
    buttons.push(button('Nächste Aufgabe', { variant: 'ghost', onClick: () => { closeSheet(); ctx.onNext(); } }));
    openSheet({ tone: 'wrong', title: res.note ? 'Fast!' : 'Nicht ganz.', text, extra, buttons });
  }

  function reveal() {
    const rev = runner.reveal();
    if (!rev) return;
    busy = true;
    setControls(true);
    const task = runner.current();
    const drawing = safeExplain(task.explain);
    openSheet({
      tone: 'info', title: 'So geht’s:',
      text: `Richtig wäre: ${rev.answerText}. ${rev.steps}`,
      extra: drawing ? h('div', { class: 'sheet__drawing' }, drawing) : null,
      buttons: [nextBtn()],
    });
  }

  function check() {
    if (busy) return;
    const v = widget.getValue();
    if (v === null) {
      nudge.textContent = widget.emptyText;
      return;
    }
    nudge.textContent = '';
    busy = true;
    setControls(true);
    const res = runner.submit(v);
    if (res.invalid) {
      openSheet({ tone: 'info', title: 'Moment.', text: INVALID_TEXT[res.invalid] ?? INVALID_TEXT.format, buttons: [retryBtn()], retry: true });
    } else if (res.correct) {
      showCorrect(res);
    } else {
      showWrong(res, v);
    }
  }

  function hint() {
    const text = runner.hint();
    if (text === null) return;
    const task = runner.current();
    const n = runner.state().hintsUsed;
    bubble.replaceChildren(
      h('p', { class: 'bubble__label' }, `Tipp ${n} von 3`),
      h('p', { class: 'bubble__text bubble__text--hint' }, richText(text)),
      n === 2 && safeExplain(task.explain) ? h('div', { class: 'bubble__drawing' }, safeExplain(task.explain)) : null,
      revealLink());
    announce(`Tipp ${n}: ${text}`);
    updateHintButton();
  }

  // Zeigt die aktuelle Aufgabe des Runners.
  function show() {
    closeSheet();
    busy = false;
    const task = runner.current();
    el.replaceChildren();
    const prompt = h('h2', { class: 'prompt', tabindex: '-1' }, richText(task.prompt));

    widget = SUPPORTED.has(task.widget.type) ? makeWidget(task, check) : null;
    if (!widget) {
      el.append(dots(), h('div', { class: 'card taskcard' }, prompt),
        h('div', { class: 'card note-card' },
          h('p', { class: 'sheet__title' }, 'Diese Aufgabe baut das Monster noch.'),
          h('p', null, 'Sie kommt bald. Bis dahin gibt es die nächste.'),
          button('Nächste Aufgabe', { variant: 'primary', onClick: () => ctx.onSkip() })));
      prompt.focus();
      return;
    }

    nudge = h('p', { class: 'nudge', role: 'status' });
    monsterEl = h('div', { class: 'taskview__monster' }, monsterPreview(app.profile));
    bubble = h('div', { class: 'bubble taskview__bubble' }, h('p', { class: 'bubble__text bubble__text--hint' }, IDLE));
    hintBtn = button('Tipp', { variant: 'secondary', onClick: hint });
    checkBtn = button('Prüfen', { variant: 'primary', onClick: check });
    el.append(dots(),
      h('div', { class: 'card taskcard' }, prompt, widget.el, nudge),
      h('div', { class: 'taskview__coach' }, monsterEl, bubble),
      h('div', { class: 'bar' }, hintBtn, checkBtn));
    updateHintButton();
    prompt.focus({ preventScroll: true });
  }

  show();
  return { el, show, destroy: closeSheet };
}
