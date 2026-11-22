// Monster-Vorschau fuer Hub und Aufgabenansicht: das echte Monster mit Stufe, Farbe und Kleidung des Profils.
import { monsterSvg, MONSTER_COLORS, resolveColor } from './art.js';
import { monsterStage } from '../../core/economy.js';

export { MONSTER_COLORS };
export const monsterColor = resolveColor;

export function monsterPreview(profile, mood = 'neutral') {
  return monsterSvg({
    stage: monsterStage(profile?.xp ?? 0),
    color: profile?.color,
    wearing: profile?.wearing ?? {},
    mood,
    fit: true,
    cls: 'monster-preview',
  });
}
