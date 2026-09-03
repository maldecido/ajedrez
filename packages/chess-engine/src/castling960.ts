import type { Chess } from "chess.js";

import type { Color, Square } from "./types";

/**
 * Enroque de Fischer960.
 *
 * chess.js no implementa esta parte de la variante, asi que se resuelve aqui:
 * chess.js sigue siendo quien sabe de reglas (usamos su `isAttacked` y su
 * lectura del tablero) y este modulo solo anade el enroque que le falta.
 *
 * Reglas de la variante: el rey y la torre acaban en las MISMAS casillas que
 * en el ajedrez clasico (g/f al flanco de rey, c/d al flanco de dama), salgan
 * de donde salgan.
 */

export type CastlingSide = "k" | "q";

export interface CastlingRights {
  k: boolean;
  q: boolean;
}

export type CastlingRightsByColor = Record<Color, CastlingRights>;

/** De que columna parten el rey y cada torre en la posicion inicial. */
export interface Castling960Layout {
  kingFile: number;
  rookFiles: Record<CastlingSide, number>;
}

const FILES = "abcdefgh";

/** Columna de destino del rey segun el flanco: g o c. */
const KING_TARGET_FILE: Record<CastlingSide, number> = { k: 6, q: 2 };
/** Columna de destino de la torre segun el flanco: f o d. */
const ROOK_TARGET_FILE: Record<CastlingSide, number> = { k: 5, q: 3 };

export function homeRank(color: Color): number {
  return color === "w" ? 1 : 8;
}

export function toSquare(file: number, rank: number): Square {
  return `${FILES[file]}${rank}` as Square;
}

/** Derechos completos, para empezar una partida. */
export function fullCastlingRights(): CastlingRightsByColor {
  return { w: { k: true, q: true }, b: { k: true, q: true } };
}

/** Copia profunda: los derechos se guardan por jugada para poder deshacer. */
export function cloneRights(rights: CastlingRightsByColor): CastlingRightsByColor {
  return { w: { ...rights.w }, b: { ...rights.b } };
}

/** Representacion tipo FEN de los derechos, para comparar posiciones. */
export function rightsToString(rights: CastlingRightsByColor): string {
  const text =
    (rights.w.k ? "K" : "") +
    (rights.w.q ? "Q" : "") +
    (rights.b.k ? "k" : "") +
    (rights.b.q ? "q" : "");
  return text || "-";
}

/**
 * Deduce de la fila inicial de donde sale cada pieza. En la variante hay
 * exactamente dos torres y el rey siempre queda entre ellas, asi que la torre
 * de la izquierda es la del flanco de dama y la de la derecha la del de rey.
 */
export function layoutFromBackRank(backRank: string): Castling960Layout {
  const normalized = backRank.toLowerCase();
  const kingFile = normalized.indexOf("k");
  const queenSideRook = normalized.indexOf("r");
  const kingSideRook = normalized.lastIndexOf("r");

  if (kingFile < 0 || queenSideRook < 0 || kingSideRook === queenSideRook) {
    throw new Error(`Fila inicial invalida para Fischer960: ${backRank}`);
  }

  return { kingFile, rookFiles: { q: queenSideRook, k: kingSideRook } };
}

/** Extrae la fila inicial (columnas a..h) de la primera fila de un FEN. */
export function backRankFromFen(fen: string): string {
  const ranks = fen.split(" ")[0].split("/");
  const whiteRank = ranks[7];
  let expanded = "";
  for (const char of whiteRank) {
    expanded += /\d/.test(char) ? "".padEnd(Number(char), "-") : char;
  }
  return expanded.toLowerCase();
}

/** Rango inclusivo entre dos columnas, en cualquier orden. */
function filesBetween(from: number, to: number): number[] {
  const [low, high] = from <= to ? [from, to] : [to, from];
  const files: number[] = [];
  for (let file = low; file <= high; file += 1) files.push(file);
  return files;
}

/**
 * Comprueba si el enroque es legal ahora mismo.
 *
 * Las tres condiciones de la variante: las casillas que recorren rey y torre
 * han de estar vacias (salvo por ellos mismos), y el rey no puede estar en
 * jaque, ni pasar por una casilla atacada, ni acabar en una.
 */
export function canCastle(
  chess: Chess,
  color: Color,
  side: CastlingSide,
  layout: Castling960Layout,
  rights: CastlingRightsByColor,
): boolean {
  if (!rights[color][side]) return false;

  const rank = homeRank(color);
  const kingFrom = toSquare(layout.kingFile, rank);
  const rookFrom = toSquare(layout.rookFiles[side], rank);

  const king = chess.get(kingFrom);
  const rook = chess.get(rookFrom);
  if (king?.type !== "k" || king.color !== color) return false;
  if (rook?.type !== "r" || rook.color !== color) return false;

  const kingPath = filesBetween(layout.kingFile, KING_TARGET_FILE[side]);
  const rookPath = filesBetween(layout.rookFiles[side], ROOK_TARGET_FILE[side]);

  // Todo el recorrido debe estar despejado; el propio rey y la propia torre
  // no se estorban entre si.
  for (const file of Array.from(new Set([...kingPath, ...rookPath]))) {
    const square = toSquare(file, rank);
    if (square === kingFrom || square === rookFrom) continue;
    if (chess.get(square)) return false;
  }

  // El rey no puede salir de jaque enrocando, ni cruzar casillas atacadas.
  const opponent: Color = color === "w" ? "b" : "w";
  for (const file of kingPath) {
    if (chess.isAttacked(toSquare(file, rank), opponent)) return false;
  }

  return true;
}

/** Casilla de la torre con la que se enroca: es asi como se pide la jugada. */
export function castlingRookSquare(
  color: Color,
  side: CastlingSide,
  layout: Castling960Layout,
): Square {
  return toSquare(layout.rookFiles[side], homeRank(color));
}

/** Casilla del rey en la posicion inicial. */
export function castlingKingSquare(color: Color, layout: Castling960Layout): Square {
  return toSquare(layout.kingFile, homeRank(color));
}

/**
 * Construye el FEN resultante del enroque.
 *
 * Hace falta montarlo a mano porque chess.js no puede aplicar la jugada: se
 * le carga la posicion ya resuelta.
 */
export function fenAfterCastling(
  chess: Chess,
  color: Color,
  side: CastlingSide,
  layout: Castling960Layout,
): string {
  const rank = homeRank(color);
  const rankIndex = 8 - rank;

  // board() viene de la fila 8 a la 1; cada celda es null o la pieza.
  const board = chess.board().map((row) => row.slice());
  const kingCell = board[rankIndex][layout.kingFile];
  const rookCell = board[rankIndex][layout.rookFiles[side]];

  board[rankIndex][layout.kingFile] = null;
  board[rankIndex][layout.rookFiles[side]] = null;
  board[rankIndex][KING_TARGET_FILE[side]] = kingCell;
  board[rankIndex][ROOK_TARGET_FILE[side]] = rookCell;

  const placement = board
    .map((row) => {
      let text = "";
      let empty = 0;
      for (const cell of row) {
        if (cell === null) {
          empty += 1;
          continue;
        }
        if (empty > 0) {
          text += String(empty);
          empty = 0;
        }
        text += cell.color === "w" ? cell.type.toUpperCase() : cell.type;
      }
      return empty > 0 ? text + String(empty) : text;
    })
    .join("/");

  const [, , , , halfMoves, fullMoves] = chess.fen().split(" ");
  const nextTurn = color === "w" ? "b" : "w";
  // El enroque no captura ni mueve peon, asi que el contador de 50 sube.
  const nextHalfMoves = String(Number(halfMoves) + 1);
  const nextFullMoves = String(Number(fullMoves) + (color === "b" ? 1 : 0));

  // Los derechos de enroque se llevan aparte, por eso van como "-".
  return `${placement} ${nextTurn} - - ${nextHalfMoves} ${nextFullMoves}`;
}

/** Notacion del enroque. */
export function castlingSan(side: CastlingSide): string {
  return side === "k" ? "O-O" : "O-O-O";
}
