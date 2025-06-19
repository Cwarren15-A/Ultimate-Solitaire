"use client";

import { Card as CardType, getRankName, getSuitSymbol, isRed } from "../core";
import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isDragging?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
  pileId?: string;
  isTopCard?: boolean;
  isDragDisabled?: boolean;
}

export default function Card({
  card,
  isSelected = false,
  onClick,
  onDoubleClick,
  className = "",
  style,
  zIndex = 1,
  pileId,
  isTopCard = false,
  isDragDisabled = false
}: CardProps) {
  
  const isRedCard = isRed(card.suit);
  const rankDisplay = getRankName(card.rank);
  const suitDisplay = getSuitSymbol(card.suit);
  
  // Enable drag and drop for face-up cards that are top cards
  const canDrag = card.faceUp && isTopCard && !isDragDisabled;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDraggingDnd,
  } = useDraggable({
    id: card.id,
    data: {
      card,
      pileId,
    },
    disabled: !canDrag,
  });
  
  // Card dimensions
  const cardWidth = 80;
  const cardHeight = 112;
  
  const dragTransform = transform ? CSS.Translate.toString(transform) : undefined;
  
  return (
    <motion.button
      ref={setNodeRef}
      aria-label={card.faceUp ? `${rankDisplay} of ${card.suit}` : "Face down card"}
      className={`
        relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg
        ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isDraggingDnd ? 'opacity-50' : ''}
        ${isSelected ? 'ring-2 ring-yellow-400' : ''}
        ${className}
      `}
      style={{
        width: cardWidth,
        height: cardHeight,
        zIndex: isDraggingDnd ? 9999 : zIndex,
        transform: dragTransform,
        ...style,
      }}
      onClick={onClick}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDoubleClick?.();
      }}
      whileHover={canDrag ? { scale: 1.05 } : {}}
      whileTap={canDrag ? { scale: 0.95 } : {}}
      animate={{
        scale: isSelected ? 1.1 : 1,
        boxShadow: isSelected
          ? "0 0 20px rgba(255, 193, 7, 0.6)"
          : isDraggingDnd
          ? "0 8px 25px rgba(0, 0, 0, 0.3)"
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
      }}
      transition={{ duration: 0.2 }}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
    >
      {/* Card Container */}
      <div className="relative w-full h-full">
        {card.faceUp ? (
          // Face-up card
          <div className="relative w-full h-full bg-white rounded-lg border border-gray-300 shadow-md overflow-hidden">
            {/* Top-left corner */}
            <div className={`absolute top-1 left-1 text-xs font-bold leading-tight ${
              isRedCard ? 'text-red-600' : 'text-black'
            }`}>
              <div>{rankDisplay}</div>
              <div className="text-sm">{suitDisplay}</div>
            </div>
            
            {/* Bottom-right corner (rotated) */}
            <div className={`absolute bottom-1 right-1 text-xs font-bold leading-tight transform rotate-180 ${
              isRedCard ? 'text-red-600' : 'text-black'
            }`}>
              <div>{rankDisplay}</div>
              <div className="text-sm">{suitDisplay}</div>
            </div>
             
            {/* Center suit symbol */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${
                isRedCard ? 'text-red-600' : 'text-black'
              }`}>
                {suitDisplay}
              </span>
            </div>
            
            {/* Accessibility enhancement for screen readers */}
            <span className="sr-only">
              {rankDisplay} of {card.suit}
            </span>
          </div>
        ) : (
          // Face-down card
          <div className="relative w-full h-full bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg">
            {/* Card back pattern */}
            <div className="absolute inset-1 bg-gradient-to-br from-blue-600 to-blue-700 rounded opacity-80">
              <div className="w-full h-full bg-blue-pattern opacity-30 rounded"></div>
            </div>
            
            {/* Subtle pattern overlay */}
            <div className="absolute inset-2 border border-blue-400 rounded opacity-40"></div>
            <div className="absolute inset-3 border border-blue-300 rounded opacity-30"></div>
            
            <span className="sr-only">Face down card</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

// Optional: Card back pattern as CSS (add to globals.css)
export const CardBackCSS = `
.bg-blue-pattern {
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%);
  background-size: 20px 20px;
}
`;
