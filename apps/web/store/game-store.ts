import { create } from "zustand";

import {
  ChessGame,
  type GameMove,
  type GameStatus,
  type PromotionPiece,
  type Square,
} from "@ajedrez/chess-engine";

/**
 * Instancia unica del motor. Vive fuera del estado de React a proposito:
 * es un objeto mutable, y si estuviera dentro del store su identidad no
 * cambiaria al mover, con lo que los componentes no se re-renderizarian.
 * Lo que si vive en el store es la foto derivada (fen, historial, estado),
 * que es serializable y por tanto comparable.
 */
const engine = new ChessGame();

/** Coronacion pendiente de que el jugador elija pieza. */
interface PendingPromotion {
  from: Square;
  to: Square;
}

export type BoardOrientation = "white" | "black";

interface GameState {
  fen: string;
  pgn: string;
  history: GameMove[];
  status: GameStatus;
  selectedSquare: Square | null;
  legalTargets: Square[];
  pendingPromotion: PendingPromotion | null;
  boardOrientation: BoardOrientation;

  /** Gestiona un clic en una casilla: selecciona pieza o intenta la jugada. */
  selectSquare: (square: Square) => void;
  /** Intenta una jugada directa (arrastre). Devuelve si se aplico. */
  tryMove: (from: Square, to: Square, promotion?: PromotionPiece) => boolean;
  /** Confirma la pieza de coronacion y aplica la jugada pendiente. */
  confirmPromotion: (piece: PromotionPiece) => void;
  cancelPromotion: () => void;
  undo: () => void;
  reset: () => void;
  flipBoard: () => void;
}

/** Vuelca el estado del motor al store y limpia la seleccion. */
function snapshot() {
  return {
    fen: engine.fen(),
    pgn: engine.pgn(),
    history: engine.history(),
    status: engine.status(),
    selectedSquare: null,
    legalTargets: [],
    pendingPromotion: null,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  fen: engine.fen(),
  pgn: engine.pgn(),
  history: engine.history(),
  status: engine.status(),
  selectedSquare: null,
  legalTargets: [],
  pendingPromotion: null,
  boardOrientation: "white",

  selectSquare: (square) => {
    const { selectedSquare, status } = get();

    if (status.isGameOver) return;

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
    if (get().status.isGameOver) return false;

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

    set(snapshot());
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

    set(snapshot());
  },

  cancelPromotion: () => set({ pendingPromotion: null }),

  undo: () => {
    if (!engine.undo()) return;
    set(snapshot());
  },

  reset: () => {
    engine.reset();
    set(snapshot());
  },

  flipBoard: () =>
    set((state) => ({
      boardOrientation: state.boardOrientation === "white" ? "black" : "white",
    })),
}));
