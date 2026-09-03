import type { Color } from "@ajedrez/chess-engine";

/**
 * Estado del reloj de una partida.
 *
 * `whiteMs` y `blackMs` NO son el tiempo que queda ahora mismo: son el tiempo
 * que quedaba en el instante `anchor`. El tiempo real se calcula siempre
 * restando contra `Date.now()` (ver `remainingMs`).
 *
 * Se hace asi para evitar la deriva: si se descontara un fijo en cada tick de
 * `setInterval`, el reloj se retrasaria, porque el navegador no garantiza la
 * cadencia y ralentiza los timers en pestanas de fondo.
 */
export interface ClockState {
  whiteMs: number;
  blackMs: number;
  /** Color cuyo reloj corre ahora, o `null` si esta parado. */
  running: Color | null;
  /** `Date.now()` de la ultima vez que se recalculo. `null` si esta parado. */
  anchor: number | null;
  incrementMs: number;
}

/** Reloj listo para empezar, con ambos lados al tiempo inicial. */
export function createClock(
  initialSeconds: number,
  incrementSeconds: number,
): ClockState {
  const initialMs = initialSeconds * 1000;
  return {
    whiteMs: initialMs,
    blackMs: initialMs,
    running: null,
    anchor: null,
    incrementMs: incrementSeconds * 1000,
  };
}

/** Tiempo que le queda de verdad a `color` en el instante `now`. */
export function remainingMs(state: ClockState, color: Color, now: number): number {
  const stored = color === "w" ? state.whiteMs : state.blackMs;
  if (state.running !== color || state.anchor === null) return stored;
  return Math.max(0, stored - (now - state.anchor));
}

/** Arranca el reloj de `color` sin tocar los tiempos acumulados. */
export function startClock(state: ClockState, color: Color, now: number): ClockState {
  return { ...state, running: color, anchor: now };
}

/** Congela el reloj, dejando en `whiteMs`/`blackMs` el tiempo real restante. */
export function stopClock(state: ClockState, now: number): ClockState {
  if (state.running === null) return state;
  return {
    ...state,
    whiteMs: remainingMs(state, "w", now),
    blackMs: remainingMs(state, "b", now),
    running: null,
    anchor: null,
  };
}

/**
 * Cierra el turno de quien acaba de mover: descuenta lo consumido, le suma el
 * incremento Fischer y pasa el reloj al rival.
 *
 * El incremento se suma DESPUES de descontar, que es como funciona un reloj de
 * competicion: se premia la jugada ya hecha.
 */
export function switchClock(state: ClockState, now: number): ClockState {
  const mover = state.running;
  if (mover === null) return state;

  const whiteMs = remainingMs(state, "w", now);
  const blackMs = remainingMs(state, "b", now);

  // Si se agoto el tiempo justo al mover, no se regala incremento.
  const moverRemaining = mover === "w" ? whiteMs : blackMs;
  const increment = moverRemaining > 0 ? state.incrementMs : 0;

  return {
    ...state,
    whiteMs: mover === "w" ? whiteMs + increment : whiteMs,
    blackMs: mover === "b" ? blackMs + increment : blackMs,
    running: mover === "w" ? "b" : "w",
    anchor: now,
  };
}

/** Color que se ha quedado sin tiempo, o `null` si ninguno. */
export function flaggedColor(state: ClockState, now: number): Color | null {
  if (state.running === null) return null;
  return remainingMs(state, state.running, now) <= 0 ? state.running : null;
}

/**
 * Formatea un tiempo para mostrarlo. Por debajo de 20 segundos aparecen las
 * decimas, que es cuando de verdad importan.
 */
export function formatClock(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = safe / 1000;

  if (safe < 20_000) {
    return totalSeconds.toFixed(1);
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
