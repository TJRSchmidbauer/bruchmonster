// Empfehlung der naechsten Aufgabenart. Reine Logik ohne UI.
import { KINDS } from '../tasks/generators.js';

const DAY_MS = 86400000;
const MIN_ATTEMPTS = 3;

const ALL = Object.entries(KINDS).flatMap(([world, kinds]) => kinds.map((kind) => ({ world, kind })));

const attempts = (m) => m.right + m.wrong;

// Hoechste Fehlerquote bei mindestens 3 Versuchen (Quote 0 zaehlt nicht), sonst die am laengsten
// nicht geuebte Art. Noch nie geuebte Arten haben last = 0 und kommen zuerst.
export function recommend(p, nowMs = Date.now()) {
  const entries = ALL.map((e) => ({ ...e, m: p.mastery[e.kind] ?? { right: 0, wrong: 0, last: 0 } }));

  let worst = null;
  let worstRate = 0;
  for (const e of entries) {
    const n = attempts(e.m);
    if (n < MIN_ATTEMPTS) continue;
    const rate = e.m.wrong / n;
    if (rate > worstRate) {
      worst = e;
      worstRate = rate;
    }
  }
  if (worst) {
    return {
      world: worst.world,
      kind: worst.kind,
      why: 'fehler',
      reason: `Fehlerquote ${Math.round(worstRate * 100)} % bei ${attempts(worst.m)} Versuchen`,
    };
  }

  const oldest = [...entries].sort((a, b) => a.m.last - b.m.last)[0];
  const days = Math.floor((nowMs - oldest.m.last) / DAY_MS);
  let reason;
  if (oldest.m.last === 0) reason = 'noch nie geübt';
  else if (days === 0) reason = 'heute schon geübt, aber am längsten her';
  else reason = `zuletzt vor ${days} Tagen geübt`;
  return { world: oldest.world, kind: oldest.kind, why: oldest.m.last === 0 ? 'neu' : 'lange-her', reason };
}
