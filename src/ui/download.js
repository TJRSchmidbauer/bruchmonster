// Spielstand als Datei speichern (rein lokal, ohne Server).
import { h } from './dom.js';
import { exportProfile } from '../core/storage.js';

export function downloadProfile(profile) {
  const safe = profile.name.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'monster';
  const url = URL.createObjectURL(new Blob([exportProfile(profile)], { type: 'application/json' }));
  const a = h('a', { href: url, download: `bruchmonster-${safe}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
