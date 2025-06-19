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

export async function POST(request: NextRequest) {
  console.log('🚀 Hint API endpoint called!');
  
  try {
    const body = await request.json();
    const { gameState, xrayData, hintsUsed, maxHints, enhanced = false } = body;
    
    console.log('📦 Request received:', { 
      gameStateLength: gameState?.length, 
      hintsUsed, 
      maxHints,
      enhanced
    });

    // Rate limiting check
    if (hintsUsed >= maxHints) {
      return NextResponse.json({
        success: false,
        hintsUsed,
        hintsRemaining: 0,
        message: `You've used all ${maxHints} hints for this game. Start a new game for more!`,
        error: 'Rate limit exceeded'
      } as HintResponse);
    }

    // Validate game state
    let parsedGameState: any;
    try {
      parsedGameState = JSON.parse(gameState);
      console.log('✅ Game state parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse game state:', parseError);
      return NextResponse.json({
        success: false,
        hintsUsed: hintsUsed + 1,
        hintsRemaining: maxHints - (hintsUsed + 1),
        message: 'Invalid game state data',
        error: 'Parse error'
      } as HintResponse);
    }

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found');
      return createFallbackResponse(hintsUsed, maxHints, parsedGameState);
    }

    console.log('🤖 Making OpenAI API call...');
    
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: enhanced 
                ? `Analyze this Solitaire game:\n${gameState}\n\nX-ray data: ${xrayData}\n\nProvide detailed strategic analysis.`
                : `Quick hint for this Solitaire game:\n${gameState.substring(0, 800)}\n\nGive ONE specific move suggestion.`
            }
          ],
          max_completion_tokens: enhanced ? 500 : 150,
          temperature: 0.3,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        console.error('❌ OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      console.log('✅ OpenAI response received');
      
      const aiAnalysis = openaiData.choices[0]?.message?.content;
      if (!aiAnalysis) {
        throw new Error('No analysis returned from OpenAI');
      }

      console.log('🎯 AI Analysis:', aiAnalysis.substring(0, 200) + '...');

      // Try to parse structured JSON response
      let structuredResponse = null;
      try {
        const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          structuredResponse = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.log('ℹ️ Using text-based analysis instead of JSON');
      }

      // Create response from AI analysis
      const hintResponse: HintResponse = {
        success: true,
        move: structuredResponse?.recommended_move ? {
          description: structuredResponse.recommended_move.description,
          reasoning: structuredResponse.recommended_move.reasoning,
        } : {
          description: extractMoveFromText(aiAnalysis),
          reasoning: 'AI suggested move from analysis'
        },
        analysis: {
          winProbability: structuredResponse?.position_analysis?.win_probability || 'Analyzing...',
          deadlockRisk: structuredResponse?.position_analysis?.deadlock_risk || 'low',
          strategicInsight: structuredResponse?.strategic_insight || aiAnalysis.substring(0, 200)
        },
        hintsUsed: hintsUsed + 1,
        hintsRemaining: maxHints - (hintsUsed + 1),
        message: enhanced ? '🧠 Enhanced analysis complete!' : '⚡ Quick hint ready!',
        debug: {
          hasStructuredResponse: !!structuredResponse,
          aiResponseLength: aiAnalysis.length,
          enhanced
        }
      };

      console.log('📤 Sending response:', {
        success: hintResponse.success,
        hasMove: !!hintResponse.move,
        message: hintResponse.message
      });

      return NextResponse.json(hintResponse);

    } catch (openaiError) {
      console.error('❌ OpenAI request failed:', openaiError);
      return createFallbackResponse(hintsUsed, maxHints, parsedGameState, openaiError);
    }

  } catch (error) {
    console.error('❌ Hint API error:', error);
    return NextResponse.json({
      success: false,
      hintsUsed: 0,
      hintsRemaining: 5,
      message: 'Sorry, the hint system is temporarily unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as HintResponse, { status: 500 });
  }
}

function createFallbackResponse(hintsUsed: number, maxHints: number, gameState: any, error?: any): NextResponse {
  console.log('🔄 Creating fallback response...');
  
  // Simple local analysis
  const foundationCards = Object.values(gameState?.foundations || {}).reduce(
    (sum: number, foundation: any) => sum + (foundation?.cards?.length || 0), 0
  );
  
  const stockCards = gameState?.stock?.cards?.length || 0;
  const progress = foundationCards / 52;
  
  let suggestion = "Look for Aces to start foundation piles";
  if (foundationCards > 13) {
    suggestion = "Continue building foundation piles with the next rank in sequence";
  } else if (stockCards > 0) {
    suggestion = "Draw cards from the stock pile to reveal new options";
  }

  const fallbackResponse: HintResponse = {
    success: true,
    move: {
      description: suggestion,
      reasoning: "Local analysis suggestion"
    },
    analysis: {
      winProbability: `${Math.round(progress * 100)}% complete`,
      deadlockRisk: progress > 0.5 ? 'low' : 'medium',
      strategicInsight: `You've placed ${foundationCards} out of 52 cards. Keep building foundation piles!`
    },
    hintsUsed: hintsUsed + 1,
    hintsRemaining: maxHints - (hintsUsed + 1),
    message: '🔧 Local analysis (AI temporarily unavailable)',
    error: error ? `AI Error: ${error.message}` : 'OpenAI API not available'
  };

  return NextResponse.json(fallbackResponse);
}

function extractMoveFromText(text: string): string {
  // Simple text parsing for move suggestions
  const movePatterns = [
    /move.*?([AKQJ\d]+.*?(?:♠︎|♥︎|♦︎|♣︎)).*?(?:foundation|tableau)/i,
    /place.*?([AKQJ\d]+.*?(?:♠︎|♥︎|♦︎|♣︎))/i,
    /(draw.*?(?:from|cards?).*?stock)/i,
    /(foundation|tableau).*?move/i
  ];

  for (const pattern of movePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // Fallback suggestions
  if (text.toLowerCase().includes('draw')) {
    return "Draw cards from the stock pile";
  }
  if (text.toLowerCase().includes('foundation')) {
    return "Look for cards that can move to foundation piles";
  }
  if (text.toLowerCase().includes('king')) {
    return "Move Kings to empty tableau spaces";
  }

  return "Continue exploring moves - look for foundation plays first";
} 