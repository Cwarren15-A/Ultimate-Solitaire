import { Move } from '@/core/types';

class Analytics {
  gameStarted() {
    // Track game start event
    console.log('Game started');
  }
  
  moveMade(move: Move) {
    // Track move event
    console.log('Move made:', move);
  }
  
  gameWon(moves: number) {
    // Track game won event
    console.log('Game won in', moves, 'moves');
  }
  
  hintRequested(hintsUsed: number) {
    // Track hint request event
    console.log('Hint requested, total hints used:', hintsUsed);
  }
  
  error(errorType: string, details: any) {
    // Track error event
    console.error(`Analytics error - ${errorType}:`, details);
  }
}

export const analytics = new Analytics();
