import { NextRequest, NextResponse } from 'next/server';
import { ENHANCED_SOLITAIRE_SYSTEM_PROMPT, createEnhancedGameStatePrompt, HINT_RATE_LIMIT_MESSAGE } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  console.log('🚀 Hint API endpoint called!');
  
  try {
    const body = await request.json();
    const { gameState, xrayData, moveHistory, hintsUsed, maxHints, enhanced } = body;
    
    console.log('📦 Request body received:', { 
      gameStateLength: gameState?.length, 
      hintsUsed, 
      maxHints 
    });

    // Rate limiting check
    if (hintsUsed >= maxHints) {
      return NextResponse.json({
        error: HINT_RATE_LIMIT_MESSAGE.exhausted(maxHints),
        hintsUsed,
        hintsRemaining: 0,
        suggestNewGame: true
      }, { status: 429 });
    }

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 OpenAI API key check:', {
      hasKey: !!openaiApiKey,
      keyLength: openaiApiKey?.length || 0,
      keyStart: openaiApiKey?.substring(0, 7) || 'none'
    });
    
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found in environment variables');
      return NextResponse.json({
        error: 'AI service unavailable',
        message: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    // Parse the actual game state for OpenAI analysis
    let state;
    try {
      state = JSON.parse(gameState);
    } catch (parseError) {
      console.error('Failed to parse game state:', parseError);
      return NextResponse.json({
        error: 'Invalid game state data',
        message: 'Could not parse game state'
      }, { status: 400 });
    }

    // Create the prompt for OpenAI
    const prompt = createEnhancedGameStatePrompt(gameState, xrayData);
    
    console.log('🤖 Making OpenAI API call to o4-mini...');
    console.log('📝 Prompt length:', prompt.length);
    
    // Call OpenAI o4-mini API
    try {
      console.log('🌐 Sending request to OpenAI...');
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'o4-mini', // Using o4-mini model as requested
          messages: [
            {
              role: 'system',
              content: ENHANCED_SOLITAIRE_SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_completion_tokens: 5000, // Fixed parameter name for o4-mini model
          // temperature: removed - o4-mini only supports default (1)
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const openaiData = await openaiResponse.json();
      console.log('OpenAI API call successful, usage:', openaiData.usage);
      
      // Parse the OpenAI response
      const aiAnalysis = openaiData.choices[0]?.message?.content;
      if (!aiAnalysis) {
        throw new Error('No analysis returned from OpenAI');
      }

      // Try to parse structured response from AI
      let parsedAnalysis;
      try {
        // Look for JSON in the response
        const jsonMatch = aiAnalysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.log('Could not parse structured response, using text analysis');
      }

      // Helper function to extract move from text if structured parsing fails
      function extractMoveFromText(text: string) {
        // Simple pattern matching for common moves
        const foundationMatch = text.match(/move.*?([AKQ\d]+[♠♥♦♣︎]+).*?foundation/i);
        const tableauMatch = text.match(/move.*?([AKQ\d]+[♠♥♦♣︎]+).*?(column|tableau).*?(\d+)/i);
        
        if (foundationMatch) {
          return {
            from: "detected",
            to: "foundation", 
            cards: [foundationMatch[1]],
            description: `Move ${foundationMatch[1]} to foundation`,
            sequenceLength: 1,
            visualHint: {
              highlightCards: [foundationMatch[1].toLowerCase()],
              animationType: "glow" as const,
              message: "AI suggests foundation move!"
            }
          };
        }
        
        if (tableauMatch) {
          return {
            from: "detected",
            to: `tableau-${tableauMatch[3]}`,
            cards: [tableauMatch[1]],
            description: `Move ${tableauMatch[1]} to column ${tableauMatch[3]}`,
            sequenceLength: 1,
            visualHint: {
              highlightCards: [tableauMatch[1].toLowerCase()],
              animationType: "pulse" as const,
              message: "AI suggests tableau move!"
            }
          };
        }
        
        return null;
      }

      // Build response with AI analysis
      const result = {
        analysis: {
          gameState: "ai-analyzed",
          hiddenCards: xrayData || "AI analysis complete",
          deadlockRisk: parsedAnalysis?.deadlockRisk || "low" as const,
          winProbability: parsedAnalysis?.winProbability || "Good",
          criticalCards: parsedAnalysis?.criticalCards || []
        },
        move: parsedAnalysis?.move || extractMoveFromText(aiAnalysis),
        reasoning: parsedAnalysis?.reasoning || aiAnalysis.substring(0, 200) + "...",
        priority: parsedAnalysis?.priority || "medium" as const,
        alternatives: parsedAnalysis?.alternatives || [],
        futureSequence: parsedAnalysis?.futureSequence || [],
        deadlockStatus: {
          isDeadlocked: parsedAnalysis?.deadlockStatus?.isDeadlocked || false,
          riskFactors: parsedAnalysis?.deadlockStatus?.riskFactors || [],
          escapeRoutes: parsedAnalysis?.deadlockStatus?.escapeRoutes || []
        },
        hintsUsed: hintsUsed + 1,
        hintsRemaining: maxHints - (hintsUsed + 1),
        xrayEnabled: true,
        message: "🤖 AI analysis complete!"
      };

      return NextResponse.json(result);

    } catch (openaiError) {
      console.error('OpenAI request failed:', openaiError);
      
      // Fallback to local analysis if OpenAI fails
      const fallbackResult = {
        analysis: {
          gameState: "local-fallback",
          hiddenCards: xrayData || "Local analysis",
          deadlockRisk: "low" as const,
          winProbability: "Unknown",
          criticalCards: []
        },
        move: null,
        reasoning: "Continue exploring moves. Look for foundation plays, or try moving Kings to empty spaces.",
        priority: "medium" as const,
        alternatives: [{
          move: "Try drawing from stock",
          pros: "Reveals new cards to play",
          cons: "May cycle through deck without progress"
        }],
        futureSequence: [],
        deadlockStatus: {
          isDeadlocked: false,
          riskFactors: [],
          escapeRoutes: ["Try different card combinations", "Look for hidden opportunities"]
        },
        hintsUsed: hintsUsed + 1,
        hintsRemaining: maxHints - (hintsUsed + 1),
        xrayEnabled: true,
        message: "⚠️ Using local analysis (OpenAI unavailable)",
        error: `OpenAI error: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`
      };
      
      return NextResponse.json(fallbackResult);
    }

  } catch (error) {
    console.error('Hint API error:', error);
    return NextResponse.json({
      error: 'Failed to generate hint',
      message: 'AI analysis temporarily unavailable'
    }, { status: 500 });
  }
} 