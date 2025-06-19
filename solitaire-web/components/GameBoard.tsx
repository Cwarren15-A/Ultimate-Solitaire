'use client';

import { useGameStore } from "../lib/game-store";
import { Card as CardType, PileId, Move } from "../core";
import { canPlaceOnFoundation, getMovableTableauCards } from "../core/rules";
import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Pile from "./Pile";
import Card from "./CardNew";
import Timer from "./HUD/Timer";
import MoveCounter from "./HUD/MoveCounter";
import DirectHintButton from "./HUD/DirectHintButton";
import SettingsDrawer from "./HUD/SettingsDrawer";
import QuickStats from "./HUD/QuickStats"; 
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";

export default function GameBoard() {
  const { 
    currentState, 
    makeMove, 
    drawCards, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    autoCompleteGame,
    isGameWon,
    isHydrated,
    hydrate
  } = useGameStore();
  
  const [selectedCard, setSelectedCard] = useState<{ card: CardType; pileId: PileId } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{ card: CardType; pileId: PileId } | null>(null);
  
  // Configure sensors to add delay for better click/drag distinction
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    })
  );
  
  // Handle card clicks for selection and moves
  const handleCardClick = useCallback((card: CardType, pileId: PileId) => {
    if (selectedCard) {
      // Try to move selected card(s) to this pile
      const move: Move = {
        from: selectedCard.pileId,
        to: pileId,
        cards: [selectedCard.card], // For now, single card moves
        timestamp: Date.now()
      };
      
      const success = makeMove(move);
      if (success) {
        setSelectedCard(null);
      }
    } else {
      // Select this card
      if (card.faceUp) {
        setSelectedCard({ card, pileId });
      }
    }
  }, [selectedCard, makeMove]);
  
  // Intelligent double-click auto-move logic
  const handleCardDoubleClick = useCallback((card: CardType, pileId: PileId) => {
    if (!card.faceUp || !currentState) return;

    // Helper function to get foundation cards by suit
    const getFoundationBySuit = (suit: string): CardType[] => {
      switch (suit) {
        case "♠︎": return currentState.foundations.spades.cards;
        case "♥︎": return currentState.foundations.hearts.cards;
        case "♦︎": return currentState.foundations.diamonds.cards;
        case "♣︎": return currentState.foundations.clubs.cards;
        default: return [];
      }
    };

    // PRIORITY 1: Always try foundation moves first for any single card
    const suitMap = {
      "♠︎": "spades",
      "♥︎": "hearts", 
      "♦︎": "diamonds",
      "♣︎": "clubs"
    };

    const foundationPileId = `foundation-${suitMap[card.suit]}` as PileId;
    const foundationCards = getFoundationBySuit(card.suit);

    // Check if the move to foundation is valid
    if (canPlaceOnFoundation(card, foundationCards)) {
      const foundationMove: Move = {
        from: pileId,
        to: foundationPileId,
        cards: [card],
        timestamp: Date.now()
      };

      if (makeMove(foundationMove, true)) {
        return; // Successfully moved to foundation
      }
    }

    // PRIORITY 2: If foundation move failed, get movable sequence for tableau moves
    let cardsToMove = [card];

    // If this is a tableau pile, get all movable cards starting from this card
    if (pileId.startsWith('tableau-')) {
      const tableauIndex = parseInt(pileId.split('-')[1]) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
      const tableauCards = currentState.tableaux[tableauIndex].cards;
      const cardIndex = tableauCards.findIndex(c => c.id === card.id);
      
      if (cardIndex !== -1) {
        // Get all cards from this position to the end that form a valid sequence
        const remainingCards = tableauCards.slice(cardIndex);
        const movableSequence = getMovableTableauCards(remainingCards);
        
        // Only use the sequence if it starts with our clicked card
        if (movableSequence.length > 0 && movableSequence[0].id === card.id) {
          cardsToMove = movableSequence;
        }
      }
    }
    
    // If foundation move is not safe or failed, or we have a sequence, try to find the best tableau move
    const tableauPiles = ["tableau-1", "tableau-2", "tableau-3", "tableau-4", "tableau-5", "tableau-6", "tableau-7"] as PileId[];
    
    // Prioritize moves that expose face-down cards or create useful sequences
    const moveOptions: { pileId: PileId; priority: number }[] = [];
    
    for (const targetPile of tableauPiles) {
      if (targetPile === pileId) continue; // Don't move to same pile
      
      // Check if the move would be valid (we'll use a dry run approach)
      // For now, we'll prioritize moves to empty piles or piles that would expose face-down cards
      const tableauIndex = parseInt(targetPile.split('-')[1]) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
      const targetTableau = currentState.tableaux[tableauIndex];
      
      let priority = 0;
      
      // Higher priority for moves to empty tableau piles (if card is King)
      if (targetTableau.cards.length === 0 && card.rank === 13) {
        priority += 10;
      }
      
      // Higher priority if the source pile would expose a face-down card
      if (pileId.startsWith('tableau-')) {
        const sourceIndex = parseInt(pileId.split('-')[1]) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
        const sourceTableau = currentState.tableaux[sourceIndex];
        const cardIndex = sourceTableau.cards.findIndex(c => c.id === card.id);
        
        if (cardIndex > 0 && !sourceTableau.cards[cardIndex - 1].faceUp) {
          priority += 5;
        }
      }
      
      // Higher priority for longer sequences (they're often more strategic to move)
      if (cardsToMove.length > 1) {
        priority += cardsToMove.length;
      }
      
      if (priority > 0) {
        moveOptions.push({ pileId: targetPile, priority });
      }
    }
    
    // Sort by priority and try moves in order
    moveOptions.sort((a, b) => b.priority - a.priority);
    
    for (const option of moveOptions) {
      const tableauMove: Move = {
        from: pileId,
        to: option.pileId,
        cards: cardsToMove,
        timestamp: Date.now()
      };
      
      if (makeMove(tableauMove, true)) {
        return; // Successfully moved
      }
    }
    
    // If no prioritized moves worked, try any valid tableau move
    for (const targetPile of tableauPiles) {
      if (targetPile === pileId) continue;
      
      const tableauMove: Move = {
        from: pileId,
        to: targetPile,
        cards: cardsToMove,
        timestamp: Date.now()
      };
      
      if (makeMove(tableauMove, true)) {
        return;
      }
    }
  }, [makeMove, currentState]);
  
  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const cardData = active.data.current;
    
    if (cardData?.card && cardData?.pileId) {
      const dragData = { card: cardData.card, pileId: cardData.pileId };
      setSelectedCard(dragData);
      setActiveDrag(dragData);
    }
  }, []);
  
  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDrag(null);
    
    if (!over) {
      setSelectedCard(null);
      return;
    }
    
    const dragData = active.data.current;
    const dropData = over.data.current;
    
    if (!dragData?.card || !dragData?.pileId || !dropData?.pileId) {
      setSelectedCard(null);
      return;
    }
    
    const move: Move = {
      from: dragData.pileId,
      to: dropData.pileId,
      cards: [dragData.card],
      timestamp: Date.now()
    };
    
    makeMove(move);
    setSelectedCard(null);
  }, [makeMove]);
  
  // Handle empty pile clicks
  const handlePileClick = useCallback((pileId: PileId) => {
    if (pileId === "stock") {
      drawCards();
    } else if (selectedCard) {
      // Try to move selected card to empty pile
      const move: Move = {
        from: selectedCard.pileId,
        to: pileId,
        cards: [selectedCard.card],
        timestamp: Date.now()
      };
      
      const success = makeMove(move);
      if (success) {
        setSelectedCard(null);
      }
    }
  }, [selectedCard, makeMove, drawCards]);
  
  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 'n':
          event.preventDefault();
          setIsSettingsOpen(true);
          break;
        // Note: Hint shortcut (Ctrl+H) is now handled by the HintButton component
      }
    }
    
    if (event.key === 'Escape') {
      setSelectedCard(null);
    }
  }, [undo, redo]);
  
  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  // Hydrate the game state on client mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  
  // Don't render the game until hydrated to prevent SSR mismatch
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading Solitaire...</p>
        </div>
      </div>
    );
  }
  
  const gameWon = isGameWon();
  
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-4"
           style={{
             backgroundImage: `
               radial-gradient(circle at 20% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
               radial-gradient(circle at 80% 50%, rgba(0,0,0,0.1) 0%, transparent 50%),
               radial-gradient(circle at 40% 20%, rgba(255,255,255,0.02) 0%, transparent 50%),
               radial-gradient(circle at 60% 80%, rgba(255,255,255,0.02) 0%, transparent 50%)
             `,
             backgroundSize: '400px 400px, 400px 400px, 600px 600px, 600px 600px',
             backgroundPosition: '0 0, 100% 100%, 50% 0, 50% 100%'
           }}>
      <div className="max-w-7xl mx-auto">
        {/* Header HUD */}
        <div className="flex items-center justify-between mb-6 bg-black/20 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-green-700/30">
          {/* Left side - Game info */}
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-green-100">Klondike Solitaire</h1>
            <Timer />
            <MoveCounter />
            <QuickStats />
          </div>
          
          {/* Right side - Actions */}
          <div className="flex items-center space-x-3">
                            <DirectHintButton />
            
            <button
              onClick={autoCompleteGame}
              className="px-3 py-2 bg-green-700/50 text-green-100 rounded-lg hover:bg-green-600/50 
                         transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-600/30"
            >
              Auto-complete
            </button>
            
            <div className="flex space-x-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="px-3 py-2 bg-green-700/50 text-green-100 rounded-lg hover:bg-green-600/50 
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium
                           focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-600/30"
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>
              
              <button
                onClick={redo}
                disabled={!canRedo}
                className="px-3 py-2 bg-green-700/50 text-green-100 rounded-lg hover:bg-green-600/50 
                           disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm font-medium
                           focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-600/30"
                title="Redo (Ctrl+Shift+Z)"
              >
                ↷
              </button>
            </div>
            
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-2 bg-green-700/50 text-green-100 rounded-lg hover:bg-green-600/50 
                         transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-600/30"
              title="Settings (Ctrl+N)"
            >
              ⚙️
            </button>
          </div>
        </div>
        
        {/* Game Won Banner */}
        {gameWon && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white p-4 rounded-lg shadow-lg text-center"
          >
            <h2 className="text-xl font-bold">🎉 Congratulations! You won! 🎉</h2>
            <p className="text-sm mt-1">
              Completed in {currentState.moves} moves
            </p>
          </motion.div>
        )}
        
        {/* Game Board */}
        <div className="space-y-8">
          {/* Top Row - Stock, Waste, and Foundations */}
          <div className="flex justify-between items-start">
            {/* Stock and Waste */}
            <div className="flex space-x-4">
              <Pile
                pile={currentState.stock}
                onPileClick={handlePileClick}
                showPileLabel={true}
                label="Stock"
              />
              <Pile
                pile={currentState.waste}
                onCardClick={handleCardClick}
                onCardDoubleClick={handleCardDoubleClick}
                showPileLabel={true}
                label="Waste"
              />
            </div>
            
            {/* Foundations */}
            <div className="flex space-x-4">
              <Pile
                pile={currentState.foundations.spades}
                onCardClick={handleCardClick}
                onCardDoubleClick={handleCardDoubleClick}
                onPileClick={handlePileClick}
                showPileLabel={true}
                isHighlighted={selectedCard?.card.suit === "♠︎"}
              />
              <Pile
                pile={currentState.foundations.hearts}
                onCardClick={handleCardClick}
                onCardDoubleClick={handleCardDoubleClick}
                onPileClick={handlePileClick}
                showPileLabel={true}
                isHighlighted={selectedCard?.card.suit === "♥︎"}
              />
              <Pile
                pile={currentState.foundations.diamonds}
                onCardClick={handleCardClick}
                onCardDoubleClick={handleCardDoubleClick}
                onPileClick={handlePileClick}
                showPileLabel={true}
                isHighlighted={selectedCard?.card.suit === "♦︎"}
              />
              <Pile
                pile={currentState.foundations.clubs}
                onCardClick={handleCardClick}
                onCardDoubleClick={handleCardDoubleClick}
                onPileClick={handlePileClick}
                showPileLabel={true}
                isHighlighted={selectedCard?.card.suit === "♣︎"}
              />
            </div>
          </div>
          
          {/* Bottom Row - Tableau */}
          <div className="flex justify-center space-x-4">
            {[1, 2, 3, 4, 5, 6, 7].map(num => (
              <Pile
                key={num}
                pile={currentState.tableaux[num as 1 | 2 | 3 | 4 | 5 | 6 | 7]}
                onCardClick={handleCardClick}
                onCardDoubleClick={handleCardDoubleClick}
                onPileClick={handlePileClick}
                showPileLabel={true}
                className="min-h-40" // Extra height for cascading cards
              />
            ))}
          </div>
        </div>
        
        {/* Settings Drawer */}
        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
      
      {/* Drag Overlay */}
      <DragOverlay>
        {activeDrag ? (
          <div className="rotate-12 scale-110">
            <Card
              card={activeDrag.card}
              pileId={activeDrag.pileId}
              isTopCard={true}
              isDragDisabled={false}
              className="shadow-2xl"
            />
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
}
