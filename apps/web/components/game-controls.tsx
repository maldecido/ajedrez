"use client";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/game-store";

export function GameControls() {
  const undo = useGameStore((state) => state.undo);
  const backToSetup = useGameStore((state) => state.backToSetup);
  const flipBoard = useGameStore((state) => state.flipBoard);
  const hasMoves = useGameStore((state) => state.history.length > 0);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={undo} disabled={!hasMoves}>
        Deshacer
      </Button>
      <Button variant="outline" size="sm" onClick={flipBoard}>
        Girar tablero
      </Button>
      <Button variant="outline" size="sm" onClick={backToSetup}>
        Nueva partida
      </Button>
    </div>
  );
}
