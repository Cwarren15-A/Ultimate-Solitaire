"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/game-store";
import { Brain, Loader2, AlertTriangle } from "lucide-react";
import { serializeGameState } from '@/core/serialize';
import { createXrayDataPrompt } from '@/lib/ai-prompts';

interface DirectHintButtonProps {
  maxHints?: number;
}

export default function DirectHintButton({ maxHints = 5 }: DirectHintButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [hintDisplay, setHintDisplay] = useState<{
    show: boolean;
    data: any;
    error: string | null;
    id: number;
  }>({ show: false, data: null, error: null, id: 0 });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentState } = useGameStore();

  const canRequestHint = hintsUsed < maxHints && !isLoading && !currentState.isComplete;

  const requestHint = async () => {
    if (!canRequestHint) return;
    
    setIsLoading(true);
    console.log('🚀 Direct hint request started');

    try {
      const xrayData = createXrayDataPrompt(currentState);
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState: serializeGameState(currentState),
          xrayData,
          moveHistory: [],
          hintsUsed,
          maxHints,
          enhanced: enhancedMode
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const hintData = await response.json();
      console.log('✅ Direct hint received:', hintData);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Force display with unique ID to prevent React batching issues
      const displayId = Date.now();
      setHintDisplay({ 
        show: true, 
        data: hintData, 
        error: null, 
        id: displayId 
      });
      setHintsUsed(prev => prev + 1);

      console.log('🎯 Hint display set:', { show: true, id: displayId });

      // Auto-hide after different times based on mode
      const hideDelay = enhancedMode ? 25000 : 15000; // 25s for enhanced, 15s for quick
      timeoutRef.current = setTimeout(() => {
        console.log('⏰ Auto-hiding hint display');
        setHintDisplay(prev => ({ ...prev, show: false }));
      }, hideDelay);

    } catch (error) {
      console.error('❌ Direct hint failed:', error);
      const displayId = Date.now();
      setHintDisplay({ 
        show: true, 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to get hint',
        id: displayId 
      });

      // Auto-hide error after 8 seconds
      timeoutRef.current = setTimeout(() => {
        setHintDisplay(prev => ({ ...prev, show: false }));
      }, 8000);
    } finally {
      setIsLoading(false);
    }
  };

  const closeHint = () => {
    console.log('🚫 Manual hint close');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHintDisplay(prev => ({ ...prev, show: false }));
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
      <motion.button
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400
          ${!canRequestHint
            ? 'bg-purple-800/30 text-purple-400/50 cursor-not-allowed border-purple-700/30'
            : 'bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-purple-100 hover:from-purple-500/50 hover:to-blue-500/50 cursor-pointer border-purple-500/30'
          }
        `}
        onClick={requestHint}
        disabled={!canRequestHint}
        whileHover={canRequestHint ? { scale: 1.05 } : {}}
        whileTap={canRequestHint ? { scale: 0.95 } : {}}
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
      </motion.button>

      {/* Direct Hint Panel */}
      <AnimatePresence>
        {hintDisplay.show && typeof document !== 'undefined' && createPortal(
          <motion.div
            key={hintDisplay.id} // Force re-render with unique key
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-4 right-4 w-80 max-h-96 bg-gray-900/98 border-2 border-purple-400/60 
                       rounded-xl shadow-2xl backdrop-blur-md z-[100000] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-4 border-b border-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <span className="text-lg font-semibold text-white">
                    {enhancedMode ? '🧠 Enhanced Analysis' : '⚡ Quick Hint'}
                  </span>
                  {hintDisplay.data?.priority && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      hintDisplay.data.priority === 'critical' ? 'text-red-400 bg-red-500/20' :
                      hintDisplay.data.priority === 'high' ? 'text-orange-400 bg-orange-500/20' :
                      'text-yellow-400 bg-yellow-500/20'
                    }`}>
                      {hintDisplay.data.priority.toUpperCase()}
                    </span>
                  )}
                </div>
                <button
                  onClick={closeHint}
                  className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700/50"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {hintDisplay.error ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Error Getting Hint</span>
                  </div>
                  <div className="text-sm text-red-300 bg-red-900/20 p-3 rounded">
                    {hintDisplay.error}
                  </div>
                </div>
              ) : hintDisplay.data ? (
                <div className="space-y-4">
                  {/* Main Move Recommendation */}
                  {hintDisplay.data.move ? (
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
                      <div className="text-sm font-medium text-blue-200 mb-2">💡 Recommended Move</div>
                      <div className="text-white font-medium mb-2">{hintDisplay.data.move.description}</div>
                      {hintDisplay.data.move.visualHint?.message && (
                        <div className="text-blue-300 text-sm">
                          💫 {hintDisplay.data.move.visualHint.message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-200 mb-2">🤔 Strategic Advice</div>
                      <div className="text-gray-300 text-sm">{hintDisplay.data.reasoning}</div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {hintDisplay.data.analysis?.winProbability && hintDisplay.data.analysis.winProbability !== 'Unknown' && (
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Win Probability</div>
                        <div className="text-sm font-bold text-green-400">
                          {hintDisplay.data.analysis.winProbability}
                        </div>
                      </div>
                    )}
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Hints Used</div>
                      <div className="text-sm font-bold text-purple-400">
                        {hintsUsed} / {maxHints}
                      </div>
                    </div>
                  </div>

                  {/* Deadlock Risk */}
                  {hintDisplay.data.analysis?.deadlockRisk && hintDisplay.data.analysis.deadlockRisk !== 'low' && (
                    <div className="bg-orange-900/20 p-3 rounded-lg border border-orange-600/30">
                      <div className="text-sm font-medium text-orange-200 mb-1">⚠️ Risk Assessment</div>
                      <div className="text-orange-100 text-xs">
                        Deadlock Risk: <span className="font-bold">{hintDisplay.data.analysis.deadlockRisk.toUpperCase()}</span>
                      </div>
                    </div>
                  )}

                  {/* Hidden Cards (only if meaningful) */}
                  {hintDisplay.data.analysis?.hiddenCards && 
                   hintDisplay.data.analysis.hiddenCards !== 'No hidden card data' && 
                   hintDisplay.data.analysis.hiddenCards !== 'AI analysis complete' &&
                   hintDisplay.data.analysis.hiddenCards !== 'Local analysis' && (
                    <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-600/30">
                      <div className="text-sm font-medium text-purple-200 mb-1">👁️ Hidden Card Intel</div>
                      <div className="text-purple-100 text-xs">{hintDisplay.data.analysis.hiddenCards}</div>
                    </div>
                  )}

                  {/* Alternatives */}
                  {hintDisplay.data.alternatives && hintDisplay.data.alternatives.length > 0 && (
                    <div className="text-xs">
                      <div className="text-gray-400 mb-2 font-medium">Other Options:</div>
                      {hintDisplay.data.alternatives.slice(0, 2).map((alt: any, i: number) => (
                        <div key={i} className="bg-gray-800/30 p-3 rounded mb-2 border border-gray-600/20">
                          <div className="text-gray-200 font-medium mb-1">{alt.move}</div>
                          <div className="text-green-400 text-xs mb-1">✓ {alt.pros}</div>
                          <div className="text-red-400 text-xs">✗ {alt.cons}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <div>Analyzing game state...</div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-800/50 px-4 py-2 border-t border-gray-600/30">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {enhancedMode ? '🧠 Enhanced Analysis' : '⚡ Quick Mode'} • OpenAI o4-mini
                </span>
                {hintDisplay.data?.message && (
                  <span className="text-purple-300">{hintDisplay.data.message}</span>
                )}
              </div>
            </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
} 