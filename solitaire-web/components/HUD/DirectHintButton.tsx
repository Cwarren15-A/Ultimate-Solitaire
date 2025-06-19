"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/game-store";
// @ts-ignore
const { Brain, Loader2, X, Lightbulb } = require("lucide-react");
import { serializeGameState } from '@/core/serialize';
import { createXrayDataPrompt } from '@/lib/ai-prompts';

interface DirectHintButtonProps {
  maxHints?: number;
}

interface HintResponse {
  success: boolean;
  move?: {
    description: string;
    from?: string;
    to?: string;
    cards?: string[];
    reasoning?: string;
  };
  analysis?: {
    winProbability: string;
    deadlockRisk: 'low' | 'medium' | 'high';
    strategicInsight?: string;
  };
  hintsUsed: number;
  hintsRemaining: number;
  message: string;
  error?: string;
  debug?: any;
}

export default function DirectHintButton({ maxHints = 5 }: DirectHintButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintData, setHintData] = useState<HintResponse | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  
  const { currentState } = useGameStore();

  const canRequestHint = hintsUsed < maxHints && !isLoading && !currentState.isComplete;

  const requestHint = async () => {
    if (!canRequestHint) return;
    
    setIsLoading(true);
    setShowHint(false);
    setHintData(null);
    
    console.log('🔍 Requesting hint...', { enhancedMode, hintsUsed });
    
    try {
      const requestBody = {
        gameState: serializeGameState(currentState),
        xrayData: createXrayDataPrompt(currentState),
        hintsUsed,
        maxHints,
        enhanced: enhancedMode
      };

      console.log('📤 Sending request:', {
        enhanced: enhancedMode,
        gameStateLength: requestBody.gameState.length,
        hintsUsed
      });

      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: HintResponse = await response.json();
      console.log('📊 Response data:', data);
      
      setHintData(data);
      setHintsUsed(data.hintsUsed);
      setShowHint(true);
      
    } catch (error) {
      console.error('❌ Hint request failed:', error);
      
      // Create error response
      const errorResponse: HintResponse = {
        success: false,
        hintsUsed: hintsUsed + 1,
        hintsRemaining: maxHints - (hintsUsed + 1),
        message: 'Failed to get hint',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      setHintData(errorResponse);
      setHintsUsed(errorResponse.hintsUsed);
      setShowHint(true);
    } finally {
      setIsLoading(false);
    }
  };

  const closeHint = () => {
    setShowHint(false);
    setHintData(null);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-orange-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="relative">
      {/* Debug Toggle (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="absolute -top-6 right-0 text-xs text-gray-500 hover:text-gray-300"
        >
          {debugMode ? '🔍' : '👁️'}
        </button>
      )}

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
          title="Enhanced analysis - Detailed strategy, uses more tokens"
        >
          🧠 Enhanced
        </button>
      </div>

      {/* Hint Button */}
      <button
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 border focus:outline-none focus:ring-2 focus:ring-blue-400
          ${!canRequestHint
            ? 'bg-purple-800/30 text-purple-400/50 cursor-not-allowed border-purple-700/30'
            : 'bg-gradient-to-r from-purple-600/50 to-blue-600/50 text-purple-100 hover:from-purple-500/50 hover:to-blue-500/50 cursor-pointer border-purple-500/30 hover:scale-105'
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
        <span>
          {isLoading 
            ? (enhancedMode ? 'Analyzing...' : 'Getting hint...') 
            : (enhancedMode ? 'Enhanced Hint' : 'Quick Hint')
          }
        </span>
        {canRequestHint && !isLoading && (
          <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-200">
            {maxHints - hintsUsed}
          </span>
        )}
      </button>

      {/* Hint Panel */}
      {showHint && hintData && (
        <div className="fixed top-4 right-4 w-96 max-w-[90vw] bg-gray-900/95 border border-purple-400 rounded-lg shadow-2xl z-50 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-lg font-semibold text-white">AI Hint</span>
              {hintData.success ? (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                  Success
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300">
                  Error
                </span>
              )}
            </div>
            <button
              onClick={closeHint}
              className="text-gray-400 hover:text-white transition-colors w-8 h-8 
                         flex items-center justify-center rounded hover:bg-gray-700/50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {/* Message */}
          <div className="mb-4 text-sm text-blue-200">
            {hintData.message}
          </div>

          {/* Move Suggestion */}
          {hintData.move && (
            <div className="bg-blue-500/20 p-3 rounded border border-blue-500/30 mb-4">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="h-4 w-4 text-blue-400" />
                <span className="text-blue-200 text-sm font-medium">Recommended Move</span>
              </div>
              <div className="text-white font-medium">{hintData.move.description}</div>
              {hintData.move.reasoning && (
                <div className="text-blue-300 text-sm mt-1">{hintData.move.reasoning}</div>
              )}
            </div>
          )}

          {/* Analysis */}
          {hintData.analysis && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 p-3 rounded">
                  <div className="text-xs text-gray-400 mb-1">Win Probability</div>
                  <div className="text-sm font-bold text-green-400">
                    {hintData.analysis.winProbability}
                  </div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded">
                  <div className="text-xs text-gray-400 mb-1">Risk Level</div>
                  <div className={`text-sm font-bold ${getRiskColor(hintData.analysis.deadlockRisk)}`}>
                    {hintData.analysis.deadlockRisk.toUpperCase()}
                  </div>
                </div>
              </div>

              {hintData.analysis.strategicInsight && (
                <div className="bg-purple-900/20 p-3 rounded border border-purple-600/30">
                  <div className="text-xs text-purple-200 mb-1">Strategic Insight</div>
                  <div className="text-sm text-purple-100">{hintData.analysis.strategicInsight}</div>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {hintData.error && (
            <div className="bg-red-500/20 p-3 rounded border border-red-500/30 mb-4">
              <div className="text-red-200 text-sm font-medium mb-1">Error Details</div>
              <div className="text-red-100 text-sm">{hintData.error}</div>
            </div>
          )}

          {/* Debug Info (only in development) */}
          {debugMode && hintData.debug && (
            <div className="mt-4 bg-gray-800/50 p-3 rounded">
              <div className="text-xs text-gray-400 mb-2">Debug Info</div>
              <pre className="text-xs text-gray-300 overflow-auto max-h-20">
                {JSON.stringify(hintData.debug, null, 2)}
              </pre>
            </div>
          )}

          {/* Hints Used */}
          <div className="text-center mt-4 pt-3 border-t border-gray-600/30">
            <div className="text-xs text-gray-400">
              Hints Used: {hintData.hintsUsed} / {hintData.hintsUsed + hintData.hintsRemaining}
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                style={{ 
                  width: `${(hintData.hintsUsed / (hintData.hintsUsed + hintData.hintsRemaining)) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}