// Gemeinsame Bausteine der Monster-Tabs: Preis, Sprechblase, Huepf-Animation, Knopf mit Schluessel.
import { h, button } from '../dom.js';
import { monsterSvg } from './art.js';
import { monsterStage } from '../../core/economy.js';

export const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function price(n) {
  return h('span', { class: 'price' }, h('span', { class: 'coin-icon', 'aria-hidden': 'true' }), `${n}`, h('span', { class: 'sr-only' }, n === 1 ? ' Münze' : ' Münzen'));
}

// Knopf mit data-key (Fokus bleibt nach dem Neuzeichnen erhalten) und Klick-Handler.
export function keyed(key, text, opts, onClick) {
  const b = button(text, { ...opts, 'data-key': key, onClick: (e) => onClick(b, e) });
  return b;
}

export function profileMonster(p, mood = 'neutral', cls = 'monster-svg') {
  return monsterSvg({ stage: monsterStage(p.xp), color: p.color, wearing: p.wearing, mood, cls });
}

// Monster mit Sprechblase. Die Blase ist eine hoeflich vorgelesene Statusanzeige.
export function coach(ctx, text) {
  const p = ctx.app.profile;
  return h('div', { class: 'coach' },
    h('div', { class: 'coach__monster' }, profileMonster(p, ctx.mood ?? 'neutral')),
    h('div', { class: 'bubble coach__bubble', role: 'status' }, h('p', { class: 'bubble__text' }, ctx.message ?? text)));
}

// Kurzer Huepfer, nur ohne reduzierte Bewegung.
export function hop(el) {
  if (!el || reduced() || typeof el.animate !== 'function') return;
  el.animate(
    [{ transform: 'translateY(0)' }, { transform: 'translateY(-18px) rotate(-3deg)' }, { transform: 'translateY(0) scale(1.04, 0.96)' }, { transform: 'translateY(0)' }],
    { duration: 520, easing: 'ease-out' });
}
