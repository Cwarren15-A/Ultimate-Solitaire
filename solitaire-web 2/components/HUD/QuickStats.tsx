"use client";

import { useStatsStore } from "../../lib/stats-store";

export default function QuickStats() {
  const { stats, getWinRate, getCurrentStreak } = useStatsStore();
  
  if (stats.gamesPlayed === 0) {
    return (
      <div className="flex items-center space-x-4 text-green-200 text-sm">
        <span className="opacity-75">🎮 Play your first game!</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-4 text-green-200 text-sm">
      <div className="flex items-center space-x-1">
        <span>🏆</span>
        <span>{getWinRate().toFixed(1)}%</span>
      </div>
      
      <div className="flex items-center space-x-1">
        <span>🔥</span>
        <span>{getCurrentStreak()}</span>
      </div>
      
      <div className="flex items-center space-x-1">
        <span>🎮</span>
        <span>{stats.gamesPlayed}</span>
      </div>
      
      {stats.bestTime !== Infinity && (
        <div className="flex items-center space-x-1">
          <span>⚡</span>
          <span>
            {Math.floor(stats.bestTime / 60000)}:{(Math.floor(stats.bestTime / 1000) % 60).toString().padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
  );
}
