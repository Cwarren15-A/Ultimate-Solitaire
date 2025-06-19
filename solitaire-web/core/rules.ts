/**
 * Klondike Solitaire game rules and move validation
 */

import { Card, GameState, Move, PileId, isRed, isBlack } from "./types";
import { flipCard } from "./deck";

/**
 * Validates if a card can be placed on a foundation pile
 */
export const canPlaceOnFoundation = (card: Card, foundationCards: Card[]): boolean => {
  // Foundation must be built up by suit starting with Ace
  if (foundationCards.length === 0) {
    return card.rank === 1; // Must start with Ace
  }
  
  const topCard = foundationCards[foundationCards.length - 1];
  return card.suit === topCard.suit && card.rank === topCard.rank + 1;
};

/**
 * Validates if cards can be placed on a tableau pile
 */
export const canPlaceOnTableau = (cards: Card[], tableauCards: Card[]): boolean => {
  if (cards.length === 0) return false;
  
  const cardToPlace = cards[0]; // The bottom card of the sequence being moved
  
  // Empty tableau can accept any King
  if (tableauCards.length === 0) {
    return cardToPlace.rank === 13;
  }
  
  const topCard = tableauCards[tableauCards.length - 1];
  
  // Must be opposite color and one rank lower
  return (
    cardToPlace.rank === topCard.rank - 1 &&
    ((isRed(cardToPlace.suit) && isBlack(topCard.suit)) ||
     (isBlack(cardToPlace.suit) && isRed(topCard.suit)))
  );
};

/**
 * Gets all face-up cards from the end of a tableau pile that form a valid sequence
 */
export const getMovableTableauCards = (tableauCards: Card[]): Card[] => {
  if (tableauCards.length === 0) return [];
  
  const movableCards: Card[] = [];
  
  // Start from the last card and work backwards
  for (let i = tableauCards.length - 1; i >= 0; i--) {
    const card = tableauCards[i];
    
    // Stop if we hit a face-down card
    if (!card.faceUp) break;
    
    // Add to the front of the array to maintain order
    movableCards.unshift(card);
    
    // If this isn't the last card, check if it forms a valid sequence with the next card
    if (i < tableauCards.length - 1) {
      const nextCard = tableauCards[i + 1];
      const isValidSequence = (
        card.rank === nextCard.rank + 1 &&
        ((isRed(card.suit) && isBlack(nextCard.suit)) ||
         (isBlack(card.suit) && isRed(nextCard.suit)))
      );
      
      if (!isValidSequence) break;
    }
  }
  
  return movableCards;
};

/**
 * Validates if a move is legal
 */
export const isValidMove = (move: Move, gameState: GameState): boolean => {
  if (move.cards.length === 0) return false;
  
  const fromPile = getPileById(gameState, move.from);
  const toPile = getPileById(gameState, move.to);
  
  if (!fromPile || !toPile) return false;
  
  // Check if the cards are actually in the from pile
  const fromCards = fromPile.cards;
  const moveCards = move.cards;
  
  // Verify the cards exist at the end of the from pile
  if (fromCards.length < moveCards.length) return false;
  
  const startIndex = fromCards.length - moveCards.length;
  for (let i = 0; i < moveCards.length; i++) {
    if (fromCards[startIndex + i].id !== moveCards[i].id) return false;
  }
  
  // Validate move based on destination pile type
  if (move.to.startsWith("foundation-")) {
    // Foundation moves: only single cards allowed
    if (moveCards.length !== 1) return false;
    return canPlaceOnFoundation(moveCards[0], toPile.cards);
  }
  
  if (move.to.startsWith("tableau-")) {
    return canPlaceOnTableau(moveCards, toPile.cards);
  }
  
  // Stock to waste moves are handled separately
  if (move.from === "stock" && move.to === "waste") {
    return true;
  }
  
  return false;
};

/**
 * Applies a move to the game state (returns new state)
 */
export const applyMove = (move: Move, gameState: GameState): GameState => {
  if (!isValidMove(move, gameState)) {
    throw new Error("Invalid move");
  }
  
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  
  const fromPile = getPileById(newState, move.from);
  const toPile = getPileById(newState, move.to);
  
  if (!fromPile || !toPile) {
    throw new Error("Invalid pile");
  }
  
  // Remove cards from source pile
  fromPile.cards = fromPile.cards.slice(0, -move.cards.length);
  
  // Add cards to destination pile
  toPile.cards.push(...move.cards);
  
  // Flip the top card of the source tableau if it's face down
  if (move.from.startsWith("tableau-") && fromPile.cards.length > 0) {
    const topCard = fromPile.cards[fromPile.cards.length - 1];
    if (!topCard.faceUp) {
      fromPile.cards[fromPile.cards.length - 1] = flipCard(topCard, true);
    }
  }
  
  // Update game stats
  newState.moves++;
  
  // Check for game completion
  newState.isComplete = isGameComplete(newState);
  
  return newState;
};

/**
 * Draws cards from stock to waste
 */
export const drawFromStock = (gameState: GameState): GameState => {
  const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
  
  if (newState.stock.cards.length === 0) {
    // Recycle waste back to stock
    newState.stock.cards = [...newState.waste.cards].reverse().map(card => 
      flipCard(card, false)
    );
    newState.waste.cards = [];
  } else {
    // Draw cards based on draw mode
    const cardsToDraw = Math.min(newState.drawMode, newState.stock.cards.length);
    const drawnCards = newState.stock.cards.slice(0, cardsToDraw); // Take from beginning (top of stock)
    
    newState.stock.cards = newState.stock.cards.slice(cardsToDraw); // Remove from beginning
    newState.waste.cards.push(...drawnCards.map(card => flipCard(card, true)));
  }
  
  return newState;
};

/**
 * Checks if the game is complete (all cards in foundations)
 */
export const isGameComplete = (gameState: GameState): boolean => {
  const totalFoundationCards = 
    gameState.foundations.spades.cards.length +
    gameState.foundations.hearts.cards.length +
    gameState.foundations.diamonds.cards.length +
    gameState.foundations.clubs.cards.length;
    
  return totalFoundationCards === 52;
};

/**
 * Helper function to get a pile by its ID
 */
export const getPileById = (gameState: GameState, pileId: PileId) => {
  switch (pileId) {
    case "stock": return gameState.stock;
    case "waste": return gameState.waste;
    case "foundation-spades": return gameState.foundations.spades;
    case "foundation-hearts": return gameState.foundations.hearts;
    case "foundation-diamonds": return gameState.foundations.diamonds;
    case "foundation-clubs": return gameState.foundations.clubs;
    case "tableau-1": return gameState.tableaux[1];
    case "tableau-2": return gameState.tableaux[2];
    case "tableau-3": return gameState.tableaux[3];
    case "tableau-4": return gameState.tableaux[4];
    case "tableau-5": return gameState.tableaux[5];
    case "tableau-6": return gameState.tableaux[6];
    case "tableau-7": return gameState.tableaux[7];
    default: return null;
  }
};

/**
 * Makes a move and returns result with success status
 */
export const makeMove = (gameState: GameState, move: Move): { success: boolean; state?: GameState; error?: string } => {
  try {
    if (!isValidMove(move, gameState)) {
      return { success: false, error: "Invalid move" };
    }
    
    const newState = applyMove(move, gameState);
    return { success: true, state: newState };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};
