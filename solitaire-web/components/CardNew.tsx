"use client";

import { Card as CardType, getRankName, getSuitSymbol, isRed } from "../core";
import { motion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface CardProps {
  card: CardType;
  isSelected?: boolean;
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

  // Check if it's a face card (Jack, Queen, King)
  const isFaceCard = ['J', 'Q', 'K'].includes(rankDisplay);
  
  // Generate suit pattern for face cards
  const generateSuitPattern = () => {
    if (!isFaceCard) return null;
    
    return (
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <div className="grid grid-cols-2 gap-1 text-lg">
          {[...Array(4)].map((_, i) => (
            <span key={i} className={isRedCard ? 'text-red-600' : 'text-gray-900'}>
              {suitDisplay}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Generate number card pattern
  const generateNumberPattern = () => {
    if (isFaceCard || rankDisplay === 'A') return null;
    
    const num = parseInt(rankDisplay);
    if (isNaN(num) || num > 10) return null;
    
    const positions: Record<number, number[][]> = {
      1: [[50, 50]],
      2: [[50, 25], [50, 75]],
      3: [[50, 20], [50, 50], [50, 80]],
      4: [[32, 28], [68, 28], [32, 72], [68, 72]],
      5: [[32, 25], [68, 25], [50, 50], [32, 75], [68, 75]],
      6: [[32, 22], [68, 22], [32, 50], [68, 50], [32, 78], [68, 78]],
      7: [[32, 20], [68, 20], [32, 42], [50, 50], [68, 42], [32, 80], [68, 80]],
      8: [[35, 18], [65, 18], [35, 38], [65, 38], [35, 62], [65, 62], [35, 82], [65, 82]],
      9: [[35, 17], [65, 17], [35, 35], [65, 35], [50, 50], [35, 65], [65, 65], [35, 83], [65, 83]],
      10: [[35, 16], [65, 16], [35, 32], [65, 32], [50, 44], [50, 56], [35, 68], [65, 68], [35, 84], [65, 84]]
    };
    
    const suitPositions = positions[num] || [];
    
    // Determine suit size based on card number for better visual balance
    const getSuitSize = (cardNum: number) => {
      if (cardNum <= 3) return 'text-lg'; // Larger for very simple cards
      if (cardNum <= 6) return 'text-base'; // Medium for mid-range
      if (cardNum === 7) return 'text-sm'; // Smaller for 7
      return 'text-xs'; // Much smaller for complex cards (8, 9, 10)
    };
    
          return (
      <div className="absolute inset-0">
        {suitPositions.map(([x, y]: number[], i: number) => {
          const isRotated = i >= num / 2;
          const isHighNumber = num >= 8;
          
          return (
            <span 
              key={i} 
              className={`absolute ${getSuitSize(num)} font-bold transform -translate-x-1/2 -translate-y-1/2 ${
                isRedCard ? 'text-red-600' : 'text-gray-900'
              } ${isRotated ? 'rotate-180' : ''} ${
                isHighNumber && isRotated ? 'opacity-90' : ''
              }`}
              style={{ 
                left: `${x}%`, 
                top: `${y}%`,
                letterSpacing: isHighNumber ? '-0.5px' : '0'
              }}
            >
              {suitDisplay}
            </span>
          );
        })}
      </div>
    );
  };
  
  return (
    <motion.button
      ref={setNodeRef}
      data-card-id={card.id}
      data-pile-id={pileId}
      aria-label={card.faceUp ? `${rankDisplay} of ${card.suit}` : "Face down card"}
      className={`
        relative focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg
        ${canDrag ? 'cursor-grab active:cursor-grabbing hover:scale-105' : ''}
        ${isDraggingDnd ? 'opacity-50' : ''}
        ${isSelected ? 'ring-2 ring-yellow-400' : ''}
        ${className}
        transition-all duration-200 ease-in-out
      `}
      style={{
        width: cardWidth,
        height: cardHeight,
        zIndex: isDraggingDnd ? 9999 : zIndex,
        transform: dragTransform,
        ...style,
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      whileHover={canDrag ? { scale: 1.05, rotateZ: 1 } : {}}
      whileTap={canDrag ? { scale: 0.98, rotateZ: -1 } : {}}
      animate={{
        scale: isSelected ? 1.1 : 1,
        boxShadow: isSelected
          ? "0 0 25px rgba(255, 193, 7, 0.8), 0 8px 16px rgba(0, 0, 0, 0.2)"
          : isDraggingDnd
          ? "0 12px 30px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)"
          : "0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)",
      }}
      transition={{ duration: 0.2 }}
      {...attributes}
      {...listeners}
    >
      {/* Card Container */}
      <div className="relative w-full h-full">
        {card.faceUp ? (
          // Face-up card - Classic playing card design
          <div className="relative w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg overflow-hidden">
            {/* Card border with subtle inner shadow */}
            <div className="absolute inset-0 rounded-lg border border-gray-400 shadow-inner opacity-50"></div>
            
            {/* Top-left corner - Classic style */}
            <div className={`absolute top-1 left-1 text-xs font-bold leading-none select-none font-serif ${
              isRedCard ? 'text-red-600' : 'text-gray-900'
            }`}>
              <div className="text-sm font-black tracking-tight">{rankDisplay}</div>
              <div className="text-base -mt-1 leading-none">{suitDisplay}</div>
            </div>
            
            {/* Bottom-right corner (rotated) - Classic style */}
            <div className={`absolute bottom-1 right-1 text-xs font-bold leading-none transform rotate-180 select-none font-serif ${
              isRedCard ? 'text-red-600' : 'text-gray-900'
            }`}>
              <div className="text-sm font-black tracking-tight">{rankDisplay}</div>
              <div className="text-base -mt-1 leading-none">{suitDisplay}</div>
            </div>
            
            {/* Center content based on card type */}
            <div className="absolute inset-0 flex items-center justify-center">
              {rankDisplay === 'A' ? (
                // Ace - Large centered suit
                <span className={`text-5xl font-bold select-none font-serif ${
                  isRedCard ? 'text-red-600' : 'text-gray-900'
                }`} style={{
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.05))'
                }}>
                  {suitDisplay}
                </span>
              ) : isFaceCard ? (
                // Face cards - Stylized with pattern background
                <div className="relative">
                  {generateSuitPattern()}
                  <div className={`text-4xl font-bold select-none font-serif relative z-10 ${
                    isRedCard ? 'text-red-600' : 'text-gray-900'
                  }`} style={{
                    textShadow: '2px 2px 4px rgba(255,255,255,0.8), 0 1px 2px rgba(0,0,0,0.2)',
                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))'
                  }}>
                    {rankDisplay}
                  </div>
                  <div className={`text-lg mt-1 font-bold select-none font-serif ${
                    isRedCard ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {suitDisplay}
                  </div>
                </div>
              ) : (
                // Number cards - Traditional suit layout
                <div className="relative w-full h-full">
                  {generateNumberPattern()}
                </div>
              )}
            </div>

            {/* Subtle card texture overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/20 to-transparent opacity-30 rounded-lg pointer-events-none"></div>
            
            {/* Card shine effect - top left highlight */}
            <div className="absolute top-1 left-1 w-6 h-6 bg-gradient-to-br from-white/60 to-transparent rounded-full blur-sm opacity-70 pointer-events-none"></div>
            
            {/* Subtle paper texture */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0),
                radial-gradient(circle at 3px 3px, rgba(0,0,0,0.05) 1px, transparent 0)
              `,
              backgroundSize: '8px 8px, 16px 16px'
            }}></div>
            
            {/* Accessibility enhancement for screen readers */}
            <span className="sr-only">
              {rankDisplay} of {card.suit}
            </span>
          </div>
        ) : (
          // Face-down card - Classic ornate back design
          <div className="relative w-full h-full bg-gradient-to-br from-red-900 via-red-800 to-red-900 rounded-lg border-2 border-red-700 shadow-lg overflow-hidden">
            {/* Outer decorative border */}
            <div className="absolute inset-0 rounded-lg border-2 border-red-600 shadow-inner"></div>
            <div className="absolute inset-1 rounded-md border border-red-500 opacity-60"></div>
            
            {/* Main pattern background */}
            <div className="absolute inset-3 bg-gradient-to-br from-red-700 to-red-800 rounded-sm">
              {/* Central ornate pattern */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Central medallion */}
                  <div className="w-12 h-12 border-2 border-yellow-300 rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-200 to-yellow-400 opacity-80">
                    <div className="w-8 h-8 border border-red-700 rounded-full flex items-center justify-center bg-red-600">
                      <div className="w-4 h-4 bg-yellow-300 rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Radiating pattern */}
                  <div className="absolute inset-0">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-1 h-6 bg-gradient-to-t from-yellow-400 to-transparent opacity-40"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
                          transformOrigin: 'bottom center'
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Corner ornaments */}
              <div className="absolute top-1 left-1 w-4 h-4 border border-yellow-300 rounded-sm opacity-60 flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
              </div>
              <div className="absolute top-1 right-1 w-4 h-4 border border-yellow-300 rounded-sm opacity-60 flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
              </div>
              <div className="absolute bottom-1 left-1 w-4 h-4 border border-yellow-300 rounded-sm opacity-60 flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
              </div>
              <div className="absolute bottom-1 right-1 w-4 h-4 border border-yellow-300 rounded-sm opacity-60 flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
              </div>
              
              {/* Decorative border pattern */}
              <div className="absolute inset-0 opacity-30" style={{
                backgroundImage: `
                  repeating-linear-gradient(0deg, 
                    transparent, 
                    transparent 2px, 
                    rgba(255,255,255,0.1) 2px, 
                    rgba(255,255,255,0.1) 3px),
                  repeating-linear-gradient(90deg, 
                    transparent, 
                    transparent 2px, 
                    rgba(255,255,255,0.1) 2px, 
                    rgba(255,255,255,0.1) 3px)
                `,
                backgroundSize: '100% 6px, 6px 100%'
              }}></div>
            </div>
            
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-lg opacity-70 pointer-events-none"></div>
            
            {/* Card shine effect */}
            <div className="absolute top-2 left-2 w-5 h-5 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm pointer-events-none"></div>
            
            <span className="sr-only">Face down card</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

// Optional: Card back pattern as CSS (add to globals.css)
export const CardBackCSS = `
.bg-classic-pattern {
  background-image: 
    radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(255,255,255,0.2) 0%, transparent 50%);
  background-size: 20px 20px;
}

.card-paper-texture {
  background-image: 
    radial-gradient(circle at 1px 1px, rgba(0,0,0,0.1) 1px, transparent 0),
    radial-gradient(circle at 3px 3px, rgba(0,0,0,0.05) 1px, transparent 0);
  background-size: 8px 8px, 16px 16px;
}
`;
