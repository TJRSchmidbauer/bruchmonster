// Sammelkarten-Album: gesammelte Karten mit Text, fehlende als Fragezeichen.
import { h } from '../dom.js';
import { ITEMS } from '../../core/economy.js';
import { itemArt } from './thumbs.js';

const RARITY = { normal: 'Normal', selten: 'Selten', legendaer: 'Legendär' };
const HOW = 'Alle 5 richtigen Antworten in Folge und an jedem 3. Tag in Folge gibt\'s eine Karte.';

function missingCard(card) {
  return h('li', { class: 'tcard tcard--missing', 'data-card': card.id },
    h('div', { class: 'tcard__art', 'aria-hidden': 'true' }, h('span', { class: 'tcard__q' }, '?')),
    h('div', { class: 'tcard__body' },
      h('h3', { class: 'tcard__name' }, 'Noch nicht gesammelt'),
      h('p', { class: 'tcard__rarity' }, `Seltenheit: ${RARITY[card.rarity]}`)));
}

function gotCard(card) {
  return h('li', { class: `tcard tcard--${card.rarity}`, 'data-card': card.id },
    h('div', { class: 'tcard__art' }, itemArt(card)),
    h('div', { class: 'tcard__body' },
      h('h3', { class: 'tcard__name' }, card.name),
      h('p', { class: 'tcard__rarity' }, h('span', { class: 'tcard__badge' }, RARITY[card.rarity])),
      h('p', { class: 'tcard__text' }, card.text)));
}

export function renderCards(ctx) {
  const p = ctx.app.profile;
  const cards = ITEMS.filter((it) => it.kind === 'karte');
  const got = cards.filter((c) => p.cards.includes(c.id)).length;
  return h('div', { class: 'album' },
    h('p', { class: 'album__count' }, `${got} von ${cards.length} Karten gesammelt`),
    h('p', { class: 'album__how' }, HOW),
    h('ul', { class: 'album__grid' }, cards.map((c) => (p.cards.includes(c.id) ? gotCard(c) : missingCard(c)))));
}
