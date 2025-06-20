"use client";

import { useState, useEffect, useRef } from "react";
// @ts-ignore
const { motion } = require("framer-motion");
import { useGameStore } from "@/lib/game-store";
// @ts-ignore
const { Zap, Clock, Target, Brain, Play, Pause, TrendingUp, Award } = require("lucide-react");
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
  reasoning?: string;
  keyFactors?: string[];
  error?: string;
  aiPowered?: boolean;
  fallback?: boolean;
}

export default function AiGameSolver() {
  const [solution, setSolution] = useState<GameSolution | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [autoAnalyzeEnabled, setAutoAnalyzeEnabled] = useState(true); // Enable by default
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  const [debugMode, setDebugMode] = useState(false);
  const { currentState, gameBaseline, isAnalyzingBaseline, getPerformanceComparison } = useGameStore();
  
  // Add ref to track analysis state more reliably
  const analysisRef = useRef(false);

  // Improved auto-analysis with better logic  
  useEffect(() => {
    console.log('🔍 Auto-analysis effect triggered:', {
      autoAnalyzeEnabled,
      isComplete: currentState.isComplete,
      moves: currentState.moves
    });

    // Don't analyze if disabled, game is complete, or already analyzing
    if (!autoAnalyzeEnabled || currentState.isComplete || analysisRef.current) {
      console.log('🚫 Auto-analysis skipped due to conditions');
      return;
    }

    // Only auto-analyze on significant game changes (not at move 0 since baseline handles that)
    const significantMoves = [5, 10, 20, 30, 40, 50]; // Analyze at these move counts
    const timeSinceLastAnalysis = Date.now() - lastAnalysisTime;
    const shouldAnalyze = significantMoves.includes(currentState.moves) && timeSinceLastAnalysis > 15000; // 15 second cooldown

    console.log('🔍 Auto-analysis check:', {
      significantMove: significantMoves.includes(currentState.moves),
      timeSinceLastAnalysis,
      shouldAnalyze
    });

    if (shouldAnalyze) {
      console.log('🔄 Auto-analyzing game at move', currentState.moves);
      const timer = setTimeout(() => {
        console.log('⏰ Auto-analysis timer fired - calling solveGame()');
        solveGame();
      }, 2000); // 2 second delay

      return () => {
        console.log('🧹 Auto-analysis timer cleared');
        clearTimeout(timer);
      };
    }
  }, [currentState.moves, autoAnalyzeEnabled, currentState.isComplete, lastAnalysisTime]); // eslint-disable-line react-hooks/exhaustive-deps

  const solveGame = async () => {
    if (isAnalyzing || analysisRef.current || currentState.isComplete) {
      console.log('⚠️ Analysis skipped:', { 
        isAnalyzing, 
        refCurrent: analysisRef.current, 
        gameComplete: currentState.isComplete 
      });
      return;
    }
    
    console.log('🤖 AI Game Solver: Starting analysis...');
    analysisRef.current = true;
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setLastAnalysisTime(Date.now());
    
    console.log('✅ Analysis state initialized', { isAnalyzing: true, refCurrent: analysisRef.current });
    
    try {
      // Simulate progressive analysis
      const progressSteps = [
        { progress: 20, status: "Analyzing tableau structure..." },
        { progress: 40, status: "Computing foundation paths..." },
        { progress: 60, status: "Evaluating move sequences..." },
        { progress: 80, status: "Optimizing solution..." },
        { progress: 100, status: "Analysis complete!" }
      ];

      for (let i = 0; i < progressSteps.length; i++) {
        const step = progressSteps[i];
        console.log('📊 Progress step:', step.status, `${step.progress}%`);
        await new Promise(resolve => setTimeout(resolve, 600));
        setAnalysisProgress(step.progress);
        
        // Exit early if analysis is cancelled (only check ref, not state)
        if (!analysisRef.current) {
          console.log('❌ Analysis cancelled early - ref changed');
          console.log('🔍 Debug: step', i, 'progress', step.progress, 'refCurrent', analysisRef.current);
          return;
        }
      }

      console.log('📤 Calling solve-game API...');
      console.log('🎮 Current state check:', { 
        isComplete: currentState?.isComplete, 
        moves: currentState?.moves,
        hasFoundations: !!currentState?.foundations 
      });
      
      const requestBody = {
        gameState: serializeGameState(currentState),
        maxDepth: 30, // Reduced for faster analysis
        timeLimit: 15000 // 15 second limit
      };
      
      console.log('📦 Request body prepared:', {
        gameStateLength: requestBody.gameState.length,
        maxDepth: requestBody.maxDepth,
        timeLimit: requestBody.timeLimit
      });
      
      const response = await fetch('/api/solve-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📥 API Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        throw new Error(`Solver API error: ${response.status} ${response.statusText}`);
      }

      const solutionData = await response.json();
      console.log('🎯 Game solution received:', solutionData);
      
      setSolution(solutionData);
    } catch (error) {
      console.error('❌ Game solver failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: typeof error
      });
      
      // Enhanced fallback analysis
      const fallbackSolution = performEnhancedLocalAnalysis();
      setSolution({
        ...fallbackSolution,
        error: error instanceof Error ? error.message : 'Analysis failed',
        aiPowered: false,
        fallback: true
      });
          } finally {
        console.log('🔄 Cleaning up analysis state...');
        analysisRef.current = false;
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }
  };

  const performEnhancedLocalAnalysis = (): GameSolution => {
    console.log('📊 Performing enhanced local analysis...');
    
    try {
      // More sophisticated local analysis
      const foundationTotal = Object.values(currentState.foundations).reduce(
        (sum: number, foundation: any) => sum + (foundation?.cards?.length || 0), 0
      );
      
      const tableauAnalysis = Object.values(currentState.tableaux).map((tableau: any) => {
        const totalCards = tableau?.cards?.length || 0;
        const faceUpCards = tableau?.cards?.filter((c: any) => c.faceUp)?.length || 0;
        const faceDownCards = totalCards - faceUpCards;
        const isEmpty = totalCards === 0;
        const hasKing = tableau?.cards?.some((c: any) => c.faceUp && c.rank === 13) || false;
        return { totalCards, faceUpCards, faceDownCards, isEmpty, hasKing };
      });
      
      const totalHiddenCards = tableauAnalysis.reduce((sum, t) => sum + t.faceDownCards, 0);
      const emptyTableauSpaces = tableauAnalysis.filter(t => t.isEmpty).length;
      const kingsAvailable = tableauAnalysis.filter(t => t.hasKing).length;
      const stockCards = currentState?.stock?.cards?.length || 0;
      const wasteCards = currentState?.waste?.cards?.length || 0;
      
      // Calculate game progress and difficulty
      const progressRatio = foundationTotal / 52;
      const gamePhase = progressRatio < 0.25 ? 'early' : progressRatio < 0.75 ? 'middle' : 'late';
      
      // Enhanced win probability calculation
      let winProbability = 75; // Base optimism
      
      // Adjust based on game state
      winProbability -= totalHiddenCards * 1.0; // Hidden cards reduce odds
      winProbability += emptyTableauSpaces * 8; // Empty spaces help
      winProbability += progressRatio * 25; // Progress improves odds
      winProbability -= (stockCards > 20 ? 15 : 0); // Large stock reduces odds
      winProbability += (kingsAvailable - emptyTableauSpaces) * 5; // Kings without spaces
      
      winProbability = Math.max(10, Math.min(95, winProbability));
      
      // Enhanced move estimation
      const cardsRemaining = 52 - foundationTotal;
      let estimatedMoves = Math.round(cardsRemaining * 0.6); // Base moves
      estimatedMoves += totalHiddenCards * 0.4; // Hidden cards add complexity
      estimatedMoves += Math.max(0, stockCards - 10) * 0.2; // Large stock adds moves
      estimatedMoves = Math.max(5, Math.min(50, estimatedMoves));
      
      // Key factors analysis
      const keyFactors = [];
      if (totalHiddenCards > 15) keyFactors.push(`${totalHiddenCards} cards still hidden`);
      if (stockCards > 20) keyFactors.push(`Large stock pile (${stockCards} cards)`);
      if (emptyTableauSpaces === 0 && kingsAvailable > 0) keyFactors.push("Need to create empty spaces for Kings");
      if (foundationTotal < 4) keyFactors.push("Early game - focus on Aces and 2s");
      if (progressRatio > 0.7) keyFactors.push("Late game - careful sequencing needed");
      if (emptyTableauSpaces > 2) keyFactors.push(`Good tableau management (${emptyTableauSpaces} empty spaces)`);
      
      // Strategic move sequence
      const moveSequence = [
        {
          move: "foundation_priority",
          description: "Build foundation piles whenever possible",
          evaluation: `${foundationTotal}/52 cards placed - focus on immediate foundation moves`
        },
        {
          move: "reveal_hidden",
          description: "Expose face-down tableau cards",
          evaluation: `${totalHiddenCards} cards hidden - prioritize revealing them`
        }
      ];
      
      if (gamePhase === 'early') {
        moveSequence.push({
          move: "establish_sequences",
          description: "Build long tableau sequences",
          evaluation: "Early game - create foundations for mid-game"
        });
      } else if (gamePhase === 'middle') {
        moveSequence.push({
          move: "optimize_spaces",
          description: "Create and use empty tableau spaces strategically",
          evaluation: `${emptyTableauSpaces} empty spaces available`
        });
      } else {
        moveSequence.push({
          move: "careful_sequencing",
          description: "Plan moves carefully to avoid blocking",
          evaluation: "Late game - precision is key"
        });
      }
      
      return {
        isWinnable: winProbability > 25,
        optimalMoves: estimatedMoves,
        confidence: Math.round(winProbability),
        moveSequence,
        timeToSolve: 1.2,
        reasoning: `${gamePhase} game analysis: ${Math.round(progressRatio * 100)}% complete. ` +
                  `${totalHiddenCards} hidden cards, ${emptyTableauSpaces} empty spaces. ` +
                  `Win probability: ${Math.round(winProbability)}%`,
        keyFactors
      };
    } catch (analysisError) {
      console.error('❌ Local analysis error:', analysisError);
      return {
        isWinnable: true,
        optimalMoves: 25,
        confidence: 50,
        moveSequence: [{
          move: "basic_strategy",
          description: "Continue with standard solitaire strategy",
          evaluation: "Fallback analysis due to error"
        }],
        timeToSolve: 0.5,
        reasoning: "Analysis error - using basic estimates",
        keyFactors: ["Analysis limited due to error"]
      };
    }
  };

  const cancelAnalysis = () => {
    console.log('🛑 Cancel analysis called');
    analysisRef.current = false;
    setIsAnalyzing(false);
    setAnalysisProgress(0);
  };

  // Get performance comparison data
  const performanceComparison = getPerformanceComparison();

  if (currentState.isComplete && performanceComparison) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center space-x-3"
      >
        {/* Victory message */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-green-600/30 to-emerald-600/30 
                       px-3 py-2 rounded-lg border border-green-500/30">
          <Award className="h-4 w-4 text-green-400" />
          <span className="text-green-200 text-sm font-medium">🎉 Victory!</span>
        </div>

        {/* Performance metrics */}
        <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-600/30 to-purple-600/30 
                       px-3 py-2 rounded-lg border border-blue-500/30">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          <div className="text-blue-200 text-sm">
            <span className="font-medium">{performanceComparison.efficiency}% Efficiency</span>
            <div className="text-xs text-blue-300">
              {gameBaseline?.optimalMoves} optimal • {currentState.moves} actual
            </div>
          </div>
        </div>

        {/* Efficiency rating */}
        <div className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs ${
          performanceComparison.efficiency >= 75 
            ? 'bg-green-600/30 border-green-500/30 text-green-200'
            : performanceComparison.efficiency >= 60
            ? 'bg-yellow-600/30 border-yellow-500/30 text-yellow-200'  
            : 'bg-orange-600/30 border-orange-500/30 text-orange-200'
        }`}>
          <Target className="h-3 w-3" />
          <span>
            {performanceComparison.efficiency >= 90 ? 'Exceptional' :
             performanceComparison.efficiency >= 75 ? 'Great' :
             performanceComparison.efficiency >= 60 ? 'Good' : 'Learning'}
          </span>
        </div>
      </motion.div>
    );
  }

  if (currentState.isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center space-x-2 bg-gradient-to-r from-green-600/30 to-emerald-600/30 
                   px-3 py-2 rounded-lg border border-green-500/30"
      >
        <Target className="h-4 w-4 text-green-400" />
        <span className="text-green-200 text-sm font-medium">🎉 Victory Achieved!</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-3"
    >
      {/* Debug toggle (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setDebugMode(!debugMode)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          {debugMode ? '🔍' : '👁️'}
        </button>
      )}

      {/* Baseline analysis indicator */}
      {isAnalyzingBaseline && (
        <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 
                        px-3 py-2 rounded-lg border border-indigo-500/30">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="h-4 w-4 text-indigo-400" />
          </motion.div>
          <span className="text-indigo-200 text-sm font-medium">Analyzing baseline...</span>
        </div>
      )}

      {/* Show baseline results when available and not currently analyzing */}
      {gameBaseline && !isAnalyzingBaseline && !isAnalyzing && (
        <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600/30 to-blue-600/30 
                        px-3 py-2 rounded-lg border border-indigo-500/30">
          <Target className="h-4 w-4 text-indigo-400" />
          <div className="text-indigo-200 text-sm">
            <span className="font-medium">Target: {gameBaseline.optimalMoves} moves</span>
            <div className="text-xs text-indigo-300">
              {gameBaseline.confidence}% confidence • {gameBaseline.isWinnable ? 'Winnable' : 'Challenging'}
            </div>
          </div>
        </div>
      )}

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
            <div className="w-24 h-1 bg-blue-900/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-blue-400"
                style={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <button
            onClick={cancelAnalysis}
            className="text-blue-300 hover:text-blue-100 text-xs"
            title="Cancel analysis"
          >
            ×
          </button>
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
                {solution.isWinnable 
                  ? `Solvable in ~${solution.optimalMoves} moves`
                  : 'Challenging position'
                }
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
            <span>Re-analyze</span>
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
            title={autoAnalyzeEnabled ? 'Auto-analyze ON' : 'Auto-analyze OFF'}
          >
            {autoAnalyzeEnabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
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
            title={autoAnalyzeEnabled ? 'Auto-analyze ON' : 'Auto-analyze OFF'}
          >
            {autoAnalyzeEnabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>Auto</span>
          </motion.button>
        </div>
      )}

      {/* Debug info overlay */}
      {debugMode && (solution || gameBaseline) && (
        <div className="fixed top-20 right-4 w-80 bg-gray-900/95 border border-gray-600 rounded p-3 text-xs z-[9999]">
          <div className="text-gray-300">
            {solution && (
              <>
                <div>AI Powered: {solution.aiPowered ? 'Yes' : 'No'}</div>
                <div>Fallback: {solution.fallback ? 'Yes' : 'No'}</div>
                {solution.error && <div className="text-red-300">Error: {solution.error}</div>}
                {solution.keyFactors && (
                  <div>
                    <div className="mt-2 font-medium">Key Factors:</div>
                    {solution.keyFactors.map((factor, i) => (
                      <div key={i}>• {factor}</div>
                    ))}
                  </div>
                )}
              </>
            )}
            {gameBaseline && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="font-medium">Baseline Analysis:</div>
                <div>Optimal moves: {gameBaseline.optimalMoves}</div>
                <div>Confidence: {gameBaseline.confidence}%</div>
                <div>Winnable: {gameBaseline.isWinnable ? 'Yes' : 'No'}</div>
                {performanceComparison && (
                  <div className="mt-2">
                    <div className="font-medium">Performance:</div>
                    <div>Efficiency: {performanceComparison.efficiency}%</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}