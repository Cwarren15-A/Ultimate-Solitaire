import { Move } from '@/core/types';
import { useStatsStore, GameResult } from './stats-store';

class Analytics {
  private startTime: number | null = null;
  
  gameStarted() {
    // Track game start event
    this.startTime = Date.now();
    console.log('🎮 Game started');
  }
  
  moveMade(move: Move) {
    // Track move event
    console.log('📝 Move made:', move.from, '→', move.to);
  }
  
  gameWon(moves: number, gameBaseline?: { optimalMoves: number; confidence: number } | null) {
    // Track game won event with enhanced performance data
    const endTime = Date.now();
    const timeElapsed = this.startTime ? endTime - this.startTime : 0;
    
    console.log('🏆 Game won in', moves, 'moves, time:', Math.round(timeElapsed / 1000), 'seconds');
    
    // Calculate efficiency if baseline is available
    let efficiency: number | undefined;
    let aiAnalysisAvailable = false;
    
    if (gameBaseline?.optimalMoves) {
      efficiency = Math.round((gameBaseline.optimalMoves / moves) * 100);
      aiAnalysisAvailable = true;
      console.log('📊 Performance: ' + efficiency + '% efficiency (' + gameBaseline.optimalMoves + ' optimal vs ' + moves + ' actual)');
    }
    
    // Record to stats store
    const gameResult: GameResult = {
      id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      completed: true,
      moves,
      timeElapsed,
      score: this.calculateScore(moves, timeElapsed),
      drawMode: 1, // Default, should be passed from game state
      timestamp: endTime,
      date: new Date().toISOString(),
      optimalMoves: gameBaseline?.optimalMoves,
      efficiency,
      aiAnalysisAvailable
    };
    
    // Record the game result
    useStatsStore.getState().recordGame(gameResult);
    
    // Reset start time for next game
    this.startTime = null;
  }
  
  gameLost(moves: number) {
    // Track game lost event
    const endTime = Date.now();
    const timeElapsed = this.startTime ? endTime - this.startTime : 0;
    
    console.log('😞 Game lost after', moves, 'moves, time:', Math.round(timeElapsed / 1000), 'seconds');
    
    // Record to stats store
    const gameResult: GameResult = {
      id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      completed: false,
      moves,
      timeElapsed,
      score: 0, // No score for lost games
      drawMode: 1, // Default, should be passed from game state
      timestamp: endTime,
      date: new Date().toISOString(),
      aiAnalysisAvailable: false
    };
    
    // Record the game result
    useStatsStore.getState().recordGame(gameResult);
    
    // Reset start time for next game
    this.startTime = null;
  }
  
  hintRequested(hintsUsed: number) {
    // Track hint request event
    console.log('💡 Hint requested, total hints used:', hintsUsed);
  }
  
  error(errorType: string, details: any) {
    // Track error event
    console.error(`Analytics error - ${errorType}:`, details);
  }
  
  private calculateScore(moves: number, timeElapsed: number): number {
    // Simple scoring algorithm
    const baseScore = 1000;
    const movePenalty = moves * 5;
    const timePenalty = Math.floor(timeElapsed / 1000) * 2;
    
    return Math.max(0, baseScore - movePenalty - timePenalty);
  }
}

export const analytics = new Analytics();
