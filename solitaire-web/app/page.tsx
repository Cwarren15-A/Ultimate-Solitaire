"use client";

import GameBoard from "../components/GameBoard";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-900">
      <GameBoard />
    </div>
  );
}
