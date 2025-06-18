/**
 * Core domain types for Klondike Solitaire
 * Framework-agnostic pure types
 */

export type Suit = "♠︎" | "♥︎" | "♦︎" | "♣︎";

export interface Card {
  id: string;
  suit: Suit;
  rank: number; // 1-13 (Ace=1, Jack=11, Queen=12, King=13)
  faceUp: boolean;
}

export type PileId = 
  | "stock"
  | "waste" 
  | "foundation-spades"
  | "foundation-hearts"
  | "foundation-diamonds"
  | "foundation-clubs"
  | "tableau-1"
  | "tableau-2" 
  | "tableau-3"
  | "tableau-4"
  | "tableau-5"
  | "tableau-6"
  | "tableau-7";

export interface BasePile {
  id: PileId;
  cards: Card[];
}

export interface StockPile extends BasePile {
  id: "stock";
}

export interface WastePile extends BasePile {
  id: "waste";
}

export interface FoundationPile extends BasePile {
  id: "foundation-spades" | "foundation-hearts" | "foundation-diamonds" | "foundation-clubs";
  suit: Suit;
}

export interface TableauPile extends BasePile {
  id: "tableau-1" | "tableau-2" | "tableau-3" | "tableau-4" | "tableau-5" | "tableau-6" | "tableau-7";
}

export type Pile = StockPile | WastePile | FoundationPile | TableauPile;

export interface Move {
  from: PileId;
  to: PileId;
  cards: Card[];
  timestamp: number;
}

export interface GameState {
  stock: StockPile;
  waste: WastePile;
  foundations: {
    spades: FoundationPile;
    hearts: FoundationPile;
    diamonds: FoundationPile;
    clubs: FoundationPile;
  };
  tableaux: {
    1: TableauPile;
    2: TableauPile;
    3: TableauPile;
    4: TableauPile;
    5: TableauPile;
    6: TableauPile;
    7: TableauPile;
  };
  drawMode: 1 | 3;
  moves: number;
  score: number;
  startTime: number;
  isComplete: boolean;
}

export interface GameSnapshot {
  state: GameState;
  move: Move;
}

// Utility type guards
export const isRed = (suit: Suit): boolean => suit === "♥︎" || suit === "♦︎";
export const isBlack = (suit: Suit): boolean => suit === "♠︎" || suit === "♣︎";

export const getRankName = (rank: number): string => {
  switch (rank) {
    case 1: return "A";
    case 11: return "J";
    case 12: return "Q"; 
    case 13: return "K";
    default: return rank.toString();
  }
};

export const getSuitSymbol = (suit: Suit): string => suit;
