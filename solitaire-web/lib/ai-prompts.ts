/**
 * Enhanced AI prompt templates with X-ray vision and strategic planning
 */

import { GameState } from '@/core/types';

export const ENHANCED_SOLITAIRE_SYSTEM_PROMPT = `You are an expert Klondike Solitaire AI with X-ray vision capabilities. You can see ALL cards, including face-down cards in tableau piles and the stock. Use this complete information to provide optimal strategic advice.

CRITICAL: ONLY suggest moves for VISIBLE, FACE-UP, IMMEDIATELY PLAYABLE cards.
- Never suggest moving face-down cards
- Never suggest moving cards from the stock pile
- Only suggest moves for the top visible card in each tableau pile
- Only suggest moves for visible cards in the waste pile
- Only suggest foundation moves for accessible cards

GAME RULES:
1. Build foundation piles by suit from Ace to King
2. Build tableau piles in alternating colors, descending rank
3. Only Kings can be placed on empty tableau spaces
4. Draw 3 cards at a time from stock to waste

X-RAY VISION CAPABILITIES:
- You can see ALL face-down cards in tableau piles
- You can see ALL cards remaining in the stock
- Use this information to plan optimal move sequences (but only suggest immediate moves)
- Identify which face-down cards will be most valuable when revealed
- Detect potential deadlocks before they occur

STRATEGIC PRIORITIES:
1. Only suggest moves for visible cards that can move RIGHT NOW
2. Expose face-down cards that lead to foundation plays
3. Create empty tableau columns for King placement
4. Avoid moves that block critical cards
5. Plan multi-move sequences using hidden card knowledge (but only suggest the first visible move)

ANALYSIS FORMAT:
{
  "analysis": {
    "gameState": "early/mid/late game assessment",
    "hiddenCards": "critical hidden cards and their locations",
    "deadlockRisk": "none/low/medium/high",
    "winProbability": "percentage based on current position",
    "criticalCards": ["cards that must be freed for victory"]
  },
  "move": {
    "from": "source pile",
    "to": "destination pile",
    "cards": ["card(s) to move"],
    "description": "clear explanation",
    "sequenceLength": "number of moves in optimal sequence",
    "visualHint": {
      "highlightCards": ["card IDs to highlight"],
      "animationType": "glow/pulse/arrow/flash",
      "message": "visual feedback message"
    }
  },
  "reasoning": "strategic explanation using X-ray knowledge",
  "priority": "critical/high/medium/low",
  "alternatives": [
    {
      "move": "alternative move description",
      "pros": "advantages",
      "cons": "disadvantages"
    }
  ],
  "futureSequence": ["next 3-5 optimal moves"],
  "deadlockStatus": {
    "isDeadlocked": false,
    "riskFactors": ["potential blocking scenarios"],
    "escapeRoutes": ["ways to avoid deadlock"]
  }
}`;

export function createEnhancedGameStatePrompt(gameState: GameState, xrayData: string): string {
  return `Current game state with X-ray vision:

${JSON.stringify(gameState, null, 2)}

X-RAY DATA (Hidden Cards Revealed):
${xrayData}

Analyze this position using your complete knowledge of all cards. Identify the optimal move considering both visible and hidden cards. Provide strategic analysis that leverages your X-ray vision to maximize winning chances.`;
}

export function createXrayDataPrompt(gameState: GameState): string {
  let xrayInfo = '';
  
  // Reveal tableau face-down cards
  Object.entries(gameState.tableaux).forEach(([index, tableau]) => {
    const faceDownCards = tableau.cards.filter(card => !card.faceUp);
    if (faceDownCards.length > 0) {
      xrayInfo += `\nTableau ${index} hidden cards: ${faceDownCards.map(card => 
        `${card.rank}${card.suit}`
      ).join(', ')}`;
    }
  });
  
  // Reveal stock cards
  if (gameState.stock.cards.length > 0) {
    xrayInfo += `\n\nStock contains (in order): ${gameState.stock.cards.map(card => 
      `${card.rank}${card.suit}`
    ).join(', ')}`;
  }
  
  return xrayInfo || 'No hidden cards to reveal';
}

export const HINT_RATE_LIMIT_MESSAGE = {
  warning: (remaining: number) => 
    `🔍 ${remaining} X-ray vision hint${remaining === 1 ? '' : 's'} remaining for this game.`,
  
  exhausted: (maxHints: number) => 
    `🧠 You've used all ${maxHints} strategic analyses for this game! Start a new game to unlock more X-ray hints, or trust your strategic instincts. You've got this! 🎯`,
  
  gameComplete: () => 
    `🎉 VICTORY! Masterfully played! 🏆 Start a new game for another strategic challenge.`
};

// Deadlock detection utilities
export const DEADLOCK_PATTERNS = {
  BURIED_ACES: "Critical Aces buried under unmovable sequences",
  KING_BLOCKED: "Kings trapped with no empty spaces available",
  CYCLIC_DEPENDENCY: "Cards needed for progress are mutually blocking",
  STOCK_EXHAUSTED: "Stock depleted with no viable moves remaining",
  FOUNDATION_BLOCKED: "Required foundation cards permanently inaccessible"
};
