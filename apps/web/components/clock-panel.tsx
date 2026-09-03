"use client";

import { useEffect, useState } from "react";

import type { Color } from "@ajedrez/chess-engine";

import { Button } from "@/components/ui/button";
import { flaggedColor, formatClock, remainingMs } from "@/lib/clock";
import { useGameStore } from "@/store/game-store";

/** Cadencia de repintado. No define la precision: el tiempo sale de Date.now(). */
const TICK_MS = 100;

export function ClockPanel() {
  const clock = useGameStore((state) => state.clock);
  const phase = useGameStore((state) => state.phase);
  const orientation = useGameStore((state) => state.boardOrientation);
  const flagTimeout = useGameStore((state) => state.flagTimeout);
  const toggleClock = useGameStore((state) => state.toggleClock);
  const hasMoves = useGameStore((state) => state.history.length > 0);

  const [now, setNow] = useState(() => Date.now());
  const isRunning = phase === "playing" && Boolean(clock?.running);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [isRunning]);

  // La bandera se comprueba como efecto, no al pintar: cerrar la partida es un
  // cambio de estado y no puede ocurrir durante el render.
  useEffect(() => {
    if (phase !== "playing" || !clock) return;
    const flagged = flaggedColor(clock, now);
    if (flagged) flagTimeout(flagged);
  }, [now, clock, phase, flagTimeout]);

  if (!clock) return null;

  // El reloj del jugador de abajo se muestra debajo, como en un tablero real.
  const order: Color[] = orientation === "white" ? ["b", "w"] : ["w", "b"];
  const isPaused = clock.running === null;
  // Antes de la primera jugada el reloj no esta pausado: es que no ha empezado.
  const label = !isPaused ? "Pausar reloj" : hasMoves ? "Reanudar reloj" : "Iniciar reloj";

  return (
    <div className="flex flex-col gap-2">
      {order.map((color) => (
        <ClockFace
          key={color}
          color={color}
          ms={remainingMs(clock, color, now)}
          isActive={phase === "playing" && clock.running === color}
        />
      ))}

      {phase === "playing" && (
        <Button
          variant={isPaused ? "default" : "outline"}
          size="sm"
          onClick={toggleClock}
        >
          {label}
        </Button>
      )}

      {isPaused && phase === "playing" && (
        <p className="text-xs text-muted-foreground">
          El reloj está detenido: se puede mover, pero no corre el tiempo.
        </p>
      )}
    </div>
  );
}

interface ClockFaceProps {
  color: Color;
  ms: number;
  isActive: boolean;
}

function ClockFace({ color, ms, isActive }: ClockFaceProps) {
  const isLow = ms < 20_000;

  return (
    <div
      className={`flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
        isActive ? "border-primary bg-primary/10" : "bg-muted/30"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          aria-hidden
          className={`inline-block h-3 w-3 rounded-full border ${
            color === "w" ? "bg-white" : "bg-black"
          }`}
        />
        {color === "w" ? "Blancas" : "Negras"}
      </span>
      <span
        aria-label={`Tiempo de las ${color === "w" ? "blancas" : "negras"}`}
        className={`font-mono text-xl tabular-nums ${
          isLow ? "font-bold text-destructive" : ""
        }`}
      >
        {formatClock(ms)}
      </span>
    </div>
  );
}
