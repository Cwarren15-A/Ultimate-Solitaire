/**
 * Enhanced AI prompt templates with X-ray vision and strategic planning
 */

import { GameState } from '@/core/types';

export const QUICK_SOLITAIRE_SYSTEM_PROMPT = `You are a Solitaire AI. Give short, direct advice.

RULES:
- Only suggest moves for visible, face-up cards
- Foundation moves: Ace to King by suit
- Tableau moves: alternating colors, descending rank
- Kings only on empty tableau spaces

Give ONE specific move suggestion or "Draw from stock".

Return JSON: {"move": "description", "priority": "high/medium/low"}`;

export const ENHANCED_SOLITAIRE_SYSTEM_PROMPT = `You are an expert Klondike Solitaire strategist with perfect game knowledge. 

ANALYZE the current position and provide strategic guidance:

1. IDENTIFY the best move considering:
   - Foundation building opportunities 
   - Tableau sequence development
   - Hidden card exposure potential
   - Deadlock prevention

2. EVALUATE position strength:
   - Win probability assessment
   - Critical blocking factors
   - Key strategic cards

3. PROVIDE specific, actionable advice in JSON format:

{
  "recommended_move": {
    "description": "Clear, specific move instruction",
    "priority": "critical|high|medium|low",
    "reasoning": "Why this move is optimal"
  },
  "position_analysis": {
    "win_probability": "percentage or descriptive assessment",
    "deadlock_risk": "none|low|medium|high",
    "key_factors": ["factor1", "factor2"]
  },
  "strategic_insight": "Advanced tactical advice",
  "alternatives": [
    {
      "move": "Alternative option",
      "pros": "Benefits",
      "cons": "Drawbacks"
    }
  ]
}

Focus on practical, immediately useful guidance.`;

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
