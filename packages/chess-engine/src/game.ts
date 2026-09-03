import { Chess, type Move } from "chess.js";

import type {
  Color,
  EngineEndReason,
  GameMove,
  GameResult,
  GameStatus,
  MoveInput,
  PromotionPiece,
  Square,
} from "./types";

/** Posicion inicial estandar. */
export const DEFAULT_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Envoltorio sobre chess.js.
 *
 * Existe por tres razones:
 *  - chess.js lanza una excepcion cuando la jugada es ilegal; aqui eso se
 *    convierte en un `null`, que es lo que la UI necesita.
 *  - aisla al resto de la app de la API de chess.js (si un dia se cambia de
 *    libreria, solo se toca este paquete).
 *  - expone el estado ya derivado y serializable, listo para el store y, mas
 *    adelante, para persistirlo en Supabase.
 */
export class ChessGame {
  private chess: Chess;

  constructor(fen: string = DEFAULT_FEN) {
    this.chess = new Chess(fen);
  }

  /** FEN de la posicion actual. */
  fen(): string {
    return this.chess.fen();
  }

  /** PGN de la partida hasta ahora. */
  pgn(): string {
    return this.chess.pgn();
  }

  /** Color al que le toca mover. */
  turn(): Color {
    return this.chess.turn();
  }

  /** Casillas de destino legales desde `square`. Vacio si no hay pieza propia. */
  legalTargets(square: Square): Square[] {
    const moves = this.chess.moves({ square, verbose: true });
    // Un mismo destino aparece 4 veces cuando la jugada es una coronacion.
    return Array.from(new Set(moves.map((move) => move.to)));
  }

  /**
   * Indica si mover de `from` a `to` obligaria a coronar, para que la UI
   * pregunte a que pieza antes de aplicar la jugada.
   */
  isPromotion(from: Square, to: Square): boolean {
    return this.chess
      .moves({ square: from, verbose: true })
      .some((move) => move.to === to && move.isPromotion());
  }

  /**
   * Aplica una jugada. Devuelve `null` si es ilegal, sin dejar el tablero
   * tocado (chess.js valida antes de mutar).
   */
  move(input: MoveInput): GameMove | null {
    let applied: Move;
    try {
      applied = this.chess.move({
        from: input.from,
        to: input.to,
        promotion: input.promotion,
      });
    } catch {
      // chess.js lanza en jugada ilegal. Para la UI es un caso normal:
      // el usuario solto la pieza en una casilla que no valia.
      return null;
    }
    return this.toGameMove(applied, this.chess.history().length);
  }

  /** Deshace la ultima jugada. Devuelve `null` si no habia ninguna. */
  undo(): boolean {
    return this.chess.undo() !== null;
  }

  /** Historial completo en orden, con la posicion resultante de cada jugada. */
  history(): GameMove[] {
    return this.chess
      .history({ verbose: true })
      .map((move, index) => this.toGameMove(move, index + 1));
  }

  /** Vuelve a la posicion inicial estandar. */
  reset(): void {
    this.chess.reset();
  }

  /** Carga una posicion. Devuelve `false` si el FEN no es valido. */
  load(fen: string): boolean {
    try {
      this.chess.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  /** Estado derivado de la posicion: turno, jaque y final de partida. */
  status(): GameStatus {
    const turn = this.chess.turn();
    const isCheck = this.chess.isCheck();

    if (!this.chess.isGameOver()) {
      return { turn, isCheck, isGameOver: false, result: null, reason: null };
    }

    const reason = this.endReason();
    // En jaque mate pierde quien tiene el turno: no le quedan jugadas legales.
    const result: GameResult =
      reason === "checkmate" ? (turn === "w" ? "black" : "white") : "draw";

    return { turn, isCheck, isGameOver: true, result, reason };
  }

  /**
   * Motivo del final. El orden importa: `isDraw()` de chess.js engloba
   * ahogado, material insuficiente, repeticion y regla de 50 jugadas, asi que
   * las causas concretas se comprueban antes.
   */
  private endReason(): EngineEndReason | null {
    if (this.chess.isCheckmate()) return "checkmate";
    if (this.chess.isStalemate()) return "stalemate";
    if (this.chess.isInsufficientMaterial()) return "insufficient_material";
    if (this.chess.isThreefoldRepetition()) return "repetition";
    if (this.chess.isDrawByFiftyMoves()) return "fifty_move";
    return null;
  }

  private toGameMove(move: Move, ply: number): GameMove {
    return {
      ply,
      san: move.san,
      from: move.from,
      to: move.to,
      piece: move.piece,
      color: move.color,
      captured: move.captured,
      promotion: move.promotion as PromotionPiece | undefined,
      fenAfter: move.after,
    };
  }
}
