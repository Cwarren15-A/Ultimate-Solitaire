"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/game-store";
import { Zap, Clock, Target, Brain } from "lucide-react";
import { serializeGameState } from '@/core/serialize';

interface GameSolution {
  isWinnable: boolean;
  optimalMoves: number;
  moveSequence: Array<{
    move: string;
    description: string;
    evaluation: string;
  }>;
  timeToSolve: number;
  confidence: number;
}

export default function AiGameSolver() {
  const [solution, setSolution] = useState<GameSolution | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [lastAnalyzedGameId, setLastAnalyzedGameId] = useState<string>('');
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [autoAnalyzeEnabled, setAutoAnalyzeEnabled] = useState(false); // Default to OFF to save tokens
  const { currentState } = useGameStore();

  useEffect(() => {
    // Create a meaningful game state hash to avoid re-analyzing identical positions
    const gameStateHash = `${currentState.moves}-${Object.values(currentState.foundations).map(f => f.cards.length).join(',')}-${currentState.stock.cards.length}`;
    const now = Date.now();
    const timeSinceLastAnalysis = now - lastAnalysisTime;
    const minCooldownTime = 5000; // 5 second minimum between analyses

    // Only analyze if:
    // 1. Auto-analysis is enabled (to save tokens)
    // 2. Game is not complete
    // 3. Not currently analyzing
    // 4. Game state has meaningfully changed (different hash)
    // 5. Enough time has passed since last analysis (cooldown)
    if (autoAnalyzeEnabled &&
        !currentState.isComplete && 
        !isAnalyzing && 
        gameStateHash !== lastAnalyzedGameId &&
        timeSinceLastAnalysis > minCooldownTime) {
      
      console.log('🔄 Game state changed meaningfully, scheduling analysis...');
      const timer = setTimeout(() => {
        setLastAnalyzedGameId(gameStateHash);
        setLastAnalysisTime(now);
        solveGame();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentState.moves, currentState.isComplete]); // Only depend on move count and completion status

  const solveGame = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    console.log('🤖 AI Game Solver: Starting full game analysis...');
    
    try {
      // Simulate progressive analysis with updates
      const progressSteps = [
        { progress: 20, status: "Analyzing tableau structure..." },
        { progress: 40, status: "Computing foundation paths..." },
        { progress: 60, status: "Evaluating move sequences..." },
        { progress: 80, status: "Optimizing solution..." },
        { progress: 100, status: "Analysis complete!" }
      ];

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setAnalysisProgress(step.progress);
      }

      // Call the AI solver API
      const response = await fetch('/api/solve-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState: serializeGameState(currentState),
          maxDepth: 50, // How many moves ahead to search
          timeLimit: 30000 // 30 second limit
        }),
      });

      if (!response.ok) {
        throw new Error(`Solver API error: ${response.status}`);
      }

      const solutionData = await response.json();
      console.log('🎯 Game solution found:', solutionData);
      
      setSolution(solutionData);
    } catch (error) {
      console.error('❌ Game solver failed:', error);
      
      // Fallback to local heuristic analysis
      const fallbackSolution = await performLocalAnalysis();
      setSolution(fallbackSolution);
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const performLocalAnalysis = async (): Promise<GameSolution> => {
    console.log('📊 Performing local heuristic analysis...');
    
    // Simple heuristic analysis based on game state
    const foundationTotal = Object.values(currentState.foundations).reduce(
      (sum: number, foundation: any) => sum + (foundation?.cards?.length || 0), 0
    );
    const revealedCards = Object.values(currentState.tableaux).reduce(
      (sum: number, tableau: any) => sum + (tableau?.cards?.filter((c: any) => c.faceUp)?.length || 0), 0
    );
    
    const completionPercentage = foundationTotal / 52;
    const estimatedMoves = Math.max(10, Math.round(52 - foundationTotal + (28 - revealedCards) * 1.5));
    const winProbability = Math.min(95, Math.max(5, 60 + (completionPercentage * 40) - (currentState.stock.cards.length * 0.5)));
    
    return {
      isWinnable: winProbability > 30,
      optimalMoves: estimatedMoves,
      moveSequence: [
        {
          move: "foundation_focus",
          description: "Prioritize foundation builds",
          evaluation: `${foundationTotal}/52 cards placed`
        },
        {
          move: "reveal_cards", 
          description: "Expose face-down cards in tableau",
          evaluation: `${28 - revealedCards} cards still hidden`
        },
        {
          move: "king_spaces",
          description: "Create empty spaces for Kings",
          evaluation: "Strategic tableau management"
        }
      ],
      timeToSolve: 1.2,
      confidence: Math.round(winProbability)
    };
  };

  if (currentState.isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center space-x-2 bg-gradient-to-r from-green-600/30 to-emerald-600/30 
                   px-3 py-2 rounded-lg border border-green-500/30"
      >
        <Target className="h-4 w-4 text-green-400" />
        <span className="text-green-200 text-sm font-medium">🎉 Victory!</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-3"
    >
      {isAnalyzing ? (
        <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-600/30 to-purple-600/30 
                        px-3 py-2 rounded-lg border border-blue-500/30">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="h-4 w-4 text-blue-400" />
          </motion.div>
          <div className="text-blue-200 text-sm">
            <div className="font-medium">AI Analyzing...</div>
            <div className="w-20 h-1 bg-blue-900/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-400"
                style={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      ) : solution ? (
        <div className="flex items-center space-x-3">
          {/* Main Solution Display */}
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
            solution.isWinnable 
              ? 'bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-green-500/30'
              : 'bg-gradient-to-r from-orange-600/30 to-red-600/30 border-orange-500/30'
          }`}>
            <Zap className={`h-4 w-4 ${solution.isWinnable ? 'text-green-400' : 'text-orange-400'}`} />
            <div className={`text-sm ${solution.isWinnable ? 'text-green-200' : 'text-orange-200'}`}>
              <span className="font-medium">
                {solution.isWinnable ? `AI: Solvable in ${solution.optimalMoves} moves` : 'Challenging position'}
              </span>
            </div>
          </div>

          {/* Confidence Indicator */}
          <div className="flex items-center space-x-1 bg-gray-800/50 px-2 py-1 rounded border border-gray-600/30">
            <Target className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-300">{solution.confidence}%</span>
          </div>

          {/* Analysis Time */}
          <div className="flex items-center space-x-1 bg-gray-800/50 px-2 py-1 rounded border border-gray-600/30">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-300">{solution.timeToSolve.toFixed(1)}s</span>
          </div>

          {/* Manual Analyze Button */}
          <motion.button
            onClick={solveGame}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-1 px-2 py-1 bg-purple-600/30 hover:bg-purple-500/30 
                       text-purple-200 rounded text-xs border border-purple-500/30 transition-colors"
          >
            <Brain className="h-3 w-3" />
            <span>Analyze</span>
          </motion.button>

          {/* Auto-Analyze Toggle */}
          <motion.button
            onClick={() => setAutoAnalyzeEnabled(!autoAnalyzeEnabled)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border transition-colors ${
              autoAnalyzeEnabled 
                ? 'bg-green-600/30 hover:bg-green-500/30 text-green-200 border-green-500/30'
                : 'bg-gray-600/30 hover:bg-gray-500/30 text-gray-300 border-gray-500/30'
            }`}
            title={autoAnalyzeEnabled ? 'Auto-analyze ON (uses tokens)' : 'Auto-analyze OFF (saves tokens)'}
          >
            <div className={`w-2 h-2 rounded-full ${autoAnalyzeEnabled ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span>Auto</span>
          </motion.button>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <motion.button
            onClick={solveGame}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-600/30 to-blue-600/30 
                       hover:from-purple-500/30 hover:to-blue-500/30 text-purple-200 rounded-lg 
                       border border-purple-500/30 transition-colors text-sm"
          >
            <Brain className="h-4 w-4" />
            <span>Analyze Game</span>
          </motion.button>

          {/* Auto-Analyze Toggle */}
          <motion.button
            onClick={() => setAutoAnalyzeEnabled(!autoAnalyzeEnabled)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center space-x-1 px-2 py-2 rounded text-xs border transition-colors ${
              autoAnalyzeEnabled 
                ? 'bg-green-600/30 hover:bg-green-500/30 text-green-200 border-green-500/30'
                : 'bg-gray-600/30 hover:bg-gray-500/30 text-gray-300 border-gray-500/30'
            }`}
            title={autoAnalyzeEnabled ? 'Auto-analyze ON (uses tokens)' : 'Auto-analyze OFF (saves tokens)'}
          >
            <div className={`w-2 h-2 rounded-full ${autoAnalyzeEnabled ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span>Auto</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
} 