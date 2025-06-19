"use client";

import { Pile as PileType, Card as CardType, PileId } from "../core";
import { motion, AnimatePresence } from "framer-motion";
import Card from "./CardNew";
import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";

interface PileProps {
  pile: PileType;
  onCardClick?: (card: CardType, pileId: PileId) => void;
  onCardDoubleClick?: (card: CardType, pileId: PileId) => void;
  onPileClick?: (pileId: PileId) => void;
  isDragOver?: boolean;
  canAcceptDrop?: boolean;
  isHighlighted?: boolean;
  className?: string;
  label?: string;
  showPileLabel?: boolean;
}

export default function Pile({
  pile,
  onCardClick,
  onCardDoubleClick,
  onPileClick,
  isDragOver = false,
  canAcceptDrop = false,
  isHighlighted = false,
  className = "",
  label,
  showPileLabel = false
}: PileProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const isEmpty = pile.cards.length === 0;
  
  // Different layouts for different pile types
  const isTableau = pile.id.startsWith("tableau-");
  const isFoundation = pile.id.startsWith("foundation-");
  const isStock = pile.id === "stock";
  const isWaste = pile.id === "waste";
  
  // Set up drop zone for this pile
  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: pile.id,
    data: {
      pileId: pile.id,
      pile,
    },
  });
  
  const pileLabels = {
    "stock": "Stock",
    "waste": "Waste", 
    "foundation-spades": "♠︎",
    "foundation-hearts": "♥︎",
    "foundation-diamonds": "♦︎",
    "foundation-clubs": "♣︎",
    "tableau-1": "1",
    "tableau-2": "2",
    "tableau-3": "3",
    "tableau-4": "4",
    "tableau-5": "5",
    "tableau-6": "6",
    "tableau-7": "7"
  };
  
  // Dynamic height calculation for tableau piles to prevent card clipping
  const getContainerHeight = () => {
    if (isTableau && pile.cards.length > 0) {
      const baseHeight = 112; // One card height
      const additionalCards = pile.cards.length - 1;
      const cascadeOffset = additionalCards * 20;
      return baseHeight + cascadeOffset + 8; // Add extra padding
    }
    return 112; // Default height
  };
  
  // Build CSS classes more cleanly
  const pileAreaClasses = [
    'relative rounded-lg border-2 transition-all duration-200',
    isWaste ? 'w-32 overflow-visible' : 'w-20',
    isTableau ? 'overflow-visible' : 'h-28 overflow-hidden',
    isEmpty ? 'border-green-600/30 bg-green-800/20' : 'border-transparent',
    isDragOver || isOver ? 'border-blue-400 bg-blue-400/20' : '',
    canAcceptDrop ? 'border-green-400 bg-green-400/20' : '',
    isHighlighted ? 'border-yellow-400 bg-yellow-400/20' : '',
    isHovered && isEmpty ? 'border-green-500/50 bg-green-700/30' : '',
    (isEmpty || isStock) ? 'cursor-pointer' : ''
  ].filter(Boolean).join(' ');
  
  return (
    <motion.div
      className={`
        relative
        ${className}
      `}
      data-pile-id={pile.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Pile Label */}
      {showPileLabel && (
        <div className="absolute -top-6 left-0 text-xs text-gray-600 font-medium">
          {label || pileLabels[pile.id] || pile.id}
        </div>
      )}
      
      {/* Pile Area */}
      <motion.div
        ref={setDropRef}
        data-pile-id={pile.id}
        className={pileAreaClasses}
        style={{
          height: isTableau ? `${getContainerHeight()}px` : undefined,
          backgroundImage: isEmpty ? `
            radial-gradient(circle at 30% 30%, rgba(255,255,255,0.05) 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(0,0,0,0.1) 0%, transparent 50%)
          ` : undefined
        }}
        onClick={() => (isEmpty || isStock) && onPileClick?.(pile.id)}
        animate={{
          scale: isDragOver || isOver ? 1.05 : 1,
          borderWidth: isDragOver || isOver ? 3 : 2
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Empty pile placeholder */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center">
            {isFoundation && (
              <span className="text-2xl text-green-400/40 font-bold">
                {pileLabels[pile.id]}
              </span>
            )}
            {isStock && (
              <div className="text-green-400/40 text-xs text-center">
                <div className="text-lg">⟲</div>
                <div>Click to draw</div>
              </div>
            )}
          </div>
        )}
        
        {/* Cards */}
        <AnimatePresence mode="popLayout">
          {pile.cards.map((card, index) => {
            const isTopCard = index === pile.cards.length - 1;
            const canDragThisCard = isTopCard || (isTableau && card.faceUp);
            
            // Calculate position based on pile type
            let cardStyle: React.CSSProperties = {};
            
            if (isTableau) {
              // Tableau: cascade cards downward
              cardStyle = {
                position: index === 0 ? 'relative' : 'absolute',
                top: index === 0 ? 0 : index * 20, // 20px offset for each card
                zIndex: index + 1,
                left: 0
              };
            } else if (isWaste) {
              // Waste: fan cards slightly to the right - only show last 3 cards
              const maxVisible = 3;
              const totalCards = pile.cards.length;
              const isVisible = index >= totalCards - maxVisible;
              
              if (!isVisible) {
                return null; // Don't render hidden cards at all
              }

              const visibleIndex = index - (totalCards - maxVisible);
              cardStyle = {
                position: 'absolute',
                top: 0,
                left: visibleIndex * 20,
                zIndex: 100 + visibleIndex // Lower base z-index to avoid conflicts
              };
            } else {
              // Stock and Foundation: stack cards directly
              cardStyle = {
                position: index === 0 ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                zIndex: index + 1
              };
            }
            
            return (
              <motion.div
                key={card.id}
                style={cardStyle}
                initial={{ 
                  opacity: 0, 
                  scale: 0.8,
                  x: isTableau ? 0 : -100
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: 0
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.8,
                  x: 100
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  delay: index * 0.05
                }}
                layout={isTableau} // Only use layout animation for tableau piles
              >
                <Card
                  card={card}
                  onClick={() => onCardClick?.(card, pile.id)}
                  onDoubleClick={() => onCardDoubleClick?.(card, pile.id)}
                  zIndex={typeof cardStyle.zIndex === 'number' ? cardStyle.zIndex : index + 1}
                  className={canDragThisCard ? 'cursor-pointer' : ''}
                  pileId={pile.id}
                  isTopCard={canDragThisCard}
                  isDragDisabled={isStock} // Disable dragging from stock pile
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
      
      {/* Pile Statistics (for debugging/development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -bottom-8 left-0 text-xs text-gray-400">
          {pile.cards.length} cards
        </div>
      )}
    </motion.div>
  );
}
