"use client";

import { useState } from "react";

import { FISCHER960_COUNT, STANDARD_SCHARNAGL_NUMBER } from "@ajedrez/chess-engine";

import { OpponentPicker } from "@/components/opponent-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Opponent } from "@/lib/supabase/repository";
import {
  OFFICIAL_TIME_CONTROLS,
  customTimeControl,
  type TimeControl,
} from "@/lib/time-controls";
import { useGameStore, type GameMode } from "@/store/game-store";

/** Valor especial del selector para "sin reloj". */
const NO_CLOCK = "none";
/** Valor especial del selector para el ritmo personalizado. */
const CUSTOM = "custom";

export function GameSetup() {
  const startGame = useGameStore((state) => state.startGame);

  const [mode, setMode] = useState<GameMode>("standard");
  const [timeChoice, setTimeChoice] = useState<string>("blitz-5-3");
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(5);
  const [useRandomPosition, setUseRandomPosition] = useState(true);
  const [scharnagl, setScharnagl] = useState(STANDARD_SCHARNAGL_NUMBER);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [colorChoice, setColorChoice] = useState<"white" | "black" | "random">(
    "white",
  );

  function resolveTimeControl(): TimeControl | null {
    if (timeChoice === NO_CLOCK) return null;
    if (timeChoice === CUSTOM) {
      return customTimeControl(customMinutes, customIncrement);
    }
    return (
      OFFICIAL_TIME_CONTROLS.find((control) => control.id === timeChoice) ?? null
    );
  }

  function handleStart() {
    const ownerColor =
      colorChoice === "random"
        ? Math.random() < 0.5
          ? "w"
          : "b"
        : colorChoice === "white"
          ? "w"
          : "b";

    startGame({
      mode,
      scharnaglNumber:
        mode === "fischer960"
          ? useRandomPosition
            ? Math.floor(Math.random() * FISCHER960_COUNT)
            : scharnagl
          : null,
      timeControl: resolveTimeControl(),
      seats: {
        ownerColor,
        opponentId: opponent?.id ?? null,
        opponentName: opponent?.name ?? "Invitado",
      },
    });
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardContent className="flex flex-col gap-6 pt-6">
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Modalidad</h2>
          <div className="grid grid-cols-2 gap-2">
            <ChoiceButton
              selected={mode === "standard"}
              onClick={() => setMode("standard")}
            >
              Estándar
            </ChoiceButton>
            <ChoiceButton
              selected={mode === "fischer960"}
              onClick={() => setMode("fischer960")}
            >
              Fischer960
            </ChoiceButton>
          </div>

          {mode === "fischer960" && (
            <div className="mt-2 flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useRandomPosition}
                  onChange={(event) => setUseRandomPosition(event.target.checked)}
                  className="h-4 w-4"
                />
                Posición aleatoria
              </label>

              {!useRandomPosition && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="shrink-0">Nº de Scharnagl (0–959)</span>
                  <input
                    type="number"
                    min={0}
                    max={FISCHER960_COUNT - 1}
                    value={scharnagl}
                    onChange={(event) =>
                      setScharnagl(
                        Math.min(
                          FISCHER960_COUNT - 1,
                          Math.max(0, Number(event.target.value) || 0),
                        ),
                      )
                    }
                    className="w-24 rounded-md border bg-background px-2 py-1"
                  />
                </label>
              )}

              <p className="text-xs text-muted-foreground">
                Para enrocar, mueve el rey sobre tu propia torre. Es la
                convención de la variante y evita ambigüedades: el rey y la
                torre acaban en las casillas de siempre (g/f o c/d).
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Ritmo de juego</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {OFFICIAL_TIME_CONTROLS.map((control) => (
              <ChoiceButton
                key={control.id}
                selected={timeChoice === control.id}
                onClick={() => setTimeChoice(control.id)}
              >
                {control.name}
              </ChoiceButton>
            ))}
            <ChoiceButton
              selected={timeChoice === CUSTOM}
              onClick={() => setTimeChoice(CUSTOM)}
            >
              Personalizado
            </ChoiceButton>
            <ChoiceButton
              selected={timeChoice === NO_CLOCK}
              onClick={() => setTimeChoice(NO_CLOCK)}
            >
              Sin reloj
            </ChoiceButton>
          </div>

          {timeChoice === CUSTOM && (
            <div className="mt-2 flex flex-wrap gap-4 rounded-md border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm">
                Minutos
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={customMinutes}
                  onChange={(event) =>
                    setCustomMinutes(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="w-20 rounded-md border bg-background px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                Incremento (s)
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={customIncrement}
                  onChange={(event) =>
                    setCustomIncrement(Math.max(0, Number(event.target.value) || 0))
                  }
                  className="w-20 rounded-md border bg-background px-2 py-1"
                />
              </label>
            </div>
          )}
        </section>

        <OpponentPicker value={opponent} onChange={setOpponent} />

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Juegas con</h2>
          <div className="grid grid-cols-3 gap-2">
            <ChoiceButton
              selected={colorChoice === "white"}
              onClick={() => setColorChoice("white")}
            >
              Blancas
            </ChoiceButton>
            <ChoiceButton
              selected={colorChoice === "black"}
              onClick={() => setColorChoice("black")}
            >
              Negras
            </ChoiceButton>
            <ChoiceButton
              selected={colorChoice === "random"}
              onClick={() => setColorChoice("random")}
            >
              Al azar
            </ChoiceButton>
          </div>
        </section>

        <Button onClick={handleStart} className="w-full">
          Empezar partida
        </Button>
      </CardContent>
    </Card>
  );
}

interface ChoiceButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ChoiceButton({ selected, onClick, children }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-md border px-3 py-2 text-sm transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
