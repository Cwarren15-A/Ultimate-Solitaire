/**
 * Card utilities and deck generation
 */

import { Card, Suit } from "./types";

const SUITS: Suit[] = ["♠︎", "♥︎", "♦︎", "♣︎"];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

/**
 * Creates a standard 52-card deck
 */
export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        faceUp: false
      });
    }
  }
  
  return deck;
};

/**
 * Fisher-Yates shuffle algorithm
 */
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};

/**
 * Creates a new shuffled deck
 */
export const createShuffledDeck = (): Card[] => {
  return shuffleDeck(createDeck());
};

/**
 * Flips a card face up/down
 */
export const flipCard = (card: Card, faceUp: boolean): Card => ({
  ...card,
  faceUp
});

/**
 * Flips multiple cards
 */
export const flipCards = (cards: Card[], faceUp: boolean): Card[] => 
  cards.map(card => flipCard(card, faceUp));

/**
 * Gets the opposite color of a card
 */
export const getOppositeColor = (card: Card): "red" | "black" => {
  return (card.suit === "♥︎" || card.suit === "♦︎") ? "black" : "red";
};
