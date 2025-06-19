"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/game-store";
import { Brain, Loader2, Eye } from "lucide-react";
import { serializeGameState } from '@/core/serialize';
import { createXrayDataPrompt } from '@/lib/ai-prompts';

interface SimpleHintDisplayProps {
  maxHints?: number;
}

export default function SimpleHintDisplay({ maxHints = 5 }: SimpleHintDisplayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hintPanel, setHintPanel] = useState<{
    visible: boolean;
    data: any;
    error: string | null;
  }>({ visible: false, data: null, error: null });
  const [hintsUsed, setHintsUsed] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { currentState } = useGameStore();
  const canRequestHint = hintsUsed < maxHints && !isLoading;

  const requestHint = async () => {
    if (!canRequestHint || currentState.isComplete) return;

    setIsLoading(true);
    console.log('🚀 Simple hint request started');

    try {
      const xrayData = createXrayDataPrompt(currentState);
      const requestBody = {
        gameState: serializeGameState(currentState),
        xrayData,
        moveHistory: [],
        hintsUsed,
        maxHints,
        enhanced: true
      };

      console.log('📤 Making hint API call...');
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const hintData = await response.json();
      console.log('✅ Hint received:', hintData);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Show the hint panel
      setHintPanel({ visible: true, data: hintData, error: null });
      setHintsUsed(hintData.hintsUsed || hintsUsed + 1);

      // Auto-hide after 12 seconds
      timeoutRef.current = setTimeout(() => {
        setHintPanel(prev => ({ ...prev, visible: false }));
      }, 12000);

    } catch (error) {
      console.error('❌ Hint request failed:', error);
      setHintPanel({ 
        visible: true, 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to get hint' 
      });

      // Auto-hide error after 6 seconds
      timeoutRef.current = setTimeout(() => {
        setHintPanel(prev => ({ ...prev, visible: false }));
      }, 6000);
    } finally {
      setIsLoading(false);
    }
  };

  const closeHint = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHintPanel({ visible: false, data: null, error: null });
  };

  return (
    <div className="relative">
      {/* Hint Button */}
      <motion.button
        className={`
          relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 border
          ${!canRequestHint || currentState.isComplete
            ? 'bg-purple-800/30 text-purple-400/50 cursor-not-allowed border-purple-700/30'
            : 'bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-purple-100 hover:from-purple-500/50 hover:to-blue-500/50 cursor-pointer border-purple-500/30'
          }
        `}
        onClick={requestHint}
        disabled={!canRequestHint || currentState.isComplete}
        whileHover={canRequestHint ? { scale: 1.05 } : {}}
        whileTap={canRequestHint ? { scale: 0.95 } : {}}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
        ) : (
          <Brain className="h-4 w-4 text-purple-200" />
        )}
        <span>{isLoading ? 'Getting hint...' : 'Hint'}</span>
        {maxHints - hintsUsed > 0 && !isLoading && (
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-200">
            {maxHints - hintsUsed}
          </span>
        )}
      </motion.button>

      {/* Hint Panel */}
      <AnimatePresence>
        {hintPanel.visible && typeof document !== 'undefined' && createPortal(
          <motion.div
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
                  <span className="text-lg font-semibold text-white">AI Hint</span>
                  {hintPanel.data?.priority && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      hintPanel.data.priority === 'critical' ? 'text-red-400 bg-red-500/20' :
                      hintPanel.data.priority === 'high' ? 'text-orange-400 bg-orange-500/20' :
                      hintPanel.data.priority === 'medium' ? 'text-yellow-400 bg-yellow-500/20' :
                      'text-gray-400 bg-gray-500/20'
                    }`}>
                      {hintPanel.data.priority.toUpperCase()}
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
              {hintPanel.error ? (
                <div className="text-sm text-red-300 bg-red-900/20 p-3 rounded">
                  {hintPanel.error}
                </div>
              ) : hintPanel.data ? (
                <div className="space-y-4">
                  {/* Main Move */}
                  {hintPanel.data.move ? (
                    <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                      <div className="text-sm font-medium text-blue-200 mb-2">💡 Recommended Move</div>
                      <div className="text-white font-medium">{hintPanel.data.move.description}</div>
                      {hintPanel.data.move.visualHint?.message && (
                        <div className="text-blue-300 text-sm mt-2">
                          💫 {hintPanel.data.move.visualHint.message}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-200 mb-2">🤔 General Advice</div>
                      <div className="text-gray-300 text-sm">{hintPanel.data.reasoning}</div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {hintPanel.data.analysis?.winProbability && hintPanel.data.analysis.winProbability !== 'Unknown' && (
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <div className="text-xs text-gray-400 mb-1">Win Probability</div>
                        <div className="text-sm font-bold text-green-400">
                          {hintPanel.data.analysis.winProbability}
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

                  {/* Hidden Cards */}
                  {hintPanel.data.analysis?.hiddenCards && 
                   hintPanel.data.analysis.hiddenCards !== 'No hidden card data' && 
                   hintPanel.data.analysis.hiddenCards !== 'AI analysis complete' && (
                    <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-600/30">
                      <div className="text-sm font-medium text-purple-200 mb-1">👁️ Hidden Cards</div>
                      <div className="text-purple-100 text-xs">{hintPanel.data.analysis.hiddenCards}</div>
                    </div>
                  )}

                  {/* Alternatives */}
                  {hintPanel.data.alternatives && hintPanel.data.alternatives.length > 0 && (
                    <div className="text-xs">
                      <div className="text-gray-400 mb-2">Alternative moves:</div>
                      {hintPanel.data.alternatives.slice(0, 2).map((alt: any, i: number) => (
                        <div key={i} className="bg-gray-800/30 p-2 rounded mb-1">
                          <div className="text-gray-200 font-medium">{alt.move}</div>
                          <div className="text-green-400">✓ {alt.pros}</div>
                          <div className="text-red-400">✗ {alt.cons}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-400">Loading hint...</div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-800/50 px-4 py-2 border-t border-gray-600/30">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Powered by OpenAI o4-mini</span>
                {hintPanel.data?.message && (
                  <span className="text-purple-300">{hintPanel.data.message}</span>
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