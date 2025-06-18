'use client';

import { motion } from 'framer-motion';
import { Trophy, Settings, RotateCcw, HelpCircle } from 'lucide-react';
import { useGameStore } from '@/lib/game-store';

export function NavBar() {
  const { startNewGame } = useGameStore();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-emerald-900/90 backdrop-blur-sm border-b border-emerald-700/50 px-4 py-3 shadow-lg"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center space-x-2"
        >
          <Trophy className="h-8 w-8 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">Ultimate Solitaire</h1>
        </motion.div>

        {/* Game Controls */}
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => startNewGame()}
            className="flex items-center space-x-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">New Game</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            title="Help & Rules"
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Help</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </motion.button>
        </div>
      </div>
    </motion.nav>
  );
}
