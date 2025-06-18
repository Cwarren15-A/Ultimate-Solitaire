import { create } from 'zustand';
import { GameState, Move } from '@/core/types';
import { initGame } from '@/core/dealing';
import { makeMove as makeMoveCore } from '@/core';
import { analytics } from './analytics';

interface GameStore {
  currentState: GameState;
  moveHistory: Move[];
  redoStack: Move[];
  hintsUsed: number;
  isHydrated: boolean;
  
  // Actions
  newGame: () => void;
  makeMove: (move: Move, silent?: boolean) => boolean;
  undo: () => void;
  redo: () => void;
  drawCards: () => void;
  autoCompleteGame: () => void;
  hydrate: () => void;
  
  // Computed
  canUndo: boolean;
  canRedo: boolean;
  isGameWon: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentState: initGame(),
  moveHistory: [],
  redoStack: [],
  hintsUsed: 0,
  isHydrated: false,
  canUndo: false,
  canRedo: false,
  
  newGame: () => {
    const newState = initGame();
    set({
      currentState: newState,
      moveHistory: [],
      redoStack: [],
      hintsUsed: 0,
      canUndo: false,
      canRedo: false,
    });
    analytics.gameStarted();
  },
  
  makeMove: (move: Move, silent: boolean = false) => {
    const { currentState } = get();
    const result = makeMoveCore(currentState, move);
    
    if (result.success && result.state) {
      set((state) => ({
        currentState: result.state!,
        moveHistory: [...state.moveHistory, move],
        redoStack: [],
        canUndo: true,
        canRedo: false,
      }));
      
      if (!silent) {
        analytics.moveMade(move);
      }
      
      if (result.state.isComplete) {
        analytics.gameWon(get().moveHistory.length);
      }
      
      return true;
    }
    
    if (!silent && result.error) {
      console.error('Invalid move:', result.error);
    }
    
    return false;
  },
  
  undo: () => {
    // Implement undo logic
    console.log('Undo not implemented yet');
  },
  
  redo: () => {
    // Implement redo logic
    console.log('Redo not implemented yet');
  },
  
  drawCards: () => {
    const { currentState } = get();
    const stockCards = currentState.stock.cards;
    if (stockCards.length > 0) {
      const cardsToDraw = Math.min(3, stockCards.length);
      const drawnCards = stockCards.slice(0, cardsToDraw).map(card => ({ ...card, faceUp: true }));
      
      set((state) => ({
        currentState: {
          ...state.currentState,
          stock: { 
            ...state.currentState.stock, 
            cards: stockCards.slice(cardsToDraw) 
          },
          waste: { 
            ...state.currentState.waste, 
            cards: [...drawnCards, ...state.currentState.waste.cards] 
          },
        },
      }));
    } else if (currentState.waste.cards.length > 0) {
      // Reset stock from waste
      set((state) => ({
        currentState: {
          ...state.currentState,
          stock: { 
            ...state.currentState.stock, 
            cards: state.currentState.waste.cards.reverse().map(card => ({ ...card, faceUp: false }))
          },
          waste: { 
            ...state.currentState.waste, 
            cards: [] 
          },
        },
      }));
    }
  },
  
  autoCompleteGame: () => {
    // Implement auto-complete logic
    console.log('Auto-complete not implemented yet');
  },
  
  hydrate: () => {
    set({ isHydrated: true });
  },
  
  isGameWon: () => {
    const { currentState } = get();
    return currentState.isComplete || false;
  },
}));
