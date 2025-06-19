/**
 * Enhanced AI-powered hint system with X-ray vision and visual effects
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { serializeGameState } from '@/core/serialize';
import { GameState } from '@/core/types';
import { analytics } from './analytics';
import { createXrayDataPrompt } from './ai-prompts';

export interface EnhancedHintResponse {
  analysis: {
    gameState: string;
    hiddenCards: string;
    deadlockRisk: 'none' | 'low' | 'medium' | 'high';
    winProbability: string;
    criticalCards: string[];
  };
  move: {
    from: string;
    to: string;
    cards: string[];
    description: string;
    sequenceLength: number;
    visualHint: {
      highlightCards: string[];
      animationType: 'glow' | 'pulse' | 'arrow' | 'flash';
      message: string;
    };
  } | null;
  reasoning: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  alternatives: Array<{
    move: string;
    pros: string;
    cons: string;
  }>;
  futureSequence: string[];
  deadlockStatus: {
    isDeadlocked: boolean;
    riskFactors: string[];
    escapeRoutes: string[];
  };
  hintsUsed: number;
  hintsRemaining: number;
  xrayEnabled?: boolean;
  error?: string;
  message?: string;
  suggestNewGame?: boolean;
}

interface VisualEffect {
  cardIds: string[];
  animation: 'glow' | 'pulse' | 'arrow' | 'flash';
  message: string;
  duration: number;
}

interface UseEnhancedHintOptions {
  gameState: GameState;
  maxHints?: number;
  moveHistory?: string[];
  onHintReceived?: (hint: EnhancedHintResponse) => void;
  onVisualEffect?: (effect: VisualEffect) => void;
  onError?: (error: string) => void;
}

export function useEnhancedHint({
  gameState,
  maxHints = 5, // Increased for enhanced AI
  moveHistory = [],
  onHintReceived,
  onVisualEffect,
  onError
}: UseEnhancedHintOptions) {
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastHint, setLastHint] = useState<EnhancedHintResponse | null>(null);
  const [activeEffect, setActiveEffect] = useState<VisualEffect | null>(null);

  const canRequestHint = hintsUsed < maxHints;
  const hintsRemaining = maxHints - hintsUsed;

  // Query for getting enhanced hints with X-ray vision
  const {
    data: hintData,
    error: hintError,
    isFetching: isLoadingHint,
    refetch: fetchHint
  } = useQuery({
    queryKey: ['enhanced-hint', serializeGameState(gameState), hintsUsed],
    queryFn: async (): Promise<EnhancedHintResponse> => {
      console.log('🔍 useHint queryFn called');
      const xrayData = createXrayDataPrompt(gameState);
      
      const requestBody = {
        gameState: serializeGameState(gameState),
        xrayData,
        moveHistory,
        hintsUsed,
        maxHints,
        enhanced: true // Flag for enhanced AI
      };
      
      console.log('📤 Sending hint request:', {
        url: '/api/hint',
        bodyKeys: Object.keys(requestBody),
        gameStateLength: requestBody.gameState.length
      });
      
      const response = await fetch('/api/hint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📥 Hint response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ API error response:', errorData);
        throw new Error(errorData.error || 'Failed to get hint');
      }

      const responseData = await response.json();
      console.log('✅ API response data:', responseData);
      return responseData;
    },
    enabled: false,
    retry: 1,
    staleTime: 0,
  });

  const triggerVisualEffect = useCallback((effect: VisualEffect) => {
    setActiveEffect(effect);
    setIsAnimating(true);
    
    // Apply visual effects to card elements
    effect.cardIds.forEach(cardId => {
      const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
      if (cardElement) {
        // Remove any existing hint classes
        cardElement.classList.remove(
          'hint-glow', 'hint-pulse', 'hint-arrow', 'hint-flash',
          'hint-highlight-from', 'hint-highlight-to'
        );
        
        // Add new animation class
        cardElement.classList.add(`hint-${effect.animation}`);
      }
    });

    // Also highlight the source and destination piles
    const fromElement = document.querySelector(`[data-pile-id="${lastHint?.move?.from}"]`);
    const toElement = document.querySelector(`[data-pile-id="${lastHint?.move?.to}"]`);
    
    if (fromElement) fromElement.classList.add('hint-pile-from');
    if (toElement) toElement.classList.add('hint-pile-to');

    // Clean up after animation duration
    setTimeout(() => {
      effect.cardIds.forEach(cardId => {
        const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
          cardElement.classList.remove(`hint-${effect.animation}`);
        }
      });
      
      if (fromElement) fromElement.classList.remove('hint-pile-from');
      if (toElement) toElement.classList.remove('hint-pile-to');
      
      setIsAnimating(false);
      setActiveEffect(null);
    }, effect.duration);

    // Trigger callback
    onVisualEffect?.(effect);
  }, [lastHint, onVisualEffect]);

  const requestHint = useCallback(async () => {
    if (!canRequestHint) {
      onError?.('🧠 All hints used! Start a new game for more strategic insights.');
      return;
    }

    if (gameState.isComplete) {
      onError?.('🎉 Game completed! Start a new challenge to use hints again.');
      return;
    }

    try {
      console.log('🔄 Calling fetchHint...');
      const result = await fetchHint();
      console.log('📊 fetchHint result:', result);
      
      if (result.data) {
        const hint = result.data;
        console.log('🎯 Processing hint data:', hint);
        setHintsUsed(hint.hintsUsed);
        setLastHint(hint);
        
        // Track analytics with enhanced data
        analytics.hintRequested(hint.hintsUsed);
        
        // Call callback
        console.log('📞 Calling onHintReceived callback...');
        onHintReceived?.(hint);
        
        // Trigger visual effects if move is available
        if (hint.move && hint.move.visualHint) {
          const effect: VisualEffect = {
            cardIds: hint.move.visualHint.highlightCards,
            animation: hint.move.visualHint.animationType,
            message: hint.move.visualHint.message,
            duration: hint.move.visualHint.animationType === 'pulse' ? 3000 : 2000
          };
          
          console.log('🎨 Triggering visual effect:', effect);
          setTimeout(() => triggerVisualEffect(effect), 100);
        }
      } else {
        console.log('⚠️ No data in result:', result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get AI hint';
      onError?.(errorMessage);
      analytics.error('enhanced_hint_request_failed', { error: errorMessage });
    }
  }, [canRequestHint, gameState.isComplete, fetchHint, onHintReceived, onError, triggerVisualEffect]);

  const resetHints = useCallback(() => {
    setHintsUsed(0);
    setLastHint(null);
    setIsAnimating(false);
    setActiveEffect(null);
  }, []);

  const getDeadlockWarning = useCallback(() => {
    if (!lastHint) return null;
    
    const { deadlockStatus, analysis } = lastHint;
    
    if (deadlockStatus.isDeadlocked) {
      return {
        type: 'error' as const,
        message: '⚠️ DEADLOCK DETECTED: This game appears unwinnable. Consider starting fresh.',
        details: deadlockStatus.riskFactors
      };
    }
    
    if (analysis.deadlockRisk === 'high') {
      return {
        type: 'warning' as const,
        message: '🚨 HIGH DEADLOCK RISK: Be very careful with your next moves!',
        details: deadlockStatus.riskFactors
      };
    }
    
    return null;
  }, [lastHint]);

  const getStrategicInsight = useCallback(() => {
    if (!lastHint) return null;
    
    return {
      winProbability: lastHint.analysis.winProbability,
      criticalCards: lastHint.analysis.criticalCards,
      futureSequence: lastHint.futureSequence,
      alternatives: lastHint.alternatives
    };
  }, [lastHint]);

  return {
    // State
    hintsUsed,
    hintsRemaining,
    canRequestHint,
    isLoadingHint,
    isAnimating,
    lastHint,
    activeEffect,
    
    // Actions
    requestHint,
    resetHints,
    triggerVisualEffect,
    
    // Enhanced analysis
    getDeadlockWarning,
    getStrategicInsight,
    
    // Data
    hintData,
    hintError: hintError?.message || null,
  };
}

// Enhanced CSS classes for visual effects
export const enhancedHintAnimationStyles = `
  .hint-glow {
    @apply ring-4 ring-yellow-300 ring-opacity-90 shadow-lg shadow-yellow-300/50;
    animation: gentle-glow 2s ease-in-out;
  }
  
  .hint-pulse {
    @apply ring-4 ring-red-400 ring-opacity-90;
    animation: urgent-pulse 1s ease-in-out infinite;
  }
  
  .hint-flash {
    @apply ring-4 ring-green-400 ring-opacity-90;
    animation: success-flash 0.5s ease-in-out 3;
  }
  
  .hint-arrow {
    @apply ring-4 ring-blue-400 ring-opacity-90;
    animation: directional-hint 2s ease-in-out;
  }
  
  .hint-pile-from {
    @apply ring-2 ring-orange-400 ring-opacity-60 bg-orange-100/20;
  }
  
  .hint-pile-to {
    @apply ring-2 ring-purple-400 ring-opacity-60 bg-purple-100/20;
  }
  
  @keyframes gentle-glow {
    0%, 100% { 
      box-shadow: 0 0 20px rgba(252, 211, 77, 0.6);
      transform: scale(1);
    }
    50% { 
      box-shadow: 0 0 30px rgba(252, 211, 77, 0.8);
      transform: scale(1.02);
    }
  }
  
  @keyframes urgent-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  @keyframes success-flash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  @keyframes directional-hint {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(2px); }
    75% { transform: translateX(-2px); }
  }
`;

// Legacy export for backward compatibility
export const useHint = useEnhancedHint;
