"use client";

import { useGameStore } from "../../lib/game-store";

export default function MoveCounter() {
  const { currentState } = useGameStore();
  
  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-green-300">📊</span>
      <span className="text-green-200">Moves:</span>
      <span className="font-mono text-green-100 min-w-[2rem]">
        {currentState.moves}
      </span>
    </div>
  );
}
