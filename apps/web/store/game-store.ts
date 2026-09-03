import { create } from "zustand";

import {
  ChessGame,
  DEFAULT_FEN,
  fischer960Fen,
  type Color,
  type GameEndReason,
  type GameMove,
  type GameResult,
  type GameStatus,
  type LegalMove,
  type PromotionPiece,
  type Square,
} from "@ajedrez/chess-engine";

import {
  createClock,
  remainingMs,
  startClock,
  stopClock,
  switchClock,
  type ClockState,
} from "@/lib/clock";
import {
  appendMove,
  createGame,
  deleteMovesFrom,
  finishGame,
  type SeatAssignment,
} from "@/lib/supabase/repository";
import { ensureSession } from "@/lib/supabase/session";
import type { TimeControl } from "@/lib/time-controls";

/**
 * Instancia unica del motor. Vive fuera del estado de React a proposito:
 * es un objeto mutable, y si estuviera dentro del store su identidad no
 * cambiaria al mover, con lo que los componentes no se re-renderizarian.
 * Lo que si vive en el store es la foto derivada (fen, historial, estado),
 * que es serializable y por tanto comparable.
 */
const engine = new ChessGame();

export type GamePhase = "setup" | "playing" | "finished";
export type GameMode = "standard" | "fischer960";
export type BoardOrientation = "white" | "black";

/** Coronacion pendiente de que el jugador elija pieza. */
interface PendingPromotion {
  from: Square;
  to: Square;
}

/** Como termino la partida, incluyendo motivos que no salen de la posicion. */
export interface GameOutcome {
  result: GameResult;
  reason: GameEndReason;
}

export interface GameSetup {
  mode: GameMode;
  /** Numero de Scharnagl, solo en Fischer960. */
  scharnaglNumber: number | null;
  /** `null` significa partida sin reloj. */
  timeControl: TimeControl | null;
  /** Quien ocupa cada color. */
  seats: SeatAssignment;
}

interface GameState extends GameSetup {
  phase: GamePhase;
  fen: string;
  pgn: string;
  history: GameMove[];
  status: GameStatus;
  /** Jugadas legales de la posicion. Las usa el parser de voz. */
  legalMoves: LegalMove[];
  outcome: GameOutcome | null;
  selectedSquare: Square | null;
  legalTargets: Square[];
  pendingPromotion: PendingPromotion | null;
  boardOrientation: BoardOrientation;
  clock: ClockState | null;
  /**
   * Reloj tal como quedo despues de cada jugada; el indice `i` corresponde al
   * ply `i + 1`. Alimenta `moves.white_clock_ms` / `black_clock_ms` en la
   * fase 3, y permite devolver el tiempo al deshacer.
   */
  clockHistory: ClockState[];
  /** Id de la partida en Supabase, o `null` si no se esta guardando. */
  remoteGameId: string | null;

  startGame: (setup: GameSetup) => void;
  backToSetup: () => void;
  selectSquare: (square: Square) => void;
  tryMove: (from: Square, to: Square, promotion?: PromotionPiece) => boolean;
  confirmPromotion: (piece: PromotionPiece) => void;
  cancelPromotion: () => void;
  /** Arranca o pausa el reloj. El arranque es siempre manual. */
  toggleClock: () => void;
  /** Cierra la partida porque a `color` se le acabo el tiempo. */
  flagTimeout: (color: Color) => void;
  /** Cierra la partida porque `color` abandona. */
  resign: (color: Color) => void;
  /** Cierra la partida en tablas de mutuo acuerdo. */
  agreeDraw: () => void;
  undo: () => void;
  flipBoard: () => void;
}

/** Traduce el estado del motor a un desenlace, si la posicion ya es final. */
function outcomeFromEngine(status: GameStatus): GameOutcome | null {
  if (!status.isGameOver || status.result === null || status.reason === null) {
    return null;
  }
  return { result: status.result, reason: status.reason };
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "setup",
  mode: "standard",
  scharnaglNumber: null,
  timeControl: null,
  fen: DEFAULT_FEN,
  pgn: "",
  history: [],
  status: engine.status(),
  legalMoves: engine.legalMoves(),
  outcome: null,
  selectedSquare: null,
  legalTargets: [],
  pendingPromotion: null,
  boardOrientation: "white",
  clock: null,
  clockHistory: [],
  seats: { ownerColor: "w", opponentId: null, opponentName: "Invitado" },
  remoteGameId: null,

  startGame: ({ mode, scharnaglNumber, timeControl, seats }) => {
    const isFischer = mode === "fischer960" && scharnaglNumber !== null;
    const startFen = isFischer ? fischer960Fen(scharnaglNumber) : DEFAULT_FEN;

    engine.load(startFen, { chess960: isFischer });

    // El reloj se crea parado: lo arrancan los jugadores cuando estan listos.
    const clock = timeControl
      ? createClock(timeControl.initialSeconds, timeControl.incrementSeconds)
      : null;

    set({
      phase: "playing",
      mode,
      scharnaglNumber: isFischer ? scharnaglNumber : null,
      timeControl,
      fen: engine.fen(),
      pgn: engine.pgn(),
      history: [],
      status: engine.status(),
      legalMoves: engine.legalMoves(),
      outcome: null,
      selectedSquare: null,
      legalTargets: [],
      pendingPromotion: null,
      clock,
      clockHistory: [],
      seats,
      remoteGameId: null,
    });

    // La persistencia no bloquea el juego: si Supabase no responde, se sigue
    // jugando en local y simplemente no se guarda.
    void ensureSession().then((identity) => {
      if (!identity) return;
      return createGame({
        ownerId: identity.profileId,
        mode,
        startFen,
        scharnaglNumber: isFischer ? scharnaglNumber : null,
        timeControl,
        seats,
      }).then((remoteGameId) => {
        // Si mientras tanto se empezo otra partida, este id ya no vale.
        if (remoteGameId && get().phase === "playing" && get().history.length === 0) {
          set({ remoteGameId });
        }
      });
    });
  },

  backToSetup: () => set({ phase: "setup", clock: null, clockHistory: [] }),

  selectSquare: (square) => {
    const { selectedSquare, phase } = get();

    if (phase !== "playing") return;

    // Segundo clic sobre la misma casilla: cancela la seleccion.
    if (selectedSquare === square) {
      set({ selectedSquare: null, legalTargets: [] });
      return;
    }

    // Hay pieza seleccionada y el destino es legal: se intenta la jugada.
    if (selectedSquare && get().legalTargets.includes(square)) {
      get().tryMove(selectedSquare, square);
      return;
    }

    // En cualquier otro caso se intenta seleccionar la casilla clicada.
    // legalTargets vacio significa que ahi no hay pieza propia con jugadas.
    const targets = engine.legalTargets(square);
    set(
      targets.length > 0
        ? { selectedSquare: square, legalTargets: targets }
        : { selectedSquare: null, legalTargets: [] },
    );
  },

  tryMove: (from, to, promotion) => {
    if (get().phase !== "playing") return false;

    // Si la jugada corona y aun no se eligio pieza, se pregunta antes.
    if (!promotion && engine.isPromotion(from, to)) {
      set({ pendingPromotion: { from, to }, selectedSquare: null, legalTargets: [] });
      return false;
    }

    const applied = engine.move({ from, to, promotion });
    if (!applied) {
      set({ selectedSquare: null, legalTargets: [] });
      return false;
    }

    applyMove(set, get);
    return true;
  },

  confirmPromotion: (piece) => {
    const pending = get().pendingPromotion;
    if (!pending) return;

    const applied = engine.move({ ...pending, promotion: piece });
    if (!applied) {
      set({ pendingPromotion: null });
      return;
    }

    applyMove(set, get);
  },

  cancelPromotion: () => set({ pendingPromotion: null }),

  toggleClock: () => {
    const { clock, phase } = get();
    if (!clock || phase !== "playing") return;

    const now = Date.now();
    set({
      clock:
        clock.running === null
          ? // Al reanudar corre el reloj de quien tiene el turno, no el de
            // quien lo paro.
            startClock(clock, engine.turn(), now)
          : stopClock(clock, now),
    });
  },

  flagTimeout: (color) => {
    const { phase, clock } = get();
    if (phase !== "playing" || !clock) return;
    // Pierde quien agota el tiempo.
    finish(set, get, { result: color === "w" ? "black" : "white", reason: "timeout" });
  },

  resign: (color) => {
    if (get().phase !== "playing") return;
    finish(set, get, {
      result: color === "w" ? "black" : "white",
      reason: "resignation",
    });
  },

  agreeDraw: () => {
    if (get().phase !== "playing") return;
    finish(set, get, { result: "draw", reason: "draw_agreement" });
  },

  undo: () => {
    const { clockHistory, history, clock, timeControl, remoteGameId } = get();
    if (history.length === 0) return;
    const undonePly = history[history.length - 1].ply;
    if (!engine.undo()) return;

    // Si la jugada se guardo, se retira: el historial persistido tiene que
    // seguir coincidiendo con la partida.
    if (remoteGameId) void deleteMovesFrom(remoteGameId, undonePly);

    // El reloj vuelve a como estaba antes de la jugada deshecha, conservando
    // si estaba en marcha o en pausa.
    let restored: ClockState | null = null;
    if (clock && timeControl) {
      const previous = clockHistory[clockHistory.length - 2];
      const base =
        previous ??
        createClock(timeControl.initialSeconds, timeControl.incrementSeconds);
      const paused = { ...base, running: null, anchor: null };
      restored =
        clock.running !== null
          ? startClock(paused, engine.turn(), Date.now())
          : paused;
    }

    const status = engine.status();
    set({
      phase: "playing",
      fen: engine.fen(),
      pgn: engine.pgn(),
      history: engine.history(),
      status,
      legalMoves: engine.legalMoves(),
      outcome: null,
      selectedSquare: null,
      legalTargets: [],
      pendingPromotion: null,
      clock: restored,
      clockHistory: clockHistory.slice(0, -1),
    });
  },

  flipBoard: () =>
    set((state) => ({
      boardOrientation: state.boardOrientation === "white" ? "black" : "white",
    })),
}));

/**
 * Cierra una jugada ya aplicada al motor: vuelca el estado, pasa el reloj al
 * rival y decide si la partida ha terminado.
 */
function applyMove(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
) {
  const { clock, clockHistory } = get();
  const status = engine.status();
  const outcome = outcomeFromEngine(status);

  let nextClock = clock;
  if (clock) {
    const now = Date.now();
    // Si el reloj aun no se ha arrancado, switchClock lo deja como esta.
    nextClock = outcome ? stopClock(clock, now) : switchClock(clock, now);
  }

  set({
    phase: outcome ? "finished" : "playing",
    fen: engine.fen(),
    pgn: engine.pgn(),
    history: engine.history(),
    status,
    legalMoves: engine.legalMoves(),
    outcome,
    selectedSquare: null,
    legalTargets: [],
    pendingPromotion: null,
    clock: nextClock,
    clockHistory: nextClock ? [...clockHistory, nextClock] : clockHistory,
  });

  const { remoteGameId } = get();
  if (remoteGameId) {
    const played = engine.history().at(-1);
    if (played) {
      void appendMove(remoteGameId, played, {
        whiteMs: nextClock ? nextClock.whiteMs : null,
        blackMs: nextClock ? nextClock.blackMs : null,
      });
    }
    if (outcome) void finishGame(remoteGameId, outcome.result, outcome.reason, engine.pgn());
  }
}

/**
 * Cierra la partida por un motivo que no sale de la posicion: tiempo,
 * abandono o tablas acordadas.
 */
function finish(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  outcome: GameOutcome,
) {
  const { clock, remoteGameId } = get();

  set({
    phase: "finished",
    outcome,
    clock: clock ? stopClock(clock, Date.now()) : null,
    selectedSquare: null,
    legalTargets: [],
    pendingPromotion: null,
  });

  if (remoteGameId) {
    void finishGame(remoteGameId, outcome.result, outcome.reason, engine.pgn());
  }
}

/** Tiempo restante de `color` en el instante `now`, o `null` si no hay reloj. */
export function selectRemainingMs(
  state: GameState,
  color: Color,
  now: number,
): number | null {
  return state.clock ? remainingMs(state.clock, color, now) : null;
}
