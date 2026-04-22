import { GameClient } from "../../src/components/game-client";

export default function GamePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="badge">Live multiplayer crash round</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight">Sky Sprint Arena</h1>
      </div>
      <GameClient />
    </div>
  );
}
