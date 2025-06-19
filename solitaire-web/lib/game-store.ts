import { create } from 'zustand';
import { GameState, Move } from '@/core/types';
import { initGame } from '@/core/dealing';
import { makeMove as makeMoveCore, drawFromStock } from '@/core';
import { analytics } from './analytics';

interface GameStore {
  currentState: GameState;
  moveHistory: Move[];
  undoStack: GameState[];
  redoStack: GameState[];
  hintsUsed: number;
  isHydrated: boolean;
  
  // Actions
  newGame: () => void;
  startNewGame: (drawMode?: 1 | 3) => void;
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
  undoStack: [],
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
      undoStack: [],
      redoStack: [],
      hintsUsed: 0,
      canUndo: false,
      canRedo: false,
    });
    analytics.gameStarted();
  },

  startNewGame: (drawMode?: 1 | 3) => {
    const currentDrawMode = drawMode || get().currentState.drawMode;
    const newState = initGame({ drawMode: currentDrawMode });
    set({
      currentState: newState,
      moveHistory: [],
      undoStack: [],
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
        undoStack: [...state.undoStack, currentState], // Save current state before move
        redoStack: [], // Clear redo stack when new move is made
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
    
    // Silently ignore invalid moves in production
    // if (!silent && result.error) {
    //   console.error('Invalid move:', result.error);
    // }
    
    return false;
  },
  
  undo: () => {
    const { undoStack, currentState } = get();
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    set({
      currentState: previousState,
      undoStack: newUndoStack,
      redoStack: [currentState, ...get().redoStack],
      canUndo: newUndoStack.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { redoStack, currentState } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    set({
      currentState: nextState,
      undoStack: [...get().undoStack, currentState],
      redoStack: newRedoStack,
      canUndo: true,
      canRedo: newRedoStack.length > 0,
    });
  },
  
  drawCards: () => {
    const { currentState } = get();
    const newState = drawFromStock(currentState);
    
    set((state) => ({
      currentState: newState,
      undoStack: [...state.undoStack, currentState], // Save current state before drawing
      redoStack: [], // Clear redo stack
      canUndo: true,
      canRedo: false,
    }));
  },
  
  autoCompleteGame: () => {
    // Simple auto-complete: try to move all face-up cards to foundations
    let currentState = get().currentState;
    let movesMade = 0;
    let maxAttempts = 100; // Prevent infinite loops

    while (maxAttempts > 0) {
      let foundMove = false;
      maxAttempts--;

      // Check all tableau piles for cards that can move to foundations
      for (let i = 1; i <= 7; i++) {
        const tableauKey = i as 1 | 2 | 3 | 4 | 5 | 6 | 7;
        const tableau = currentState.tableaux[tableauKey];
        
        if (tableau.cards.length > 0) {
          const topCard = tableau.cards[tableau.cards.length - 1];
          if (topCard.faceUp) {
            // Try to move to appropriate foundation
            const foundationId = `foundation-${
              topCard.suit === "♠︎" ? "spades" :
              topCard.suit === "♥︎" ? "hearts" :
              topCard.suit === "♦︎" ? "diamonds" : "clubs"
            }` as any;

            const move = {
              from: tableau.id as any,
              to: foundationId,
              cards: [topCard],
              timestamp: Date.now()
            };

            const result = makeMoveCore(currentState, move);
            if (result.success && result.state) {
              currentState = result.state;
              movesMade++;
              foundMove = true;
              break;
            }
          }
        }
      }

      // Check waste pile
      if (!foundMove && currentState.waste.cards.length > 0) {
        const topCard = currentState.waste.cards[currentState.waste.cards.length - 1];
        const foundationId = `foundation-${
          topCard.suit === "♠︎" ? "spades" :
          topCard.suit === "♥︎" ? "hearts" :
          topCard.suit === "♦︎" ? "diamonds" : "clubs"
        }` as any;

        const move = {
          from: "waste" as any,
          to: foundationId,
          cards: [topCard],
          timestamp: Date.now()
        };

        const result = makeMoveCore(currentState, move);
        if (result.success && result.state) {
          currentState = result.state;
          movesMade++;
          foundMove = true;
        }
      }

      if (!foundMove) break;
    }

    if (movesMade > 0) {
      set({
        currentState,
        canUndo: true,
      });
    }
  },
  
  hydrate: () => {
    set({ isHydrated: true });
  },
  
  isGameWon: () => {
    const { currentState } = get();
    return currentState.isComplete || false;
  },
}));
