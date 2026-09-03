import { ChessBoard } from "@/components/chess-board";
import { GameControls } from "@/components/game-controls";
import { GameStatus } from "@/components/game-status";
import { MoveHistory } from "@/components/move-history";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ajedrez</h1>
        <p className="text-sm text-muted-foreground">
          Fase 1 — tablero jugable con reglas completas y PGN.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col items-center gap-4">
          <ChessBoard />
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <GameStatus />
            <GameControls />
            <MoveHistory />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
