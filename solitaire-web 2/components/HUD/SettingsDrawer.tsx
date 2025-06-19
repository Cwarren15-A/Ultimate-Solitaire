"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../lib/game-store";
import { useStatsStore } from "../../lib/stats-store";
import StatsPanel from "./StatsPanel";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { currentState, startNewGame } = useGameStore();
  const { resetStats } = useStatsStore();
  const [selectedDrawMode, setSelectedDrawMode] = useState<1 | 3>(currentState.drawMode);
  const [activeTab, setActiveTab] = useState<"settings" | "stats">("settings");
  
  const handleNewGame = () => {
    startNewGame(selectedDrawMode);
    onClose();
  };
  
  const handleDrawModeChange = (mode: 1 | 3) => {
    setSelectedDrawMode(mode);
  };
  
  const handleResetStats = () => {
    if (confirm("Are you sure you want to reset all statistics? This cannot be undone.")) {
      resetStats();
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-96 bg-gradient-to-br from-green-900 via-green-800 to-green-900 shadow-xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-green-700/30">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "settings" 
                      ? "bg-green-600 text-white" 
                      : "text-green-200 hover:text-white"
                  }`}
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={() => setActiveTab("stats")}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "stats" 
                      ? "bg-green-600 text-white" 
                      : "text-green-200 hover:text-white"
                  }`}
                >
                  📊 Stats
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-green-700/50 rounded-lg transition-colors text-green-200 hover:text-white"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4">
              {activeTab === "settings" && (
                <div className="space-y-6">
                  {/* Game Options */}
                  <div>
                    <h3 className="text-md font-medium text-green-100 mb-3">🎮 Game Options</h3>
                    
                    {/* Draw Mode */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-green-200">Draw Mode</label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="drawMode"
                            value="1"
                            checked={selectedDrawMode === 1}
                            onChange={() => handleDrawModeChange(1)}
                            className="w-4 h-4 text-green-600 border-green-300 focus:ring-green-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-green-100">Draw 1</div>
                            <div className="text-xs text-green-300">Draw one card at a time (easier)</div>
                          </div>
                        </label>
                        
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="drawMode"
                            value="3"
                            checked={selectedDrawMode === 3}
                            onChange={() => handleDrawModeChange(3)}
                            className="w-4 h-4 text-green-600 border-green-300 focus:ring-green-500"
                          />
                          <div>
                            <div className="text-sm font-medium text-green-100">Draw 3</div>
                            <div className="text-xs text-green-300">Draw three cards at a time (harder)</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Game Actions */}
                  <div>
                    <h3 className="text-md font-medium text-green-100 mb-3">🚀 Game Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={handleNewGame}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 
                                 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        New Game
                      </button>
                      
                      <button
                        onClick={handleResetStats}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 
                                 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        Reset Statistics
                      </button>
                    </div>
                  </div>
                  
                  {/* Current Game Info */}
                  <div>
                    <h3 className="text-md font-medium text-green-100 mb-3">📈 Current Game</h3>
                    <div className="bg-green-800/50 rounded-lg p-3 space-y-2 border border-green-700/30">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-200">Moves:</span>
                        <span className="font-mono text-green-100">{currentState.moves}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-200">Draw Mode:</span>
                        <span className="font-mono text-green-100">Draw {currentState.drawMode}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-200">Foundation Cards:</span>
                        <span className="font-mono text-green-100">
                          {Object.values(currentState.foundations).reduce((sum, foundation) => 
                            sum + foundation.cards.length, 0
                          )} / 52
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === "stats" && <StatsPanel />}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
