"use client";

import type { GameEndReason, GameResult } from "@ajedrez/chess-engine";

import { useGameStore } from "@/store/game-store";

const WINNER_TEXT: Record<Exclude<GameResult, "draw">, string> = {
  white: "Ganan las blancas",
  black: "Ganan las negras",
};

const REASON_TEXT: Record<GameEndReason, string> = {
  checkmate: "Jaque mate",
  timeout: "Tiempo agotado",
  resignation: "Abandono",
  draw_agreement: "Tablas de mutuo acuerdo",
  stalemate: "Tablas por rey ahogado",
  insufficient_material: "Tablas por material insuficiente",
  repetition: "Tablas por repetición de posición",
  fifty_move: "Tablas por la regla de las 50 jugadas",
};

export function GameStatus() {
  const status = useGameStore((state) => state.status);
  const outcome = useGameStore((state) => state.outcome);

  if (outcome) {
    const reason = REASON_TEXT[outcome.reason];
    const text =
      outcome.result === "draw"
        ? reason
        : `${reason}. ${WINNER_TEXT[outcome.result]}`;

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
