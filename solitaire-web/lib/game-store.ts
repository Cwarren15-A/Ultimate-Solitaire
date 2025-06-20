import { create } from 'zustand';
import { GameState, Move } from '@/core/types';
import { initGame } from '@/core/dealing';
import { makeMove as makeMoveCore, drawFromStock } from '@/core';
import { analytics } from './analytics';
import { serializeGameState } from '@/core/serialize';

// Add interface for storing AI analysis baseline
interface GameAnalysisBaseline {
  optimalMoves: number;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  isWinnable: boolean;
  analysisTimestamp: number;
  // Add optimal sequence storage
  optimalSequence?: Array<{
    move: string;
    from: string;
    to: string;
    card: string;
    moveNumber: number;
  }>;
}

interface GameStore {
  currentState: GameState;
  moveHistory: Move[];
  undoStack: GameState[];
  redoStack: GameState[];
  hintsUsed: number;
  isHydrated: boolean;
  
  // Add AI analysis baseline tracking
  gameBaseline: GameAnalysisBaseline | null;
  isAnalyzingBaseline: boolean;
  
  // Actions
  newGame: () => void;
  startNewGame: (drawMode?: 1 | 3) => void;
  makeMove: (move: Move, silent?: boolean) => boolean;
  undo: () => void;
  redo: () => void;
  drawCards: () => void;
  autoCompleteGame: () => void;
  hydrate: () => void;
  
  // Add baseline analysis methods
  analyzeInitialGameState: () => Promise<void>;
  getPerformanceComparison: () => { efficiency: number; analysis: string } | null;
  
  // Add optimal sequence methods
  getNextOptimalMove: () => { move: string; from: string; to: string; card: string } | null;
  getCurrentMoveInSequence: () => number;
  
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
  
  // Initialize new baseline tracking properties
  gameBaseline: null,
  isAnalyzingBaseline: false,
  
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
      gameBaseline: null, // Reset baseline for new game
      isAnalyzingBaseline: false,
    });
    analytics.gameStarted();
    
    // Analyze the new game state for optimal solution baseline
    setTimeout(() => {
      get().analyzeInitialGameState();
    }, 1000); // Small delay to let game settle
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
      gameBaseline: null, // Reset baseline for new game
      isAnalyzingBaseline: false,
    });
    analytics.gameStarted();
    
    // Analyze the new game state for optimal solution baseline
    setTimeout(() => {
      get().analyzeInitialGameState();
    }, 1000); // Small delay to let game settle
  },

  // Add method to analyze initial game state
  analyzeInitialGameState: async () => {
    const { currentState } = get();
    
    if (get().isAnalyzingBaseline) {
      console.log('🔄 Baseline analysis already in progress');
      return;
    }
    
    set({ isAnalyzingBaseline: true });
    
    console.log('🎯 Starting baseline analysis for new game...');
    
    try {
      const gameState = serializeGameState(currentState);
      
      const response = await fetch('/api/solve-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState,
          maxDepth: 30,
          timeLimit: 10000
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Baseline analysis complete:', result);
      
      const baseline: GameAnalysisBaseline = {
        optimalMoves: result.optimalMoves,
        confidence: result.confidence,
        reasoning: result.reasoning,
        keyFactors: result.keyFactors,
        isWinnable: result.isWinnable,
        analysisTimestamp: Date.now(),
        optimalSequence: result.optimalSequence || []
      };
      
      set({ 
        gameBaseline: baseline,
        isAnalyzingBaseline: false 
      });
      
      console.log('📊 Game baseline established:', {
        optimalMoves: baseline.optimalMoves,
        confidence: baseline.confidence,
        hasSequence: !!baseline.optimalSequence && baseline.optimalSequence.length > 0,
        sequenceLength: baseline.optimalSequence?.length || 0
      });
      
    } catch (error) {
      console.error('❌ Baseline analysis failed:', error);
      set({ 
        gameBaseline: null,
        isAnalyzingBaseline: false 
      });
    }
  },

  // Add method to get performance comparison
  getPerformanceComparison: () => {
    const { gameBaseline, moveHistory, currentState } = get();
    
    if (!gameBaseline || !currentState.isComplete) {
      return null;
    }
    
    const actualMoves = moveHistory.length;
    const optimalMoves = gameBaseline.optimalMoves;
    const efficiency = Math.round((optimalMoves / actualMoves) * 100);
    
    let analysis = '';
    if (efficiency >= 90) {
      analysis = '🎯 Exceptional! Nearly optimal performance';
    } else if (efficiency >= 75) {
      analysis = '⭐ Great! Very efficient solution';
    } else if (efficiency >= 60) {
      analysis = '👍 Good! Room for some improvement';
    } else if (efficiency >= 45) {
      analysis = '📈 Decent! Consider more strategic planning';
    } else {
      analysis = '🎓 Learning opportunity! Focus on efficiency';
    }
    
    return {
      efficiency,
      analysis: `${analysis}\nAI predicted: ${optimalMoves} moves | You used: ${actualMoves} moves`
    };
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
        const comparison = get().getPerformanceComparison();
        const { gameBaseline } = get();
        
        // Pass baseline data to analytics for efficiency tracking
        analytics.gameWon(get().moveHistory.length, gameBaseline);
        
        // Log performance comparison for debugging
        if (comparison) {
          console.log('🏆 Game completed with performance analysis:', comparison);
        }
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

  // Add optimal sequence methods
  getNextOptimalMove: () => {
    const { gameBaseline, currentState } = get();
    
    if (!gameBaseline || currentState.isComplete) {
      return null;
    }
    
    const optimalSequence = gameBaseline.optimalSequence;
    if (!optimalSequence || optimalSequence.length === 0) {
      return null;
    }
    
    const currentMoveNumber = currentState.moves;
    if (currentMoveNumber >= optimalSequence.length) {
      return null; // Past the optimal sequence
    }
    
    return optimalSequence[currentMoveNumber];
  },

  getCurrentMoveInSequence: () => {
    const { currentState } = get();
    return currentState.moves;
  },
}));
