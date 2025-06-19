/**
 * Game state serialization for AI hints and persistence
 */

import { GameState, Card, Move } from "./types";

/**
 * Serializes game state to a compact JSON representation for AI analysis
 */
export const serializeGameState = (gameState: GameState): string => {
  const serialized = {
    // Compact card representation: "suit:rank:faceUp"
    stock: gameState.stock.cards.map(serializeCard),
    waste: gameState.waste.cards.map(serializeCard),
    foundations: {
      s: gameState.foundations.spades.cards.map(serializeCard),
      h: gameState.foundations.hearts.cards.map(serializeCard),  
      d: gameState.foundations.diamonds.cards.map(serializeCard),
      c: gameState.foundations.clubs.cards.map(serializeCard)
    },
    tableaux: {
      1: gameState.tableaux[1].cards.map(serializeCard),
      2: gameState.tableaux[2].cards.map(serializeCard),
      3: gameState.tableaux[3].cards.map(serializeCard),
      4: gameState.tableaux[4].cards.map(serializeCard),
      5: gameState.tableaux[5].cards.map(serializeCard),
      6: gameState.tableaux[6].cards.map(serializeCard),
      7: gameState.tableaux[7].cards.map(serializeCard)
    },
    drawMode: gameState.drawMode,
    moves: gameState.moves
  };
  
  return JSON.stringify(serialized);
};

/**
 * Serializes a single card to compact string format
 */
const serializeCard = (card: Card): string => {
  const suitMap = { "♠︎": "s", "♥︎": "h", "♦︎": "d", "♣︎": "c" };
  const suit = suitMap[card.suit];
  const rank = card.rank.toString(16); // Use hex for compactness
  const face = card.faceUp ? "1" : "0";
  return `${suit}${rank}${face}`;
};

/**
 * Deserializes a card from compact string format
 */
const deserializeCard = (cardStr: string, id?: string): Card => {
  const suitMap = { s: "♠︎", h: "♥︎", d: "♦︎", c: "♣︎" } as const;
  
  const suit = suitMap[cardStr[0] as keyof typeof suitMap];
  const rank = parseInt(cardStr.slice(1, -1), 16);
  const faceUp = cardStr.slice(-1) === "1";
  
  return {
    id: id || `${suit}-${rank}`,
    suit,
    rank,
    faceUp
  };
};

/**
 * Deserializes game state from compact JSON
 */
export const deserializeGameState = (serialized: string): Partial<GameState> => {
  const data = JSON.parse(serialized);
  
  return {
    stock: { id: "stock", cards: data.stock.map((c: string) => deserializeCard(c)) },
    waste: { id: "waste", cards: data.waste.map((c: string) => deserializeCard(c)) },
    foundations: {
      spades: { id: "foundation-spades", suit: "♠︎", cards: data.foundations.s.map((c: string) => deserializeCard(c)) },
      hearts: { id: "foundation-hearts", suit: "♥︎", cards: data.foundations.h.map((c: string) => deserializeCard(c)) },
      diamonds: { id: "foundation-diamonds", suit: "♦︎", cards: data.foundations.d.map((c: string) => deserializeCard(c)) },
      clubs: { id: "foundation-clubs", suit: "♣︎", cards: data.foundations.c.map((c: string) => deserializeCard(c)) }
    },
    tableaux: {
      1: { id: "tableau-1", cards: data.tableaux[1].map((c: string) => deserializeCard(c)) },
      2: { id: "tableau-2", cards: data.tableaux[2].map((c: string) => deserializeCard(c)) },
      3: { id: "tableau-3", cards: data.tableaux[3].map((c: string) => deserializeCard(c)) },
      4: { id: "tableau-4", cards: data.tableaux[4].map((c: string) => deserializeCard(c)) },
      5: { id: "tableau-5", cards: data.tableaux[5].map((c: string) => deserializeCard(c)) },
      6: { id: "tableau-6", cards: data.tableaux[6].map((c: string) => deserializeCard(c)) },
      7: { id: "tableau-7", cards: data.tableaux[7].map((c: string) => deserializeCard(c)) }
    },
    drawMode: data.drawMode,
    moves: data.moves
  };
};

/**
 * Creates a human-readable description of the game state for AI analysis
 */
export const describeGameState = (gameState: GameState): string => {
  const descriptions = [];
  
  // Stock and waste
  descriptions.push(`Stock: ${gameState.stock.cards.length} cards`);
  if (gameState.waste.cards.length > 0) {
    const topWaste = gameState.waste.cards[gameState.waste.cards.length - 1];
    descriptions.push(`Waste: ${topWaste.rank} of ${topWaste.suit} (${gameState.waste.cards.length} total)`);
  } else {
    descriptions.push("Waste: empty");
  }
  
  // Foundations
  const foundationDescs = [];
  for (const [suitName, foundation] of Object.entries(gameState.foundations)) {
    if (foundation.cards.length > 0) {
      const top = foundation.cards[foundation.cards.length - 1];
      foundationDescs.push(`${suitName}: ${top.rank}`);
    } else {
      foundationDescs.push(`${suitName}: empty`);
    }
  }
  descriptions.push(`Foundations - ${foundationDescs.join(", ")}`);
  
  // Tableaux
  for (let i = 1; i <= 7; i++) {
    const tableau = gameState.tableaux[i as 1 | 2 | 3 | 4 | 5 | 6 | 7];
    const faceDownCount = tableau.cards.filter(c => !c.faceUp).length;
    const faceUpCards = tableau.cards.filter(c => c.faceUp);
    
    let desc = `Tableau ${i}: `;
    if (faceDownCount > 0) desc += `${faceDownCount} face-down, `;
    if (faceUpCards.length > 0) {
      desc += faceUpCards.map(c => `${c.rank}${c.suit}`).join("-");
    } else if (faceDownCount === 0) {
      desc += "empty";
    }
    descriptions.push(desc);
  }
  
  descriptions.push(`Moves: ${gameState.moves}, Draw mode: ${gameState.drawMode}`);
  
  return descriptions.join("\\n");
};

/**
 * Serializes a move for storage or transmission
 */
export const serializeMove = (move: Move): string => {
  return JSON.stringify({
    from: move.from,
    to: move.to,
    cards: move.cards.map(serializeCard),
    timestamp: move.timestamp
  });
};

/**
 * Deserializes a move from storage
 */
export const deserializeMove = (serialized: string): Move => {
  const data = JSON.parse(serialized);
  return {
    from: data.from,
    to: data.to,
    cards: data.cards.map((c: string) => deserializeCard(c)),
    timestamp: data.timestamp
  };
};
