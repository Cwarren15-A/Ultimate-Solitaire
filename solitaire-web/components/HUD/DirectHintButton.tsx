"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/game-store";
// @ts-ignore
const { Brain, Loader2 } = require("lucide-react");
import { serializeGameState } from '@/core/serialize';
import { createXrayDataPrompt } from '@/lib/ai-prompts';

interface DirectHintButtonProps {
  maxHints?: number;
}

export default function DirectHintButton({ maxHints = 5 }: DirectHintButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintData, setHintData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { currentState } = useGameStore();

  const canRequestHint = hintsUsed < maxHints && !isLoading && !currentState.isComplete;

  const requestHint = async () => {
    if (!canRequestHint) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState: serializeGameState(currentState),
          xrayData: createXrayDataPrompt(currentState),
          hintsUsed,
          maxHints,
          enhanced: enhancedMode
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      setHintData(data);
      setHintsUsed(prev => prev + 1);
      setShowHint(true);
      
      // Auto-hide after 12 seconds
      setTimeout(() => setShowHint(false), 12000);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get hint');
      setShowHint(true);
      setTimeout(() => setShowHint(false), 6000);
    } finally {
      setIsLoading(false);
    }
  };

  const closeHint = () => {
    setShowHint(false);
    setError(null);
    setHintData(null);
  };

  return (
    <div className="relative">
      {/* Mode Toggle */}
      <div className="flex items-center space-x-1 mb-2">
        <button
          onClick={() => setEnhancedMode(false)}
          className={`px-2 py-1 rounded text-xs border transition-colors ${
            !enhancedMode 
              ? 'bg-blue-600/30 text-blue-200 border-blue-500/30'
              : 'bg-gray-600/30 text-gray-300 border-gray-500/30 hover:bg-gray-500/30'
          }`}
          title="Quick hint - Fast response, basic move suggestion"
        >
          ⚡ Quick
        </button>
        <button
          onClick={() => setEnhancedMode(true)}
          className={`px-2 py-1 rounded text-xs border transition-colors ${
            enhancedMode 
              ? 'bg-purple-600/30 text-purple-200 border-purple-500/30'
              : 'bg-gray-600/30 text-gray-300 border-gray-500/30 hover:bg-gray-500/30'
          }`}
          title="Enhanced analysis - Detailed strategy, costs more tokens"
        >
          🧠 Enhanced
        </button>
      </div>

      {/* Hint Button */}
      <button
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400
          hover:scale-105 active:scale-95 transform
          ${!canRequestHint
            ? 'bg-purple-800/30 text-purple-400/50 cursor-not-allowed border-purple-700/30'
            : 'bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-purple-100 hover:from-purple-500/50 hover:to-blue-500/50 cursor-pointer border-purple-500/30'
          }
        `}
        onClick={requestHint}
        disabled={!canRequestHint}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
        ) : (
          <Brain className="h-4 w-4 text-purple-200" />
        )}
        <span>{isLoading ? (enhancedMode ? 'Analyzing...' : 'Getting hint...') : (enhancedMode ? 'Enhanced Hint' : 'Quick Hint')}</span>
        {maxHints - hintsUsed > 0 && !isLoading && (
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-200">
            {maxHints - hintsUsed}
          </span>
        )}
      </button>

      {/* Better Error Handling Hint Panel */}
      {showHint && (
        <div className="fixed top-4 right-4 w-80 bg-gray-900 border border-purple-400 rounded-lg shadow-2xl z-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">🧠 AI Hint</h3>
            <button onClick={() => setShowHint(false)} className="text-gray-400 hover:text-white">×</button>
          </div>
          
          {error ? (
            <div className="text-red-300 text-sm">{error}</div>
          ) : hintData?.move ? (
            <div className="space-y-3">
              <div className="bg-blue-500/20 p-3 rounded border border-blue-500/30">
                <div className="text-blue-200 text-sm font-medium mb-1">Recommended Move</div>
                <div className="text-white">{hintData.move.description}</div>
                {hintData.move.reasoning && (
                  <div className="text-blue-300 text-xs mt-1">{hintData.move.reasoning}</div>
                )}
              </div>
              
              {hintData.analysis?.winProbability && (
                <div className="text-sm">
                  <span className="text-gray-400">Win Probability: </span>
                  <span className="text-green-300">{hintData.analysis.winProbability}</span>
                </div>
              )}
              
              {hintData.strategicInsight && (
                <div className="text-gray-300 text-sm">{hintData.strategicInsight}</div>
              )}
            </div>
          ) : (
            <div className="text-gray-400">Analyzing position...</div>
          )}
        </div>
      )}
    </div>
  );
} 