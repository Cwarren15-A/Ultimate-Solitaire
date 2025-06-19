/**
 * Auto-completion logic for obvious foundation moves
 */

import { GameState, Move, Card } from "./types";
import { canPlaceOnFoundation, applyMove } from "./rules";

/**
 * Finds all cards that can be automatically moved to foundations
 */
export const findAutocompleteMoves = (gameState: GameState): Move[] => {
  const moves: Move[] = [];
  
  // Check waste pile
  if (gameState.waste.cards.length > 0) {
    const topCard = gameState.waste.cards[gameState.waste.cards.length - 1];
    const foundationMove = findFoundationMoveForCard(topCard, gameState);
    if (foundationMove && isCardSafeToAutoMove(topCard, gameState)) {
      moves.push({
        from: "waste",
        to: foundationMove,
        cards: [topCard],
        timestamp: Date.now()
      });
    }
  }
  
  // Check each tableau pile
  for (let i = 1; i <= 7; i++) {
    const tableauKey = i as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const tableau = gameState.tableaux[tableauKey];
    
    if (tableau.cards.length > 0) {
      const topCard = tableau.cards[tableau.cards.length - 1];
      if (topCard.faceUp) {
        const foundationMove = findFoundationMoveForCard(topCard, gameState);
        if (foundationMove && isCardSafeToAutoMove(topCard, gameState)) {
          moves.push({
            from: `tableau-${i}` as "tableau-1" | "tableau-2" | "tableau-3" | "tableau-4" | "tableau-5" | "tableau-6" | "tableau-7",
            to: foundationMove,
            cards: [topCard],
            timestamp: Date.now()
          });
        }
      }
    }
  }
  
  return moves;
};

/**
 * Determines if a card can be safely auto-moved without blocking future moves
 */
const isCardSafeToAutoMove = (card: Card, gameState: GameState): boolean => {
  // Aces and 2s are always safe to move
  if (card.rank <= 2) return true;
  
  // Check if both cards of opposite color and one rank lower are already on foundations
  const requiredRank = card.rank - 1;
  const oppositeColors = card.suit === "♠︎" || card.suit === "♣︎" ? ["♥︎", "♦︎"] : ["♠︎", "♣︎"];
  
  for (const suit of oppositeColors) {
    const foundation = getFoundationBySuit(gameState, suit);
    if (foundation.cards.length === 0 || foundation.cards[foundation.cards.length - 1].rank < requiredRank) {
      return false;
    }
  }
  
  return true;
};

/**
 * Finds the appropriate foundation pile for a card
 */
const findFoundationMoveForCard = (card: Card, gameState: GameState) => {
  const foundation = getFoundationBySuit(gameState, card.suit);
  
  if (canPlaceOnFoundation(card, foundation.cards)) {
    switch (card.suit) {
      case "♠︎": return "foundation-spades" as const;
      case "♥︎": return "foundation-hearts" as const;
      case "♦︎": return "foundation-diamonds" as const;
      case "♣︎": return "foundation-clubs" as const;
    }
  }
  
  return null;
};

/**
 * Gets foundation pile by suit
 */
const getFoundationBySuit = (gameState: GameState, suit: string) => {
  switch (suit) {
    case "♠︎": return gameState.foundations.spades;
    case "♥︎": return gameState.foundations.hearts;
    case "♦︎": return gameState.foundations.diamonds;
    case "♣︎": return gameState.foundations.clubs;
    default: throw new Error(`Invalid suit: ${suit}`);
  }
};

/**
 * Performs auto-completion by repeatedly finding and applying obvious moves
 */
export const autoComplete = (gameState: GameState): GameState => {
  let currentState = gameState;
  let movesApplied = 0;
  const maxMoves = 52; // Safety limit
  
  while (movesApplied < maxMoves) {
    const autoMoves = findAutocompleteMoves(currentState);
    
    if (autoMoves.length === 0) break;
    
    // Apply the first available auto-move
    try {
      currentState = applyMove(autoMoves[0], currentState);
      movesApplied++;
    } catch {
      // If move fails, stop auto-completion
      break;
    }
  }
  
  return currentState;
};

/**
 * Checks if auto-completion is possible
 */
export const canAutoComplete = (gameState: GameState): boolean => {
  return findAutocompleteMoves(gameState).length > 0;
};
