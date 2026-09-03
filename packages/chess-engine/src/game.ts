import { Chess, type Move } from "chess.js";

import {
  backRankFromFen,
  canCastle,
  castlingKingSquare,
  castlingRookSquare,
  castlingSan,
  cloneRights,
  fenAfterCastling,
  layoutFromBackRank,
  rightsToString,
  type Castling960Layout,
  type CastlingRightsByColor,
  type CastlingSide,
} from "./castling960";
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

const CASTLING_SIDES: readonly CastlingSide[] = ["k", "q"];

export interface ChessGameOptions {
  /** Activa el enroque de Fischer960, que chess.js no implementa. */
  chess960?: boolean;
}

/** Posicion guardada tras cada jugada, para deshacer y detectar repeticion. */
interface PositionRecord {
  fen: string;
  /** Clave de comparacion: posicion, turno, enroques y al paso. */
  key: string;
  rights: CastlingRightsByColor;
}

function rightsFromFen(fen: string): CastlingRightsByColor {
  const field = fen.split(" ")[2] ?? "-";
  return {
    w: { k: field.includes("K"), q: field.includes("Q") },
    b: { k: field.includes("k"), q: field.includes("q") },
  };
}

/** Quita los derechos de enroque del FEN que ve chess.js. */
function withoutCastlingField(fen: string): string {
  const parts = fen.split(" ");
  if (parts.length < 3) return fen;
  parts[2] = "-";
  return parts.join(" ");
}

/**
 * Envoltorio sobre chess.js.
 *
 * chess.js sigue siendo quien decide las reglas, pero el historial, el PGN y
 * la repeticion los lleva esta clase. Hace falta porque el enroque de
 * Fischer960 se aplica cargando la posicion resultante, y eso borraria el
 * historial interno de chess.js: teniendolo aqui, PGN y deshacer sobreviven.
 */
export class ChessGame {
  private chess: Chess;
  private chess960 = false;
  private startFen: string = DEFAULT_FEN;
  private layout: Castling960Layout | null = null;
  private rights: CastlingRightsByColor = rightsFromFen(DEFAULT_FEN);
  private moveList: GameMove[] = [];
  private positions: PositionRecord[] = [];

  constructor(fen: string = DEFAULT_FEN, options: ChessGameOptions = {}) {
    this.chess = new Chess();
    this.init(fen, options.chess960 ?? false);
  }

  private init(fen: string, chess960: boolean): void {
    // En modo 960 los derechos se llevan aparte: si se le dejan a chess.js,
    // los interpreta con el rey en e1 y las torres en a1/h1.
    this.chess = new Chess(chess960 ? withoutCastlingField(fen) : fen);
    this.chess960 = chess960;
    this.startFen = fen;
    this.layout = chess960 ? layoutFromBackRank(backRankFromFen(fen)) : null;
    this.rights = rightsFromFen(fen);
    this.moveList = [];
    this.positions = [];
    this.pushPosition();
  }

  /** FEN de la posicion actual, con los derechos de enroque reales. */
  fen(): string {
    const current = this.chess.fen();
    if (!this.chess960) return current;
    const parts = current.split(" ");
    parts[2] = rightsToString(this.rights);
    return parts.join(" ");
  }

  turn(): Color {
    return this.chess.turn();
  }

  /** Casillas de destino legales desde `square`. Vacio si no hay pieza propia. */
  legalTargets(square: Square): Square[] {
    const targets = new Set<Square>(
      this.chess.moves({ square, verbose: true }).map((move) => move.to),
    );

    // En Fischer960 el enroque se pide moviendo el rey sobre su propia torre.
    // Es la convencion de la variante y ademas evita ambiguedades: el rey
    // nunca puede capturar una pieza propia, asi que no choca con nada.
    if (this.chess960 && this.layout) {
      const color = this.chess.turn();
      if (square === castlingKingSquare(color, this.layout)) {
        for (const side of this.availableCastlingSides()) {
          targets.add(castlingRookSquare(color, side, this.layout));
        }
      }
    }

    return Array.from(targets);
  }

  /** Indica si mover de `from` a `to` obligaria a coronar. */
  isPromotion(from: Square, to: Square): boolean {
    return this.chess
      .moves({ square: from, verbose: true })
      .some((move) => move.to === to && move.isPromotion());
  }

  /** Aplica una jugada. Devuelve `null` si es ilegal, sin tocar el tablero. */
  move(input: MoveInput): GameMove | null {
    const castling = this.castlingSideFor(input);
    if (castling) return this.applyCastling(this.chess.turn(), castling);

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

    this.updateRightsAfterMove(applied);

    const gameMove: GameMove = {
      ply: this.moveList.length + 1,
      san: applied.san,
      from: applied.from,
      to: applied.to,
      piece: applied.piece,
      color: applied.color,
      captured: applied.captured,
      promotion: applied.promotion as PromotionPiece | undefined,
      fenAfter: applied.after,
    };
    this.moveList.push(gameMove);
    this.pushPosition();
    return gameMove;
  }

  /** Deshace la ultima jugada. Devuelve `false` si no habia ninguna. */
  undo(): boolean {
    if (this.moveList.length === 0) return false;

    this.moveList.pop();
    this.positions.pop();
    const previous = this.positions[this.positions.length - 1];
    this.chess.load(
      this.chess960 ? withoutCastlingField(previous.fen) : previous.fen,
    );
    this.rights = cloneRights(previous.rights);
    return true;
  }

  /** Historial completo en orden, con la posicion resultante de cada jugada. */
  history(): GameMove[] {
    return [...this.moveList];
  }

  /** Vuelve a la posicion inicial estandar. */
  reset(): void {
    this.init(DEFAULT_FEN, false);
  }

  /** Carga una posicion y empieza una partida nueva desde ella. */
  load(fen: string, options: ChessGameOptions = {}): boolean {
    try {
      this.init(fen, options.chess960 ?? false);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * PGN de la partida.
   *
   * Se genera aqui en vez de delegarlo en chess.js porque su historial se
   * pierde al aplicar el enroque de la variante.
   */
  pgn(): string {
    if (this.moveList.length === 0) return "";

    const headers: string[] = [];
    if (this.chess960) headers.push('[Variant "Chess960"]');
    if (this.startFen !== DEFAULT_FEN) {
      headers.push('[SetUp "1"]', `[FEN "${this.startFen}"]`);
    }

    const [, startTurn, , , , startFullMoves] = this.startFen.split(" ");
    let moveNumber = Number(startFullMoves) || 1;
    let sideToMove: Color = startTurn === "b" ? "b" : "w";

    const tokens: string[] = [];
    for (const move of this.moveList) {
      if (sideToMove === "w") {
        tokens.push(`${moveNumber}.`, move.san);
      } else {
        // Si la partida arranca con negras, la primera fila lleva puntos
        // suspensivos para no fingir una jugada blanca que no existe.
        if (tokens.length === 0) tokens.push(`${moveNumber}...`);
        tokens.push(move.san);
        moveNumber += 1;
      }
      sideToMove = sideToMove === "w" ? "b" : "w";
    }

    const status = this.status();
    const result = !status.isGameOver
      ? "*"
      : status.result === "white"
        ? "1-0"
        : status.result === "black"
          ? "0-1"
          : "1/2-1/2";

    const movetext = `${tokens.join(" ")} ${result}`;
    return headers.length > 0 ? `${headers.join("\n")}\n\n${movetext}` : movetext;
  }

  /** Estado derivado de la posicion: turno, jaque y final de partida. */
  status(): GameStatus {
    const turn = this.chess.turn();
    const isCheck = this.chess.isCheck();
    const reason = this.endReason();

    if (reason === null) {
      return { turn, isCheck, isGameOver: false, result: null, reason: null };
    }

    // En jaque mate pierde quien tiene el turno: no le quedan jugadas legales.
    const result: GameResult =
      reason === "checkmate" ? (turn === "w" ? "black" : "white") : "draw";

    return { turn, isCheck, isGameOver: true, result, reason };
  }

  /** Flancos por los que el jugador de turno puede enrocar (solo en 960). */
  private availableCastlingSides(): CastlingSide[] {
    if (!this.chess960 || !this.layout) return [];
    const color = this.chess.turn();
    const layout = this.layout;
    return CASTLING_SIDES.filter((side) =>
      canCastle(this.chess, color, side, layout, this.rights),
    );
  }

  /** Si la jugada pedida es un enroque de la variante, devuelve el flanco. */
  private castlingSideFor(input: MoveInput): CastlingSide | null {
    if (!this.chess960 || !this.layout) return null;
    const color = this.chess.turn();
    if (input.from !== castlingKingSquare(color, this.layout)) return null;

    for (const side of this.availableCastlingSides()) {
      if (input.to === castlingRookSquare(color, side, this.layout)) return side;
    }
    return null;
  }

  private applyCastling(color: Color, side: CastlingSide): GameMove {
    const layout = this.layout as Castling960Layout;
    const from = castlingKingSquare(color, layout);
    const to = castlingRookSquare(color, side, layout);
    const fenAfter = fenAfterCastling(this.chess, color, side, layout);

    this.chess.load(fenAfter);
    this.rights[color] = { k: false, q: false };

    const gameMove: GameMove = {
      ply: this.moveList.length + 1,
      san: castlingSan(side),
      from,
      to,
      piece: "k",
      color,
      fenAfter: this.fen(),
    };
    this.moveList.push(gameMove);
    this.pushPosition();
    return gameMove;
  }

  /** Un rey o una torre que se mueven (o una torre capturada) pierden derechos. */
  private updateRightsAfterMove(move: Move): void {
    if (!this.chess960 || !this.layout) return;
    const layout = this.layout;
    const color = move.color;

    if (move.piece === "k") {
      this.rights[color] = { k: false, q: false };
    } else if (move.piece === "r") {
      for (const side of CASTLING_SIDES) {
        if (move.from === castlingRookSquare(color, side, layout)) {
          this.rights[color][side] = false;
        }
      }
    }

    if (move.captured === "r") {
      const opponent: Color = color === "w" ? "b" : "w";
      for (const side of CASTLING_SIDES) {
        if (move.to === castlingRookSquare(opponent, side, layout)) {
          this.rights[opponent][side] = false;
        }
      }
    }
  }

  private pushPosition(): void {
    const fen = this.fen();
    const [placement, turn, castlingField, enPassant] = fen.split(" ");
    this.positions.push({
      fen,
      key: `${placement} ${turn} ${castlingField} ${enPassant}`,
      rights: cloneRights(this.rights),
    });
  }

  /** Repeticion contada sobre el historial propio, no sobre el de chess.js. */
  private isThreefoldRepetition(): boolean {
    const current = this.positions[this.positions.length - 1];
    let seen = 0;
    for (const position of this.positions) {
      if (position.key === current.key) seen += 1;
    }
    return seen >= 3;
  }

  /**
   * Motivo del final. El orden importa: `isDraw()` de chess.js engloba varias
   * causas, asi que las concretas se comprueban antes.
   */
  private endReason(): EngineEndReason | null {
    if (this.chess.isCheckmate()) return "checkmate";
    // chess.js no ve el enroque de la variante: si cree que hay ahogado pero
    // aun queda un enroque legal, la partida sigue viva.
    if (this.chess.isStalemate() && this.availableCastlingSides().length === 0) {
      return "stalemate";
    }
    if (this.chess.isInsufficientMaterial()) return "insufficient_material";
    if (this.isThreefoldRepetition()) return "repetition";
    if (this.chess.isDrawByFiftyMoves()) return "fifty_move";
    return null;
  }
}
