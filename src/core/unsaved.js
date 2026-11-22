// Merkt sich den neuesten Spielstand, dessen Speichern fehlgeschlagen ist.
// Export und Banner nutzen diese Kopie im Arbeitsspeicher, nicht den (veralteten) Speicher.
export function createUnsaved() {
  let cur = null;
  return {
    note(profile, res) {
      if (!res.ok) cur = profile;
      else if (cur && cur.id === profile.id) cur = null;
    },
    get: () => cur,
    pendingFor: (id) => (cur && cur.id === id ? cur : null),
  };
}
