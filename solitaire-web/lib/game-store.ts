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

  startNewGame: (drawMode?: 1 | 3) => {
    const currentDrawMode = drawMode || get().currentState.drawMode;
    const newState = initGame({ drawMode: currentDrawMode });
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
    
    // Silently ignore invalid moves in production
    // if (!silent && result.error) {
    //   console.error('Invalid move:', result.error);
    // }
    
    return false;
  },
  
    undo: () => {
    const { moveHistory, redoStack } = get();
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory[moveHistory.length - 1];
    const newMoveHistory = moveHistory.slice(0, -1);
    const newRedoStack = [...redoStack, lastMove];

    // For now, just recreate the game state by replaying all moves except the last one
    const initialState = initGame({ drawMode: get().currentState.drawMode });
    let replayState = initialState;

    for (const move of newMoveHistory) {
      const result = makeMoveCore(replayState, move);
      if (result.success && result.state) {
        replayState = result.state;
      }
    }

    set({
      currentState: replayState,
      moveHistory: newMoveHistory,
      redoStack: newRedoStack,
      canUndo: newMoveHistory.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;

    const moveToRedo = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    const result = makeMoveCore(get().currentState, moveToRedo);
    if (result.success && result.state) {
      set((state) => ({
        currentState: result.state!,
        moveHistory: [...state.moveHistory, moveToRedo],
        redoStack: newRedoStack,
        canUndo: true,
        canRedo: newRedoStack.length > 0,
      }));
    }
  },
  
  drawCards: () => {
    const { currentState } = get();
    const stockCards = currentState.stock.cards;
    if (stockCards.length > 0) {
      const cardsToDraw = Math.min(currentState.drawMode, stockCards.length);
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
