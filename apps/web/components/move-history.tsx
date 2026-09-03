"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { GameMove } from "@ajedrez/chess-engine";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/game-store";

interface MovePair {
  number: number;
  white?: GameMove;
  black?: GameMove;
}

/** Agrupa los medio-movimientos en filas "1. e4 e5", como en una planilla. */
function toPairs(history: GameMove[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (const move of history) {
    const number = Math.ceil(move.ply / 2);
    const isWhite = move.color === "w";
    const last = pairs[pairs.length - 1];

    if (isWhite || !last || last.black) {
      pairs.push(isWhite ? { number, white: move } : { number, black: move });
    } else {
      last.black = move;
    }
  }
  return pairs;
}

export function MoveHistory() {
  const history = useGameStore((state) => state.history);
  const pgn = useGameStore((state) => state.pgn);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pairs = useMemo(() => toPairs(history), [history]);

  // La planilla sigue a la ultima jugada sin que haya que bajar a mano.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [history.length]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copyPgn() {
    try {
      await navigator.clipboard.writeText(pgn);
      setCopied(true);
    } catch {
      // Sin permiso de portapapeles (o sin HTTPS) el PGN sigue visible abajo
      // para copiarlo a mano, asi que no hace falta avisar de nada.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Jugadas</h2>
        <span className="text-xs text-muted-foreground">
          {history.length} {history.length === 1 ? "jugada" : "jugadas"}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="h-48 overflow-y-auto rounded-md border bg-muted/30 p-2 font-mono text-sm"
      >
        {pairs.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            Aun no hay jugadas. Mueve una pieza para empezar.
          </p>
        ) : (
          <ol className="space-y-0.5">
            {pairs.map((pair) => (
              <li key={pair.number} className="flex gap-2">
                <span className="w-7 shrink-0 text-right text-muted-foreground">
                  {pair.number}.
                </span>
                <span className="w-20">{pair.white?.san ?? "…"}</span>
                <span className="w-20">{pair.black?.san ?? ""}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">PGN</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={copyPgn}
            disabled={history.length === 0}
          >
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <textarea
          readOnly
          value={pgn}
          aria-label="PGN de la partida"
          placeholder="El PGN aparecera aqui al mover."
          className="h-24 w-full resize-none rounded-md border bg-muted/30 p-2 font-mono text-xs"
        />
      </div>
    </div>
  );
}
