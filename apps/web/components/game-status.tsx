"use client";

import type { EngineEndReason, GameResult } from "@ajedrez/chess-engine";

import { useGameStore } from "@/store/game-store";

const DRAW_REASON_TEXT: Record<Exclude<EngineEndReason, "checkmate">, string> = {
  stalemate: "Tablas por rey ahogado",
  insufficient_material: "Tablas por material insuficiente",
  repetition: "Tablas por repeticion de posicion",
  fifty_move: "Tablas por la regla de las 50 jugadas",
};

const WINNER_TEXT: Record<Exclude<GameResult, "draw">, string> = {
  white: "Ganan las blancas",
  black: "Ganan las negras",
};

export function GameStatus() {
  const status = useGameStore((state) => state.status);

  if (status.isGameOver) {
    const text =
      status.reason === "checkmate"
        ? `Jaque mate. ${WINNER_TEXT[status.result as Exclude<GameResult, "draw">]}`
        : status.reason
          ? DRAW_REASON_TEXT[status.reason]
          : "Partida terminada";

    return (
      <p className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
        {text}
      </p>
    );
  }

  const turnText = status.turn === "w" ? "Juegan las blancas" : "Juegan las negras";

  return (
    <p className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-medium">
      <span
        aria-hidden
        className={`inline-block h-3 w-3 rounded-full border ${
          status.turn === "w" ? "bg-white" : "bg-black"
        }`}
      />
      {turnText}
      {status.isCheck && <span className="font-semibold text-destructive">· Jaque</span>}
    </p>
  );
}
