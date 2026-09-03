import type { Color } from "@ajedrez/chess-engine";

/**
 * Categorias de ritmo, alineadas con `time_controls.category` del modelo de
 * datos. Los umbrales son los de la FIDE, en tiempo total estimado por jugador
 * (tiempo inicial + 60 x incremento).
 */
export type TimeControlCategory =
  | "classical"
  | "rapid"
  | "blitz"
  | "bullet"
  | "custom";

/** Un ritmo de juego. Refleja una fila de `time_controls`. */
export interface TimeControl {
  /** Slug estable. Al sembrar la tabla pasara a ser el uuid de la fila. */
  id: string;
  name: string;
  category: TimeControlCategory;
  initialSeconds: number;
  /** Incremento tipo Fischer, sumado al terminar cada jugada. */
  incrementSeconds: number;
  isOfficial: boolean;
}

/**
 * Ritmos oficiales precargados. Estos son los que sembraran
 * `supabase/seed` en la fase 3.
 */
export const OFFICIAL_TIME_CONTROLS: readonly TimeControl[] = [
  {
    id: "classical-90-30",
    name: "Clásica 90+30",
    category: "classical",
    initialSeconds: 90 * 60,
    incrementSeconds: 30,
    isOfficial: true,
  },
  {
    id: "rapid-15-10",
    name: "Rápida 15+10",
    category: "rapid",
    initialSeconds: 15 * 60,
    incrementSeconds: 10,
    isOfficial: true,
  },
  {
    id: "blitz-5-3",
    name: "Blitz 5+3",
    category: "blitz",
    initialSeconds: 5 * 60,
    incrementSeconds: 3,
    isOfficial: true,
  },
  {
    id: "blitz-3-2",
    name: "Blitz 3+2",
    category: "blitz",
    initialSeconds: 3 * 60,
    incrementSeconds: 2,
    isOfficial: true,
  },
  {
    id: "bullet-1-0",
    name: "Bullet 1+0",
    category: "bullet",
    initialSeconds: 60,
    incrementSeconds: 0,
    isOfficial: true,
  },
];

/** Construye un ritmo personalizado a partir de minutos e incremento. */
export function customTimeControl(
  minutes: number,
  incrementSeconds: number,
): TimeControl {
  const initialSeconds = Math.round(minutes * 60);
  return {
    id: `custom-${initialSeconds}-${incrementSeconds}`,
    name: `Personalizado ${minutes}+${incrementSeconds}`,
    category: "custom",
    initialSeconds,
    incrementSeconds,
    isOfficial: false,
  };
}

/** Etiqueta legible del color, para mensajes de fin de partida. */
export const COLOR_LABEL: Record<Color, string> = {
  w: "blancas",
  b: "negras",
};
