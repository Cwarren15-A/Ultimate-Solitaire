/**
 * Zustand store for persistent game statistics and leaderboard
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface GameResult {
  id: string;
  completed: boolean;
  moves: number;
  timeElapsed: number; // in milliseconds
  score: number;
  drawMode: 1 | 3;
  timestamp: number;
  date: string; // ISO date string
  
  // Add efficiency tracking
  optimalMoves?: number; // AI predicted optimal moves
  efficiency?: number; // (optimal / actual) * 100
  aiAnalysisAvailable?: boolean; // Whether AI baseline was available
}

export interface PlayerStats {
  // Basic stats
  gamesPlayed: number;
  gamesWon: number;
  winPercentage: number;
  
  // Time stats
  bestTime: number; // fastest win in milliseconds
  averageTime: number; // average win time
  totalPlayTime: number; // total time played
  
  // Move stats
  bestMoveCount: number; // fewest moves to win
  averageMoveCount: number;
  totalMoves: number;
  
  // Efficiency stats (new)
  bestEfficiency: number; // highest efficiency percentage
  averageEfficiency: number; // average efficiency for analyzed games
  totalAnalyzedGames: number; // games with AI analysis
  
  // Streak stats
  currentStreak: number;
  bestStreak: number;
  
  // Score stats
  bestScore: number;
  totalScore: number;
  averageScore: number;
  
  // Game mode stats
  draw1Stats: Partial<PlayerStats>;
  draw3Stats: Partial<PlayerStats>;
  
  // Recent games (last 10)
  recentGames: GameResult[];
  
  // Timestamps
  firstGameDate: string;
  lastGameDate: string;
}

export interface StatsStore {
  // Player stats
  stats: PlayerStats;
  
  // Anonymous user ID (for cloud sync)
  anonymousId: string | null;
  
  // Actions
  recordGame: (result: GameResult) => void;
  resetStats: () => void;
  getWinRate: () => number;
  getBestTime: () => number;
  getCurrentStreak: () => number;
  
  // Cloud sync (placeholder for future Supabase integration)
  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  
  // Leaderboard (local for now)
  getLocalLeaderboard: () => GameResult[];
}

// Default empty stats
const createEmptyStats = (): PlayerStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  winPercentage: 0,
  bestTime: Infinity,
  averageTime: 0,
  totalPlayTime: 0,
  bestMoveCount: Infinity,
  averageMoveCount: 0,
  totalMoves: 0,
  
  // Initialize efficiency stats
  bestEfficiency: 0,
  averageEfficiency: 0,
  totalAnalyzedGames: 0,
  
  currentStreak: 0,
  bestStreak: 0,
  bestScore: 0,
  totalScore: 0,
  averageScore: 0,
  draw1Stats: {},
  draw3Stats: {},
  recentGames: [],
  firstGameDate: new Date().toISOString(),
  lastGameDate: new Date().toISOString()
});

// Generate anonymous UUID for user identification
const generateAnonymousId = (): string => {
  return 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
};

// Calculate updated stats from a new game result
const updateStatsWithGame = (stats: PlayerStats, result: GameResult): PlayerStats => {
  const newStats = { ...stats };
  
  // Basic counters
  newStats.gamesPlayed += 1;
  newStats.totalPlayTime += result.timeElapsed;
  newStats.totalMoves += result.moves;
  newStats.totalScore += result.score;
  newStats.lastGameDate = result.date;
  
  // Add to recent games (keep last 10)
  newStats.recentGames = [result, ...newStats.recentGames].slice(0, 10);
  
  if (result.completed) {
    // Win stats
    newStats.gamesWon += 1;
    newStats.currentStreak += 1;
    newStats.bestStreak = Math.max(newStats.bestStreak, newStats.currentStreak);
    
    // Best time and moves (only for wins)
    if (result.timeElapsed < newStats.bestTime) {
      newStats.bestTime = result.timeElapsed;
    }
    if (result.moves < newStats.bestMoveCount) {
      newStats.bestMoveCount = result.moves;
    }
    if (result.score > newStats.bestScore) {
      newStats.bestScore = result.score;
    }
    
    // Efficiency tracking (new)
    if (result.efficiency && result.aiAnalysisAvailable) {
      newStats.totalAnalyzedGames += 1;
      newStats.bestEfficiency = Math.max(newStats.bestEfficiency, result.efficiency);
      
      // Calculate running average efficiency
      const analyzedGames = newStats.recentGames.filter(g => g.completed && g.aiAnalysisAvailable);
      if (analyzedGames.length > 0) {
        newStats.averageEfficiency = analyzedGames.reduce((acc, g) => acc + (g.efficiency || 0), 0) / analyzedGames.length;
      }
    }
  } else {
    // Loss breaks streak
    newStats.currentStreak = 0;
  }
  
  // Calculate percentages and averages
  newStats.winPercentage = (newStats.gamesWon / newStats.gamesPlayed) * 100;
  
  if (newStats.gamesWon > 0) {
    const winningGames = newStats.recentGames.filter(g => g.completed);
    
    // Calculate averages based on wins only
    newStats.averageTime = newStats.recentGames
      .filter(g => g.completed)
      .reduce((acc, g) => acc + g.timeElapsed, 0) / Math.max(winningGames.length, 1);
    
    newStats.averageMoveCount = newStats.recentGames
      .filter(g => g.completed)
      .reduce((acc, g) => acc + g.moves, 0) / Math.max(winningGames.length, 1);
  }
  
  newStats.averageScore = newStats.totalScore / newStats.gamesPlayed;
  
  return newStats;
};

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      stats: createEmptyStats(),
      anonymousId: null,
      
      recordGame: (result: GameResult) => {
        const { stats } = get();
        const updatedStats = updateStatsWithGame(stats, result);
        set({ stats: updatedStats });
      },
      
      resetStats: () => {
        set({ stats: createEmptyStats() });
      },
      
      getWinRate: () => {
        const { stats } = get();
        return stats.winPercentage;
      },
      
      getBestTime: () => {
        const { stats } = get();
        return stats.bestTime === Infinity ? 0 : stats.bestTime;
      },
      
      getCurrentStreak: () => {
        const { stats } = get();
        return stats.currentStreak;
      },
      
      getLocalLeaderboard: () => {
        const { stats } = get();
        return stats.recentGames
          .filter(game => game.completed)
          .sort((a, b) => a.timeElapsed - b.timeElapsed) // Sort by fastest time
          .slice(0, 5); // Top 5 best times
      },
      
      // Placeholder cloud sync functions
      syncToCloud: async () => {
        // TODO: Implement Supabase sync
        console.log("Cloud sync not yet implemented");
      },
      
      loadFromCloud: async () => {
        // TODO: Implement Supabase load
        console.log("Cloud load not yet implemented");
      }
    }),
    {
      name: 'solitaire-stats',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Generate anonymous ID if not present
        if (state && !state.anonymousId) {
          state.anonymousId = generateAnonymousId();
        }
      }
    }
  )
);
