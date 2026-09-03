import type { Color, PieceSymbol, Square } from "chess.js";

export type { Color, PieceSymbol, Square };

/** Pieza a la que corona un peon. El rey no es coronable. */
export type PromotionPiece = "q" | "r" | "b" | "n";

/** Ganador de la partida, en el vocabulario del modelo de datos (`games.result`). */
export type GameResult = "white" | "black" | "draw";

/**
 * Motivo del final de partida.
 *
 * Coincide con `games.result_reason` del modelo de datos, salvo `fifty_move`,
 * que chess.js detecta pero el enum de la arquitectura todavia no contempla.
 * Se resuelve al escribir la migracion en la fase 3.
 */
export type GameEndReason =
  | "checkmate"
  | "stalemate"
  | "insufficient_material"
  | "repetition"
  | "fifty_move"
  | "resignation"
  | "draw_agreement"
  | "timeout";

/** Motivos que el motor deduce solo de la posicion. Los demas son externos. */
export type EngineEndReason = Extract<
  GameEndReason,
  "checkmate" | "stalemate" | "insufficient_material" | "repetition" | "fifty_move"
>;

/** Una jugada ya aplicada al tablero. */
export interface GameMove {
  /** Numero de medio-movimiento, empezando en 1. */
  ply: number;
  /** Notacion algebraica estandar: "Cf3", "exd5", "O-O". */
  san: string;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  color: Color;
  captured?: PieceSymbol;
  promotion?: PromotionPiece;
  /** FEN de la posicion resultante, para poder rebobinar la partida. */
  fenAfter: string;
}

/** Estado derivado de la posicion actual. Todo serializable. */
export interface GameStatus {
  turn: Color;
  isCheck: boolean;
  isGameOver: boolean;
  /** null mientras la partida sigue viva. */
  result: GameResult | null;
  reason: EngineEndReason | null;
}

/** Intento de jugada, tal como llega desde el tablero. */
export interface MoveInput {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}
