"use client";

import { useGameStore } from "../../lib/game-store";
import { useEffect, useState } from "react";

export default function Timer() {
  const { currentState, isGameWon } = useGameStore();
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    if (isGameWon()) return; // Stop timer when game is won
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - currentState.startTime;
      setElapsedTime(elapsed);
    }, 100); // Update every 100ms for smooth display
    
    return () => clearInterval(interval);
  }, [currentState.startTime, isGameWon]);
  
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-green-300">⏱</span>
      <span className="font-mono text-green-100 min-w-[3rem]">
        {formatTime(elapsedTime)}
      </span>
    </div>
  );
}
