"use client";

import { ChessBoard } from "@/components/chess-board";
import { ClockPanel } from "@/components/clock-panel";
import { EndGameControls } from "@/components/end-game-controls";
import { GameHistory } from "@/components/game-history";
import { GameControls } from "@/components/game-controls";
import { GameSetup } from "@/components/game-setup";
import { GameStatus } from "@/components/game-status";
import { MoveHistory } from "@/components/move-history";
import { VoiceControl } from "@/components/voice-control";
import { Card, CardContent } from "@/components/ui/card";
import { useGameStore } from "@/store/game-store";

export function GameScreen() {
  const phase = useGameStore((state) => state.phase);
  const mode = useGameStore((state) => state.mode);
  const scharnaglNumber = useGameStore((state) => state.scharnaglNumber);
  const timeControl = useGameStore((state) => state.timeControl);

  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-6">
        <GameSetup />
        <GameHistory />
      </div>
    );
  }

  const modeLabel =
    mode === "fischer960" ? `Fischer960 · posición ${scharnaglNumber}` : "Estándar";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {modeLabel} · {timeControl ? timeControl.name : "Sin reloj"}
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col items-center gap-4">
          <ChessBoard />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <ClockPanel />
            <GameStatus />
            <VoiceControl />
            <GameControls />
            <MoveHistory />
            <EndGameControls />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
