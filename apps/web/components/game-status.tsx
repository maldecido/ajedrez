"use client";

import type { GameEndReason } from "@ajedrez/chess-engine";

import { useGameStore } from "@/store/game-store";

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
    const headline =
      outcome.result === "draw"
        ? "Tablas"
        : outcome.result === "white"
          ? "Ganan las blancas"
          : "Ganan las negras";

    return (
      <div
        role="status"
        className="rounded-md border-2 border-primary bg-primary px-3 py-3 text-primary-foreground"
      >
        <p className="text-xs uppercase tracking-wide opacity-80">
          Partida terminada
        </p>
        <p className="text-lg font-bold leading-tight">{headline}</p>
        <p className="text-sm opacity-90">{REASON_TEXT[outcome.reason]}</p>
      </div>
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
