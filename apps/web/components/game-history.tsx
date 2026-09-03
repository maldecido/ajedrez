"use client";

import { useEffect, useState } from "react";

import type { GameEndReason } from "@ajedrez/chess-engine";

import { listFinishedGames, type GameSummary } from "@/lib/supabase/repository";
import { ensureSession } from "@/lib/supabase/session";

const REASON_TEXT: Record<GameEndReason, string> = {
  checkmate: "jaque mate",
  timeout: "tiempo",
  resignation: "abandono",
  draw_agreement: "acuerdo",
  stalemate: "ahogado",
  insufficient_material: "material insuficiente",
  repetition: "repetición",
  fifty_move: "50 jugadas",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resultLabel(game: GameSummary): string {
  if (game.result === "draw") return "Tablas";
  const winner = game.result === "white" ? game.whiteName : game.blackName;
  return winner === "Tú" ? "Victoria" : "Derrota";
}

export function GameHistory() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void ensureSession().then(async (identity) => {
      if (!identity) {
        if (active) setIsLoading(false);
        return;
      }
      const list = await listFinishedGames(identity.profileId);
      if (active) {
        setGames(list);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (isLoading || games.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-lg">
      <h2 className="mb-2 text-sm font-semibold">Partidas anteriores</h2>
      <ul className="divide-y rounded-md border">
        {games.map((game) => (
          <li
            key={game.id}
            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {game.whiteName} vs {game.blackName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(game.startedAt)}
                {game.mode === "fischer960" && ` · Fischer960 #${game.scharnaglNumber}`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-medium">{resultLabel(game)}</p>
              <p className="text-xs text-muted-foreground">
                {game.resultReason ? REASON_TEXT[game.resultReason] : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
