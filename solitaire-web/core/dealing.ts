/**
 * Game dealing and initialization
 */

import { GameState } from "./types";
import { createShuffledDeck, flipCard } from "./deck";

/**
 * Creates initial game state with dealt cards
 */
export const dealNewGame = (options: { drawMode: 1 | 3 } = { drawMode: 1 }): GameState => {
  const deck = createShuffledDeck();
  const now = Date.now();
  
  // Initialize empty piles
  const gameState: GameState = {
    stock: {
      id: "stock",
      cards: []
    },
    waste: {
      id: "waste", 
      cards: []
    },
    foundations: {
      spades: {
        id: "foundation-spades",
        suit: "♠︎",
        cards: []
      },
      hearts: {
        id: "foundation-hearts",
        suit: "♥︎",
        cards: []
      },
      diamonds: {
        id: "foundation-diamonds", 
        suit: "♦︎",
        cards: []
      },
      clubs: {
        id: "foundation-clubs",
        suit: "♣︎",
        cards: []
      }
    },
    tableaux: {
      1: { id: "tableau-1", cards: [] },
      2: { id: "tableau-2", cards: [] },
      3: { id: "tableau-3", cards: [] },
      4: { id: "tableau-4", cards: [] },
      5: { id: "tableau-5", cards: [] },
      6: { id: "tableau-6", cards: [] },
      7: { id: "tableau-7", cards: [] }
    },
    drawMode: options.drawMode,
    moves: 0,
    score: 0,
    startTime: now,
    isComplete: false
  };
  
  // Deal cards to tableau (Klondike pattern)
  let cardIndex = 0;
  
  // Deal face-down cards first
  for (let col = 1; col <= 7; col++) {
    for (let row = col; row <= 7; row++) {
      const tableauKey = row as 1 | 2 | 3 | 4 | 5 | 6 | 7;
      const card = deck[cardIndex++];
      gameState.tableaux[tableauKey].cards.push({
        ...card,
        faceUp: false
      });
    }
  }
  
  // Flip the top card of each tableau pile
  for (let col = 1; col <= 7; col++) {
    const tableauKey = col as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const pile = gameState.tableaux[tableauKey];
    if (pile.cards.length > 0) {
      const topCard = pile.cards[pile.cards.length - 1];
      pile.cards[pile.cards.length - 1] = flipCard(topCard, true);
    }
  }
  
  // Remaining cards go to stock
  gameState.stock.cards = deck.slice(cardIndex);
  
  return gameState;
};

/**
 * Resets game to initial state
 */
export const resetGame = (drawMode: 1 | 3 = 1): GameState => {
  return dealNewGame({ drawMode });
};

/**
 * Creates a new game with the same settings
 */
export const newGame = (currentState: GameState): GameState => {
  return dealNewGame({ drawMode: currentState.drawMode });
};

/**
 * Alias for dealNewGame - for backwards compatibility
 */
export const initGame = dealNewGame;
