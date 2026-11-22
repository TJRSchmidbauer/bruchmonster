// Sicherungsstand: Wann wurde zuletzt gesichert, und lohnt sich eine Erinnerung?
// Reine Logik ohne UI. Der Stand liegt im Profil: backup = { date: 'JJJJ-MM-TT' | '', right: Anzahl richtiger Antworten }.

// So viele neue richtige Antworten seit der letzten Sicherung, dann erinnert die App.
export const BACKUP_AFTER_RIGHT = 20;

const DAY_MS = 86_400_000;

export function rightTotal(p) {
  return Object.values(p.mastery ?? {}).reduce((n, m) => n + (m.right ?? 0), 0);
}

export function markBackedUp(p, today) {
  return { ...p, backup: { date: today, right: rightTotal(p) } };
}

export function backupDue(p) {
  return rightTotal(p) - (p.backup?.right ?? 0) >= BACKUP_AFTER_RIGHT;
}

export function backupLabel(p, today) {
  const date = p.backup?.date ?? '';
  if (date === '') return 'noch nie gesichert';
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / DAY_MS);
  if (!(days > 0)) return 'heute gesichert';
  if (days === 1) return 'gestern gesichert';
  return `vor ${days} Tagen gesichert`;
}
