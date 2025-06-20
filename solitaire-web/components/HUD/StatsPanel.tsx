"use client";

import { useStatsStore } from "../../lib/stats-store";
import { motion } from "framer-motion";
import { Clock, Target, Trophy, Zap } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}

function StatsCard({ title, value, subtitle, icon, color = "blue" }: StatsCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900", 
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-900",
    red: "bg-red-50 border-red-200 text-red-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900"
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border-2 ${colorClasses[color]} shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-60">{subtitle}</p>}
        </div>
        {icon && <span className="text-2xl opacity-60">{icon}</span>}
      </div>
    </motion.div>
  );
}

function formatTime(milliseconds: number): string {
  if (milliseconds === 0 || milliseconds === Infinity) return "—";
  
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${remainingSeconds}s`;
}

function formatPercentage(value: number): string {
  return value.toFixed(1) + '%';
}

export default function StatsPanel() {
  const { stats } = useStatsStore();
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-green-100 mb-4">📊 Your Statistics</h3>
        
        {/* Overall Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatsCard
            title="Games Played"
            value={stats.gamesPlayed}
            icon="🎮"
            color="blue"
          />
          <StatsCard
            title="Win Rate"
            value={formatPercentage(stats.winPercentage)}
            subtitle={`${stats.gamesWon} wins`}
            icon="🏆"
            color="green"
          />
          <StatsCard
            title="Current Streak"
            value={stats.currentStreak}
            subtitle={`Best: ${stats.bestStreak}`}
            icon="🔥"
            color="yellow"
          />
          <StatsCard
            title="Best Time"
            value={formatTime(stats.bestTime)}
            icon="⚡"
            color="purple"
          />
        </div>
        
        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatsCard
            title="Best Score"
            value={stats.bestScore.toLocaleString()}
            subtitle={`Avg: ${Math.round(stats.averageScore)}`}
            icon="⭐"
            color="yellow"
          />
          <StatsCard
            title="Fewest Moves"
            value={stats.bestMoveCount === Infinity ? "—" : stats.bestMoveCount}
            subtitle={`Avg: ${Math.round(stats.averageMoveCount) || "—"}`}
            icon="🎯"
            color="green"
          />
          <StatsCard
            title="Total Play Time"
            value={formatTime(stats.totalPlayTime)}
            subtitle={`${stats.gamesPlayed} games`}
            icon="⏱️"
            color="blue"
          />
        </div>

        {/* AI Efficiency Stats */}
        {stats.totalAnalyzedGames > 0 && (
          <div className="mt-4">
            <h4 className="text-md font-semibold text-green-100 mb-3">🤖 AI Performance Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsCard
                title="Best Efficiency"
                value={formatPercentage(stats.bestEfficiency)}
                subtitle="vs AI optimal"
                icon="🎯"
                color="purple"
              />
              <StatsCard
                title="Avg Efficiency"
                value={formatPercentage(stats.averageEfficiency)}
                subtitle={`${stats.totalAnalyzedGames} analyzed games`}
                icon="📊"
                color="blue"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Recent Games */}
      {stats.recentGames.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-green-100 mb-3">📝 Recent Games</h4>
          <div className="space-y-2">
            {stats.recentGames.slice(0, 5).map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border ${
                  game.completed 
                    ? "bg-green-50 border-green-200 text-green-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {game.completed ? "✅" : "❌"}
                    </span>
                    <div>
                      <p className="font-medium">
                        {game.completed ? "Won" : "Lost"} • {game.moves} moves
                      </p>
                      <p className="text-sm opacity-75">
                        {formatTime(game.timeElapsed)} • Draw-{game.drawMode} • {new Date(game.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {game.completed && (
                    <div className="text-right">
                      <p className="font-bold">{game.score.toLocaleString()}</p>
                      <p className="text-sm opacity-75">score</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Local Leaderboard */}
      <div>
        <h4 className="text-md font-semibold text-green-100 mb-3">🥇 Personal Best Times</h4>
        <div className="space-y-2">
          {useStatsStore.getState().getLocalLeaderboard().map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-900"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{formatTime(game.timeElapsed)}</p>
                    <p className="text-sm opacity-75">
                      {game.moves} moves • {new Date(game.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{game.score.toLocaleString()}</p>
                  <p className="text-sm opacity-75">points</p>
                </div>
              </div>
            </motion.div>
          ))}
          {useStatsStore.getState().getLocalLeaderboard().length === 0 && (
            <p className="text-green-200 text-center py-4 opacity-75">
              Complete some games to see your best times!
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
