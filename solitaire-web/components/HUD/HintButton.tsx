"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEnhancedHint, type EnhancedHintResponse } from "@/lib/useHint";
import { useGameStore } from "@/lib/game-store";
import { Eye, Loader2, AlertTriangle, TrendingUp, Brain } from "lucide-react";

interface HintButtonProps {
  maxHints?: number;
}

export default function HintButton({ maxHints = 5 }: HintButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<EnhancedHintResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const { currentState } = useGameStore();
  
  const {
    hintsRemaining,
    canRequestHint,
    isLoadingHint,
    isAnimating,
    requestHint,
    getDeadlockWarning,
    getStrategicInsight
  } = useEnhancedHint({
    gameState: currentState,
    maxHints,
    moveHistory: [], // TODO: Add move history tracking
    onHintReceived: (hint) => {
      setAnalysisData(hint);
      setShowAnalysis(true);
      
      // Auto-hide analysis after 8 seconds for enhanced content
      setTimeout(() => {
        setShowAnalysis(false);
      }, 8000);
    },
    onVisualEffect: (effect) => {
      console.log('Visual effect triggered:', effect);
    },
    onError: (error) => {
      setErrorMessage(error);
      setAnalysisData(null);
      setShowAnalysis(true);
      setTimeout(() => {
        setShowAnalysis(false);
        setErrorMessage(null);
      }, 4000);
    }
  });
  
  const handleClick = () => {
    console.log('🖱️ Hint button clicked!', { canRequestHint, isLoadingHint });
    if (canRequestHint && !isLoadingHint) {
      console.log('✅ Requesting hint...');
      requestHint();
    } else {
      console.log('❌ Cannot request hint:', { canRequestHint, isLoadingHint });
    }
  };
  
  const isDisabled = !canRequestHint || isLoadingHint || currentState.isComplete;
  const deadlockWarning = getDeadlockWarning();
  const strategicInsight = getStrategicInsight();
  
  return (
    <div className="relative">
      <motion.button
        className={`
          relative flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 border
          ${isDisabled
            ? 'bg-purple-800/30 text-purple-400/50 cursor-not-allowed border-purple-700/30'
            : 'bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-purple-100 hover:from-purple-500/50 hover:to-blue-500/50 active:from-purple-400/50 active:to-blue-400/50 cursor-pointer border-purple-500/30'
          }
          ${isAnimating ? 'ring-2 ring-yellow-400 ring-opacity-50 animate-pulse' : ''}
          ${deadlockWarning?.type === 'error' ? 'ring-2 ring-red-500' : ''}
          ${deadlockWarning?.type === 'warning' ? 'ring-2 ring-orange-500' : ''}
        `}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={!isDisabled ? { scale: 1.05 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
        disabled={isDisabled}
        aria-label={`AI hint analysis. ${hintsRemaining} hints remaining`}
      >
        {/* Enhanced Icon */}
        {isLoadingHint ? (
          <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
        ) : deadlockWarning ? (
          <AlertTriangle className="h-4 w-4 text-orange-400" />
        ) : (
          <Eye className={`h-4 w-4 ${isAnimating ? 'text-yellow-400' : 'text-purple-200'}`} />
        )}
        
        {/* Enhanced Button Text */}
        <span>
          {isLoadingHint ? 'Getting hint...' : 'Hint'}
        </span>
        
        {/* Enhanced Hints Counter */}
        {hintsRemaining > 0 && !isLoadingHint && (
          <span className={`
            ml-1 px-1.5 py-0.5 text-xs rounded-full
            ${isDisabled ? 'bg-purple-800/30 text-purple-500/50' : 'bg-purple-500/30 text-purple-200'}
          `}>
            {hintsRemaining}
          </span>
        )}
        
        {/* Strategic indicator */}
        {strategicInsight && strategicInsight.winProbability && (
          <TrendingUp className="h-3 w-3 text-green-400" />
        )}
      </motion.button>

      {/* Enhanced Tooltip */}
      <AnimatePresence>
        {isHovered && !showAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 
                       bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap border border-purple-500/30"
            style={{ zIndex: 999998 }}
          >
            {currentState.isComplete 
              ? '🎉 Game completed! Start new game for more hints' 
              : !canRequestHint 
                ? '🧠 All hints used for this game'
                : '🤖 Get AI strategy hints for your next move'
            }
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 
                            border-2 border-transparent border-t-gray-900"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Analysis Panel - Rendered via Portal */}
      <AnimatePresence>
        {showAnalysis && (analysisData || errorMessage) && typeof document !== 'undefined' && createPortal(
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 p-4 
                       bg-gray-900/95 border-2 border-purple-400/60 
                       rounded-xl shadow-2xl min-w-72 max-w-80 text-white backdrop-blur-md"
            style={{ zIndex: 999999 }}
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center space-x-2 border-b border-purple-500/20 pb-2">
                <Brain className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-200">AI Hint</span>
                {analysisData?.xrayEnabled && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    ENHANCED
                  </span>
                )}
              </div>

              {/* Error handling */}
              {errorMessage && (
                <div className="text-sm text-red-300 bg-red-900/20 p-2 rounded">
                  {errorMessage}
                </div>
              )}

              {/* Main move recommendation */}
              {analysisData?.move && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-yellow-300">
                    💡 Recommended Move:
                  </div>
                  <div className="text-sm text-white bg-gray-800/80 p-2 rounded border border-gray-600/30">
                    {analysisData.move.description}
                  </div>
                  {analysisData.move.visualHint?.message && (
                    <div className="text-xs text-blue-300 flex items-center space-x-1">
                      <span>💫</span>
                      <span>{analysisData.move.visualHint.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Strategic analysis */}
              {analysisData?.analysis && (
                <div className="space-y-2 text-xs">
                  {analysisData.analysis.winProbability !== 'Unknown' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Probability:</span>
                      <span className="text-green-300 font-medium">
                        {analysisData.analysis.winProbability}
                      </span>
                    </div>
                  )}
                  
                  {analysisData.analysis.deadlockRisk !== 'none' && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Deadlock Risk:</span>
                      <span className={`font-medium ${
                        analysisData.analysis.deadlockRisk === 'high' ? 'text-red-400' :
                        analysisData.analysis.deadlockRisk === 'medium' ? 'text-orange-400' :
                        'text-yellow-400'
                      }`}>
                        {analysisData.analysis.deadlockRisk.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {analysisData.analysis.hiddenCards && analysisData.analysis.hiddenCards !== 'No hidden card data' && (
                    <div className="text-xs text-purple-200 bg-purple-900/60 p-2 rounded border border-purple-600/40">
                      <div className="font-medium mb-1 text-purple-100">👁️ Hidden Cards Detected:</div>
                      <div className="text-purple-100">{analysisData.analysis.hiddenCards}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Priority indicator */}
              {analysisData?.priority && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Priority:</span>
                  <span className={`font-medium px-2 py-0.5 rounded-full ${
                    analysisData.priority === 'critical' ? 'bg-red-500/20 text-red-300' :
                    analysisData.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                    analysisData.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {analysisData.priority.toUpperCase()}
                  </span>
                </div>
              )}

              {/* Future sequence preview */}
              {analysisData?.futureSequence && analysisData.futureSequence.length > 0 && (
                <div className="text-xs">
                  <div className="text-gray-400 mb-1">🔮 Future Moves:</div>
                  <div className="text-gray-300 space-y-0.5">
                    {analysisData.futureSequence.slice(0, 2).map((move: string, i: number) => (
                      <div key={i} className="text-blue-300">• {move}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowAnalysis(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg w-6 h-6 
                         flex items-center justify-center rounded hover:bg-gray-700/50"
            >
              ×
            </button>
            
            {/* Removed arrow since we're using fixed positioning */}
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
