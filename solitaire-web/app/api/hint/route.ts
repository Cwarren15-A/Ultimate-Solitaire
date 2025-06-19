import { NextRequest, NextResponse } from 'next/server';
import { QUICK_SOLITAIRE_SYSTEM_PROMPT, ENHANCED_SOLITAIRE_SYSTEM_PROMPT, createEnhancedGameStatePrompt, HINT_RATE_LIMIT_MESSAGE } from '@/lib/ai-prompts';

export async function POST(request: NextRequest) {
  console.log('🚀 Hint API endpoint called!');
  
  try {
    const body = await request.json();
    const { gameState, xrayData, moveHistory, hintsUsed, maxHints, enhanced = false } = body;
    
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
    let state: any;
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
          model: 'o4-mini',
          messages: [
            {
              role: 'system',
              content: enhanced ? ENHANCED_SOLITAIRE_SYSTEM_PROMPT : QUICK_SOLITAIRE_SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: enhanced 
                ? `Current game state:\n${gameState.substring(0, 1000)}\n\nProvide comprehensive analysis.`
                : `Game: ${gameState.substring(0, 500)}... Give ONE move.`
            }
          ],
          max_completion_tokens: enhanced ? 800 : 100, // More tokens for enhanced analysis
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

      // Validate if a suggested move is actually possible
      function validateMove(gameState: any, move: any): boolean {
        if (!move || !move.cards || move.cards.length === 0) {
          return false;
        }
        
        const cardToMove = move.cards[0];
        console.log('🔍 Validating move for card:', cardToMove);
        
        // Check if card is visible in waste pile
        if (gameState.waste && gameState.waste.cards && gameState.waste.cards.length > 0) {
          const topWasteCard = gameState.waste.cards[gameState.waste.cards.length - 1];
          const wasteCardName = `${topWasteCard.rank}${topWasteCard.suit}`;
          if (wasteCardName === cardToMove || cardToMove.includes(topWasteCard.rank)) {
            console.log('✅ Card found in waste pile');
            return true;
          }
        }
        
        // Check if card is visible at top of tableau piles
        for (const [index, tableau] of Object.entries(gameState.tableaux || {})) {
          const tableauPile = tableau as any;
          if (tableauPile.cards && tableauPile.cards.length > 0) {
            const topCard = tableauPile.cards[tableauPile.cards.length - 1];
            if (topCard.faceUp) {
              const tableauCardName = `${topCard.rank}${topCard.suit}`;
              if (tableauCardName === cardToMove || cardToMove.includes(topCard.rank)) {
                console.log('✅ Card found in tableau pile', index);
                return true;
              }
            }
          }
        }
        
        console.log('❌ Card not found or not visible');
        return false;
      }

      // Find actual available moves in the game state
      function findActualMoves(gameState: any) {
        const availableMoves = [];
        
        // Check waste pile to foundation moves
        if (gameState.waste && gameState.waste.cards && gameState.waste.cards.length > 0) {
          const topWasteCard = gameState.waste.cards[gameState.waste.cards.length - 1];
          const wasteCardName = `${topWasteCard.rank}${topWasteCard.suit}`;
          
          // Check if waste card can go to foundation
          const suitFoundation = gameState.foundations[topWasteCard.suit.toLowerCase()];
          if (canPlaceOnFoundation(topWasteCard, suitFoundation)) {
            availableMoves.push({
              from: "waste",
              to: "foundation",
              cards: [wasteCardName],
              description: `Move ${wasteCardName} from waste to foundation`,
              priority: "high"
            });
          }
        }
        
        // Check tableau top cards to foundation moves
        Object.entries(gameState.tableaux).forEach(([index, tableau]: [string, any]) => {
          if (tableau.cards && tableau.cards.length > 0) {
            const topCard = tableau.cards[tableau.cards.length - 1];
            if (topCard.faceUp) {
              const cardName = `${topCard.rank}${topCard.suit}`;
              const suitFoundation = gameState.foundations[topCard.suit.toLowerCase()];
              
              if (canPlaceOnFoundation(topCard, suitFoundation)) {
                availableMoves.push({
                  from: `tableau-${index}`,
                  to: "foundation",
                  cards: [cardName],
                  description: `Move ${cardName} from column ${parseInt(index) + 1} to foundation`,
                  priority: "high"
                });
              }
            }
          }
        });
        
        // Check waste to tableau moves
        if (gameState.waste && gameState.waste.cards && gameState.waste.cards.length > 0) {
          const topWasteCard = gameState.waste.cards[gameState.waste.cards.length - 1];
          const wasteCardName = `${topWasteCard.rank}${topWasteCard.suit}`;
          
          Object.entries(gameState.tableaux).forEach(([index, tableau]: [string, any]) => {
            if (canPlaceOnTableau(topWasteCard, tableau)) {
              availableMoves.push({
                from: "waste",
                to: `tableau-${index}`,
                cards: [wasteCardName],
                description: `Move ${wasteCardName} from waste to column ${parseInt(index) + 1}`,
                priority: "medium"
              });
            }
          });
        }
        
        // If no moves found, suggest drawing from stock
        if (availableMoves.length === 0 && gameState.stock && gameState.stock.cards.length > 0) {
          availableMoves.push({
            from: "stock",
            to: "waste",
            cards: ["draw"],
            description: "Draw cards from stock pile",
            priority: "low"
          });
        }
        
        console.log('🎯 Found available moves:', availableMoves);
        return availableMoves;
      }
      
      function canPlaceOnFoundation(card: any, foundation: any) {
        if (!foundation || !foundation.cards) return false;
        
        // Aces can go on empty foundations
        if (foundation.cards.length === 0) {
          return card.rank === 1; // Ace
        }
        
        // Other cards must follow suit and be next in sequence
        const topFoundationCard = foundation.cards[foundation.cards.length - 1];
        return topFoundationCard.suit === card.suit && 
               topFoundationCard.rank === card.rank - 1;
      }
      
      function canPlaceOnTableau(card: any, tableau: any) {
        if (!tableau || !tableau.cards) return true; // Can place King on empty tableau
        
        if (tableau.cards.length === 0) {
          return card.rank === 13; // Only Kings on empty tableaux
        }
        
        const topTableauCard = tableau.cards[tableau.cards.length - 1];
        if (!topTableauCard.faceUp) return false;
        
        // Must be opposite color and one rank lower
        const cardColor = (card.suit === '♠︎' || card.suit === '♣︎') ? 'black' : 'red';
        const tableauColor = (topTableauCard.suit === '♠︎' || topTableauCard.suit === '♣︎') ? 'black' : 'red';
        
        return cardColor !== tableauColor && topTableauCard.rank === card.rank + 1;
      }

      // Helper function to extract move from text if structured parsing fails
      function extractMoveFromText(text: string) {
        // First try to find actual available moves
        const actualMoves = findActualMoves(state);
        if (actualMoves.length > 0) {
          const bestMove = actualMoves.sort((a, b) => {
            const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
            return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
          })[0];
          
          return {
            from: bestMove.from,
            to: bestMove.to,
            cards: bestMove.cards,
            description: bestMove.description,
            sequenceLength: 1,
            visualHint: {
              highlightCards: bestMove.cards.map(c => c.toLowerCase()),
              animationType: bestMove.priority === 'high' ? "glow" as const : "pulse" as const,
              message: `AI found: ${bestMove.description}`
            }
          };
        }
        
        // Fallback to text parsing
        const foundationMatch = text.match(/move.*?([AKQ\d]+[♠♥♦♣︎]+).*?foundation/i);
        const tableauMatch = text.match(/move.*?([AKQ\d]+[♠♥♦♣︎]+).*?(column|tableau).*?(\d+)/i);
        
        if (foundationMatch && validateMove(gameState, { cards: [foundationMatch[1]] })) {
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
        
        if (tableauMatch && validateMove(gameState, { cards: [tableauMatch[1]] })) {
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

      // Prioritize actual moves over AI confusion
      const actualMoves = findActualMoves(state);
      const bestMove = actualMoves.length > 0 ? actualMoves.sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
      })[0] : null;

      const move = bestMove ? {
        from: bestMove.from,
        to: bestMove.to,
        cards: bestMove.cards,
        description: bestMove.description,
        sequenceLength: 1,
        visualHint: {
          highlightCards: bestMove.cards.map((c: string) => c.toLowerCase()),
          animationType: bestMove.priority === 'high' ? "glow" as const : "pulse" as const,
          message: bestMove.description
        }
      } : null;

      // Build simplified response
      const result = {
        analysis: {
          gameState: "simplified",
          hiddenCards: "Quick analysis",
          deadlockRisk: "low" as const,
          winProbability: actualMoves.length > 0 ? "Good" : "Limited",
          criticalCards: []
        },
        move,
        reasoning: bestMove ? bestMove.description : "Try drawing from stock or look for different moves.",
        priority: bestMove?.priority || "medium" as const,
        alternatives: [],
        futureSequence: [],
        deadlockStatus: {
          isDeadlocked: false,
          riskFactors: [],
          escapeRoutes: []
        },
        hintsUsed: hintsUsed + 1,
        hintsRemaining: maxHints - (hintsUsed + 1),
        xrayEnabled: true,
        message: "⚡ Quick hint!"
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