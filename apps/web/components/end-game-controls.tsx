"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/game-store";

/**
 * Desenlaces que no salen de la posicion: abandono y tablas acordadas.
 * Van detras de una confirmacion porque cierran la partida sin vuelta atras.
 */
export function EndGameControls() {
  const phase = useGameStore((state) => state.phase);
  const resign = useGameStore((state) => state.resign);
  const agreeDraw = useGameStore((state) => state.agreeDraw);
  const [isOpen, setIsOpen] = useState(false);

  if (phase !== "playing") return null;

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        Terminar partida
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">
        Esto cierra la partida y la guarda con su motivo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => resign("w")}>
          Abandonan blancas
        </Button>
        <Button variant="outline" size="sm" onClick={() => resign("b")}>
          Abandonan negras
        </Button>
        <Button variant="outline" size="sm" onClick={agreeDraw}>
          Tablas acordadas
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
