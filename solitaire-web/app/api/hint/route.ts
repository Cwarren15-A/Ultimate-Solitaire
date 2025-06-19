import { NextRequest, NextResponse } from 'next/server';
import { ENHANCED_SOLITAIRE_SYSTEM_PROMPT, createEnhancedGameStatePrompt, HINT_RATE_LIMIT_MESSAGE } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameState, xrayData, moveHistory, hintsUsed, maxHints, enhanced } = body;

    // Rate limiting check
    if (hintsUsed >= maxHints) {
      return NextResponse.json({
        error: HINT_RATE_LIMIT_MESSAGE.exhausted(maxHints),
        hintsUsed,
        hintsRemaining: 0,
        suggestNewGame: true
      }, { status: 429 });
    }

    // For now, return a mock strategic response until AI integration is set up
    const mockHint = {
      analysis: {
        gameState: "mid-game",
        hiddenCards: xrayData || "X-ray vision active",
        deadlockRisk: "low" as const,
        winProbability: "75%",
        criticalCards: ["Ace of Spades", "King of Hearts"]
      },
      move: {
        from: "waste",
        to: "foundation-spades", 
        cards: ["Ace of Spades"],
        description: "Move Ace of Spades to foundation to start building the spades suit",
        sequenceLength: 1,
        visualHint: {
          highlightCards: ["ace-spades"],
          animationType: "glow" as const,
          message: "Foundation play available!"
        }
      },
      reasoning: "Moving the Ace to foundation opens up strategic options and begins foundation building. This is typically the highest priority move in solitaire.",
      priority: "high" as const,
      alternatives: [
        {
          move: "Move King to empty tableau column",
          pros: "Creates space for building sequences",
          cons: "May not be immediately beneficial"
        }
      ],
      futureSequence: [
        "Move 2 of Spades to foundation",
        "Move 3 of Spades to foundation", 
        "Look for red cards to place on black cards in tableau"
      ],
      deadlockStatus: {
        isDeadlocked: false,
        riskFactors: [],
        escapeRoutes: ["Multiple foundation plays available", "Several tableau moves possible"]
      },
      hintsUsed: hintsUsed + 1,
      hintsRemaining: maxHints - (hintsUsed + 1),
      xrayEnabled: true,
      message: "🔍 X-ray vision analysis complete! Optimal move identified."
    };

    return NextResponse.json(mockHint);

  } catch (error) {
    console.error('Hint API error:', error);
    return NextResponse.json({
      error: 'Failed to generate hint',
      message: 'AI analysis temporarily unavailable'
    }, { status: 500 });
  }
} 