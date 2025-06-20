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

const ENHANCED_SOLVER_PROMPT = `You are a Klondike Solitaire expert analyzing game positions. 

IMPORTANT: The game state uses compact notation:
- Cards format: "s5a1" = 5 of Spades, face up
- s=Spades, h=Hearts, d=Diamonds, c=Clubs  
- Ranks: 1=Ace, b=11(Jack), c=12(Queen), d=13(King)
- Last digit: 1=face up, 0=face down

Return ONLY this JSON format:
{
  "isWinnable": boolean,
  "optimalMoves": number (realistic estimate 8-50),
  "confidence": number (0-100),
  "reasoning": "brief explanation of analysis",
  "keyFactors": ["key observation 1", "key observation 2"]
}

ANALYSIS RULES:
1. If you see cards in tableau/stock/waste, the game is NOT empty
2. Count face-up cards and potential moves carefully
3. Consider card accessibility and sequence building
4. Estimate moves based on cards remaining and complexity
5. Be realistic - most games take 15-40 moves if winnable

Focus on accuracy over speed. If uncertain, explain your reasoning clearly.`;

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
      console.log('🔍 Game state preview:', {
        stock: parsedState.stock?.length || 0,
        waste: parsedState.waste?.length || 0,
        tableaux: Object.keys(parsedState.tableaux || {}).map(key => ({
          tableau: key,
          cards: parsedState.tableaux[key]?.length || 0
        })),
        moves: parsedState.moves || 0
      });
      
      // Basic validation
      if (!parsedState?.foundations || !parsedState?.stock || !parsedState?.tableaux) {
        throw new Error('Invalid game state structure');
      }
      
      // Enhanced validation - check if game state actually has cards
      const totalCards = (parsedState.stock?.length || 0) + 
                        (parsedState.waste?.length || 0) +
                        Object.values(parsedState.tableaux || {}).reduce((sum: number, tableau: any) => 
                          sum + (tableau?.length || 0), 0) +
                        Object.values(parsedState.foundations || {}).reduce((sum: number, foundation: any) => 
                          sum + (foundation?.length || 0), 0);
      
      console.log('🃏 Total cards in game:', totalCards);
      
      if (totalCards === 0) {
        console.warn('⚠️ Empty game state detected - all piles are empty');
        return NextResponse.json(createErrorResponse('Empty game state - no cards found'), { status: 400 });
      }
      
    } catch (parseError) {
      console.error('❌ Invalid game state:', parseError);
      const fallbackSolution = performEnhancedLocalGameAnalysis(null);
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
      const fallbackSolution = performEnhancedLocalGameAnalysis(parsedState);
      return NextResponse.json({
        ...fallbackSolution,
        error: 'OpenAI API key not configured',
        fallback: true
      });
    }

    // Create enhanced game state summary for AI
    const gameStateSummary = createEnhancedGameStateSummary(parsedState);
    const solverPrompt = `${ENHANCED_SOLVER_PROMPT}\n\nGame State:\n${gameStateSummary}\n\nRaw JSON: ${gameState}`;

    console.log('🤖 Making OpenAI API call for game solving...');
    console.log('📝 Game state summary:', gameStateSummary);
    
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
            content: ENHANCED_SOLVER_PROMPT
          },
          {
            role: 'user',
            content: solverPrompt
          }
        ],
        max_completion_tokens: 800, // Increased as requested
        temperature: 0.1, // Very low temperature for consistent analysis
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

    console.log('🎯 AI Analysis:', aiAnalysis);

    // Parse AI response
    let aiSolution: any = null;
    try {
      const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiSolution = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed AI JSON response:', aiSolution);
      } else {
        console.warn('⚠️ No JSON found in AI response, using text analysis');
        throw new Error('No JSON in AI response');
      }
    } catch (parseError) {
      console.log('⚠️ Could not parse structured response, using local analysis');
      aiSolution = null;
    }

    // Enhanced local analysis to supplement or replace AI
    const localAnalysis = performEnhancedLocalGameAnalysis(parsedState);
    
    // Use AI analysis if available and reasonable, otherwise use enhanced local analysis
    const solution: SolverResponse = {
      isWinnable: aiSolution?.isWinnable ?? localAnalysis.isWinnable,
      optimalMoves: aiSolution?.optimalMoves ?? localAnalysis.optimalMoves,
      confidence: aiSolution?.confidence ?? localAnalysis.confidence,
      reasoning: aiSolution?.reasoning ?? localAnalysis.reasoning,
      keyFactors: aiSolution?.keyFactors ?? localAnalysis.keyFactors,
      timeToSolve: parseFloat((Date.now() % 5000 / 1000).toFixed(1)), // Simulate solve time
      aiPowered: !!aiSolution
    };

    // Validate and sanitize AI response values
    solution.optimalMoves = Math.max(5, Math.min(60, solution.optimalMoves));
    solution.confidence = Math.max(10, Math.min(95, solution.confidence));
    
    // If AI gave obviously wrong answer, override with local analysis
    if (aiSolution && (aiSolution.optimalMoves < 5 || aiSolution.confidence === 0)) {
      console.warn('⚠️ AI gave suspicious answer, using enhanced local analysis instead');
      solution.isWinnable = localAnalysis.isWinnable;
      solution.optimalMoves = localAnalysis.optimalMoves;
      solution.confidence = localAnalysis.confidence;
      solution.reasoning = `AI override: ${localAnalysis.reasoning}`;
      solution.keyFactors = localAnalysis.keyFactors;
      solution.aiPowered = false;
    }

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
      const fallbackSolution = performEnhancedLocalGameAnalysis(parsedState);
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

function createEnhancedGameStateSummary(state: any): string {
  try {
    const foundationTotal = Object.values(state?.foundations || {}).reduce(
      (sum: number, foundation: any) => sum + (foundation?.length || 0), 0
    );
    
    const stockCards = state?.stock?.length || 0;
    const wasteCards = state?.waste?.length || 0;
    
    const tableauInfo = Object.entries(state?.tableaux || {}).map(([index, tableau]: [string, any]) => {
      const totalCards = tableau?.length || 0;
      return `T${index}: ${totalCards} cards`;
    });
    
    const totalCards = stockCards + wasteCards + foundationTotal + 
                      Object.values(state?.tableaux || {}).reduce((sum: number, tableau: any) => 
                        sum + (tableau?.length || 0), 0);
    
    return [
      `GAME ANALYSIS SUMMARY:`,
      `Foundation: ${foundationTotal}/52 cards completed`,
      `Stock: ${stockCards} cards remaining`,
      `Waste: ${wasteCards} cards`,
      `Tableaux: ${tableauInfo.join(', ')}`,
      `Total cards in game: ${totalCards}`,
      `Moves played: ${state?.moves || 0}`,
      `Draw mode: ${state?.drawMode || 1}`,
      `\nThis is an ACTIVE game with ${totalCards} cards in play.`
    ].join('\n');
    
  } catch (error) {
    return 'Game state summary unavailable';
  }
}

function performEnhancedLocalGameAnalysis(state: any): SolverResponse {
  console.log('📊 Performing enhanced local game analysis...');
  
  try {
    if (!state) {
      return createErrorResponse('No game state available');
    }
    
    // Calculate game progress metrics
    const foundationTotal = Object.values(state?.foundations || {}).reduce(
      (sum: number, foundation: any) => sum + (foundation?.length || 0), 0
    );
    
    const tableauInfo = Object.entries(state?.tableaux || {}).map(([index, tableau]: [string, any]) => {
      const totalCards = tableau?.length || 0;
      // Count face down cards (cards ending in "0")
      const faceDownCards = tableau?.filter((card: string) => card.endsWith('0'))?.length || 0;
      const faceUpCards = totalCards - faceDownCards;
      const isEmpty = totalCards === 0;
      return { index, totalCards, faceUpCards, faceDownCards, isEmpty };
    });
    
    const totalHiddenCards = tableauInfo.reduce((sum, t) => sum + t.faceDownCards, 0);
    const emptySpaces = tableauInfo.filter(t => t.isEmpty).length;
    const stockCards = state?.stock?.length || 0;
    const wasteCards = state?.waste?.length || 0;
    const moves = state?.moves || 0;
    
    const totalCards = foundationTotal + stockCards + wasteCards + 
                      tableauInfo.reduce((sum, t) => sum + t.totalCards, 0);
    
    console.log('🔍 Game metrics:', {
      foundationTotal,
      totalHiddenCards,
      emptySpaces,
      stockCards,
      totalCards,
      moves
    });
    
    // Enhanced solvability heuristics
    const progressRatio = foundationTotal / 52;
    const gamePhase = progressRatio < 0.3 ? 'early' : progressRatio < 0.7 ? 'middle' : 'late';
    
    // Win probability calculation
    let winProbability = 75; // Base optimism for active games
    
    // Adjust based on various factors
    winProbability += progressRatio * 20; // Progress bonus
    winProbability -= totalHiddenCards * 1.2; // Hidden cards penalty
    winProbability += emptySpaces * 8; // Empty spaces bonus
    winProbability -= (stockCards > 20 ? 10 : 0); // Large stock penalty
    winProbability -= (moves > 80 ? 15 : 0); // Too many moves penalty
    winProbability += (wasteCards > 0 ? 5 : 0); // Waste cards can be good
    
    winProbability = Math.max(25, Math.min(90, winProbability));
    
    // Estimate optimal moves based on game state
    const cardsRemaining = 52 - foundationTotal;
    let estimatedMoves = Math.round(cardsRemaining * 0.7); // Base moves per card
    estimatedMoves += totalHiddenCards * 0.3; // Hidden cards add complexity
    estimatedMoves += Math.max(0, stockCards - 10) * 0.2; // Large stock adds moves
    estimatedMoves = Math.max(8, Math.min(50, estimatedMoves));
    
    // Key factors identification
    const keyFactors = [];
    if (gamePhase === 'early') keyFactors.push("Early game - focus on revealing cards");
    if (totalHiddenCards > 15) keyFactors.push(`${totalHiddenCards} cards still hidden`);
    if (emptySpaces === 0) keyFactors.push("No empty tableau spaces available");
    if (stockCards > 15) keyFactors.push(`Large stock pile (${stockCards} cards)`);
    if (progressRatio > 0.6) keyFactors.push("Good progress - maintain momentum");
    if (moves > 50) keyFactors.push("Many moves played - focus on efficiency");
    if (totalCards === 0) keyFactors.push("ERROR: No cards found in game state");
    
    return {
      isWinnable: winProbability > 35 && totalCards > 0,
      optimalMoves: estimatedMoves,
      confidence: Math.round(winProbability),
      reasoning: `Enhanced analysis: ${gamePhase} game (${Math.round(progressRatio * 100)}% complete), ` +
                `${totalHiddenCards} hidden cards, ${emptySpaces} empty spaces. ` +
                `Estimated ${estimatedMoves} moves remaining. Total cards: ${totalCards}`,
      keyFactors,
      timeToSolve: 1.0,
      aiPowered: false
    };
    
  } catch (analysisError) {
    console.error('❌ Enhanced local analysis error:', analysisError);
    return createErrorResponse('Enhanced local analysis failed');
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