// Aufgabenablauf ohne DOM: Tipps, Pruefen, Belohnung, Serie, Karten, Loesung zeigen.
// Das Profil wird nie veraendert; jede Aenderung geht als neues Profil an onUpdate(profile, event).
import { generate, checkAnswer } from '../tasks/generators.js';
import { applyResult, touchStreak, cardDue, awardCard } from '../core/economy.js';
import { format, formatMixed, frac } from '../core/fractions.js';

const GUESS_TYPES = new Set(['choice', 'marks']);

// Text der richtigen Antwort fuer "Loesung zeigen".
export function answerText(task) {
  const a = task.answer;
  switch (a.type) {
    case 'frac':
      if (a.accept === 'between') {
        const [lo, hi] = a.range;
        return `zum Beispiel ${format(frac(lo.n + hi.n, lo.d + hi.d))}`;
      }
      if (a.accept === 'exact') return format(a.value);
      return formatMixed(a.value);
    case 'position':
      return `bei ${formatMixed(a.value)}`;
    case 'choice':
      return String(task.widget?.data?.options?.[a.value] ?? '');
    case 'marks':
      return `Zeile ${a.value + 1}`;
    default:
      return '';
  }
}

export function createRunner({ profile, kind, level, rng, today, nowMs, onUpdate, pickTask = generate }) {
  let p = profile;
  let task = pickTask(kind, level, rng);
  let sessionStreak = 0;
  let newDayCard = null;
  let t = fresh();

  const now = () => nowMs ?? Date.now();
  const emit = (event) => { if (onUpdate) onUpdate(p, event); };

  function fresh() {
    return { hintsUsed: 0, wrongAttempts: 0, solved: false, revealed: false, countedWrong: false, first: null };
  }

  // Beim Start: Tageserie weiterzaehlen, am Serientag durch 3 eine Karte.
  const touched = touchStreak(p, today);
  if (touched.isNewDay) {
    p = touched.profile;
    if (cardDue({ sessionStreak: 0, isNewDay: true, streakDays: p.streak.days })) {
      const drawn = awardCard(p, rng);
      p = drawn.profile;
      newDayCard = drawn.card;
    }
    emit({ type: 'new-day', card: newDayCard });
  }

  function countWrongOnce() {
    if (t.countedWrong) return false;
    t.countedWrong = true;
    p = applyResult(p, task, { correct: false, hintsUsed: t.hintsUsed }, today, now()).profile;
    return true;
  }

  const canReveal = () => !t.solved && !t.revealed && (t.wrongAttempts >= 2 || t.hintsUsed >= 3);

  return {
    current: () => task,
    profile: () => p,
    canReveal,

    hint() {
      if (t.hintsUsed >= task.hints.length) return null;
      return task.hints[t.hintsUsed++];
    },

    state: () => ({
      hintsUsed: t.hintsUsed, wrongAttempts: t.wrongAttempts, solved: t.solved, revealed: t.revealed,
      sessionStreak, newDayCard,
    }),

    submit(input) {
      if (t.solved || t.revealed) return { ...t.first, already: true };
      const check = checkAnswer(task, input);

      if (check.invalid) return { correct: false, invalid: check.invalid, coins: 0, capped: false, already: false };

      if (!check.correct) {
        t.wrongAttempts++;
        sessionStreak = 0;
        const changed = countWrongOnce();
        if (changed) emit({ type: 'wrong' });
        const res = { correct: false, coins: 0, capped: false, already: false };
        if (check.mistake) res.mistake = check.mistake;
        if (check.note) res.note = check.note;
        return res;
      }

      // Richtig.
      const clean = t.wrongAttempts === 0 && t.hintsUsed === 0;
      let coins = 0;
      let capped = false;
      if (!(GUESS_TYPES.has(task.answer.type) && t.wrongAttempts > 0)) {
        const r = applyResult(p, task, {
          correct: true,
          hintsUsed: t.hintsUsed + t.wrongAttempts,
          explained: task.meta?.isReasoning === true,
          streak: sessionStreak,
        }, today, now());
        p = r.profile;
        coins = r.coins;
        capped = r.capped;
      }
      if (clean) sessionStreak++;
      let card = null;
      if (cardDue({ sessionStreak: clean ? sessionStreak : 0, isNewDay: false, streakDays: p.streak.days })) {
        const drawn = awardCard(p, rng);
        p = drawn.profile;
        card = drawn.card;
      }
      t.solved = true;
      const res = { correct: true, coins, capped, already: false };
      if (card) res.card = card;
      t.first = { correct: true, coins, capped };
      if (card) t.first.card = card;
      emit({ type: 'correct', coins, card });
      return res;
    },

    reveal() {
      if (!canReveal()) return null;
      t.revealed = true;
      sessionStreak = 0;
      if (countWrongOnce()) emit({ type: 'reveal' });
      t.first = { correct: false, coins: 0, capped: false };
      return { answerText: answerText(task), steps: task.hints[2] };
    },

    next() {
      task = pickTask(kind, level, rng);
      t = fresh();
      return task;
    },
  };
}
