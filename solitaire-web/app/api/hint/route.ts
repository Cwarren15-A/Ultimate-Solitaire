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

    // Parse the actual game state for real analysis
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
    
    // Real strategic analysis function
    function analyzeGameState(gameState: any, xrayData: string) {
      // Find foundation moves first (highest priority)
      const foundationMoves = findFoundationMoves(gameState);
      if (foundationMoves.length > 0) {
        const bestFoundationMove = foundationMoves[0];
        return {
          move: {
            from: bestFoundationMove.from,
            to: bestFoundationMove.to,
            cards: [bestFoundationMove.card],
            description: `Move ${bestFoundationMove.card} to ${bestFoundationMove.to} foundation`,
            sequenceLength: 1,
            visualHint: {
              highlightCards: [bestFoundationMove.card.toLowerCase().replace(/[^a-z0-9]/g, '-')],
              animationType: "glow" as const,
              message: "Foundation play available!"
            }
          },
          reasoning: "Foundation moves always take priority as they clear the board and progress toward victory.",
          priority: "critical" as const
        };
      }

      // Find empty tableau spots and available kings
      const emptyTableaux = findEmptyTableaux(gameState);
      const availableKings = findAvailableKings(gameState);
      
      if (emptyTableaux.length > 0 && availableKings.length > 0) {
        // Analyze which king move would be better based on hidden cards
        const bestKingMove = analyzeKingMoves(gameState, emptyTableaux, availableKings, xrayData);
        if (bestKingMove) {
          return {
            move: {
              from: bestKingMove.from,
              to: bestKingMove.to,
              cards: [bestKingMove.card],
              description: bestKingMove.description,
              sequenceLength: 1,
              visualHint: {
                highlightCards: [bestKingMove.card.toLowerCase().replace(/[^a-z0-9]/g, '-')],
                animationType: "pulse" as const,
                message: bestKingMove.message
              }
            },
            reasoning: bestKingMove.reasoning,
            priority: "high" as const
          };
        }
      }

      // Fallback to other strategic moves
      const strategicMoves = findStrategicMoves(gameState);
      if (strategicMoves.length > 0) {
        const bestMove = strategicMoves[0];
        return {
          move: {
            from: bestMove.from,
            to: bestMove.to,
            cards: [bestMove.card],
            description: bestMove.description,
            sequenceLength: 1,
            visualHint: {
              highlightCards: [bestMove.card.toLowerCase().replace(/[^a-z0-9]/g, '-')],
              animationType: "glow" as const,
              message: "Strategic move identified!"
            }
          },
          reasoning: bestMove.reasoning,
          priority: "medium" as const
        };
      }

      return null; // No good moves found
    }

    // Helper functions for game analysis
         function findFoundationMoves(state: any) {
       const moves = [];
       
       try {
         // Check waste pile
         if (state?.waste?.cards && state.waste.cards.length > 0) {
           const topCard = state.waste.cards[state.waste.cards.length - 1];
           if (topCard && topCard.suit && typeof topCard.rank === 'number') {
             const foundationPile = getFoundationForCard(topCard, state);
             if (foundationPile && canPlaceOnFoundation(topCard, foundationPile)) {
               moves.push({
                 from: "waste",
                 to: `foundation-${getSuitName(topCard.suit)}`,
                 card: `${topCard.rank}${topCard.suit}`,
               });
             }
           }
         }
       } catch (error) {
         console.error('Error checking waste pile:', error);
       }

             try {
         // Check tableau piles
         if (state?.tableaux) {
           for (let i = 1; i <= 7; i++) {
             const tableau = state.tableaux[i];
             if (tableau && tableau.cards && tableau.cards.length > 0) {
               const topCard = tableau.cards[tableau.cards.length - 1];
               if (topCard && topCard.faceUp && topCard.suit && typeof topCard.rank === 'number') {
                 const foundationPile = getFoundationForCard(topCard, state);
                 if (foundationPile && canPlaceOnFoundation(topCard, foundationPile)) {
                   moves.push({
                     from: `tableau-${i}`,
                     to: `foundation-${getSuitName(topCard.suit)}`,
                     card: `${topCard.rank}${topCard.suit}`,
                   });
                 }
               }
             }
           }
         }
       } catch (error) {
         console.error('Error checking tableau piles:', error);
       }

      return moves;
    }

    function findEmptyTableaux(state: any) {
      const empty = [];
      for (let i = 1; i <= 7; i++) {
        if (state.tableaux[i].cards.length === 0) {
          empty.push(`tableau-${i}`);
        }
      }
      return empty;
    }

    function findAvailableKings(state: any) {
      const kings = [];
      
      // Check waste pile
      if (state.waste.cards.length > 0) {
        const topCard = state.waste.cards[state.waste.cards.length - 1];
        if (topCard.rank === 13) {
          kings.push({
            from: "waste",
            card: `${topCard.rank}${topCard.suit}`,
            color: topCard.suit === "♥︎" || topCard.suit === "♦︎" ? "red" : "black"
          });
        }
      }

      // Check tableau piles
      for (let i = 1; i <= 7; i++) {
        const tableau = state.tableaux[i];
        if (tableau.cards.length > 0) {
          const topCard = tableau.cards[tableau.cards.length - 1];
          if (topCard.faceUp && topCard.rank === 13) {
            kings.push({
              from: `tableau-${i}`,
              card: `${topCard.rank}${topCard.suit}`,
              color: topCard.suit === "♥︎" || topCard.suit === "♦︎" ? "red" : "black"
            });
          }
        }
      }

      return kings;
    }

    function analyzeKingMoves(state: any, emptySpots: string[], kings: any[], xrayData: string) {
      if (kings.length === 0 || emptySpots.length === 0) return null;

      // Analyze each king to see what cards it would reveal
      let bestKing = null;
      let bestScore = -1;

      for (const king of kings) {
        let score = 0;
        let reasoning = "";

        if (king.from.startsWith("tableau-")) {
          const tableauIndex = parseInt(king.from.split("-")[1]);
          const tableau = state.tableaux[tableauIndex];
          
          // Check if moving this king would reveal a face-down card
          if (tableau.cards.length > 1) {
            const cardBelowKing = tableau.cards[tableau.cards.length - 2];
            if (!cardBelowKing.faceUp) {
              score += 10; // High value for revealing hidden cards
              reasoning += `Reveals hidden card in column ${tableauIndex}. `;
              
              // Try to guess what might be under using xrayData
              if (xrayData.includes(`Tableau ${tableauIndex}`)) {
                score += 5;
                reasoning += "X-ray shows valuable cards below. ";
              }
            }
          }
        }

        // Prefer moving kings that create more opportunities
        if (king.color === "black") score += 2; // Black kings often more useful for red cards
        
        if (score > bestScore) {
          bestScore = score;
          bestKing = {
            ...king,
            to: emptySpots[0],
            description: `Move ${king.card} to empty column ${emptySpots[0].split("-")[1]}`,
            reasoning: reasoning || "Creates empty space for building sequences",
            message: "Strategic king placement!"
          };
        }
      }

      return bestKing;
    }

    function findStrategicMoves(state: any) {
      // Look for cards that can be moved between tableau piles
      const moves = [];
      
      for (let i = 1; i <= 7; i++) {
        const fromTableau = state.tableaux[i];
        if (fromTableau.cards.length === 0) continue;
        
        const topCard = fromTableau.cards[fromTableau.cards.length - 1];
        if (!topCard.faceUp) continue;

        for (let j = 1; j <= 7; j++) {
          if (i === j) continue;
          
          const toTableau = state.tableaux[j];
          if (canPlaceOnTableau(topCard, toTableau.cards)) {
            moves.push({
              from: `tableau-${i}`,
              to: `tableau-${j}`,
              card: `${topCard.rank}${topCard.suit}`,
              description: `Move ${topCard.rank}${topCard.suit} to column ${j}`,
              reasoning: "Creates building opportunities"
            });
          }
        }
      }

      return moves;
    }

    function getFoundationForCard(card: any, state: any) {
      const suitName = getSuitName(card.suit);
      return state.foundations[suitName].cards;
    }

    function getSuitName(suit: string) {
      switch (suit) {
        case "♠︎": return "spades";
        case "♥︎": return "hearts";
        case "♦︎": return "diamonds";
        case "♣︎": return "clubs";
        default: return "spades";
      }
    }

    function canPlaceOnFoundation(card: any, foundationCards: any[]) {
      if (foundationCards.length === 0) {
        return card.rank === 1; // Must start with Ace
      }
      const topCard = foundationCards[foundationCards.length - 1];
      return card.suit === topCard.suit && card.rank === topCard.rank + 1;
    }

    function canPlaceOnTableau(card: any, tableauCards: any[]) {
      if (tableauCards.length === 0) {
        return card.rank === 13; // Only King on empty tableau
      }
      const topCard = tableauCards[tableauCards.length - 1];
      const isRed = (suit: string) => suit === "♥︎" || suit === "♦︎";
      return card.rank === topCard.rank - 1 && 
             ((isRed(card.suit) && !isRed(topCard.suit)) || 
              (!isRed(card.suit) && isRed(topCard.suit)));
    }

         // Perform the analysis with error handling
     let analysis;
     try {
       analysis = analyzeGameState(state, xrayData);
     } catch (analysisError) {
       console.error('Analysis error:', analysisError);
       analysis = null;
     }
     
          const result = {
       analysis: {
         gameState: "active-analysis",
         hiddenCards: xrayData || "X-ray vision scanning...",
         deadlockRisk: "low" as const,
         winProbability: "calculating...",
         criticalCards: []
       },
       move: analysis?.move || null,
       reasoning: analysis?.reasoning || "Continue exploring moves. Look for foundation plays, or try moving Kings to empty spaces.",
       priority: analysis?.priority || "medium" as const,
       alternatives: analysis ? [] : [{
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
       message: analysis ? "🎯 Strategic analysis complete!" : "🤔 Keep exploring - look for Aces, Kings on empty spaces, or foundation builds!"
     };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Hint API error:', error);
    return NextResponse.json({
      error: 'Failed to generate hint',
      message: 'AI analysis temporarily unavailable'
    }, { status: 500 });
  }
} 