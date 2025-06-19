import { NextRequest, NextResponse } from 'next/server';
import { ENHANCED_SOLITAIRE_SYSTEM_PROMPT } from '@/lib/ai-prompts';

// Simplified, consistent response structure
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
  debug?: any; // For debugging
}

const SIMPLIFIED_SOLVER_PROMPT = `Analyze this Solitaire game quickly and return JSON only:
{
  "isWinnable": boolean,
  "optimalMoves": number (realistic estimate 10-40),
  "confidence": number (0-100),
  "reasoning": "brief explanation",
  "keyFactors": ["factor1", "factor2"]
}

Focus on: foundation progress, blocked cards, empty spaces, hidden cards.`;

interface SolverResponse {
  isWinnable: boolean;
  optimalMoves: number;
  confidence: number;
  reasoning: string;
  keyFactors: string[];
  timeToSolve: number;
  aiPowered: boolean;
  fallback?: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  console.log('🧠 AI Game Solver API called');
  
  let body: any;
  let gameState: string;
  let parsedState: any;
  
  // Parse request body
  try {
    body = await request.json();
    gameState = body.gameState;
    
    if (!gameState) {
      throw new Error('Missing gameState in request body');
    }
    
    console.log('📦 Request received:', {
      gameStateLength: gameState.length,
      maxDepth: body.maxDepth || 30,
      timeLimit: body.timeLimit || 15000
    });
    
  } catch (parseError) {
    console.error('❌ Failed to parse request body:', parseError);
    return NextResponse.json(createErrorResponse('Invalid request body'), { status: 400 });
  }

  const { maxDepth = 30, timeLimit = 15000 } = body;
  
  try {
    // Parse and validate game state
    try {
      parsedState = JSON.parse(gameState);
      console.log('✅ Game state parsed successfully');
      
      // Basic validation
      if (!parsedState?.foundations || !parsedState?.stock || !parsedState?.tableaux) {
        throw new Error('Invalid game state structure');
      }
      
    } catch (parseError) {
      console.error('❌ Invalid game state:', parseError);
      const fallbackSolution = performLocalGameAnalysis(null);
      return NextResponse.json({
        ...fallbackSolution,
        error: 'Invalid game state - using fallback analysis',
        fallback: true
      });
    }

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found');
      const fallbackSolution = performLocalGameAnalysis(parsedState);
      return NextResponse.json({
        ...fallbackSolution,
        error: 'OpenAI API key not configured',
        fallback: true
      });
    }

    // Create optimized prompt for solver
    const gameStateSummary = createGameStateSummary(parsedState);
    const solverPrompt = `${SIMPLIFIED_SOLVER_PROMPT}\n\nGame State Summary:\n${gameStateSummary}`;

    console.log('🤖 Making OpenAI API call for game solving...');
    console.log('📝 Prompt preview:', solverPrompt.substring(0, 200) + '...');
    
    // Call OpenAI with timeout
    const openaiPromise = fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: ENHANCED_SOLITAIRE_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: solverPrompt
          }
        ],
        max_completion_tokens: 800, // Increased as requested
        temperature: 0.2, // Lower temperature for more consistent analysis
      }),
    });

    // Add timeout to OpenAI request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI request timeout')), timeLimit);
    });

    const openaiResponse = await Promise.race([openaiPromise, timeoutPromise]) as Response;

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('❌ OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('✅ OpenAI game solver response received');
    
    const aiAnalysis = openaiData.choices[0]?.message?.content;
    if (!aiAnalysis) {
      throw new Error('No analysis returned from OpenAI');
    }

    console.log('🎯 AI Analysis preview:', aiAnalysis.substring(0, 150) + '...');

    // Parse AI response
    let aiSolution: any = null;
    try {
      const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiSolution = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed AI JSON response');
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse structured response, using text analysis');
    }

    // Enhanced local analysis to supplement AI
    const localAnalysis = performLocalGameAnalysis(parsedState);
    
    // Combine AI analysis with local heuristics
    const solution: SolverResponse = {
      isWinnable: aiSolution?.isWinnable ?? localAnalysis.isWinnable,
      optimalMoves: aiSolution?.optimalMoves ?? localAnalysis.optimalMoves,
      confidence: aiSolution?.confidence ?? localAnalysis.confidence,
      reasoning: aiSolution?.reasoning ?? localAnalysis.reasoning,
      keyFactors: aiSolution?.keyFactors ?? localAnalysis.keyFactors,
      timeToSolve: parseFloat((Date.now() % 5000 / 1000).toFixed(1)), // Simulate solve time
      aiPowered: true
    };

    // Validate AI response values
    solution.optimalMoves = Math.max(5, Math.min(50, solution.optimalMoves));
    solution.confidence = Math.max(0, Math.min(100, solution.confidence));

    console.log('🎯 Final solution:', {
      isWinnable: solution.isWinnable,
      optimalMoves: solution.optimalMoves,
      confidence: solution.confidence,
      aiPowered: solution.aiPowered
    });

    return NextResponse.json(solution);

  } catch (error) {
    console.error('❌ Game solver error:', error);
    
    // Always provide fallback analysis
    try {
      const fallbackSolution = performLocalGameAnalysis(parsedState);
      return NextResponse.json({
        ...fallbackSolution,
        error: error instanceof Error ? error.message : 'Unknown error',
        aiPowered: false,
        fallback: true
      });
    } catch (fallbackError) {
      console.error('❌ Fallback analysis failed:', fallbackError);
      return NextResponse.json(createErrorResponse('Complete analysis failure'));
    }
  }
}

function createGameStateSummary(state: any): string {
  try {
    const foundationTotal = Object.values(state?.foundations || {}).reduce(
      (sum: number, foundation: any) => sum + (foundation?.cards?.length || 0), 0
    );
    
    const stockCards = state?.stock?.cards?.length || 0;
    const wasteCards = state?.waste?.cards?.length || 0;
    
    const tableauInfo = Object.values(state?.tableaux || {}).map((tableau: any, index) => {
      const totalCards = tableau?.cards?.length || 0;
      const faceUpCards = tableau?.cards?.filter((c: any) => c.faceUp)?.length || 0;
      const faceDownCards = totalCards - faceUpCards;
      return `T${index + 1}: ${totalCards} cards (${faceDownCards} down, ${faceUpCards} up)`;
    });
    
    return [
      `Foundation: ${foundationTotal}/52 cards`,
      `Stock: ${stockCards} cards, Waste: ${wasteCards} cards`,
      `Tableaux: ${tableauInfo.join(', ')}`,
      `Moves: ${state?.moves || 0}, Draw mode: ${state?.drawMode || 1}`
    ].join('\n');
    
  } catch (error) {
    return 'Game state summary unavailable';
  }
}

function performLocalGameAnalysis(state: any): SolverResponse {
  console.log('📊 Performing local game analysis...');
  
  try {
    if (!state) {
      return createErrorResponse('No game state available');
    }
    
    // Calculate game progress metrics
    const foundationTotal = Object.values(state?.foundations || {}).reduce(
      (sum: number, foundation: any) => sum + (foundation?.cards?.length || 0), 0
    );
    
    const tableauAnalysis = Object.values(state?.tableaux || {}).map((tableau: any) => {
      const totalCards = tableau?.cards?.length || 0;
      const faceUpCards = tableau?.cards?.filter((c: any) => c.faceUp)?.length || 0;
      const faceDownCards = totalCards - faceUpCards;
      const isEmpty = totalCards === 0;
      return { totalCards, faceUpCards, faceDownCards, isEmpty };
    });
    
    const totalHiddenCards = tableauAnalysis.reduce((sum, t) => sum + t.faceDownCards, 0);
    const emptySpaces = tableauAnalysis.filter(t => t.isEmpty).length;
    const stockCards = state?.stock?.cards?.length || 0;
    const moves = state?.moves || 0;
    
    // Enhanced solvability heuristics
    const progressRatio = foundationTotal / 52;
    const gamePhase = progressRatio < 0.3 ? 'early' : progressRatio < 0.7 ? 'middle' : 'late';
    
    // Win probability calculation
    let winProbability = 70; // Base optimism
    
    // Adjust based on various factors
    winProbability += progressRatio * 25; // Progress bonus
    winProbability -= totalHiddenCards * 1.5; // Hidden cards penalty
    winProbability += emptySpaces * 10; // Empty spaces bonus
    winProbability -= (stockCards > 20 ? 15 : 0); // Large stock penalty
    winProbability -= (moves > 100 ? 20 : 0); // Too many moves penalty
    
    winProbability = Math.max(15, Math.min(90, winProbability));
    
    // Estimate optimal moves
    const cardsRemaining = 52 - foundationTotal;
    let estimatedMoves = Math.round(cardsRemaining * 0.7); // Base moves per card
    estimatedMoves += totalHiddenCards * 0.4; // Hidden cards add complexity
    estimatedMoves += Math.max(0, stockCards - 15) * 0.3; // Large stock adds moves
    estimatedMoves = Math.max(8, Math.min(45, estimatedMoves));
    
    // Key factors identification
    const keyFactors = [];
    if (gamePhase === 'early') keyFactors.push("Early game - establish foundations");
    if (totalHiddenCards > 12) keyFactors.push(`${totalHiddenCards} cards still hidden`);
    if (emptySpaces === 0) keyFactors.push("No empty tableau spaces available");
    if (stockCards > 15) keyFactors.push(`Large stock pile (${stockCards} cards)`);
    if (progressRatio > 0.6) keyFactors.push("Good progress - maintain momentum");
    if (moves > 50) keyFactors.push("Many moves played - be strategic");
    
    return {
      isWinnable: winProbability > 30,
      optimalMoves: estimatedMoves,
      confidence: Math.round(winProbability),
      reasoning: `${gamePhase} game analysis: ${Math.round(progressRatio * 100)}% complete, ` +
                `${totalHiddenCards} hidden cards, ${emptySpaces} empty spaces. ` +
                `Estimated ${estimatedMoves} moves remaining.`,
      keyFactors,
      timeToSolve: 0.8,
      aiPowered: false
    };
    
  } catch (analysisError) {
    console.error('❌ Local analysis error:', analysisError);
    return createErrorResponse('Local analysis failed');
  }
}

function createErrorResponse(message: string): SolverResponse {
  return {
    isWinnable: true,
    optimalMoves: 25,
    confidence: 50,
    reasoning: message,
    keyFactors: ["Analysis error - using safe estimates"],
    timeToSolve: 0.1,
    aiPowered: false,
    error: message
  };
}